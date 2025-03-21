import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { useJupyterStore } from '@/stores/jupyterStore'

/**
 * Result structure for the coder
 */
export interface CodeResult {
  code: string
  language: string
  execution?: {
    output: string
    error?: string
    success: boolean
  }
}

/**
 * Coder actor that generates and executes code
 */
export class Coder extends BaseActor {
  private codeExecutionStore = useCodeExecutionStore()
  private jupyterStore = useJupyterStore()
  
  constructor() {
    super(ActorType.CODER)
  }
  
  /**
   * Executes a coding task
   * @param task The task to execute
   * @returns The coding result
   */
  protected async execute(task: VibeTask): Promise<CodeResult> {
    // Create a code database table if it doesn't exist
    const codeTable = await this.createTable(
      task.boardId,
      'code',
      'Stores code snippets and execution results',
      {
        language: 'string',
        code: 'string',
        execution: 'object'
      }
    )
    
    // Generate code based on the task description
    const codeResult = await this.generateCode(task.description)
    
    // Store the generated code in the database
    await this.createEntry(
      codeTable.id,
      task.id,
      DatabaseEntryType.CODE,
      'generated_code',
      {
        language: codeResult.language,
        code: codeResult.code
      }
    )
    
    // Insert the code into the document if editor is available
    if (this.editor) {
      this.insertCodeBlock(codeResult.language, codeResult.code)
    }
    
    // Execute the generated code if possible
    try {
      const executionResult = await this.executeCode(codeResult.code, codeResult.language)
      
      // Store the execution result in the database
      await this.createEntry(
        codeTable.id,
        task.id,
        DatabaseEntryType.RESULT,
        'execution_result',
        executionResult
      )
      
      // Add execution results to the result
      return {
        ...codeResult,
        execution: executionResult
      }
    } catch (error) {
      console.error('Code execution error:', error)
      
      // Store the error in the database
      await this.createEntry(
        codeTable.id,
        task.id,
        DatabaseEntryType.DATA,
        'execution_error',
        {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      )
      
      // Return the generated code even if execution fails
      return {
        ...codeResult,
        execution: {
          output: '',
          error: error instanceof Error ? error.message : String(error),
          success: false
        }
      }
    }
  }
  
  /**
   * Generates code based on a task description
   * @param description The task description
   * @returns The generated code and language
   */
  private async generateCode(description: string): Promise<CodeResult> {
    const language = this.determineLanguage(description)
    
    const prompt = `
You are an expert programmer. Your task is to generate ${language} code that accomplishes the following task:

${description}

Write only the code, without any explanations, markdown formatting, or comments. The code should be complete, correct, and ready to execute.
`
    
    const completion = await this.generateCompletion(prompt)
    
    // Extract code from the completion (in case the AI adds markdown code blocks)
    const codeMatch = completion.match(/```(\w+)?([\s\S]*?)```/)
    if (codeMatch) {
      return {
        language: codeMatch[1]?.toLowerCase() || language,
        code: codeMatch[2].trim()
      }
    }
    
    // If no code block markers, assume the whole response is code
    return {
      language,
      code: completion.trim()
    }
  }
  
  /**
   * Determines the appropriate programming language based on the task description
   * @param description The task description
   * @returns The determined language
   */
  private determineLanguage(description: string): string {
    const lowercaseDesc = description.toLowerCase()
    
    // Check for explicit language mentions
    if (lowercaseDesc.includes('python')) return 'python'
    if (lowercaseDesc.includes('javascript') || lowercaseDesc.includes('js')) return 'javascript'
    if (lowercaseDesc.includes('typescript') || lowercaseDesc.includes('ts')) return 'typescript'
    if (lowercaseDesc.includes(' r ') || lowercaseDesc.includes('language r') || 
        lowercaseDesc.includes('using r')) return 'r'
    if (lowercaseDesc.includes('sql')) return 'sql'
    
    // Default to Python if not specified
    return 'python'
  }
  
  /**
   * Executes generated code using the appropriate kernel
   * @param code The code to execute
   * @param language The programming language
   * @returns The execution result
   */
  private async executeCode(code: string, language: string): Promise<{output: string, success: boolean}> {
    try {
      // Get available kernels from all servers
      const allKernels = Object.values(this.jupyterStore.kernels).flat()
      
      if (!allKernels || allKernels.length === 0) {
        throw new Error('No kernels available for code execution')
      }
      
      // Choose appropriate kernel based on language
      let kernelSpec = ''
      if (language === 'python') kernelSpec = 'python'
      else if (language === 'r') kernelSpec = 'ir'
      else if (language === 'javascript' || language === 'typescript') kernelSpec = 'javascript'
      else if (language === 'sql') kernelSpec = 'sql'
      
      // Find a matching kernel
      const kernel = allKernels.find((k: any) => 
        k.name.toLowerCase().includes(kernelSpec) || 
        k.display_name.toLowerCase().includes(kernelSpec)
      )
      
      if (!kernel) {
        throw new Error(`No kernel found for language: ${language}`)
      }
      
      // Create a server configuration from the first server
      const serverConfig = this.jupyterStore.jupyterServers[0]
      
      // Generate a unique ID for the code cell
      const cellId = crypto.randomUUID()
      
      // Add the cell to the store
      this.codeExecutionStore.addCell({
        id: cellId,
        code,
        kernelName: kernel.name,
        serverConfig,
        sessionId: '',
        output: ''
      })
      
      // Execute the code
      await this.codeExecutionStore.executeCell(cellId)
      
      // Get the updated cell to extract results
      const cell = this.codeExecutionStore.getCellById(cellId)
      
      // Parse and format the result
      return {
        output: cell?.output || 'No output',
        success: !cell?.hasError
      }
    } catch (error: unknown) {
      console.error('Code execution error:', error)
      throw new Error(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * Formats the execution output into a readable string
   * @param result The execution result from the code execution store
   * @returns Formatted output
   */
  private formatExecutionOutput(result: any): string {
    if (!result) return 'No output'
    
    // For simple string results
    if (typeof result === 'string') return result
    
    // For structured results
    try {
      if (Array.isArray(result)) {
        return result.map(item => JSON.stringify(item)).join('\n')
      }
      
      if (typeof result === 'object') {
        if (result.output) return result.output
        return JSON.stringify(result, null, 2)
      }
      
      return String(result)
    } catch (error: unknown) {
      return `Error formatting output: ${error instanceof Error ? error.message : String(error)}`
    }
  }
} 