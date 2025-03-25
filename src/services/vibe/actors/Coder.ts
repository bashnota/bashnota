import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { useJupyterStore } from '@/stores/jupyterStore'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { logger } from '@/services/logger'

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
    logger.log('Coder: Using configured Jupyter server and kernel:', 
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
    
    // Always attempt to use Jupyter for execution
    const language = this.determineLanguage(task.description)
    
    // Generate code based on the task description
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
    
    // Check for Jupyter servers
    const jupyterServers = this.configuredServer 
      ? [this.configuredServer] 
      : this.jupyterStore.jupyterServers
      
    if (!jupyterServers || jupyterServers.length === 0) {
      // No Jupyter server available - create an entry about the missing server
      await this.createEntry(
        codeTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        'jupyter_server_missing',
        'No Jupyter server is configured. Code was generated but could not be executed. Please configure a Jupyter server to execute code.'
      )
      
      // Return the generated code without execution
      return {
        ...codeResult,
        execution: {
          output: 'No Jupyter server available for execution. Please configure a Jupyter server.',
          error: 'Jupyter server not configured',
          success: false
        }
      }
    }
    
    // Attempt to execute the code
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
      
      // If execution failed, make another attempt with refined code
      if (!executionResult.success) {
        // Refine the code based on execution error
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
      } else if (task.description.toLowerCase().includes('iterative')) {
        // For iterative improvement tasks that executed successfully on first try
        // Refine the code for further improvements
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
      logger.error('Code execution error:', error)
      
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
      
      // Return the generated code with the error information
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
You are an expert programmer with deep knowledge of ${language} and best practices. Your task is to generate high-quality, efficient ${language} code that accomplishes the following task:

TASK DESCRIPTION:
${description}

REQUIREMENTS:
1. Write clean, well-structured, and optimized code that follows industry best practices for ${language}
2. Ensure the code is complete, correct, and ready to execute without modifications
3. Use appropriate error handling to gracefully manage potential issues
4. Include only essential comments for complex logic that needs explanation
5. Follow conventions and idioms specific to ${language}
6. The code must run in a Jupyter notebook environment in a SINGLE CELL

OUTPUT GUIDELINES:
- If the task involves data visualization:
  - Include appropriate visualization commands with clear labels, titles, and legends
  - Configure visualizations with appropriate colors, sizes, and styles for readability
  - Handle different data types and edge cases appropriately

- If the task involves data processing:
  - Include appropriate print or display statements so results are clearly visible
  - Handle edge cases such as empty data, missing values, or unexpected input formats
  - Implement efficient algorithms for data manipulation

- If the task involves mathematical calculations:
  - Use appropriate libraries for complex mathematics (numpy, scipy, etc. for Python)
  - Ensure numerical stability in calculations
  - Validate inputs to mathematical functions

IMPORTANT: Write only the code, without any explanations, markdown formatting, or surrounding text. The code should be ready to copy and execute in a Jupyter notebook.
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
    const hasError = !executionResult.success
    
    const prompt = `
You are an expert programmer specializing in debugging and optimizing ${language} code. ${hasError ? 'Your task is to fix the errors in the following code:' : 'Your task is to refine and improve the following code:'}

ORIGINAL TASK:
${description}

ORIGINAL CODE:
\`\`\`${language}
${originalCode}
\`\`\`

${hasError ? 'ERROR:' : 'EXECUTION RESULT:'}
${hasError ? (executionResult.error || 'Unknown error occurred during execution') : executionResult.output}

${hasError ? 'DEBUGGING GUIDELINES:' : 'REFINEMENT GUIDELINES:'}
1. ${hasError ? 'Identify and fix all errors in the code' : 'Optimize the code for better performance and readability'}
2. Ensure the code correctly addresses all aspects of the original task
3. Make the code more robust with proper error handling
4. ${hasError ? 'Fix the code so it runs successfully in a Jupyter notebook' : 'Enhance output formatting and visualization if applicable'}
5. The fixed code must be complete and runnable in a single Jupyter cell

IMPORTANT REQUIREMENTS:
- The code must run in a Jupyter notebook environment in a SINGLE CELL
- The code must be complete, not just the fixed portions
- Follow ${language} best practices and idiomatic patterns
- Include clear output/display statements so results are visible

Return ONLY the improved code without explanations, markdown formatting, or surrounding text. The code should be ready to execute in a Jupyter notebook.
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
    
    // Check for explicit language requests
    if (lowercaseDesc.includes(' python') || 
        lowercaseDesc.includes('in python') || 
        lowercaseDesc.includes('using python') || 
        lowercaseDesc.includes('with python')) return 'python'
    
    if (lowercaseDesc.includes(' javascript') || 
        lowercaseDesc.includes('in javascript') || 
        lowercaseDesc.includes(' js ') || 
        lowercaseDesc.includes('using javascript') || 
        lowercaseDesc.includes('with javascript')) return 'javascript'
    
    if (lowercaseDesc.includes(' typescript') || 
        lowercaseDesc.includes('in typescript') || 
        lowercaseDesc.includes(' ts ') || 
        lowercaseDesc.includes('using typescript') || 
        lowercaseDesc.includes('with typescript')) return 'typescript'
    
    if (lowercaseDesc.includes(' r ') || 
        lowercaseDesc.includes('language r') || 
        lowercaseDesc.includes('in r ') || 
        lowercaseDesc.includes(' r programming') || 
        lowercaseDesc.includes('using r ') || 
        lowercaseDesc.includes('with r ')) return 'r'
    
    if (lowercaseDesc.includes(' sql') || 
        lowercaseDesc.includes('in sql') || 
        lowercaseDesc.includes('using sql') || 
        lowercaseDesc.includes('with sql')) return 'sql'
    
    if (lowercaseDesc.includes(' julia') || 
        lowercaseDesc.includes('in julia') || 
        lowercaseDesc.includes('using julia') || 
        lowercaseDesc.includes('with julia')) return 'julia'
    
    // Check for library/framework mentions that imply languages
    if (lowercaseDesc.includes('matplotlib') || 
        lowercaseDesc.includes('pandas') || 
        lowercaseDesc.includes('numpy') || 
        lowercaseDesc.includes('sklearn') || 
        lowercaseDesc.includes('scikit') || 
        lowercaseDesc.includes('tensorflow') || 
        lowercaseDesc.includes('torch') || 
        lowercaseDesc.includes('keras') || 
        lowercaseDesc.includes('scipy') || 
        lowercaseDesc.includes('seaborn')) return 'python'
    
    if (lowercaseDesc.includes('ggplot') || 
        lowercaseDesc.includes('dplyr') ||
        lowercaseDesc.includes('tidyverse') ||
        lowercaseDesc.includes('shiny') ||
        lowercaseDesc.includes('caret')) return 'r'
    
    if (lowercaseDesc.includes('d3.js') || 
        lowercaseDesc.includes('chart.js') ||
        lowercaseDesc.includes('plotly.js') ||
        lowercaseDesc.includes('node.js') ||
        lowercaseDesc.includes('react') ||
        lowercaseDesc.includes('vue') ||
        lowercaseDesc.includes('angular')) return 'javascript'
    
    if (lowercaseDesc.includes('data.table') ||
        lowercaseDesc.includes('randomforest') ||
        lowercaseDesc.includes('lubridate')) return 'r'
    
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
        logger.log(`Using configured kernel: ${kernel.name}`)
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
        else if (language === 'julia') kernelSpec = 'julia'
        
        // Find a matching kernel
        kernel = allKernels.find((k: any) => 
          k.name.toLowerCase().includes(kernelSpec) || 
          k.display_name.toLowerCase().includes(kernelSpec)
        )
        
        if (!kernel) {
          // If no specific kernel found, try to use Python as fallback
          kernel = allKernels.find((k: any) => 
            k.name.toLowerCase().includes('python') || 
            k.display_name.toLowerCase().includes('python')
          )
          
          if (!kernel) {
            // If still no kernel, just use the first available one
            kernel = allKernels[0]
            logger.warn(`No kernel found for ${language}, using ${kernel.name} as fallback`)
          } else {
            logger.warn(`No kernel found for ${language}, using Python kernel as fallback`)
          }
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
      let data: any = null
      try {
        // Look for JSON in the output with a more robust pattern
        // First attempt: Look for valid JSON objects or arrays
        const jsonRegex = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g
        const potentialMatches = [...output.matchAll(jsonRegex)]
        
        // Try each potential match until we find valid JSON
        for (const match of potentialMatches) {
          try {
            const jsonText = match[0].trim()
            data = JSON.parse(jsonText)
            break // If parsing succeeds, exit the loop
          } catch (parseError) {
            // Continue to the next potential match
            continue
          }
        }
      } catch (error) {
        logger.warn('Could not parse structured data from output:', error)
      }
      
      const success = !cell.hasError
      const errorMessage = cell.hasError ? (cell.error?.message || 'Execution failed') : undefined
      
      // Provide useful error message when execution fails
      if (!success) {
        logger.error(`Code execution failed: ${errorMessage}`)
        
        // Create a styled error message with red coloring
        output = `<div style="color: red; font-weight: bold;">
Execution Failed: ${errorMessage || 'Unknown error'}
</div>
${output}`
      }
      
      // Parse and format the result
      return {
        output,
        success,
        error: errorMessage,
        visualizations: visualizations.length > 0 ? visualizations : undefined,
        data: data
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Code execution error:', error)
      
      // Create styled error with red color
      const styledError = `<div style="color: red; font-weight: bold;">
Execution Failed: ${errorMessage}
</div>`
      
      return {
        output: styledError,
        success: false,
        error: errorMessage
      }
    }
  }
}