import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DatabaseAdapter,
  initializeDatabaseAdapter,
  installDatabaseAdapter,
  runDatabaseAuthorityTransition,
  withNotaPersistence,
} from '../databaseAdapter';
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
    parentId: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
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
      expect(adapter.isUsingNewStorage()).toBe(
        adapter.getStorageService().getBackendType() !== 'indexeddb',
      )
    })

    it('should initialize with new storage enabled', async () => {
      const adapter = await initializeDatabaseAdapter(true)

      expect(adapter.isUsingNewStorage()).toBe(true)
    })

    it('routes automatic memory fallback through memory rather than legacy Dexie', async () => {
      const { db } = await import('@/db')
      const adapter = await initializeDatabaseAdapter(false)
      if (adapter.getStorageService().getBackendType() !== 'memory') return
      vi.mocked(db.notas.put).mockClear()

      await adapter.saveNota(mockNota)

      expect(adapter.isUsingNewStorage()).toBe(true)
      expect(await adapter.getNota(mockNota.id)).toEqual(mockNota)
      expect(db.notas.put).not.toHaveBeenCalledWith(mockNota)
    })
  })

  it('drains an in-flight write and reroutes a write queued during authority replacement', async () => {
    const { db } = await import('@/db')
    vi.clearAllMocks()
    let announceStarted!: () => void
    const started = new Promise<void>((resolve) => { announceStarted = resolve })
    let releaseWrite!: () => void
    const release = new Promise<void>((resolve) => { releaseWrite = resolve })
    vi.mocked(db.notas.put).mockImplementationOnce((async () => {
      announceStarted()
      await release
      return 'test-1'
    }) as any)

    const oldAdapter = new DatabaseAdapter(storage, false)
    installDatabaseAdapter(oldAdapter)
    const firstWrite = oldAdapter.saveNota(mockNota)
    await started

    const newStorage = new StorageService()
    await newStorage.initialize()
    const newAdapter = new DatabaseAdapter(newStorage, true)
    const transition = runDatabaseAuthorityTransition(async () => {
      installDatabaseAdapter(newAdapter)
    })
    await Promise.resolve()
    const queuedWrite = oldAdapter.saveNota({ ...mockNota, id: 'after-switch' })

    releaseWrite()
    await Promise.all([firstWrite, transition, queuedWrite])
    expect(await newStorage.readNota('after-switch')).toEqual(expect.objectContaining({ id: 'after-switch' }))
    expect(db.notas.put).toHaveBeenCalledTimes(1)
  })

  it('drains history work and blocks a later version mutation until migration completes', async () => {
    const events: string[] = []
    let releaseVersion!: () => void
    const versionDeferred = new Promise<void>((resolve) => { releaseVersion = resolve })
    const firstVersion = withNotaPersistence('versioned', async () => {
      events.push('version-1-start')
      await versionDeferred
      events.push('version-1-end')
    })
    await Promise.resolve()

    let releaseMigration!: () => void
    const migrationDeferred = new Promise<void>((resolve) => { releaseMigration = resolve })
    const migration = runDatabaseAuthorityTransition(async () => {
      events.push('migration-start')
      await migrationDeferred
      events.push('migration-end')
    })
    await Promise.resolve()
    const secondVersion = withNotaPersistence('versioned', async () => {
      events.push('version-2')
    })

    releaseVersion()
    await firstVersion
    await vi.waitFor(() => expect(events).toContain('migration-start'))
    expect(events).not.toContain('version-2')
    releaseMigration()
    await Promise.all([migration, secondVersion])
    expect(events).toEqual([
      'version-1-start',
      'version-1-end',
      'migration-start',
      'migration-end',
      'version-2',
    ])
  })
})
