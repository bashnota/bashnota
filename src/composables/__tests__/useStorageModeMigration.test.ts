import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import type { Nota } from '@/features/nota/types/nota'

const state = vi.hoisted(() => ({
  failWrite: false,
  restored: false,
  target: new Map<string, Nota>(),
  targetDocuments: new Map<string, any>(),
  filesystemNotas: [] as Nota[],
  verificationMismatch: false,
  installedKind: 'indexeddb',
  liveWrites: [] as Array<{ kind: string; notaId: string }>,
  corruptTargetContent: false,
  corruptIndexedContent: false,
  sourceKind: 'indexeddb' as 'filesystem' | 'indexeddb' | 'memory',
  restoredCanonicalIds: [] as string[],
}))

vi.mock('@/features/nota/services/versionHistoryPersistence', () => ({
  captureCanonicalContent: async () => ({
    format: 'normalized-blocks-v1',
    blockOrder: state.corruptIndexedContent ? ['text:corrupt'] : [],
    blocks: state.corruptIndexedContent ? [{ id: 'corrupt', type: 'text' }] : [],
    structureVersion: 1,
    capturedAt: '2026-08-26T12:00:00.000Z',
  }),
  restoreCanonicalContent: async (notaId: string) => { state.restoredCanonicalIds.push(notaId) },
}))

vi.mock('@/services/fileSystemBackend', () => ({
  FileSystemBackend: class {
    async setDirectoryHandle() {}
    async initialize() {}
    async snapshotDirectory() { return new Map([['existing.nota', 'before']]) }
    async restoreDirectory() { state.restored = true; state.target.clear(); state.targetDocuments.clear() }
    async createNotaDocument(nota: Nota) {
      return {
        format: 'bashnota-filesystem-nota', version: 2, exportedAt: '2026-08-26T12:00:00.000Z',
        nota: structuredClone(nota),
        canonicalContent: {
          format: 'normalized-blocks-v1', blockOrder: [], blocks: [], structureVersion: 1,
          capturedAt: '2026-08-26T12:00:00.000Z',
        },
      }
    }
    async writeNotaDocument(document: any) {
      await this.writeNota(document.nota)
      state.targetDocuments.set(document.nota.id, structuredClone(document))
    }
    async writeNota(nota: Nota) {
      if (state.failWrite && nota.id === 'child') throw new Error('injected migration write failure')
      state.target.set(nota.id, structuredClone(nota))
    }
    async listNotas() {
      const notas = [...state.target.values()].map((nota) => structuredClone(nota))
      return state.verificationMismatch ? notas.filter((nota) => nota.id !== 'child') : notas
    }
    async listNotaDocuments() {
      const documents = [...state.targetDocuments.values()].map((document) => structuredClone(document))
      const verified = state.verificationMismatch
        ? documents.filter((document) => document.nota.id !== 'child')
        : documents
      if (state.corruptTargetContent) {
        const childDocument = verified.find((document) => document.nota.id === 'child')
        if (childDocument) childDocument.nota.title = 'silently corrupted'
      }
      return verified
    }
    async readNotaDocument(id: string) {
      const document = structuredClone(state.targetDocuments.get(id))
      if (state.corruptTargetContent && id === 'child') document.nota.title = 'silently corrupted'
      return document
    }
  },
}))

