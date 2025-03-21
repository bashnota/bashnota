import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { useJupyterStore } from '@/stores/jupyterStore'
import { notaExtensionService } from '@/services/notaExtensionService'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'

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
    visualizations?: string[] // Base64 encoded images if available
    data?: any // Structured data from execution result
  }
}

/**
 * Coder actor that generates and executes code
 */
export class Coder extends BaseActor {
  private codeExecutionStore = useCodeExecutionStore()
  private jupyterStore = useJupyterStore()
  private configuredServer: JupyterServer | null = null
  private configuredKernel: KernelSpec | null = null
  
  constructor() {
    super(ActorType.CODER)
  }
  
  /**
   * Set a specific Jupyter server and kernel configuration
   * @param server The Jupyter server to use
   * @param kernel The kernel to use for code execution
   */
  public setJupyterConfig(server: JupyterServer, kernel: KernelSpec): void {
    this.configuredServer = server
    this.configuredKernel = kernel
    console.log('Coder: Using configured Jupyter server and kernel:', 
      `${server.ip}:${server.port}`, kernel.name)
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
    
    // Check if Jupyter server is configured
    const jupyterServers = this.configuredServer 
      ? [this.configuredServer] 
      : this.jupyterStore.jupyterServers
      
    if (!jupyterServers || jupyterServers.length === 0) {
      // Create an entry about the missing server
      await this.createEntry(
        codeTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        'jupyter_server_missing',
        'No Jupyter server is configured. Code will be generated but not executed.'
      )
      
      // Generate code without execution
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
      
      // No longer automatically insert code - user will do this manually
      console.log('Coder: Generated code and stored in database')
      
      return codeResult
    }
    
    // Generate initial code based on the task description
    let codeResult = await this.generateCode(task.description)
    
    // Store the generated code in the database
    await this.createEntry(
      codeTable.id,
      task.id,
      DatabaseEntryType.CODE,
      'initial_code',
      {
        language: codeResult.language,
        code: codeResult.code
      }
    )
    
    // Execute the generated code
    try {
      // Execute the code
      const executionResult = await this.executeCode(codeResult.code, codeResult.language)
      
      // Store the execution result in the database
      await this.createEntry(
        codeTable.id,
        task.id,
        DatabaseEntryType.RESULT,
        'execution_result',
        executionResult
      )
      
      // If execution succeeded but further refinement is needed
      if (executionResult.success && task.description.toLowerCase().includes('iterative')) {
        // Refine the code based on execution results
        const refinedCodeResult = await this.refineCode(
          task.description,
          codeResult.code,
          codeResult.language,
          executionResult
        )
        
        // Store the refined code in the database
        await this.createEntry(
          codeTable.id,
          task.id,
          DatabaseEntryType.CODE,
          'refined_code',
          {
            language: refinedCodeResult.language,
            code: refinedCodeResult.code
          }
        )
        
        // Execute the refined code
        const refinedExecutionResult = await this.executeCode(
          refinedCodeResult.code,
          refinedCodeResult.language
        )
        
        // Store the refined execution result in the database
        await this.createEntry(
          codeTable.id,
          task.id,
          DatabaseEntryType.RESULT,
          'refined_execution_result',
          refinedExecutionResult
        )
        
        // Update the code result with the refined version
        codeResult = {
          ...refinedCodeResult,
          execution: refinedExecutionResult
        }
      } else {
        // Add execution results to the original code result
        codeResult = {
          ...codeResult,
          execution: executionResult
        }
      }
      
      return codeResult
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
If the task involves data visualization, ensure the code includes appropriate visualization commands.
If the task involves data processing, make sure to include appropriate print or display statements so results are visible.
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
   * Refines code based on execution results
   * @param description Original task description
   * @param originalCode The original code
   * @param language The programming language
   * @param executionResult The result of executing the original code
   * @returns Refined code
   */
  private async refineCode(
    description: string,
    originalCode: string,
    language: string,
    executionResult: any
  ): Promise<CodeResult> {
    const prompt = `
You are an expert programmer. Your task is to refine the following ${language} code based on its execution results:

ORIGINAL TASK:
${description}

ORIGINAL CODE:
\`\`\`${language}
${originalCode}
\`\`\`

EXECUTION RESULT:
${executionResult.output}

${executionResult.error ? `ERROR:\n${executionResult.error}\n` : ''}

Please analyze the execution results and improve the code. The refined code should fix any issues and improve functionality.
Write only the improved code, without any explanations, markdown formatting, or comments.
The code should be complete, correct, and ready to execute.
Focus on improving:
1. Any errors or bugs
2. Efficiency or performance issues
3. Enhancing visualization or output clarity
4. Addressing the original task more effectively
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
    
    // Check for visualization libraries that imply language
    if (lowercaseDesc.includes('matplotlib') || 
        lowercaseDesc.includes('pandas') || 
        lowercaseDesc.includes('numpy') || 
        lowercaseDesc.includes('seaborn')) return 'python'
    
    if (lowercaseDesc.includes('ggplot') || 
        lowercaseDesc.includes('dplyr') ||
        lowercaseDesc.includes('tidyverse')) return 'r'
    
    if (lowercaseDesc.includes('d3.js') || 
        lowercaseDesc.includes('chart.js') ||
        lowercaseDesc.includes('plotly.js')) return 'javascript'
    
    // Default to Python if not specified
    return 'python'
  }
  
  /**
   * Executes generated code using the appropriate kernel
   * @param code The code to execute
   * @param language The programming language
   * @returns The execution result
   */
  private async executeCode(code: string, language: string): Promise<{
    output: string, 
    success: boolean,
    error?: string,
    visualizations?: string[],
    data?: any
  }> {
    try {
      let kernel, serverConfig
      
      // Use configured kernel if available, otherwise find an appropriate one
      if (this.configuredServer && this.configuredKernel) {
        kernel = this.configuredKernel
        serverConfig = this.configuredServer
        console.log(`Using configured kernel: ${kernel.name}`)
      } else {
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
        kernel = allKernels.find((k: any) => 
          k.name.toLowerCase().includes(kernelSpec) || 
          k.display_name.toLowerCase().includes(kernelSpec)
        )
        
        if (!kernel) {
          throw new Error(`No kernel found for language: ${language}`)
        }
        
        // Create a server configuration from the first server
        serverConfig = this.jupyterStore.jupyterServers[0]
      }
      
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
      
      if (!cell) {
        throw new Error('Failed to retrieve cell after execution')
      }
      
      // Extract visualizations if available (look for base64 image data in output)
      const visualizations: string[] = []
      const base64ImagePattern = /<img src="data:image\/\w+;base64,([^"]+)"/g
      let match
      
      let output = cell.output || 'No output'
      
      while ((match = base64ImagePattern.exec(output)) !== null) {
        visualizations.push(match[1]) // Store just the base64 data
      }
      
      // Try to extract structured data from the output
      let data: any = null;
      try {
        // Look for JSON in the output with a more robust pattern
        // First attempt: Look for valid JSON objects or arrays
        const jsonRegex = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
        const potentialMatches = [...output.matchAll(jsonRegex)];
        
        // Try each potential match until we find valid JSON
        for (const match of potentialMatches) {
          try {
            const jsonText = match[0].trim();
            data = JSON.parse(jsonText);
            break; // If parsing succeeds, exit the loop
          } catch (parseError) {
            // Continue to the next potential match
            continue;
          }
        }
      } catch (error) {
        console.warn('Could not parse structured data from output:', error);
      }
      
      // Parse and format the result
      return {
        output,
        success: !cell.hasError,
        error: cell.hasError ? (cell.error?.message || 'Execution failed') : undefined,
        visualizations: visualizations.length > 0 ? visualizations : undefined,
        data: data
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