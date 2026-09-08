import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const memoryDb = vi.hoisted(() => {
  const clone = <T>(value: T): T => structuredClone(value)
  let failure: { table: string; operation: string } | null = null

  class MemoryTable {
    readonly name: string
    rows = new Map<string | number, any>()
    nextId = 1

    constructor(name: string) {
      this.name = name
    }

    maybeFail(operation: string) {
      if (failure?.table === this.name && failure.operation === operation) {
        failure = null
        throw new Error(`injected ${this.name}.${operation} failure`)
      }
    }

    async get(id: string | number) {
      this.maybeFail('get')
      const row = this.rows.get(id)
      return row == null ? undefined : clone(row)
    }

    async add(value: any) {
      this.maybeFail('add')
      const row = clone(value)
      const id = row.id ?? this.nextId++
      row.id = id
      if (this.rows.has(id)) throw new Error(`duplicate key ${String(id)}`)
      this.rows.set(id, row)
      return id
    }

    async put(value: any) {
      this.maybeFail('put')
      const row = clone(value)
      const id = row.id ?? this.nextId++
      row.id = id
      this.rows.set(id, row)
      return id
    }

    async update(id: string | number, changes: any) {
      this.maybeFail('update')
      const current = this.rows.get(id)
      if (!current) return 0
      this.rows.set(id, { ...current, ...clone(changes) })
      return 1
    }

    async delete(id: string | number) {
      this.maybeFail('delete')
      this.rows.delete(id)
    }

    async toArray() {
      this.maybeFail('toArray')
      return clone(Array.from(this.rows.values()))
    }

    where(field: string) {
      return {
        equals: (expected: unknown) => ({
          toArray: async () => {
            this.maybeFail('toArray')
            return clone(Array.from(this.rows.values()).filter((row) => row[field] === expected))
          },
          delete: async () => {
            this.maybeFail('whereDelete')
            for (const [id, row] of this.rows) {
              if (row[field] === expected) this.rows.delete(id)
            }
          },
        }),
      }
    }

    snapshot() {
      return { rows: clone(Array.from(this.rows.entries())), nextId: this.nextId }
    }

    restore(snapshot: { rows: Array<[string | number, any]>; nextId: number }) {
      this.rows = new Map(clone(snapshot.rows))
      this.nextId = snapshot.nextId
    }
  }

  const blockTableNames = [
    'textBlocks', 'headingBlocks', 'codeBlocks', 'mathBlocks', 'tableBlocks',
    'imageBlocks', 'quoteBlocks', 'listBlocks', 'horizontalRuleBlocks',
    'youtubeBlocks', 'drawIoBlocks', 'citationBlocks', 'bibliographyBlocks',
    'subfigureBlocks', 'notaTableBlocks', 'aiGenerationBlocks',
    'executableCodeBlocks', 'confusionMatrixBlocks', 'theoremBlocks',
    'pipelineBlocks', 'mermaidBlocks', 'subNotaLinkBlocks',
  ]
  const typeToTable: Record<string, string> = {
    text: 'textBlocks', heading: 'headingBlocks', code: 'codeBlocks', math: 'mathBlocks',
    table: 'tableBlocks', image: 'imageBlocks', quote: 'quoteBlocks', list: 'listBlocks',
    horizontalRule: 'horizontalRuleBlocks', youtube: 'youtubeBlocks', drawio: 'drawIoBlocks',
    citation: 'citationBlocks', bibliography: 'bibliographyBlocks', subfigure: 'subfigureBlocks',
    notaTable: 'notaTableBlocks', aiGeneration: 'aiGenerationBlocks',
    executableCodeBlock: 'executableCodeBlocks', confusionMatrix: 'confusionMatrixBlocks',
    theorem: 'theoremBlocks', pipeline: 'pipelineBlocks', mermaid: 'mermaidBlocks',
    subNotaLink: 'subNotaLinkBlocks',
  }
  const tables: Record<string, MemoryTable> = {
    notas: new MemoryTable('notas'),
    blockStructures: new MemoryTable('blockStructures'),
  }
  for (const name of blockTableNames) tables[name] = new MemoryTable(name)

  const db: any = {
    ...tables,
    tables: Object.values(tables),
    getBlockTable(type: string) {
      const name = typeToTable[type]
      if (!name) throw new Error(`Unknown block type: ${type}`)
      return tables[name]
    },
    async saveBlock(block: any) {
      return tables[typeToTable[block.type]].put(block)
    },
    async deleteBlock(id: string | number, type: string) {
      return tables[typeToTable[type]].delete(id)
    },
    async getAllBlocksForNota(notaId: string) {
      const rows = await Promise.all(blockTableNames.map((name) => tables[name].where('notaId').equals(notaId).toArray()))
      return rows.flat()
    },
    async deleteAllBlocksForNota(notaId: string) {
      for (const name of blockTableNames) await tables[name].where('notaId').equals(notaId).delete()
    },
    async transaction(_mode: string, transactionTables: MemoryTable[], scope: () => Promise<unknown>) {
      const snapshots = new Map(transactionTables.map((table) => [table, table.snapshot()]))
      try {
        return await scope()
      } catch (error) {
        for (const [table, snapshot] of snapshots) table.restore(snapshot)
        throw error
      }
    },
    reset() {
      for (const table of Object.values(tables)) table.restore({ rows: [], nextId: 1 })
      failure = null
    },
    failNext(table: string, operation: string) {
      failure = { table, operation }
    },
  }
  return db
})

