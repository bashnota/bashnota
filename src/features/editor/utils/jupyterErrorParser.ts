/**
 * Jupyter Error Parser
 * Extracts and formats Jupyter execution errors for better display
 */

export interface ParsedError {
  type: 'syntax' | 'runtime' | 'import' | 'timeout' | 'kernel' | 'unknown'
  title: string
  message: string
  traceback?: string[]
  lineNumber?: number
  columnNumber?: number
  suggestion?: string
  originalError: string
}

/**
 * Common error patterns in Jupyter output
 */
const ERROR_PATTERNS = {
  syntax: [
    /SyntaxError: (.+)/,
    /IndentationError: (.+)/,
    /TabError: (.+)/
  ],
  runtime: [
    /NameError: (.+)/,
    /TypeError: (.+)/,
    /ValueError: (.+)/,
    /AttributeError: (.+)/,
    /KeyError: (.+)/,
    /IndexError: (.+)/,
    /ZeroDivisionError: (.+)/
  ],
  import: [
    /ImportError: (.+)/,
    /ModuleNotFoundError: (.+)/
  ],
  timeout: [
    /TimeoutError: (.+)/,
    /Kernel died/,
    /Kernel restarting/
  ],
  kernel: [
    /Kernel Error/,
    /Connection refused/,
    /Kernel not found/
  ]
}

/**
 * Error suggestions for common issues
 */
const ERROR_SUGGESTIONS: Record<string, string> = {
  'NameError': 'Check if the variable is defined and spelled correctly',
  'ModuleNotFoundError': 'Install the missing module using: pip install <module_name>',
  'SyntaxError': 'Check your code syntax, brackets, and indentation',
  'IndentationError': 'Fix indentation - use consistent spaces or tabs',
  'TypeError': 'Check the data types being used in your operation',
  'ValueError': 'Check if the value is appropriate for the operation',
  'ImportError': 'Check if the module exists and is properly installed',
  'AttributeError': 'Check if the object has the attribute you\'re trying to access',
  'KeyError': 'Check if the key exists in the dictionary',
  'IndexError': 'Check if the index is within the valid range',
  'ZeroDivisionError': 'Cannot divide by zero - check your calculation'
}

/**
 * Parse Jupyter execution error output
 */
export function parseJupyterError(output: string): ParsedError {
  if (!output || typeof output !== 'string') {
    return {
      type: 'unknown',
      title: 'Unknown Error',
      message: 'An unknown error occurred',
      originalError: output || ''
    }
  }

  // Clean the output
  const cleanOutput = output.trim()
  
  // Extract traceback
  const traceback = extractTraceback(cleanOutput)
  
  // Determine error type and extract main error message
  let errorType: ParsedError['type'] = 'unknown'
  let mainMessage = ''
  let lineNumber: number | undefined
  let columnNumber: number | undefined

  // Check each error pattern
  for (const [type, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      const match = cleanOutput.match(pattern)
      if (match) {
        errorType = type as ParsedError['type']
        mainMessage = match[1] || match[0]
        break
      }
    }
    if (errorType !== 'unknown') break
  }

  // Extract line and column numbers
  const lineMatch = cleanOutput.match(/line (\d+)/i)
  const columnMatch = cleanOutput.match(/column (\d+)/i)
  
  if (lineMatch) lineNumber = parseInt(lineMatch[1])
  if (columnMatch) columnNumber = parseInt(columnMatch[1])

  // Get error title from the error type
  const title = getErrorTitle(errorType, mainMessage)
  
  // Get suggestion for this error type
  const suggestion = getErrorSuggestion(cleanOutput)

  return {
    type: errorType,
    title,
    message: mainMessage || extractErrorMessage(cleanOutput),
    traceback,
    lineNumber,
    columnNumber,
    suggestion,
    originalError: cleanOutput
  }
}

/**
 * Extract traceback lines from error output
 */
function extractTraceback(output: string): string[] {
  const lines = output.split('\n')
  const traceback: string[] = []
  let inTraceback = false

  for (const line of lines) {
    if (line.includes('Traceback (most recent call last):')) {
      inTraceback = true
      continue
    }
    
    if (inTraceback) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('File "<stdin>"')) {
        traceback.push(trimmed)
      }
    }
  }

  return traceback
}

/**
 * Get a user-friendly error title
 */
function getErrorTitle(type: string, message: string): string {
  switch (type) {
    case 'syntax':
      return 'Syntax Error'
    case 'runtime':
      return 'Runtime Error'
    case 'import':
      return 'Import Error'
    case 'timeout':
      return 'Execution Timeout'
    case 'kernel':
      return 'Kernel Error'
    default:
      // Try to extract error type from message
      const errorTypeMatch = message.match(/^(\w+Error):/i)
      return errorTypeMatch ? errorTypeMatch[1] : 'Execution Error'
  }
}

/**
 * Extract the main error message from output
 */
function extractErrorMessage(output: string): string {
  const lines = output.split('\n').filter(line => line.trim())
  
  // Look for the last line that looks like an error message
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line.includes('Error:') || line.includes('Exception:')) {
      return line
    }
  }
  
  // If no clear error message, return the last non-empty line
  return lines[lines.length - 1] || 'Unknown error occurred'
}

/**
 * Get suggestion for fixing the error
 */
function getErrorSuggestion(output: string): string | undefined {
  for (const [errorType, suggestion] of Object.entries(ERROR_SUGGESTIONS)) {
    if (output.includes(errorType)) {
      return suggestion
    }
  }
  return undefined
}

/**
 * Check if output contains an error
 */
export function isJupyterError(output: string): boolean {
  if (!output || typeof output !== 'string') {
    return false
  }

  const errorIndicators = [
    'Traceback (most recent call last):',
    'Error:',
    'Exception:',
    'SyntaxError',
    'NameError',
    'TypeError',
    'ValueError',
    'ImportError',
    'ModuleNotFoundError',
    'AttributeError',
    'KeyError',
    'IndexError',
    'ZeroDivisionError',
    'IndentationError',
    'TabError',
    'TimeoutError',
    'Kernel died',
    'Kernel restarting'
  ]

  return errorIndicators.some(indicator => output.includes(indicator))
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(parsedError: ParsedError): {
  title: string
  message: string
  details?: string
  suggestion?: string
} {
  let details = ''
  
  if (parsedError.traceback && parsedError.traceback.length > 0) {
    details = parsedError.traceback.join('\n')
  }
  
  if (parsedError.lineNumber) {
    const location = parsedError.columnNumber 
      ? ` (Line ${parsedError.lineNumber}, Column ${parsedError.columnNumber})`
      : ` (Line ${parsedError.lineNumber})`
    details = details ? `${details}\n\nLocation: ${location}` : `Location: ${location}`
  }

  return {
    title: parsedError.title,
    message: parsedError.message,
    details: details || undefined,
    suggestion: parsedError.suggestion
  }
}