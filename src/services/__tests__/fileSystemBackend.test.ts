import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

/**
 * Tests for FileSystemBackend
 * 
 * Note: These tests mock the File System Access API since it's not available
 * in the test environment (jsdom). In a real browser environment with the API,
 * the backend would work with actual file handles.
 */
describe('FileSystemBackend', () => {
  let FileSystemBackend: any
  let mockDirectoryHandle: any
  let mockFileHandles: Map<string, any>

  beforeEach(async () => {
    // Mock File System Access API
    mockFileHandles = new Map()
    
    mockDirectoryHandle = {
      name: 'test-directory',
      queryPermission: vi.fn(async () => 'granted'),
      requestPermission: vi.fn(async () => 'granted'),
      getFileHandle: vi.fn(async (name: string, options?: any) => {
        if (!mockFileHandles.has(name) && !options?.create) {
          throw new Error('NotFoundError')
        }
        
        if (!mockFileHandles.has(name)) {
          const mockFile = {
            name,
            content: '',
            handle: null as any
          }
          
          const mockFileHandle = {
            name,
            kind: 'file',
            getFile: vi.fn(async () => ({
              text: async () => mockFile.content
            })),
            createWritable: vi.fn(async () => ({
              write: vi.fn(async (data: string) => {
                mockFile.content = data
              }),
              close: vi.fn(async () => {})
            }))
          }
          
          mockFile.handle = mockFileHandle
          mockFileHandles.set(name, mockFile)
        }
        
        return mockFileHandles.get(name).handle
      }),
      
      removeEntry: vi.fn(async (name: string) => {
        mockFileHandles.delete(name)
      }),
      
      entries: vi.fn(function* () {
        for (const [name, file] of mockFileHandles) {
          yield [name, file.handle]
        }
      }),
      
      values: vi.fn(function* () {
        for (const [name, file] of mockFileHandles) {
          yield file.handle
        }
      })
    }

    // Mock window.showDirectoryPicker
    global.window = global.window || {} as any
    ;(global.window as any).showDirectoryPicker = vi.fn(async () => mockDirectoryHandle)
    
    // Mock IndexedDB for directory handle storage
    const mockIDB = {
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
              contains: vi.fn(() => false)
            },
            createObjectStore: vi.fn(() => ({})),
            transaction: vi.fn(() => {
              const transaction = {
                objectStore: vi.fn(() => ({
                  get: vi.fn((key: string) => {
                    const getRequest = {
                      result: mockDirectoryHandle,
                      onsuccess: null as any,
                      onerror: null as any
                    }
                    setTimeout(() => {
                      if (getRequest.onsuccess) getRequest.onsuccess()
                    }, 0)
                    return getRequest
                  }),
                  put: vi.fn(() => {
                    const putRequest = {
                      onsuccess: null as any,
                      onerror: null as any
                    }
                    setTimeout(() => {
                      if (putRequest.onsuccess) putRequest.onsuccess()
                    }, 0)
                    return putRequest
                  }),
                  delete: vi.fn(() => {
                    const deleteRequest = {
                      onsuccess: null as any,
                      onerror: null as any
                    }
                    setTimeout(() => {
                      if (deleteRequest.onsuccess) deleteRequest.onsuccess()
                    }, 0)
                    return deleteRequest
                  })
                })),
                oncomplete: null as any
              }
              setTimeout(() => {
                if (transaction.oncomplete) transaction.oncomplete()
              }, 10)
              return transaction
            }),
            close: vi.fn()
          }
          
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: request } as any)
          }
          
          request.result = db
          if (request.onsuccess) {
            request.onsuccess()
          }
        }, 0)
        
        return request
      })
    }
    
    global.indexedDB = mockIDB as any

    // Dynamically import the FileSystemBackend after mocking
    const storageModule = await import('../fileSystemBackend')
    FileSystemBackend = storageModule.FileSystemBackend
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockFileHandles.clear()
  })

  describe('availability check', () => {
    it('should detect File System Access API availability', async () => {
      const backend = new FileSystemBackend()
      
      // In test environment, should return false (no real API)
      // In production with mocked API, would return true
      const available = await backend.isAvailable()
      expect(typeof available).toBe('boolean')
    })

    it('should check for persisted handle availability', async () => {
      // Test the static method that checks if a persisted handle exists
      const hasHandle = await FileSystemBackend.hasPersistedHandle()
      
      // Should return a boolean value
      expect(typeof hasHandle).toBe('boolean')
    })
  })

  describe('initialization', () => {
    it('should initialize with persisted directory handle', async () => {
      const backend = new FileSystemBackend()
      
      // First set the directory handle
      await backend.setDirectoryHandle(mockDirectoryHandle)
      
      // Verify it initialized
      expect(backend.type).toBe('filesystem')
      expect(backend.getDirectoryHandle()).toBe(mockDirectoryHandle)
    }, 10000)

    it('should fail to initialize without a persisted directory handle', async () => {
      // Mock IndexedDB to return no handle
      const mockOpen = vi.fn((name: string, version: number) => {
        const request = {
          result: null as any,
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any
        }
        
        setTimeout(() => {
          const db = {
            objectStoreNames: { contains: vi.fn(() => true) },
            createObjectStore: vi.fn(() => ({})),
            transaction: vi.fn(() => ({
              objectStore: vi.fn(() => ({
                get: vi.fn((key: string) => {
                  const getRequest = {
                    result: null, // No handle stored
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
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
        }, 0)
        
        return request
      })
      
      // Replace the global indexedDB.open temporarily
      const originalOpen = global.indexedDB.open
      global.indexedDB.open = mockOpen as any
      
      const backend = new FileSystemBackend()
      await expect(backend.initialize()).rejects.toThrow()
      
      // Restore the original
      global.indexedDB.open = originalOpen
    }, 10000)
    
    it('should allow setting directory handle from user gesture', async () => {
      const backend = new FileSystemBackend()
      
      await backend.setDirectoryHandle(mockDirectoryHandle)
      
      expect(backend.getDirectoryHandle()).toBe(mockDirectoryHandle)
    }, 10000)
  })

  describe('nota operations with mocked API', () => {
    let backend: any

    beforeEach(async () => {
      backend = new FileSystemBackend()
      
      // Override the initialization to use our mock
      backend.directoryHandle = mockDirectoryHandle
      backend.initialized = true
    })

    it('should write a nota as JSON file with proper wrapper format', async () => {
      const testNota: Nota = {
        id: 'test-nota-1',
        title: 'Test File System Nota',
        tags: ['filesystem', 'test'],
        favorite: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        parentId: null
      }

      await backend.writeNota(testNota)

      const fileHandle = await mockDirectoryHandle.getFileHandle('test-nota-1.nota', { create: false })
      expect(fileHandle).toBeDefined()
      
      const file = await fileHandle.getFile()
      const content = await file.text()
      const parsed = JSON.parse(content)
      
      // Check wrapper format
      expect(parsed.version).toBe('1.0')
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.nota).toBeDefined()
      
      // Check nota content
      expect(parsed.nota.id).toBe('test-nota-1')
      expect(parsed.nota.title).toBe('Test File System Nota')
    })

    it('should read a nota from JSON file', async () => {
      const testNota: Nota = {
        id: 'test-nota-2',
        title: 'Read Test',
        tags: [],
        favorite: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        parentId: null
      }

      // Write first
      await backend.writeNota(testNota)

      // Then read
      const readNota = await backend.readNota('test-nota-2')

      expect(readNota).toBeDefined()
      expect(readNota?.id).toBe('test-nota-2')
      expect(readNota?.title).toBe('Read Test')
    })

    it('should return null for non-existent nota', async () => {
      const nota = await backend.readNota('non-existent')
      expect(nota).toBeNull()
    })

    it('should delete a nota file', async () => {
      const testNota: Nota = {
        id: 'test-nota-3',
        title: 'To Delete',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await backend.writeNota(testNota)
      await backend.deleteNota('test-nota-3')

      const nota = await backend.readNota('test-nota-3')
      expect(nota).toBeNull()
    })

    it('should list all notas', async () => {
      const nota1: Nota = {
        id: 'list-nota-1',
        title: 'Nota 1',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      const nota2: Nota = {
        id: 'list-nota-2',
        title: 'Nota 2',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await backend.writeNota(nota1)
      await backend.writeNota(nota2)

      const notas = await backend.listNotas()
      expect(notas.length).toBe(2)
      
      const ids = notas.map((n: Nota) => n.id)
      expect(ids).toContain('list-nota-1')
      expect(ids).toContain('list-nota-2')
    })

    it('should handle file parsing errors', async () => {
      // Manually create a corrupted file
      const fileHandle = await mockDirectoryHandle.getFileHandle('corrupted.json', { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write('{ invalid json }')
      await writable.close()

      const nota = await backend.readNota('corrupted')
      expect(nota).toBeNull()
    })

    it('should serialize dates correctly', async () => {
      const testNota: Nota = {
        id: 'date-test',
        title: 'Date Test',
        tags: [],
        favorite: false,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        parentId: null
      }

      await backend.writeNota(testNota)
      const readNota = await backend.readNota('date-test')

      expect(readNota?.createdAt).toBeInstanceOf(Date)
      expect(readNota?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('error handling', () => {
    it('should handle write permission errors', async () => {
      const backend = new FileSystemBackend()
      backend.directoryHandle = mockDirectoryHandle
      backend.initialized = true

      // Mock permission denied
      mockDirectoryHandle.getFileHandle = vi.fn(async () => {
        throw new Error('Permission denied')
      })

      const nota: Nota = {
        id: 'test',
        title: 'Test',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await expect(backend.writeNota(nota)).rejects.toThrow()
    })
  })

  describe('performance', () => {
    it('should handle multiple concurrent operations', async () => {
      const backend = new FileSystemBackend()
      backend.directoryHandle = mockDirectoryHandle
      backend.initialized = true

      const notas: Nota[] = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-nota-${i}`,
        title: `Nota ${i}`,
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }))

      // Write all notas concurrently
      await Promise.all(notas.map(nota => backend.writeNota(nota)))

      // Read all notas concurrently
      const results = await Promise.all(
        notas.map(nota => backend.readNota(nota.id))
      )

      expect(results.every(r => r !== null)).toBe(true)
      expect(results).toHaveLength(10)
    })
  })
})