vi.mock('@/services/databaseAdapter', () => ({
  useDatabaseAdapter: () => ({
    getAllNotas: async () => state.sourceKind === 'indexeddb'
      ? db.notas.toArray()
      : structuredClone(state.filesystemNotas),
    getStorageService: () => ({
      getBackendType: () => state.sourceKind,
      getBackend: () => ({
        listNotaDocuments: async () => state.filesystemNotas.map((nota) => ({
          format: 'bashnota-filesystem-nota', version: 2, exportedAt: '2026-08-26T12:00:00.000Z',
          nota: structuredClone(nota),
          canonicalContent: {
            format: 'normalized-blocks-v1', blockOrder: [], blocks: [], structureVersion: 1,
            capturedAt: '2025-01-01T00:00:00.000Z',
          },
        })),
        readNotaDocument: async (id: string) => ({
          format: 'bashnota-filesystem-nota', version: 2, exportedAt: '2026-08-26T12:00:00.000Z',
          nota: structuredClone(state.filesystemNotas.find((nota) => nota.id === id)),
          canonicalContent: {
            format: 'normalized-blocks-v1', blockOrder: [], blocks: [], structureVersion: 1,
            // Capture time is provenance, not document semantics. A real
            // reverse migration always recaptures at a later instant.
            capturedAt: '2025-01-01T00:00:00.000Z',
          },
        }),
      }),
    }),
    saveNota: async (nota: Nota) => {
      state.liveWrites.push({ kind: state.installedKind, notaId: nota.id })
    },
  }),
  createDatabaseAdapterForBackend: () => ({ kind: 'filesystem' }),
  createDatabaseAdapter: async () => ({ kind: 'indexeddb' }),
  installDatabaseAdapter: (adapter: { kind: string }) => { state.installedKind = adapter.kind },
  runDatabaseAuthorityTransition: async (transition: () => Promise<unknown>) => transition(),
}))

const timestamp = new Date('2026-08-26T12:00:00.000Z')
const root: Nota = { id: 'root', title: 'Root', parentId: null, tags: [], createdAt: timestamp, updatedAt: timestamp }
const child: Nota = { id: 'child', title: 'Child', parentId: 'root', tags: [], createdAt: timestamp, updatedAt: timestamp }

async function storageMode() {
  vi.resetModules()
  return (await import('@/composables/useStorageMode')).useStorageMode()
}

