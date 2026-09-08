import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT, BACKUP_VERSION, BLOCK_TABLES } from '@/features/nota/services/backupArchiveService'

const mocks = vi.hoisted(() => ({
  useDatabaseAdapter: vi.fn(() => {
    throw new Error('Database adapter has not been initialized')
  }),
}))

vi.mock('@/services/databaseAdapter', () => ({
  useDatabaseAdapter: mocks.useDatabaseAdapter,
}))

import { db } from '@/db'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { beginStorageAuthorityResolution, reportStorageAuthorityReady } from '@/services/storageAuthority'

const timestamp = '2026-08-20T12:00:00.000Z'
const initializingError = 'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.'
const emptyBlocks = () => Object.fromEntries(
  Object.keys(BLOCK_TABLES).map((tableName) => [tableName, []]),
)

describe('nota backup during filesystem adapter startup', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'filesystem' }))
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    reportStorageAuthorityReady('indexeddb', 'indexeddb')
    localStorage.clear()
    vi.restoreAllMocks()
    db.close()
    await db.delete()
  })

  it('blocks legacy IndexedDB access while automatic backend selection is delayed', async () => {
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'indexeddb' }))
    beginStorageAuthorityResolution(undefined)
    await db.notas.add({
      id: 'hidden-until-ready',
      title: 'Hidden until ready',
      parentId: null,
      tags: [],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    })

    const notaStore = useNotaStore()
    await expect(notaStore.loadNotas()).rejects.toThrow(/adapter has not been initialized/i)

    expect(notaStore.items).toEqual([])
    expect(await db.notas.count()).toBe(1)
  })

  it('fails export closed without reading the legacy Dexie nota authority', async () => {
    await db.notas.add({
      id: 'dexie-only',
      title: 'Must not be exported',
      parentId: null,
      tags: [],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    })
    const notaStore = useNotaStore()
    notaStore.items = [{
      id: 'memory-only',
      title: 'Unchanged memory',
      parentId: null,
      tags: [],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    }]

    await expect(notaStore.exportAllNotas()).rejects.toThrow(initializingError)

    expect((await db.notas.toArray()).map((nota) => nota.id)).toEqual(['dexie-only'])
    expect(notaStore.items.map((nota) => nota.id)).toEqual(['memory-only'])
  })

  it('fails ordinary nota reads and writes closed without touching legacy Dexie', async () => {
    await db.notas.add({
      id: 'dexie-only',
      title: 'Wrong authority',
      parentId: null,
      tags: [],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    })
    const notaStore = useNotaStore()

    await expect(notaStore.loadNotas()).rejects.toThrow(/filesystem storage is initializing/i)
    await expect(notaStore.createItem('Must not be created')).rejects.toThrow(/filesystem storage is initializing/i)

    expect((await db.notas.toArray()).map((nota) => nota.id)).toEqual(['dexie-only'])
    expect(notaStore.items).toEqual([])
  })

  it('fails import closed before mutating Dexie or Pinia', async () => {
    const notaStore = useNotaStore()
    const blockStore = useBlockStore()
    notaStore.items = [{
      id: 'memory-only',
      title: 'Unchanged memory',
      parentId: null,
      tags: [],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    }]
    blockStore.blocks.set('text:memory-block', {
      id: 'memory-block',
      type: 'text',
      notaId: 'memory-only',
      order: 0,
      content: 'unchanged',
      version: 1,
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    })

    const archive = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: timestamp,
      notas: [{
        id: 'archive-nota',
        title: 'Must not be restored',
        parentId: null,
        tags: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
      blockStructures: [],
      blocks: emptyBlocks(),
    }

    await expect(notaStore.importAllNotas(archive)).rejects.toThrow(initializingError)

    expect(await db.notas.count()).toBe(0)
    expect(await db.blockStructures.count()).toBe(0)
    expect(notaStore.items.map((nota) => nota.id)).toEqual(['memory-only'])
    expect([...blockStore.blocks.keys()]).toEqual(['text:memory-block'])
    expect(blockStore.blockStructures.size).toBe(0)
  })
})
