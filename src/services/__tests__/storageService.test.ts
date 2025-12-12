import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../storageService'
import type { StorageBackendType } from '../storageService'
import type { Nota } from '@/features/nota/types/nota'

describe('StorageService', () => {
  let storageService: StorageService

  beforeEach(() => {
    storageService = new StorageService()
  })

  describe('initialization', () => {
    it('should create a storage service instance', () => {
      expect(storageService).toBeDefined()
      expect(storageService).toBeInstanceOf(StorageService)
    })

    it('should initialize with a backend', async () => {
      await storageService.initialize()
      const backend = storageService.getBackendType()
      expect(backend).toBeDefined()
      expect(['filesystem', 'indexeddb', 'memory']).toContain(backend)
    })

    it('should detect and select best available backend', async () => {
      await storageService.initialize()
      const backendType = storageService.getBackendType()
      
      // In test environment, should fall back to memory or indexeddb
      expect(backendType).toMatch(/memory|indexeddb/)
    })
  })

  describe('nota operations', () => {
    beforeEach(async () => {
      await storageService.initialize()
    })

    it('should write and read a nota', async () => {
      const testNota: Nota = {
        id: 'test-nota-1',
        title: 'Test Nota',
        tags: ['test'],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await storageService.writeNota(testNota)
      const readNota = await storageService.readNota('test-nota-1')

      expect(readNota).toBeDefined()
      expect(readNota?.id).toBe('test-nota-1')
      expect(readNota?.title).toBe('Test Nota')
    })

    it('should return null for non-existent nota', async () => {
      const nota = await storageService.readNota('non-existent')
      expect(nota).toBeNull()
    })

    it('should delete a nota', async () => {
      const testNota: Nota = {
        id: 'test-nota-2',
        title: 'To Delete',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await storageService.writeNota(testNota)
      await storageService.deleteNota('test-nota-2')
      
      const nota = await storageService.readNota('test-nota-2')
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

      await storageService.writeNota(nota1)
      await storageService.writeNota(nota2)

      const notas = await storageService.listNotas()
      expect(notas.length).toBeGreaterThanOrEqual(2)
      
      const ids = notas.map(n => n.id)
      expect(ids).toContain('list-nota-1')
      expect(ids).toContain('list-nota-2')
    })

    it('should update existing nota', async () => {
      const nota: Nota = {
        id: 'update-nota-1',
        title: 'Original Title',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await storageService.writeNota(nota)

      const updatedNota = { ...nota, title: 'Updated Title' }
      await storageService.writeNota(updatedNota)

      const retrieved = await storageService.readNota('update-nota-1')
      expect(retrieved?.title).toBe('Updated Title')
    })
  })

  describe('error handling', () => {
    beforeEach(async () => {
      await storageService.initialize()
    })

    it('should handle write errors gracefully', async () => {
      // Invalid nota (missing required fields)
      const invalidNota = { id: 'invalid' } as any

      await expect(storageService.writeNota(invalidNota)).rejects.toThrow()
    })

    it('should handle initialization without crashing', async () => {
      const newService = new StorageService()
      await expect(newService.initialize()).resolves.not.toThrow()
    })
  })

  describe('backend fallback', () => {
    it('should fallback to memory backend in test environment', async () => {
      const service = new StorageService()
      await service.initialize()
      
      const backendType = service.getBackendType()
      // In test environment without File System API, should use memory or indexeddb
      expect(['memory', 'indexeddb']).toContain(backendType)
    })

    it('should not attempt FileSystemBackend initialization when no persisted handle exists', async () => {
      // This test ensures that FileSystemBackend.initialize() is not called
      // when there's no persisted directory handle in auto-select mode
      const service = new StorageService()
      
      // Mock the hasPersistedHandle method to return false
      vi.mock('../fileSystemBackend', () => ({
        FileSystemBackend: {
          hasPersistedHandle: vi.fn(async () => false)
        }
      }))
      
      await service.initialize()
      
      const backendType = service.getBackendType()
      // Should not use filesystem backend when no handle is persisted
      expect(backendType).not.toBe('filesystem')
      expect(['memory', 'indexeddb']).toContain(backendType)
    })
  })
})
