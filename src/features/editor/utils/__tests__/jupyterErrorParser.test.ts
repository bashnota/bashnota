import { describe, it, expect } from 'vitest'
import {
  parseJupyterError,
  isJupyterError,
  formatErrorForDisplay,
  type ParsedError
} from '../jupyterErrorParser'

describe('jupyterErrorParser', () => {
  describe('isJupyterError', () => {
    it('should return true for SyntaxError', () => {
      const output = 'SyntaxError: invalid syntax'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for NameError', () => {
      const output = 'NameError: name "x" is not defined'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for traceback', () => {
      const output = 'Traceback (most recent call last):\n  File "<stdin>", line 1'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for TypeError', () => {
      const output = 'TypeError: unsupported operand type(s)'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for ValueError', () => {
      const output = 'ValueError: invalid literal for int()'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for ImportError', () => {
      const output = 'ImportError: No module named pandas'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for ModuleNotFoundError', () => {
      const output = 'ModuleNotFoundError: No module named "numpy"'
      expect(isJupyterError(output)).toBe(true)
    })

    it('should return true for kernel errors', () => {
      expect(isJupyterError('Kernel died')).toBe(true)
      expect(isJupyterError('Kernel restarting')).toBe(true)
    })

    it('should return false for normal output', () => {
      const output = 'Hello, world!'
      expect(isJupyterError(output)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isJupyterError('')).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isJupyterError(null as any)).toBe(false)
      expect(isJupyterError(undefined as any)).toBe(false)
    })

    it('should return false for success messages', () => {
      const output = 'Execution completed successfully'
      expect(isJupyterError(output)).toBe(false)
    })
  })

  describe('parseJupyterError', () => {
    it('should parse SyntaxError correctly', () => {
      const output = 'SyntaxError: invalid syntax'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('syntax')
      expect(result.title).toBe('Syntax Error')
      expect(result.message).toContain('invalid syntax')
      expect(result.suggestion).toBeDefined()
    })

    it('should parse NameError correctly', () => {
      const output = 'NameError: name "x" is not defined'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.title).toBe('Runtime Error')
      expect(result.message).toContain('not defined')
      expect(result.suggestion).toContain('variable is defined')
    })

    it('should parse IndentationError correctly', () => {
      const output = 'IndentationError: expected an indented block'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('syntax')
      expect(result.title).toBe('Syntax Error')
      expect(result.message).toContain('indented block')
    })

    it('should parse TypeError correctly', () => {
      const output = 'TypeError: unsupported operand type(s) for +: "int" and "str"'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.message).toContain('unsupported operand')
      expect(result.suggestion).toContain('data types')
    })

    it('should parse ImportError correctly', () => {
      const output = 'ImportError: No module named pandas'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('import')
      expect(result.title).toBe('Import Error')
      expect(result.message).toContain('pandas')
    })

    it('should parse ModuleNotFoundError correctly', () => {
      const output = 'ModuleNotFoundError: No module named "numpy"'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('import')
      expect(result.title).toBe('Import Error')
      expect(result.suggestion).toContain('pip install')
    })

    it('should extract line numbers', () => {
      const output = 'SyntaxError: invalid syntax at line 5'
      const result = parseJupyterError(output)
      
      expect(result.lineNumber).toBe(5)
    })

    it('should extract line and column numbers', () => {
      const output = 'SyntaxError: invalid syntax at line 10, column 3'
      const result = parseJupyterError(output)
      
      expect(result.lineNumber).toBe(10)
      expect(result.columnNumber).toBe(3)
    })

    it('should extract traceback', () => {
      const output = `Traceback (most recent call last):
  File "test.py", line 2, in <module>
    result = 10 / 0
ZeroDivisionError: division by zero`
      
      const result = parseJupyterError(output)
      
      expect(result.traceback).toBeDefined()
      expect(result.traceback!.length).toBeGreaterThan(0)
      expect(result.type).toBe('runtime')
    })

    it('should handle unknown error types', () => {
      const output = 'Some random error message'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('unknown')
      // When unknown, the title is extracted from the message or defaults to 'Execution Error'
      expect(result.title).toContain('Error')
    })

    it('should handle empty string', () => {
      const result = parseJupyterError('')
      
      expect(result.type).toBe('unknown')
      expect(result.title).toBe('Unknown Error')
    })

    it('should handle null input', () => {
      const result = parseJupyterError(null as any)
      
      expect(result.type).toBe('unknown')
      expect(result.originalError).toBe('')
    })

    it('should parse ZeroDivisionError correctly', () => {
      const output = 'ZeroDivisionError: division by zero'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.message).toContain('division by zero')
      expect(result.suggestion).toContain('Cannot divide by zero')
    })

    it('should parse AttributeError correctly', () => {
      const output = 'AttributeError: "list" object has no attribute "append_all"'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.suggestion).toContain('attribute')
    })

    it('should parse KeyError correctly', () => {
      const output = 'KeyError: "missing_key"'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.suggestion).toContain('key exists')
    })

    it('should parse IndexError correctly', () => {
      const output = 'IndexError: list index out of range'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.suggestion).toContain('index is within')
    })

    it('should parse kernel errors', () => {
      const output = 'Kernel died, restarting'
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('timeout')
      expect(result.title).toBe('Execution Timeout')
    })

    it('should preserve original error', () => {
      const output = 'SyntaxError: test'
      const result = parseJupyterError(output)
      
      expect(result.originalError).toBe(output)
    })

    it('should handle complex traceback', () => {
      const output = `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
  File "/usr/lib/python3/test.py", line 10, in function_a
    return function_b()
  File "/usr/lib/python3/test.py", line 15, in function_b
    raise ValueError("Invalid value")
ValueError: Invalid value`
      
      const result = parseJupyterError(output)
      
      expect(result.type).toBe('runtime')
      expect(result.traceback!.length).toBeGreaterThan(0)
      expect(result.message).toContain('Invalid value')
    })
  })

  describe('formatErrorForDisplay', () => {
    it('should format basic error', () => {
      const parsedError: ParsedError = {
        type: 'syntax',
        title: 'Syntax Error',
        message: 'invalid syntax',
        originalError: 'SyntaxError: invalid syntax'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.title).toBe('Syntax Error')
      expect(result.message).toBe('invalid syntax')
    })

    it('should include suggestion when available', () => {
      const parsedError: ParsedError = {
        type: 'syntax',
        title: 'Syntax Error',
        message: 'invalid syntax',
        suggestion: 'Check your code syntax',
        originalError: 'SyntaxError: invalid syntax'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.suggestion).toBe('Check your code syntax')
    })

    it('should format traceback as details', () => {
      const parsedError: ParsedError = {
        type: 'runtime',
        title: 'Runtime Error',
        message: 'division by zero',
        traceback: ['Line 1: x = 10', 'Line 2: y = x / 0'],
        originalError: 'ZeroDivisionError'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.details).toContain('Line 1: x = 10')
      expect(result.details).toContain('Line 2: y = x / 0')
    })

    it('should include line number in details', () => {
      const parsedError: ParsedError = {
        type: 'syntax',
        title: 'Syntax Error',
        message: 'invalid syntax',
        lineNumber: 5,
        originalError: 'SyntaxError'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.details).toContain('Line 5')
    })

    it('should include line and column numbers in details', () => {
      const parsedError: ParsedError = {
        type: 'syntax',
        title: 'Syntax Error',
        message: 'invalid syntax',
        lineNumber: 5,
        columnNumber: 10,
        originalError: 'SyntaxError'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.details).toContain('Line 5')
      expect(result.details).toContain('Column 10')
    })

    it('should combine traceback and location', () => {
      const parsedError: ParsedError = {
        type: 'runtime',
        title: 'Runtime Error',
        message: 'error',
        traceback: ['traceback line 1'],
        lineNumber: 3,
        originalError: 'Error'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.details).toContain('traceback line 1')
      expect(result.details).toContain('Location')
      expect(result.details).toContain('Line 3')
    })

    it('should handle error without traceback or location', () => {
      const parsedError: ParsedError = {
        type: 'unknown',
        title: 'Unknown Error',
        message: 'something went wrong',
        originalError: 'Error'
      }
      
      const result = formatErrorForDisplay(parsedError)
      
      expect(result.title).toBe('Unknown Error')
      expect(result.message).toBe('something went wrong')
      expect(result.details).toBeUndefined()
    })
  })
})
