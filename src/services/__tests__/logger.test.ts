import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('Logger', () => {
  let consoleLogSpy: any
  let consoleWarnSpy: any
  let consoleInfoSpy: any
  let consoleErrorSpy: any
  let consoleDebugSpy: any
  let consoleGroupSpy: any
  let consoleGroupEndSpy: any
  let consoleTimeSpy: any
  let consoleTimeEndSpy: any

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {})
    consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('should call console.log in development mode', () => {
      logger.log('test message')
      // In test environment, DEV is true by default
      expect(consoleLogSpy).toHaveBeenCalledWith('test message')
    })

    it('should handle multiple arguments', () => {
      logger.log('message', 123, { key: 'value' })
      expect(consoleLogSpy).toHaveBeenCalledWith('message', 123, { key: 'value' })
    })
  })

  describe('warn', () => {
    it('should call console.warn in development mode', () => {
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')
    })

    it('should handle multiple arguments', () => {
      logger.warn('warning', 'details', { error: 'info' })
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning', 'details', { error: 'info' })
    })
  })

  describe('info', () => {
    it('should call console.info in development mode', () => {
      logger.info('info message')
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message')
    })

    it('should handle multiple arguments', () => {
      logger.info('info', 'additional', 'data')
      expect(consoleInfoSpy).toHaveBeenCalledWith('info', 'additional', 'data')
    })
  })

  describe('error', () => {
    it('should always call console.error', () => {
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message')
    })

    it('should handle error objects', () => {
      const error = new Error('test error')
      logger.error('Error occurred:', error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error)
    })

    it('should handle multiple arguments', () => {
      logger.error('error', 'critical', { code: 500 })
      expect(consoleErrorSpy).toHaveBeenCalledWith('error', 'critical', { code: 500 })
    })
  })

  describe('debug', () => {
    it('should call console.debug with [DEBUG] prefix in development mode', () => {
      logger.debug('debug message')
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'debug message')
    })

    it('should handle multiple arguments', () => {
      logger.debug('debugging', 'value:', 42)
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'debugging', 'value:', 42)
    })
  })

  describe('group', () => {
    it('should call console.group in development mode', () => {
      logger.group('Test Group')
      expect(consoleGroupSpy).toHaveBeenCalledWith('Test Group')
    })
  })

  describe('groupEnd', () => {
    it('should call console.groupEnd in development mode', () => {
      logger.groupEnd()
      expect(consoleGroupEndSpy).toHaveBeenCalled()
    })
  })

  describe('time', () => {
    it('should call console.time in development mode', () => {
      logger.time('operation')
      expect(consoleTimeSpy).toHaveBeenCalledWith('operation')
    })
  })

  describe('timeEnd', () => {
    it('should call console.timeEnd in development mode', () => {
      logger.timeEnd('operation')
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('operation')
    })
  })

  describe('createPrefixedLogger', () => {
    it('should create a prefixed logger', () => {
      const prefixedLogger = logger.createPrefixedLogger('MyComponent')
      expect(prefixedLogger).toBeDefined()
    })

    it('should prefix log messages', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.log('test message')
      expect(consoleLogSpy).toHaveBeenCalledWith('[TestService]', 'test message')
    })

    it('should prefix warn messages', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.warn('warning')
      expect(consoleWarnSpy).toHaveBeenCalledWith('[TestService]', 'warning')
    })

    it('should prefix info messages', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.info('information')
      expect(consoleInfoSpy).toHaveBeenCalledWith('[TestService]', 'information')
    })

    it('should prefix error messages', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.error('error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestService]', 'error')
    })

    it('should prefix debug messages', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.debug('debug info')
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', '[TestService]', 'debug info')
    })

    it('should prefix group labels', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.group('My Group')
      expect(consoleGroupSpy).toHaveBeenCalledWith('[TestService] My Group')
    })

    it('should call groupEnd', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.groupEnd()
      expect(consoleGroupEndSpy).toHaveBeenCalled()
    })

    it('should prefix time labels', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.time('operation')
      expect(consoleTimeSpy).toHaveBeenCalledWith('[TestService] operation')
    })

    it('should prefix timeEnd labels', () => {
      const prefixedLogger = logger.createPrefixedLogger('TestService')
      prefixedLogger.timeEnd('operation')
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('[TestService] operation')
    })

    it('should handle multiple prefixed loggers independently', () => {
      const logger1 = logger.createPrefixedLogger('Service1')
      const logger2 = logger.createPrefixedLogger('Service2')

      logger1.log('from service 1')
      logger2.log('from service 2')

      expect(consoleLogSpy).toHaveBeenCalledWith('[Service1]', 'from service 1')
      expect(consoleLogSpy).toHaveBeenCalledWith('[Service2]', 'from service 2')
    })
  })
})