const filesystemAdapter = vi.hoisted(() => {
  const notas = new Map<string, any>()
  const canonical = new Map<string, any>()
  let enabled = false
  let failWithinAt = -1
  let withinCalls = 0
  const clone = <T>(value: T): T => structuredClone(value)
  const snapshotCanonical = async (notaId: string) => ({
    structures: await memoryDb.blockStructures.where('notaId').equals(notaId).toArray(),
    blocks: await memoryDb.getAllBlocksForNota(notaId),
  })
  const backend: any = {}

  const adapter = {
    isUsingNewStorage: () => true,
    getStorageService: () => ({ getBackendType: () => 'filesystem', getBackend: () => backend }),
    getNota: vi.fn(async (id: string) => {
      const nota = notas.get(id)
      return nota == null ? undefined : clone(nota)
    }),
    saveNota: vi.fn(async (nota: any) => {
      notas.set(nota.id, clone(nota))
      canonical.set(nota.id, clone(await snapshotCanonical(nota.id)))
    }),
    saveNotaWithinMutation: vi.fn(async (nota: any) => {
      withinCalls += 1
      if (withinCalls === failWithinAt) throw new Error('injected filesystem history append failure')
      notas.set(nota.id, clone(nota))
      canonical.set(nota.id, clone(await snapshotCanonical(nota.id)))
    }),
  }
  Object.assign(backend, {
    readNotaDocument: vi.fn(async (id: string) => {
      const nota = notas.get(id)
      return nota == null ? null : { nota: clone(nota), exportedAt: 'mock-generation' }
    }),
    writeNotaIfDocumentUnchanged: vi.fn(async (nota: any) => adapter.saveNotaWithinMutation(nota)),
  })

  return {
    adapter,
    enable(nota: any) {
      enabled = true
      notas.set(nota.id, clone(nota))
    },
    disable() {
      enabled = false
      notas.clear()
      canonical.clear()
      adapter.getNota.mockClear()
      adapter.saveNota.mockClear()
      adapter.saveNotaWithinMutation.mockClear()
      failWithinAt = -1
      withinCalls = 0
    },
    isEnabled: () => enabled,
    read(id: string) {
      const nota = notas.get(id)
      return nota == null ? undefined : clone(nota)
    },
    readCanonical(id: string) {
      const snapshot = canonical.get(id)
      return snapshot == null ? undefined : clone(snapshot)
    },
    failWithinAfter(successfulCalls: number) {
      failWithinAt = withinCalls + successfulCalls + 1
    },
  }
})

vi.mock('@/db', () => ({ db: memoryDb }))
vi.mock('@/services/databaseAdapter', () => {
  const activeNotas = new Set<string>()
  return {
    useDatabaseAdapter: () => {
      if (filesystemAdapter.isEnabled()) return filesystemAdapter.adapter
      throw new Error('adapter intentionally unavailable in version-history tests')
    },
    withNotaPersistence: async (notaId: string, mutation: () => Promise<unknown>) => {
      if (activeNotas.has(notaId)) throw new Error(`reentrant nota persistence for ${notaId}`)
      activeNotas.add(notaId)
      try {
        return await mutation()
      } finally {
        activeNotas.delete(notaId)
      }
    },
  }
})
vi.mock('vue-sonner', () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(),
  })
  return { toast }
})

