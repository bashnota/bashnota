import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseAdapter, initializeDatabaseAdapter, useDatabaseAdapter } from '../databaseAdapter'
import { StorageService } from '../storageService'
import type { Nota } from '@/features/nota/types/nota'

// Mock the db module
vi.mock('@/db', () => ({
  db: {
    notas: {
      get: vi.fn(),
      toArray: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      bulkPut: vi.fn()
    }
  }
}))

describe('DatabaseAdapter', () => {
  let adapter: DatabaseAdapter
  let storage: StorageService

  const mockNota: Nota = {
    id: 'test-1',
    title: 'Test Nota',
    content: 'Test content',
    createdAt: new Date(),
    updatedAt: new Date(),
    blocks: []
  }

  beforeEach(async () => {
    storage = new StorageService()
    await storage.initialize()
    adapter = new DatabaseAdapter(storage, false)
  })

  describe('with old storage (Dexie)', () => {
    it('should get nota from Dexie', async () => {
      const { db } = await import('@/db')
      vi.mocked(db.notas.get).mockResolvedValue(mockNota)

      const result = await adapter.getNota('test-1')

      expect(result).toEqual(mockNota)
      expect(db.notas.get).toHaveBeenCalledWith('test-1')
    })

    it('should get all notas from Dexie', async () => {
      const { db } = await import('@/db')
      vi.mocked(db.notas.toArray).mockResolvedValue([mockNota])

      const result = await adapter.getAllNotas()

      expect(result).toEqual([mockNota])
      expect(db.notas.toArray).toHaveBeenCalled()
    })

    it('should save nota to Dexie', async () => {
      const { db } = await import('@/db')

      await adapter.saveNota(mockNota)

      expect(db.notas.put).toHaveBeenCalledWith(mockNota)
    })

    it('should delete nota from Dexie', async () => {
      const { db } = await import('@/db')

      await adapter.deleteNota('test-1')

      expect(db.notas.delete).toHaveBeenCalledWith('test-1')
    })

    it('should save multiple notas to Dexie', async () => {
      const { db } = await import('@/db')
      const notas = [mockNota]

      await adapter.saveNotas(notas)

      expect(db.notas.bulkPut).toHaveBeenCalledWith(notas)
    })
  })

  describe('with new storage', () => {
    beforeEach(() => {
      adapter.setUseNewStorage(true)
    })

    it('should get nota from new storage', async () => {
      await storage.writeNota(mockNota)

      const result = await adapter.getNota('test-1')

      expect(result).toEqual(mockNota)
    })

    it('should get all notas from new storage', async () => {
      await storage.writeNota(mockNota)

      const result = await adapter.getAllNotas()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockNota)
    })

    it('should save nota to new storage', async () => {
      await adapter.saveNota(mockNota)

      const result = await storage.readNota('test-1')
      expect(result).toEqual(mockNota)
    })

    it('should delete nota from new storage', async () => {
      await storage.writeNota(mockNota)
      await adapter.deleteNota('test-1')

      const result = await storage.readNota('test-1')
      expect(result).toBeNull()
    })

    it('should save multiple notas to new storage', async () => {
      const nota2: Nota = { ...mockNota, id: 'test-2', title: 'Test Nota 2' }
      await adapter.saveNotas([mockNota, nota2])

      const notas = await storage.listNotas()
      expect(notas).toHaveLength(2)
    })
  })

  describe('feature flag management', () => {
    it('should toggle between old and new storage', async () => {
      expect(adapter.isUsingNewStorage()).toBe(false)

      adapter.setUseNewStorage(true)
      expect(adapter.isUsingNewStorage()).toBe(true)

      adapter.setUseNewStorage(false)
      expect(adapter.isUsingNewStorage()).toBe(false)
    })

    it('should provide access to underlying storage service', () => {
      const service = adapter.getStorageService()
      expect(service).toBeInstanceOf(StorageService)
    })
  })

  describe('initialization', () => {
    it('should initialize database adapter', async () => {
      const adapter = await initializeDatabaseAdapter(false)

      expect(adapter).toBeInstanceOf(DatabaseAdapter)
      expect(adapter.isUsingNewStorage()).toBe(false)
    })

    it('should initialize with new storage enabled', async () => {
      const adapter = await initializeDatabaseAdapter(true)

      expect(adapter.isUsingNewStorage()).toBe(true)
    })
  })
})
