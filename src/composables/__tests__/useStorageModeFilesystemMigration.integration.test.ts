import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import type { Nota } from '@/features/nota/types/nota'
import { FileSystemBackend } from '@/services/fileSystemBackend'

const adapterHarness = vi.hoisted(() => ({
  backend: undefined as unknown,
  getAllNotasCalls: 0,
  installedKind: 'filesystem',
}))

vi.mock('@/services/databaseAdapter', () => ({
  useDatabaseAdapter: () => ({
    getAllNotas: async () => {
      adapterHarness.getAllNotasCalls += 1
      return (adapterHarness.backend as FileSystemBackend).listNotas()
    },
    getStorageService: () => ({
      getBackendType: () => 'filesystem',
      getBackend: () => adapterHarness.backend,
    }),
  }),
  createDatabaseAdapter: async () => ({ kind: 'indexeddb' }),
  installDatabaseAdapter: (adapter: { kind: string }) => { adapterHarness.installedKind = adapter.kind },
  runDatabaseAuthorityTransition: async (transition: () => Promise<unknown>) => transition(),
}))

class MemoryFileSystem {
  files = new Map<string, string>()
  handle = { name: 'migration-source' } as any

  constructor() {
    this.handle.getFileHandle = async (name: string, options?: { create?: boolean }) => {
      if (!this.files.has(name) && !options?.create) throw new DOMException('missing', 'NotFoundError')
      if (!this.files.has(name)) this.files.set(name, '')
      return {
        name,
        kind: 'file',
        getFile: async () => ({ text: async () => this.files.get(name) ?? '' }),
        createWritable: async () => {
          let staged = this.files.get(name) ?? ''
          return {
            write: async (value: string) => { staged = value },
            close: async () => { this.files.set(name, staged) },
            abort: async () => undefined,
          }
        },
      }
    }
    this.handle.entries = async function* (this: any) {
      for (const name of [...this.owner.files.keys()].sort()) {
        yield [name, await this.owner.handle.getFileHandle(name)]
      }
    }.bind({ owner: this })
    this.handle.removeEntry = async (name: string) => { this.files.delete(name) }
  }
}

const timestamp = new Date('2026-08-31T12:00:00.000Z')

async function clearDatabase(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
}

async function seedCanonicalNota(
  id: string,
  title: string,
  content: string,
  blockId: string,
): Promise<Nota> {
  await db.textBlocks.put({
    id: blockId,
    type: 'text',
    notaId: id,
    order: 0,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    content,
  })
  const structureId = await db.blockStructures.add({
    notaId: id,
    blockOrder: [`text:${blockId}`],
    version: 1,
    lastModified: timestamp,
  })
  const nota: Nota = {
    id,
    title,
    parentId: null,
    tags: [],
    blockStructureId: structureId,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.notas.put(nota)
  return nota
}

async function filesystemSource(
  id: string,
  title: string,
  content: string,
  blockId: string,
): Promise<FileSystemBackend> {
  const memory = new MemoryFileSystem()
  const backend = new FileSystemBackend()
  ;(backend as any).directoryHandle = memory.handle
  ;(backend as any).initialized = true
  const nota = await seedCanonicalNota(id, title, content, blockId)
  await backend.writeNota(nota)
  return backend
}

describe('filesystem authority migration with real canonical persistence', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'filesystem', autoWatch: true }))
    adapterHarness.backend = undefined
    adapterHarness.getAllNotasCalls = 0
    adapterHarness.installedKind = 'filesystem'
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    db.close()
    await db.delete()
  })

  it('replaces metadata and every stale canonical row without hydrating during source inspection', async () => {
    const backend = await filesystemSource('source', 'Filesystem source', 'filesystem body', 'source-block')
    await clearDatabase()
    await seedCanonicalNota('stale', 'Stale IndexedDB nota', 'stale body', 'stale-block')
    adapterHarness.backend = backend
    const { useStorageMode } = await import('@/composables/useStorageMode')
    const mode = useStorageMode()
    mode.storageMode.value = 'filesystem'

    await mode.switchToIndexedDB()

    expect(adapterHarness.getAllNotasCalls).toBe(0)
    expect((await db.notas.toArray()).map(({ id }) => id)).toEqual(['source'])
    expect(await db.textBlocks.toArray()).toEqual([
      expect.objectContaining({ id: 'source-block', notaId: 'source', content: 'filesystem body' }),
    ])
    expect((await db.blockStructures.toArray()).map(({ notaId }) => notaId)).toEqual(['source'])
    expect(adapterHarness.installedKind).toBe('indexeddb')
  })

  it('rolls metadata and canonical tables back when post-hydration verification fails', async () => {
    const backend = await filesystemSource('source', 'Filesystem source', 'filesystem body', 'source-block')
    await clearDatabase()
    await seedCanonicalNota('durable', 'Durable before failure', 'durable body', 'durable-block')
    adapterHarness.backend = backend
    const metadataBefore = await db.notas.toArray()
    const blocksBefore = await db.textBlocks.toArray()
    const structuresBefore = await db.blockStructures.toArray()
    vi.spyOn(db.notas, 'get').mockResolvedValueOnce(undefined)
    const { useStorageMode } = await import('@/composables/useStorageMode')
    const mode = useStorageMode()
    mode.storageMode.value = 'filesystem'

    await expect(mode.switchToIndexedDB()).rejects.toThrow('lost nota source')

    expect(await db.notas.toArray()).toEqual(metadataBefore)
    expect(await db.textBlocks.toArray()).toEqual(blocksBefore)
    expect(await db.blockStructures.toArray()).toEqual(structuresBefore)
    expect(adapterHarness.getAllNotasCalls).toBe(0)
    expect(adapterHarness.installedKind).toBe('filesystem')
    expect(mode.storageMode.value).toBe('filesystem')
  })
})
