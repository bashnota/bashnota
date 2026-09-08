import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileSystemBackend } from '../fileSystemBackend'
import * as DirectoryStorage from '../directoryHandleStorage'
import { IndexedDBBackend, MemoryBackend, StorageService } from '../storageService'
import { isStorageModeAlreadyActive } from '@/composables/useStorageMode'

describe('storage mode recovery selection', () => {
  it('allows the persisted IndexedDB preference to recover an active memory fallback', () => {
    expect(isStorageModeAlreadyActive('indexeddb', 'memory', 'indexeddb')).toBe(false)
  })

  it('skips a transition only when the requested durable backend is active', () => {
    expect(isStorageModeAlreadyActive('indexeddb', 'indexeddb', 'filesystem')).toBe(true)
    expect(isStorageModeAlreadyActive('filesystem', 'filesystem', 'indexeddb')).toBe(true)
  })

  it('uses the persisted preference before authority resolution', () => {
    expect(isStorageModeAlreadyActive('indexeddb', null, 'indexeddb')).toBe(true)
    expect(isStorageModeAlreadyActive('filesystem', null, 'indexeddb')).toBe(false)
  })
})

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
    delete (window as any).showDirectoryPicker
  })

  afterEach(() => {
    // Restore original indexedDB
    global.indexedDB = originalIndexedDB
    delete (window as any).showDirectoryPicker
    vi.restoreAllMocks()
  })

  it('does not publish a backend while filesystem initialization is delayed', async () => {
    let releaseInitialization!: () => void
    const delayed = new Promise<void>((resolve) => { releaseInitialization = resolve })
    vi.spyOn(FileSystemBackend.prototype, 'isAvailable').mockResolvedValue(true)
    vi.spyOn(FileSystemBackend.prototype, 'initialize').mockImplementation(() => delayed)
    const service = new StorageService()

    const initialization = service.initialize('filesystem')
    await vi.waitFor(() => expect(FileSystemBackend.prototype.initialize).toHaveBeenCalled())

    expect(() => service.getBackendType()).toThrow(/not initialized/i)
    releaseInitialization()
    await initialization
    expect(service.getBackendType()).toBe('filesystem')
  })

  it('reports denied filesystem permission without activating another backend', async () => {
    ;(window as any).showDirectoryPicker = vi.fn()
    vi.spyOn(DirectoryStorage, 'getDirectoryHandle').mockResolvedValue({ name: 'denied' } as FileSystemDirectoryHandle)
    vi.spyOn(DirectoryStorage, 'verifyHandlePermission').mockResolvedValue(false)
    const indexedInitialize = vi.spyOn(IndexedDBBackend.prototype, 'initialize')
    const memoryInitialize = vi.spyOn(MemoryBackend.prototype, 'initialize')
    const service = new StorageService()

    await expect(service.initialize('filesystem')).rejects.toThrow(/Permission denied.*No fallback was activated|No fallback was activated.*Permission denied/)
    expect(() => service.getBackendType()).toThrow(/not initialized/i)
    expect(indexedInitialize).not.toHaveBeenCalled()
    expect(memoryInitialize).not.toHaveBeenCalled()
  })

  it('reports an unavailable persisted handle without activating IndexedDB', async () => {
    ;(window as any).showDirectoryPicker = vi.fn()
    vi.spyOn(DirectoryStorage, 'getDirectoryHandle').mockResolvedValue(null)
    const indexedInitialize = vi.spyOn(IndexedDBBackend.prototype, 'initialize')
    const service = new StorageService()

    await expect(service.initialize('filesystem')).rejects.toThrow(/No directory handle available/)
    expect(indexedInitialize).not.toHaveBeenCalled()
  })

  it('uses memory only as the visible authority when automatic durable selection fails', async () => {
    vi.spyOn(FileSystemBackend, 'hasPersistedHandle').mockResolvedValue(false)
    vi.spyOn(IndexedDBBackend.prototype, 'isAvailable').mockResolvedValue(false)
    const service = new StorageService()

    await service.initialize()

    expect(service.getBackendType()).toBe('memory')
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
    
    // An explicit filesystem selection is an authority choice. If its handle
    // is unavailable, startup must fail instead of opening another library.
    await expect(storageService.initialize('filesystem')).rejects.toThrow(/No fallback was activated/)
    expect(() => storageService.getBackendType()).toThrow(/not initialized/i)
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