describe('verified storage authority switching', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'indexeddb', autoWatch: true }))
    state.failWrite = false
    state.restored = false
    state.target.clear()
    state.targetDocuments.clear()
    state.filesystemNotas = []
    state.verificationMismatch = false
    state.installedKind = 'indexeddb'
    state.liveWrites = []
    state.corruptTargetContent = false
    state.corruptIndexedContent = false
    state.sourceKind = 'indexeddb'
    state.restoredCanonicalIds = []
    vi.stubGlobal('showDirectoryPicker', async () => ({}))
    Object.defineProperty(window, 'showDirectoryPicker', { configurable: true, value: async () => ({}) })
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    db.close()
    await db.delete()
  })

  it('does not change authority and compensates the target when a filesystem write fails', async () => {
    await db.notas.bulkPut([root, child])
    state.failWrite = true
    const mode = await storageMode()

    await expect(mode.switchToFilesystem({} as FileSystemDirectoryHandle)).rejects.toThrow('injected migration')
    expect(state.restored).toBe(true)
    expect(mode.storageMode.value).toBe('indexeddb')
    expect(JSON.parse(localStorage.getItem('bashnota-storage-mode')!).mode).toBe('indexeddb')
    expect((await db.notas.toArray()).map((nota) => nota.id).sort()).toEqual(['child', 'root'])
  })

  it('changes to filesystem only after hierarchy verification succeeds', async () => {
    await db.notas.bulkPut([root, child])
    const mode = await storageMode()

    await mode.switchToFilesystem({} as FileSystemDirectoryHandle)
    expect(mode.storageMode.value).toBe('filesystem')
    expect([...state.target.values()].map(({ id, parentId }) => ({ id, parentId }))).toEqual([
      { id: 'child', parentId: 'root' },
      { id: 'root', parentId: null },
    ])
    expect(state.installedKind).toBe('filesystem')
    const { useDatabaseAdapter } = await import('@/services/databaseAdapter')
    await useDatabaseAdapter().saveNota({ ...root, id: 'post-switch' })
    expect(state.liveWrites).toEqual([{ kind: 'filesystem', notaId: 'post-switch' }])
  })

  it('migrates memory-authoritative notas to filesystem instead of reading stale Dexie rows', async () => {
    await db.notas.put({ ...root, id: 'stale', title: 'Stale IndexedDB nota' })
    state.sourceKind = 'memory'
    state.filesystemNotas = [root, child]
    state.installedKind = 'memory'
    const mode = await storageMode()

    await mode.switchToFilesystem({} as FileSystemDirectoryHandle)

    expect([...state.target.keys()].sort()).toEqual(['child', 'root'])
    expect(state.target.has('stale')).toBe(false)
    expect(state.installedKind).toBe('filesystem')
  })

  it('compensates the target and keeps the live adapter when verification fails', async () => {
    await db.notas.bulkPut([root, child])
    state.verificationMismatch = true
    const mode = await storageMode()

    await expect(mode.switchToFilesystem({} as FileSystemDirectoryHandle)).rejects.toThrow('verification failed')
    expect(state.restored).toBe(true)
    expect(state.installedKind).toBe('indexeddb')
    const { useDatabaseAdapter } = await import('@/services/databaseAdapter')
    await useDatabaseAdapter().saveNota({ ...root, id: 'post-switch' })
    expect(state.liveWrites).toEqual([{ kind: 'indexeddb', notaId: 'post-switch' }])
    expect(mode.storageMode.value).toBe('indexeddb')
    expect(JSON.parse(localStorage.getItem('bashnota-storage-mode')!).mode).toBe('indexeddb')
  })

  it('rejects silent canonical document corruption before changing authority', async () => {
    await db.notas.bulkPut([root, child])
    state.corruptTargetContent = true
    const mode = await storageMode()

    await expect(mode.switchToFilesystem({} as FileSystemDirectoryHandle)).rejects.toThrow('content verification')
    expect(state.restored).toBe(true)
    expect(state.installedKind).toBe('indexeddb')
    expect(mode.storageMode.value).toBe('indexeddb')
  })

  it('atomically replaces IndexedDB metadata before changing back from filesystem', async () => {
    await db.notas.put({ ...root, id: 'stale', title: 'Stale' })
    state.filesystemNotas = [root, child]
    state.sourceKind = 'filesystem'
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'filesystem', autoWatch: true }))
    state.installedKind = 'filesystem'
    const mode = await storageMode()

    await mode.switchToIndexedDB()
    expect(mode.storageMode.value).toBe('indexeddb')
    expect(state.installedKind).toBe('indexeddb')
    expect((await db.notas.toArray()).map((nota) => nota.id).sort()).toEqual(['child', 'root'])
    expect(state.restoredCanonicalIds.sort()).toEqual(['child', 'root'])
  })

  it('merges memory recovery into IndexedDB without deleting durable rows', async () => {
    await db.notas.bulkPut([
      { ...root, title: 'Older durable title' },
      { ...root, id: 'durable-only', title: 'Durable only' },
    ])
    state.sourceKind = 'memory'
    state.filesystemNotas = [{ ...root, title: 'Newest memory title' }, child]
    state.installedKind = 'memory'
    const mode = await storageMode()

    await mode.switchToIndexedDB()

    expect((await db.notas.toArray()).map((nota) => nota.id).sort()).toEqual([
      'child',
      'durable-only',
      'root',
    ])
    expect((await db.notas.get('root'))?.title).toBe('Newest memory title')
    expect(state.installedKind).toBe('indexeddb')
    expect(mode.storageMode.value).toBe('indexeddb')
  })

  it('keeps filesystem live when complete IndexedDB verification detects corruption', async () => {
    await db.notas.put({ ...root, id: 'durable-before-failure', title: 'Durable before failure' })
    state.filesystemNotas = [root, child]
    state.sourceKind = 'filesystem'
    state.installedKind = 'filesystem'
    state.corruptIndexedContent = true
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'filesystem', autoWatch: true }))
    const mode = await storageMode()

    await expect(mode.switchToIndexedDB()).rejects.toThrow('content verification')
    expect((await db.notas.toArray()).map((nota) => nota.id)).toEqual(['durable-before-failure'])
    expect(state.installedKind).toBe('filesystem')
    expect(mode.storageMode.value).toBe('filesystem')
    expect(JSON.parse(localStorage.getItem('bashnota-storage-mode')!).mode).toBe('filesystem')
  })
})
