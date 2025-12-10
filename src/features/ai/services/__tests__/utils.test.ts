import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { handleApiError, DEFAULT_RETRY_CONFIG } from '../utils'

// Mock axios
vi.mock('axios', () => ({
  default: {
    isAxiosError: vi.fn(),
  },
}))

// Mock logger
vi.mock('@/services/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AI services utils', () => {
  describe('handleApiError', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should handle 400 Bad Request error', () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid request' } },
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toBe('TestProvider API error: Invalid request')
    })

    it('should handle 400 error without message', () => {
      const mockError = {
        response: {
          status: 400,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider API error: Bad request')
    })

    it('should handle 401 Unauthorized error', () => {
      const mockError = {
        response: {
          status: 401,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider API error: Unauthorized - check your API key')
    })

    it('should handle 403 Forbidden error', () => {
      const mockError = {
        response: {
          status: 403,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider API error: Forbidden - lacking permissions')
    })

    it('should handle 404 Not Found error', () => {
      const mockError = {
        response: {
          status: 404,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider resource not found. Check your configuration.')
    })

    it('should handle 429 Rate Limit error', () => {
      const mockError = {
        response: {
          status: 429,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider API rate limit exceeded. Please try again later.')
    })

    it('should handle 500 Internal Server Error', () => {
      const mockError = {
        response: {
          status: 500,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider server error. Please try again later.')
    })

    it('should handle 502 Bad Gateway error', () => {
      const mockError = {
        response: {
          status: 502,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider server error. Please try again later.')
    })

    it('should handle 503 Service Unavailable error', () => {
      const mockError = {
        response: {
          status: 503,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider server error. Please try again later.')
    })

    it('should handle 504 Gateway Timeout error', () => {
      const mockError = {
        response: {
          status: 504,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toBe('TestProvider server error. Please try again later.')
    })

    it('should handle other HTTP status codes', () => {
      const mockError = {
        response: {
          status: 418,
          data: { error: { message: "I'm a teapot" } },
        },
        message: 'Unexpected error',
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result.message).toContain('TestProvider API error: 418')
      expect(result.message).toContain("I'm a teapot")
    })

    it('should handle non-axios errors', () => {
      const mockError = new Error('Generic error')
      
      vi.mocked(axios.isAxiosError).mockReturnValue(false)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result).toBe(mockError)
    })

    it('should handle unknown errors', () => {
      const mockError = { something: 'unknown' }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(false)
      
      const result = handleApiError(mockError, 'TestProvider')
      
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toContain('Unknown TestProvider error')
    })

    it('should use provider name in error messages', () => {
      const mockError = {
        response: {
          status: 401,
          data: {},
        },
      }
      
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = handleApiError(mockError, 'CustomProvider')
      
      expect(result.message).toContain('CustomProvider')
    })
  })

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3)
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000)
      expect(DEFAULT_RETRY_CONFIG.shouldRetry).toBeDefined()
    })

    it('shouldRetry should return true for ECONNABORTED', () => {
      const error = { code: 'ECONNABORTED' }
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = DEFAULT_RETRY_CONFIG.shouldRetry!(error)
      expect(result).toBe(true)
    })

    it('shouldRetry should return true for ETIMEDOUT', () => {
      const error = { code: 'ETIMEDOUT' }
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = DEFAULT_RETRY_CONFIG.shouldRetry!(error)
      expect(result).toBe(true)
    })

    it('shouldRetry should return true for 429 status', () => {
      const error = { response: { status: 429 } }
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = DEFAULT_RETRY_CONFIG.shouldRetry!(error)
      expect(result).toBe(true)
    })

    it('shouldRetry should return false for other errors', () => {
      const error = { response: { status: 500 } }
      vi.mocked(axios.isAxiosError).mockReturnValue(true)
      
      const result = DEFAULT_RETRY_CONFIG.shouldRetry!(error)
      expect(result).toBe(false)
    })

    it('shouldRetry should return false for non-axios errors', () => {
      const error = new Error('Generic error')
      vi.mocked(axios.isAxiosError).mockReturnValue(false)
      
      const result = DEFAULT_RETRY_CONFIG.shouldRetry!(error)
      expect(result).toBe(false)
    })
  })
})
