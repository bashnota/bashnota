import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

/**
 * Tests for CachedStorageService
 * 
 * Adds caching layer on top of StorageService for improved performance
 */
describe('CachedStorageService', () => {
  let CachedStorageService: any
  let mockBackend: any

  beforeEach(async () => {
    // Create mock backend
    const notaStore = new Map<string, Nota>()
    
    mockBackend = {
      type: 'memory',
      readNota: vi.fn(async (id: string) => notaStore.get(id) || null),
      writeNota: vi.fn(async (nota: Nota) => { notaStore.set(nota.id, nota) }),
      deleteNota: vi.fn(async (id: string) => { notaStore.delete(id) }),
      listNotas: vi.fn(async () => Array.from(notaStore.values())),
      initialize: vi.fn(async () => {}),
      isAvailable: vi.fn(async () => true)
    }

    // Import CachedStorageService
    const module = await import('../cachedStorageService')
    CachedStorageService = module.CachedStorageService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('caching behavior', () => {
    it('should cache nota reads', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'cache-test-1',
        title: 'Cache Test',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await mockBackend.writeNota(nota)

      // First read - should hit backend
      await service.readNota('cache-test-1')
      expect(mockBackend.readNota).toHaveBeenCalledTimes(1)

      // Second read - should use cache
      await service.readNota('cache-test-1')
      expect(mockBackend.readNota).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should invalidate cache on write', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'cache-test-2',
        title: 'Original',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await service.writeNota(nota)
      await service.readNota('cache-test-2')
      
      // Update the nota
      const updated = { ...nota, title: 'Updated' }
      await service.writeNota(updated)
      
      // Next read should get updated version
      const result = await service.readNota('cache-test-2')
      expect(result?.title).toBe('Updated')
    })

    it('should invalidate cache on delete', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'cache-test-3',
        title: 'To Delete',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await service.writeNota(nota)
      await service.readNota('cache-test-3') // Cache it
      
      await service.deleteNota('cache-test-3')
      
      const result = await service.readNota('cache-test-3')
      expect(result).toBeNull()
    })

    it('should respect cache size limit', async () => {
      const service = new CachedStorageService(mockBackend, { maxSize: 3 })
      
      // Add 4 notas (exceeds limit)
      for (let i = 0; i < 4; i++) {
        const nota: Nota = {
          id: `cache-limit-${i}`,
          title: `Nota ${i}`,
          tags: [],
          favorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null
        }
        await service.writeNota(nota)
        await service.readNota(`cache-limit-${i}`)
      }

      // Cache should only have 3 items (most recent)
      const stats = service.getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(3)
    })

    it('should provide cache statistics', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'stats-test',
        title: 'Stats',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await service.writeNota(nota)
      
      // Read twice
      await service.readNota('stats-test')
      await service.readNota('stats-test')
      
      // Read non-existent
      await service.readNota('non-existent')

      const stats = service.getCacheStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.misses).toBeGreaterThan(0)
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should allow manual cache clear', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'clear-test',
        title: 'Clear',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      await service.writeNota(nota)
      await service.readNota('clear-test') // Cache it
      
      service.clearCache()
      
      const stats = service.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('batch operations', () => {
    it('should support batch write operations', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const notas: Nota[] = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-write-${i}`,
        title: `Nota ${i}`,
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }))

      await service.writeMany(notas)
      
      expect(mockBackend.writeNota).toHaveBeenCalledTimes(5)
    })

    it('should support batch read operations', async () => {
      const service = new CachedStorageService(mockBackend)
      
      // Write some notas first
      for (let i = 0; i < 3; i++) {
        const nota: Nota = {
          id: `batch-read-${i}`,
          title: `Nota ${i}`,
          tags: [],
          favorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null
        }
        await service.writeNota(nota)
      }

      const ids = ['batch-read-0', 'batch-read-1', 'batch-read-2']
      const results = await service.readMany(ids)
      
      expect(results).toHaveLength(3)
      expect(results.every(r => r !== null)).toBe(true)
    })

    it('should handle partial batch read failures', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'batch-partial-1',
        title: 'Exists',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }
      await service.writeNota(nota)

      const ids = ['batch-partial-1', 'non-existent', 'also-non-existent']
      const results = await service.readMany(ids)
      
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).toBeNull()
      expect(results[2]).toBeNull()
    })
  })

  describe('performance', () => {
    it('should improve read performance with cache', async () => {
      const service = new CachedStorageService(mockBackend)
      
      const nota: Nota = {
        id: 'perf-test',
        title: 'Performance',
        tags: [],
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }

      // First write the nota to backend directly (bypassing cache)
      await mockBackend.writeNota(nota)

      // Now read through the service - this should call backend once
      await service.readNota('perf-test')
      expect(mockBackend.readNota).toHaveBeenCalledTimes(1)
      
      const start = Date.now()
      for (let i = 0; i < 100; i++) {
        await service.readNota('perf-test')
      }
      const duration = Date.now() - start

      // Should be very fast (cached reads)
      expect(duration).toBeLessThan(50) // 50ms for 100 reads
      expect(mockBackend.readNota).toHaveBeenCalledTimes(1) // Still only 1 call to backend
    })
  })
})
