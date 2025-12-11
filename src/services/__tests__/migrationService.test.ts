import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

/**
 * Tests for MigrationService
 * 
 * Handles migration from IndexedDB (Dexie) to FileSystem storage
 */
describe('MigrationService', () => {
  let MigrationService: any
  let mockSourceBackend: any
  let mockTargetBackend: any

  beforeEach(async () => {
    // Mock source backend (IndexedDB)
    const sourceStore = new Map<string, Nota>()
    mockSourceBackend = {
      type: 'indexeddb',
      readNota: vi.fn(async (id: string) => sourceStore.get(id) || null),
      writeNota: vi.fn(),
      deleteNota: vi.fn(),
      listNotas: vi.fn(async () => Array.from(sourceStore.values())),
      initialize: vi.fn(async () => {}),
      isAvailable: vi.fn(async () => true)
    }

    // Mock target backend (FileSystem)
    const targetStore = new Map<string, Nota>()
    mockTargetBackend = {
      type: 'filesystem',
      readNota: vi.fn(async (id: string) => targetStore.get(id) || null),
      writeNota: vi.fn(async (nota: Nota) => { targetStore.set(nota.id, nota) }),
      deleteNota: vi.fn(async (id: string) => { targetStore.delete(id) }),
      listNotas: vi.fn(async () => Array.from(targetStore.values())),
      initialize: vi.fn(async () => {}),
      isAvailable: vi.fn(async () => true)
    }

    // Add test data to source
    for (let i = 0; i < 3; i++) {
      const nota: Nota = {
        id: `migrate-test-${i}`,
        title: `Test Nota ${i}`,
        tags: [`tag${i}`],
        favorite: i === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null
      }
      sourceStore.set(nota.id, nota)
    }

    const module = await import('../migrationService')
    MigrationService = module.MigrationService
  })

  describe('migration process', () => {
    it('should check if migration is needed', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      const needed = await service.needsMigration()
      expect(typeof needed).toBe('boolean')
    })

    it('should migrate all notas from source to target', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      await service.migrate()
      
      // Verify all notas were migrated
      const sourceNotas = await mockSourceBackend.listNotas()
      expect(mockTargetBackend.writeNota).toHaveBeenCalledTimes(sourceNotas.length)
    })

    it('should track migration progress', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      const progressUpdates: any[] = []
      const onProgress = (progress: any) => progressUpdates.push(progress)
      
      await service.migrate({ onProgress })
      
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].current).toBeGreaterThan(0)
    })

    it('should handle empty source database', async () => {
      mockSourceBackend.listNotas = vi.fn(async () => [])
      
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      await service.migrate()
      
      expect(mockTargetBackend.writeNota).not.toHaveBeenCalled()
    })

    it('should verify migration after completion', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      await service.migrate()
      const report = await service.verify()
      
      expect(report.success).toBe(true)
      expect(report.errors).toHaveLength(0)
    })

    it('should handle migration errors gracefully', async () => {
      mockTargetBackend.writeNota = vi.fn(async () => {
        throw new Error('Write failed')
      })
      
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      // Migration should complete but with errors
      await service.migrate()
      
      const report = await service.verify()
      expect(report.errorCount).toBeGreaterThan(0)
      expect(report.success).toBe(false)
    })

    it('should preserve data integrity during migration', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      await service.migrate()
      
      const sourceNotas = await mockSourceBackend.listNotas()
      const targetNotas = await mockTargetBackend.listNotas()
      
      expect(targetNotas).toHaveLength(sourceNotas.length)
      
      // Verify each nota was migrated correctly
      for (const sourceNota of sourceNotas) {
        const targetNota = targetNotas.find(n => n.id === sourceNota.id)
        expect(targetNota).toBeDefined()
        expect(targetNota?.title).toBe(sourceNota.title)
        expect(targetNota?.tags).toEqual(sourceNota.tags)
        expect(targetNota?.favorite).toBe(sourceNota.favorite)
      }
    })
  })

  describe('batch migration', () => {
    it('should support batch size configuration', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      await service.migrate({ batchSize: 2 })
      
      expect(mockTargetBackend.writeNota).toHaveBeenCalled()
    })

    it('should migrate in batches for large datasets', async () => {
      // Add more test data
      const sourceStore = new Map<string, Nota>()
      for (let i = 0; i < 10; i++) {
        const nota: Nota = {
          id: `batch-nota-${i}`,
          title: `Nota ${i}`,
          tags: [],
          favorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          parentId: null
        }
        sourceStore.set(nota.id, nota)
      }
      mockSourceBackend.listNotas = vi.fn(async () => Array.from(sourceStore.values()))
      
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      const progressUpdates: any[] = []
      
      await service.migrate({
        batchSize: 3,
        onProgress: (p: any) => progressUpdates.push(p)
      })
      
      expect(progressUpdates.length).toBeGreaterThan(1)
      expect(mockTargetBackend.writeNota).toHaveBeenCalledTimes(10)
    })
  })

  describe('rollback', () => {
    it('should support rollback functionality', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      await service.migrate()
      
      // Rollback should clear target and restore source state
      await service.rollback()
      
      const targetNotas = await mockTargetBackend.listNotas()
      expect(mockTargetBackend.deleteNota).toHaveBeenCalled()
    })
  })

  describe('progress reporting', () => {
    it('should report migration phases', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      const phases: string[] = []
      await service.migrate({
        onProgress: (p: any) => phases.push(p.phase)
      })
      
      expect(phases).toContain('preparing')
      expect(phases).toContain('migrating')
      expect(phases).toContain('complete')
    })

    it('should report current item being migrated', async () => {
      const service = new MigrationService(mockSourceBackend, mockTargetBackend)
      
      const items: string[] = []
      await service.migrate({
        onProgress: (p: any) => {
          if (p.currentItem) items.push(p.currentItem)
        }
      })
      
      expect(items.length).toBeGreaterThan(0)
    })
  })
})