import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'
import type { Block, TextBlock } from '@/features/nota/types/blocks'

const notaId = 'versioned-nota'
const nowA = new Date('2026-08-13T01:00:00.000Z')
const nowB = new Date('2026-08-13T02:00:00.000Z')

function notaRow(title: string, tags: string[] = [], versions: any[] = []) {
  return {
    id: notaId,
    title,
    parentId: null,
    tags,
    createdAt: nowA,
    updatedAt: title === 'Metadata A' ? nowA : nowB,
    blockStructureId: 'structure-1',
    versions,
  }
}

function blockRows(label: 'A' | 'B') {
  const timestamp = label === 'A' ? nowA : nowB
  return [
    {
      id: 1, type: 'text', notaId, order: 0, content: `paragraph ${label}`,
      createdAt: timestamp, updatedAt: timestamp, version: 1,
    },
    {
      id: 1, type: 'executableCodeBlock', notaId, order: 1,
      language: 'python', content: `print('${label}')`, output: { stdout: `${label}\n` },
      kernelPreferences: { kernel: 'python3' }, createdAt: timestamp, updatedAt: timestamp, version: 2,
    },
    {
      id: 1, type: 'theorem', notaId, order: 2, title: `Theorem ${label}`,
      content: `Statement ${label}`, proof: `Proof ${label}`, theoremType: 'lemma',
      createdAt: timestamp, updatedAt: timestamp, version: 3,
    },
    {
      id: 1, type: 'aiGeneration', notaId, order: 3, prompt: `Prompt ${label}`,
      generatedContent: `Generated ${label}`, model: 'model', timestamp,
      createdAt: timestamp, updatedAt: timestamp, version: 1,
    },
  ]
}

async function writeBody(label: 'A' | 'B') {
  await memoryDb.textBlocks.where('notaId').equals(notaId).delete()
  await memoryDb.executableCodeBlocks.where('notaId').equals(notaId).delete()
  await memoryDb.theoremBlocks.where('notaId').equals(notaId).delete()
  await memoryDb.aiGenerationBlocks.where('notaId').equals(notaId).delete()
  for (const block of blockRows(label)) await memoryDb.getBlockTable(block.type).put(block)
  await memoryDb.blockStructures.put({
    id: 'structure-1', notaId,
    blockOrder: ['text:1', 'executableCodeBlock:1', 'theorem:1', 'aiGeneration:1'],
    version: label === 'A' ? 3 : 4,
    lastModified: label === 'A' ? nowA.toISOString() : nowB.toISOString(),
  })
}

async function freshStores() {
  setActivePinia(createPinia())
  const notaStore = useNotaStore()
  const blockStore = useBlockStore()
  const nota = await notaStore.loadNota(notaId)
  await blockStore.loadNotaBlocks(notaId, nota)
  return { notaStore, blockStore, nota }
}

