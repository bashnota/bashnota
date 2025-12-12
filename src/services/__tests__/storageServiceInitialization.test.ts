import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageService } from '../storageService'

/**
 * Integration test for StorageService initialization behavior
 * 
 * This test verifies that FileSystemBackend is not attempted during auto-select
 * initialization when no persisted directory handle exists, which would cause
 * the "Must be handling a user gesture" error.
 */
describe('StorageService Initialization (Runtime Behavior)', () => {
  let originalIndexedDB: any
  let mockIndexedDB: any

  beforeEach(() => {
    // Save original indexedDB
    originalIndexedDB = global.indexedDB

    // Mock IndexedDB to simulate no persisted directory handle
    mockIndexedDB = {
      open: vi.fn((name: string, version: number) => {
        const request = {
          result: null as any,
          error: null,
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any
        }
        
        setTimeout(() => {
          const db = {
            objectStoreNames: {
              contains: vi.fn(() => true)
            },
            createObjectStore: vi.fn(() => ({})),
            transaction: vi.fn(() => ({
              objectStore: vi.fn(() => ({
                get: vi.fn((key: string) => {
                  const getRequest = {
                    result: null, // No persisted handle
                    onsuccess: null as any,
                    onerror: null as any
                  }
                  setTimeout(() => {
                    if (getRequest.onsuccess) getRequest.onsuccess()
                  }, 0)
                  return getRequest
                })
              })),
              oncomplete: null as any
            })),
            close: vi.fn()
          }
          
          request.result = db
          if (request.onsuccess) {
            request.onsuccess()
          }
        }, 0)
        
        return request
      })
    }
    
    global.indexedDB = mockIndexedDB
  })

  afterEach(() => {
    // Restore original indexedDB
    global.indexedDB = originalIndexedDB
    vi.clearAllMocks()
  })

  it('should initialize without attempting FileSystemBackend when no handle is persisted', async () => {
    const storageService = new StorageService()
    
    // This should succeed without throwing the "Must be handling a user gesture" error
    await expect(storageService.initialize()).resolves.not.toThrow()
    
    const backendType = storageService.getBackendType()
    
    // Should NOT be filesystem since no handle is persisted
    expect(backendType).not.toBe('filesystem')
    
    // Should fall back to memory or indexeddb
    expect(['memory', 'indexeddb']).toContain(backendType)
  })

  it('should only attempt FileSystemBackend when explicitly requested', async () => {
    const storageService = new StorageService()
    
    // When filesystem is explicitly requested and no handle exists, should fail gracefully
    // and fall back to IndexedDB or Memory
    await expect(storageService.initialize('filesystem')).resolves.not.toThrow()
    
    const backendType = storageService.getBackendType()
    
    // Should fall back to a different backend since filesystem was not available
    expect(['memory', 'indexeddb']).toContain(backendType)
  })

  it('should not throw "Must be handling a user gesture" error on app startup', async () => {
    // Simulate the app startup scenario
    const storageService = new StorageService()
    
    // Mock console.error to capture any errors
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    try {
      await storageService.initialize()
      
      // Check that no "user gesture" error was logged
      const errorCalls = consoleErrorSpy.mock.calls
      const hasUserGestureError = errorCalls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('user gesture') || arg.includes('showDirectoryPicker'))
        )
      )
      
      expect(hasUserGestureError).toBe(false)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it('should prefer IndexedDB in auto-select when no filesystem handle exists', async () => {
    const storageService = new StorageService()
    
    await storageService.initialize()
    
    const backendType = storageService.getBackendType()
    
    // In test environment without filesystem handle, should use memory or indexeddb
    expect(['memory', 'indexeddb']).toContain(backendType)
    expect(backendType).not.toBe('filesystem')
  })
})