beforeEach(async () => {
  filesystemAdapter.disable()
  localStorage.removeItem('bashnota-storage-mode')
  memoryDb.reset()
  await memoryDb.notas.put(notaRow('Metadata A', ['alpha']))
  await writeBody('A')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('canonical nota version history', () => {
  it('converts live PM JSON through the production block path before snapshotting', async () => {
    const { notaStore } = await freshStores()
    const { initializeBlocks, syncContentForVersion } = useBlockEditor(notaId)
    await initializeBlocks()
    const liveDocument = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'live editor text' }] },
        {
          type: 'executableCodeBlock',
          attrs: {
            language: 'python', output: { stdout: 'live\n' },
            kernelPreferences: { kernel: 'python3' },
          },
          content: [{ type: 'text', text: "print('live')" }],
        },
        {
          type: 'theorem',
          attrs: { title: 'Live theorem', content: 'Live statement', proof: 'Live proof', type: 'lemma' },
        },
      ],
    }

    const saved = await notaStore.saveNotaVersion({
      id: notaId,
      versionName: 'Live editor state',
      createdAt: nowB,
      prepareCanonical: () => syncContentForVersion(liveDocument),
    })

    expect(saved.canonicalContent?.blocks).toMatchObject([
      { type: 'text', content: [{ type: 'text', text: 'live editor text' }] },
      {
        type: 'executableCodeBlock', content: "print('live')", output: { stdout: 'live\n' },
        kernelPreferences: { kernel: 'python3' },
      },
      { type: 'theorem', title: 'Live theorem', content: 'Live statement', proof: 'Live proof' },
    ])
  })

  it('restores metadata, multiple typed block payloads, and ordering after a fresh read', async () => {
    let { notaStore } = await freshStores()
    const saved = await notaStore.saveNotaVersion({
      id: notaId,
      versionName: 'State A',
      createdAt: nowA,
    })

    expect(saved.nota).toMatchObject({ title: 'Metadata A', tags: ['alpha'] })
    expect(saved.nota).not.toHaveProperty('versions')
    expect(saved.nota).not.toHaveProperty('blockStructure')
    expect(saved.canonicalContent).toMatchObject({
      format: 'normalized-blocks-v1',
      blockOrder: ['text:1', 'executableCodeBlock:1', 'theorem:1', 'aiGeneration:1'],
    })
    expect(saved.canonicalContent?.blocks.map((block) => block.type)).toEqual([
      'text', 'executableCodeBlock', 'theorem', 'aiGeneration',
    ])

    await memoryDb.notas.update(notaId, { title: 'Metadata B', tags: ['beta'] })
    await writeBody('B')
    ;({ notaStore } = await freshStores())

    await expect(notaStore.restoreVersion(notaId, saved.id)).resolves.toMatchObject({ kind: 'canonical' })

    const fresh = await freshStores()
    expect(fresh.notaStore.getCurrentNota(notaId)).toMatchObject({ title: 'Metadata A', tags: ['alpha'] })
    expect(fresh.notaStore.getNotaVersions(notaId)).toHaveLength(1)
    expect(fresh.blockStore.getBlockStructure(notaId)?.blockOrder).toEqual([
      'text:1', 'executableCodeBlock:1', 'theorem:1', 'aiGeneration:1',
    ])
    expect(fresh.blockStore.getNotaBlocks(notaId)).toMatchObject([
      { type: 'text', content: 'paragraph A', order: 0 },
      {
        type: 'executableCodeBlock', content: "print('A')", output: { stdout: 'A\n' },
        kernelPreferences: { kernel: 'python3' }, order: 1,
      },
      { type: 'theorem', title: 'Theorem A', content: 'Statement A', proof: 'Proof A', order: 2 },
      { type: 'aiGeneration', generatedContent: 'Generated A', timestamp: nowA, order: 3 },
    ])
  })

  it('repairs a stale structure reference and fresh-loads the single restored structure', async () => {
    let { notaStore } = await freshStores()
    const saved = await notaStore.saveNotaVersion({ id: notaId, versionName: 'State A', createdAt: nowA })
    await memoryDb.notas.update(notaId, { blockStructureId: 'stale-structure-id', title: 'Metadata B' })
    await writeBody('B')
    ;({ notaStore } = await freshStores())

    await notaStore.restoreVersion(notaId, saved.id)

    const persistedNota = await memoryDb.notas.get(notaId)
    const persistedStructures = await memoryDb.blockStructures.where('notaId').equals(notaId).toArray()
    expect(persistedStructures).toHaveLength(1)
    expect(persistedNota.blockStructureId).toBe(persistedStructures[0].id)

    const fresh = await freshStores()
    expect(fresh.blockStore.getBlockStructure(notaId)).toMatchObject({
      id: persistedStructures[0].id,
      blockOrder: saved.canonicalContent?.blockOrder,
      version: saved.canonicalContent?.structureVersion,
    })
    expect(await memoryDb.blockStructures.where('notaId').equals(notaId).toArray()).toHaveLength(1)
  })

  it('rolls back live canonical preparation and history when snapshot persistence fails', async () => {
    const { notaStore, blockStore } = await freshStores()
    const rollbackCache = vi.fn()
    memoryDb.failNext('notas', 'put')

    await expect(notaStore.saveNotaVersion({
      id: notaId,
      versionName: 'must fail',
      createdAt: nowB,
      prepareCanonical: async () => {
        const changed = { ...blockRows('B')[0] } as unknown as Block
        await memoryDb.textBlocks.put(changed)
        blockStore.blocks.set('text:1', changed)
        return rollbackCache
      },
    })).rejects.toThrow(/No changes were committed/)

    expect(rollbackCache).toHaveBeenCalledOnce()
    expect(notaStore.getNotaVersions(notaId)).toHaveLength(0)
    expect(blockStore.getBlock('text:1')).toMatchObject({ content: 'paragraph A' })
    expect(blockStore.getBlock('aiGeneration:1')).toMatchObject({ timestamp: nowA })
    expect(await memoryDb.textBlocks.get(1)).toMatchObject({ content: 'paragraph A' })
    expect((await memoryDb.notas.get(notaId)).versions).toEqual([])
  })

  it('rolls back deletes and partial block writes when restore fails', async () => {
    let { notaStore } = await freshStores()
    const saved = await notaStore.saveNotaVersion({ id: notaId, versionName: 'State A', createdAt: nowA })
    await memoryDb.notas.update(notaId, { title: 'Metadata B', tags: ['beta'] })
    await writeBody('B')
    ;({ notaStore } = await freshStores())
    memoryDb.failNext('theoremBlocks', 'put')

    await expect(notaStore.restoreVersion(notaId, saved.id)).rejects.toThrow(/left unchanged/)

    const fresh = await freshStores()
    expect(fresh.notaStore.getCurrentNota(notaId)).toMatchObject({ title: 'Metadata B', tags: ['beta'] })
    expect(fresh.notaStore.getNotaVersions(notaId)).toHaveLength(1)
    expect(fresh.blockStore.getNotaBlocks(notaId)).toMatchObject([
      { content: 'paragraph B' },
      { content: "print('B')", output: { stdout: 'B\n' } },
      { title: 'Theorem B', content: 'Statement B' },
      { generatedContent: 'Generated B', timestamp: nowB },
    ])
  })

  it('restores legacy metadata explicitly without touching the current body or order', async () => {
    const legacy = {
      id: 'legacy-version', notaId, versionName: 'Legacy metadata', createdAt: nowA,
      nota: { ...notaRow('Metadata A', ['legacy']), versions: undefined, blockStructureId: undefined },
    }
    await memoryDb.notas.put(notaRow('Metadata B', ['beta'], [legacy]))
    await writeBody('B')
    const { notaStore } = await freshStores()

    await expect(notaStore.restoreVersion(notaId, legacy.id)).resolves.toMatchObject({
      kind: 'legacy-metadata-only',
    })

    const fresh = await freshStores()
    expect(fresh.notaStore.getCurrentNota(notaId)).toMatchObject({ title: 'Metadata A', tags: ['legacy'] })
    expect(fresh.notaStore.getNotaVersions(notaId)).toHaveLength(1)
    expect(fresh.blockStore.getBlockStructure(notaId)?.blockOrder).toEqual([
      'text:1', 'executableCodeBlock:1', 'theorem:1', 'aiGeneration:1',
    ])
    expect(fresh.blockStore.getNotaBlocks(notaId)[0]).toMatchObject({ content: 'paragraph B' })
  })

  it('rejects every version action before mutation while filesystem storage is still initializing', async () => {
    localStorage.setItem('bashnota-storage-mode', JSON.stringify({ mode: 'filesystem' }))
    const dexieGet = vi.spyOn(memoryDb.notas, 'get')
    const dexiePut = vi.spyOn(memoryDb.notas, 'put')
    const dexieUpdate = vi.spyOn(memoryDb.notas, 'update')
    setActivePinia(createPinia())
    const notaStore = useNotaStore()
    const pendingVersion = {
      id: 'pending-version', notaId, versionName: 'Pending filesystem history', createdAt: nowA,
      nota: { ...notaRow('Metadata A'), versions: undefined, blockStructureId: undefined },
    }
    notaStore.items.push({ ...notaRow('Metadata A', ['alpha'], [pendingVersion]) })

    await expect(notaStore.saveNotaVersion({ id: notaId, versionName: 'Pending', createdAt: nowB }))
      .rejects.toThrow(/filesystem storage is initializing/)
    await expect(notaStore.restoreVersion(notaId, pendingVersion.id))
      .rejects.toThrow(/filesystem storage is initializing/)
    await expect(notaStore.deleteVersion(notaId, pendingVersion.id))
      .rejects.toThrow(/filesystem storage is initializing/)

    expect(dexieGet).not.toHaveBeenCalled()
    expect(dexiePut).not.toHaveBeenCalled()
    expect(dexieUpdate).not.toHaveBeenCalled()
  })

  it('persists filesystem history through the adapter, restores it after reload, and never touches db.notas', async () => {
    filesystemAdapter.enable(notaRow('Metadata A', ['alpha']))
    const dexieGet = vi.spyOn(memoryDb.notas, 'get')
    const dexiePut = vi.spyOn(memoryDb.notas, 'put')
    const dexieUpdate = vi.spyOn(memoryDb.notas, 'update')

    let { notaStore } = await freshStores()
    const saved = await notaStore.saveNotaVersion({ id: notaId, versionName: 'Filesystem state A', createdAt: nowA })
    expect(filesystemAdapter.read(notaId)?.versions).toHaveLength(1)
    expect(filesystemAdapter.adapter.saveNotaWithinMutation).toHaveBeenCalledOnce()
    expect(filesystemAdapter.adapter.saveNota).not.toHaveBeenCalled()

    await filesystemAdapter.adapter.saveNota({
      ...filesystemAdapter.read(notaId),
      title: 'Metadata B',
      tags: ['beta'],
      updatedAt: nowB,
    })
    await writeBody('B')
    ;({ notaStore } = await freshStores())

    await expect(notaStore.restoreVersion(notaId, saved.id)).resolves.toMatchObject({ kind: 'canonical' })
    const fresh = await freshStores()
    expect(fresh.notaStore.getCurrentNota(notaId)).toMatchObject({ title: 'Metadata A', tags: ['alpha'] })
    expect(fresh.blockStore.getNotaBlocks(notaId)).toContainEqual(expect.objectContaining({ content: 'paragraph A' }))

    expect(dexieGet).not.toHaveBeenCalled()
    expect(dexiePut).not.toHaveBeenCalled()
    expect(dexieUpdate).not.toHaveBeenCalled()
  })

  it('compensates the prepared filesystem body when the history append fails', async () => {
    filesystemAdapter.enable(notaRow('Metadata A', ['alpha']))
    const { notaStore, blockStore } = await freshStores()
    const beforeMemory = blockStore.captureNotaMemoryState(notaId)
    const beforePersisted = filesystemAdapter.read(notaId)
    const { syncContentForVersion } = useBlockEditor(notaId)
    const liveDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'prepared body B' }] }],
    }

    // Canonical preparation must not write stale Pinia metadata to the file;
    // fail the sole following history-bearing write.
    filesystemAdapter.failWithinAfter(0)
    await expect(notaStore.saveNotaVersion({
      id: notaId,
      versionName: 'must roll back',
      createdAt: nowB,
      prepareCanonical: () => syncContentForVersion(liveDocument),
    })).rejects.toThrow('No changes were committed')

    expect(filesystemAdapter.adapter.saveNotaWithinMutation).toHaveBeenCalledOnce()
    expect(filesystemAdapter.read(notaId)).toEqual(beforePersisted)
    expect(blockStore.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
    expect(notaStore.getNotaVersions(notaId)).toEqual([])
    expect((await memoryDb.textBlocks.toArray()).map((block: any) => block.content)).toContain('paragraph A')
    expect((await memoryDb.textBlocks.toArray()).map((block: any) => block.content)).not.toContain('prepared body B')
  })

  it('deletes filesystem history through the adapter and keeps it deleted after reload', async () => {
    filesystemAdapter.enable(notaRow('Metadata A', ['alpha']))
    const dexieGet = vi.spyOn(memoryDb.notas, 'get')
    const dexiePut = vi.spyOn(memoryDb.notas, 'put')
    const dexieUpdate = vi.spyOn(memoryDb.notas, 'update')

    let { notaStore } = await freshStores()
    const saved = await notaStore.saveNotaVersion({ id: notaId, versionName: 'Filesystem state A', createdAt: nowA })
    await notaStore.deleteVersion(notaId, saved.id)
    expect(filesystemAdapter.read(notaId)?.versions).toEqual([])

    ;({ notaStore } = await freshStores())
    expect(notaStore.getNotaVersions(notaId)).toEqual([])
    expect(dexieGet).not.toHaveBeenCalled()
    expect(dexiePut).not.toHaveBeenCalled()
    expect(dexieUpdate).not.toHaveBeenCalled()
  })

})

describe('canonical block deletion', () => {
  const deletionNotaId = 'deleted-nota'

  async function seedStructure(blockOrder: string[] = []) {
    return memoryDb.blockStructures.add({
      notaId: deletionNotaId,
      blockOrder,
      version: 1,
      lastModified: nowA.toISOString(),
    })
  }

  async function freshBlockStore() {
    setActivePinia(createPinia())
    const store = useBlockStore()
    await store.loadNotaBlocks(deletionNotaId)
    return store
  }

  function textBlockData(content: string): Omit<TextBlock, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
    return { type: 'text', notaId: deletionNotaId, order: 0, content }
  }

  it('deletes the final numeric ++id row without resurrecting it after a fresh load', async () => {
    memoryDb.reset()
    await seedStructure()
    const store = await freshBlockStore()
    const created = await store.createBlock(textBlockData('must stay deleted'))

    expect(created.id).toBe(1)
    expect(typeof created.id).toBe('number')
    await store.deleteBlock('text:1')

    expect(await memoryDb.textBlocks.get(1)).toBeUndefined()
    expect((await memoryDb.blockStructures.where('notaId').equals(deletionNotaId).toArray())[0].blockOrder).toEqual([])

    const fresh = await freshBlockStore()
    expect(fresh.getNotaBlocks(deletionNotaId)).toEqual([])
    expect(fresh.getBlockStructure(deletionNotaId)?.blockOrder).toEqual([])
    expect(fresh.getTiptapContent(deletionNotaId)).toEqual({ type: 'doc', content: [] })
  })

  it('deletes an explicitly string-keyed compatibility row without coercing its key', async () => {
    memoryDb.reset()
    await memoryDb.textBlocks.put({
      id: 'legacy-text',
      type: 'text',
      notaId: deletionNotaId,
      order: 0,
      content: 'legacy string key',
      createdAt: nowA,
      updatedAt: nowA,
      version: 1,
    })
    await seedStructure(['text:legacy-text'])

    const store = await freshBlockStore()
    expect(store.getBlock('text:legacy-text')?.id).toBe('legacy-text')
    await store.deleteBlock('text:legacy-text')

    expect(await memoryDb.textBlocks.get('legacy-text')).toBeUndefined()
    const fresh = await freshBlockStore()
    expect(fresh.getNotaBlocks(deletionNotaId)).toEqual([])
    expect(fresh.getBlockStructure(deletionNotaId)?.blockOrder).toEqual([])
  })

  it('rolls back the typed row and leaves Pinia untouched when the structure write fails', async () => {
    memoryDb.reset()
    await seedStructure()
    const store = await freshBlockStore()
    const created = await store.createBlock(textBlockData('transactional body'))
    const compositeId = `text:${String(created.id)}`
    const currentStructure = store.getBlockStructure(deletionNotaId)!
    const structureBefore = {
      ...currentStructure,
      blockOrder: [...currentStructure.blockOrder],
      lastModified: new Date(currentStructure.lastModified),
    }
    memoryDb.failNext('blockStructures', 'put')

    await expect(store.deleteBlock(compositeId)).rejects.toThrow('injected blockStructures.put failure')

    expect(await memoryDb.textBlocks.get(created.id)).toMatchObject({ content: 'transactional body' })
    expect(store.getBlock(compositeId)).toMatchObject({ content: 'transactional body' })
    expect(store.getBlockStructure(deletionNotaId)).toEqual(structureBefore)

    const fresh = await freshBlockStore()
    expect(fresh.getNotaBlocks(deletionNotaId)).toMatchObject([{ content: 'transactional body' }])
    expect(fresh.getBlockStructure(deletionNotaId)?.blockOrder).toEqual([compositeId])
  })
})
