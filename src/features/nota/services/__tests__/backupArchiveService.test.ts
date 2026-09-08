import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { DatabaseAdapter } from '@/services/databaseAdapter'
import type { Nota } from '@/features/nota/types/nota'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BLOCK_TABLES,
  BackupArchiveError,
  createBackupArchive,
  restoreBackupArchive,
  validateBackupArchive,
  type BackupRow,
  type BashNotaBackupArchive,
  type BlockTableName,
} from '../backupArchiveService'

class MemoryTable {
  rows: BackupRow[]
  failBulkAdd = false

  constructor(rows: BackupRow[] = []) {
    this.rows = structuredClone(rows)
  }

  async toArray() { return structuredClone(this.rows) }
  async count() { return this.rows.length }
  async bulkAdd(rows: BackupRow[]) {
    if (this.failBulkAdd) throw new Error('injected typed-row write failure')
    this.rows.push(...structuredClone(rows))
  }
}

class MemoryDatabase {
  notas = new MemoryTable()
  blockStructures = new MemoryTable()
  transactionCalls = 0
  failCommit = false

  constructor() {
    for (const tableName of Object.keys(BLOCK_TABLES) as BlockTableName[]) {
      ;(this as any)[tableName] = new MemoryTable()
    }
  }

  async transaction(_mode: string, tables: MemoryTable[], callback: () => Promise<unknown>) {
    this.transactionCalls++
    const snapshots = tables.map((table) => structuredClone(table.rows))
    try {
      const result = await callback()
      if (this.failCommit) throw new Error('injected transaction commit failure')
      return result
    } catch (error) {
      tables.forEach((table, index) => { table.rows = snapshots[index] })
      throw error
    }
  }
}

class FaithfulFilesystemStorage {
  private notas = new Map<string, string>()
  failNextWrite = false

  getBackendType() { return 'filesystem' as const }
  private deserialize(value: string | undefined): Nota | null {
    if (value === undefined) return null
    const nota = JSON.parse(value) as Nota
    nota.createdAt = new Date(nota.createdAt)
    nota.updatedAt = new Date(nota.updatedAt)
    return nota
  }
  async listNotas() {
    return [...this.notas.values()].map((value) => this.deserialize(value)!)
  }
  async readNota(id: string) { return this.deserialize(this.notas.get(id)) }
  async writeNota(nota: Nota) {
    if (this.failNextWrite) {
      this.failNextWrite = false
      throw new Error('injected filesystem write failure')
    }
    this.notas.set(nota.id, JSON.stringify(nota))
  }
  async deleteNota(id: string) { this.notas.delete(id) }
}

function filesystemAdapter(storage: FaithfulFilesystemStorage): DatabaseAdapter {
  return new DatabaseAdapter(storage as any, true)
}

const timestamp = '2026-08-19T12:00:00.000Z'

function typedPayload(type: string): BackupRow {
  switch (type) {
    case 'text': return { content: 'text' }
    case 'heading': return { level: 2, content: 'heading' }
    case 'code':
    case 'executableCodeBlock': return { language: 'python', content: 'print(1)' }
    case 'math': return { latex: 'x^2' }
    case 'table': return { headers: ['A'], rows: [['1']] }
    case 'image': return { src: 'data:image/png;base64,AA==' }
    case 'quote': return { content: 'quote' }
    case 'list': return { listType: 'ordered', items: ['one'] }
    case 'youtube': return { videoId: 'video' }
    case 'drawio': return { diagramData: '<mxfile />' }
    case 'citation': return { citationKey: 'key', citationData: { title: 'Paper' } }
    case 'bibliography': return { citations: ['key'] }
    case 'subfigure': return { images: [{ src: 'image.png' }], layout: 'grid' }
    case 'notaTable': return { tableData: [{ id: 1 }], columns: ['id'] }
    case 'aiGeneration': return { prompt: 'prompt', generatedContent: 'answer', timestamp }
    case 'theorem': return { title: 'Theorem', content: 'Statement' }
    case 'pipeline': return { title: 'Pipeline', nodes: [], edges: [] }
    case 'mermaid': return { content: 'graph TD' }
    case 'subNotaLink': return { targetNotaId: 'root', targetNotaTitle: 'Root' }
    default: return {}
  }
}

function seededDatabase(): MemoryDatabase {
  const database = new MemoryDatabase()
  database.notas.rows = [
    {
      id: 'root', title: 'Root', blockStructureId: 1, parentId: null, tags: ['backup'],
      createdAt: timestamp, updatedAt: timestamp,
      citations: [{
        id: 'citation-1', key: 'key', title: 'Paper', authors: ['Author'], year: '2026',
        journal: 'Journal', createdAt: timestamp,
      }],
      versions: [{
        id: 'version-1', notaId: 'root', versionName: 'First', createdAt: timestamp,
        nota: {
          id: 'root', title: 'Earlier', parentId: null, tags: [],
          createdAt: timestamp, updatedAt: timestamp,
        },
        canonicalContent: {
          format: 'normalized-blocks-v1', structureVersion: 1, capturedAt: timestamp,
          blockOrder: ['text:history'],
          blocks: [{
            id: 'history', type: 'text', notaId: 'root', order: 0, version: 1,
            createdAt: timestamp, updatedAt: timestamp, content: 'historical text',
          }],
        },
      }],
    },
    {
      id: 'child', title: 'Child', blockStructureId: 'structure-child', parentId: 'root',
      tags: [], createdAt: timestamp, updatedAt: timestamp,
    },
  ]

  const rootOrder: string[] = []
  for (const [tableName, type] of Object.entries(BLOCK_TABLES) as [BlockTableName, string][]) {
    const notaId = type === 'subNotaLink' ? 'child' : 'root'
    const id = type === 'heading' ? 'legacy-heading' : 1
    const row: BackupRow = {
      id,
      type,
      notaId,
      order: notaId === 'root' ? rootOrder.length : 0,
      version: 1,
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
      payload: { tableName, preserved: true },
      ...typedPayload(type),
    }
    if (type === 'aiGeneration') row.timestamp = new Date(timestamp)
    ;(database as any)[tableName].rows = [row]
    if (notaId === 'root') rootOrder.push(`${type}:${String(id)}`)
  }
  database.blockStructures.rows = [
    { id: 1, notaId: 'root', blockOrder: rootOrder, version: 7, lastModified: new Date(timestamp) },
    { id: 'structure-child', notaId: 'child', blockOrder: ['subNotaLink:1'], version: 2, lastModified: new Date(timestamp) },
  ]
  return database
}

function minimalArchive(): BashNotaBackupArchive {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: timestamp,
    notas: [{ id: 'only', title: 'Only', parentId: null, tags: [], createdAt: timestamp, updatedAt: timestamp }],
    blockStructures: [],
    blocks: Object.fromEntries(
      Object.keys(BLOCK_TABLES).map((tableName) => [tableName, []]),
    ) as unknown as BashNotaBackupArchive['blocks'],
  }
}

function semanticArchive(archive: BashNotaBackupArchive): BashNotaBackupArchive {
  const normalized = structuredClone(archive)
  normalized.notas.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  normalized.blockStructures.sort((a, b) => String(a.notaId).localeCompare(String(b.notaId)))
  for (const rows of Object.values(normalized.blocks)) {
    rows.sort((a, b) => `${typeof a.id}:${String(a.id)}`.localeCompare(`${typeof b.id}:${String(b.id)}`))
  }
  return normalized
}

describe('canonical BashNota backup archive', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    db.close()
    await db.delete()
  })

  it('round-trips hierarchy, versions, canonical order, and payloads from all 22 typed tables', async () => {
    const source = seededDatabase()
    const archive = await createBackupArchive(source as any)

    expect(Object.keys(archive.blocks)).toEqual(Object.keys(BLOCK_TABLES))
    expect(archive.notas[0].versions).toHaveLength(1)
    expect(archive.notas[1].parentId).toBe('root')
    for (const [tableName, rows] of Object.entries(archive.blocks)) {
      expect(rows).toHaveLength(1)
      expect(rows[0].payload).toEqual({ tableName, preserved: true })
    }

    const restored = new MemoryDatabase()
    await restoreBackupArchive(archive, () => undefined, restored as any)
    const reloaded = await createBackupArchive(restored as any)

    expect({ ...reloaded, exportedAt: archive.exportedAt }).toEqual(archive)
  })

  it('validates the complete archive before starting a transaction', async () => {
    const database = new MemoryDatabase()
    const malformed = minimalArchive()
    delete (malformed.blocks as Partial<typeof malformed.blocks>).mermaidBlocks

    await expect(restoreBackupArchive(malformed, () => undefined, database as any))
      .rejects.toThrow('blocks.mermaidBlocks must be an array')
    expect(database.transactionCalls).toBe(0)
    expect(database.notas.rows).toEqual([])
  })

  it('rejects malformed metadata, structure keys, and historical canonical content before mutation', async () => {
    const valid = await createBackupArchive(seededDatabase() as any)
    const mutations: Array<[string, (archive: BashNotaBackupArchive) => void]> = [
      ['notas[0].title', (archive) => { archive.notas[0].title = 42 }],
      ['notas[0].createdAt', (archive) => { archive.notas[0].createdAt = 'not-a-date' }],
      ['notas[0].versions[0].notaId', (archive) => {
        ;((archive.notas[0].versions as BackupRow[])[0]).notaId = 'child'
      }],
      ['canonicalContent.structureVersion', (archive) => {
        const version = (archive.notas[0].versions as BackupRow[])[0]
        ;(version.canonicalContent as BackupRow).structureVersion = 0
      }],
      ['blockStructureId', (archive) => { archive.notas[0].blockStructureId = 'wrong-key' }],
      ['blockStructures[0].id', (archive) => { archive.blockStructures[0].id = Number.NaN }],
    ]

    for (const [expectedPath, mutate] of mutations) {
      const malformed = structuredClone(valid)
      mutate(malformed)
      const database = new MemoryDatabase()
      await expect(restoreBackupArchive(malformed, () => undefined, database as any))
        .rejects.toThrow(expectedPath)
      expect(database.transactionCalls).toBe(0)
    }
  })

  it('rejects numeric/string keys that collapse to the same canonical composite id before mutation', async () => {
    const archive = await createBackupArchive(seededDatabase() as any)
    archive.blocks.textBlocks.push({
      id: '1', type: 'text', notaId: 'child', order: 1, version: 1,
      createdAt: timestamp, updatedAt: timestamp, content: 'legacy string key',
    })
    archive.blockStructures[1].blockOrder = ['subNotaLink:1', 'text:1']
    const restored = new MemoryDatabase()

    await expect(restoreBackupArchive(archive, () => undefined, restored as any))
      .rejects.toThrow('ambiguous numeric/string keys')
    expect(restored.transactionCalls).toBe(0)

    const historical = await createBackupArchive(seededDatabase() as any)
    const version = (historical.notas[0].versions as BackupRow[])[0]
    const snapshot = version.canonicalContent as BackupRow
    snapshot.blockOrder = ['text:1', 'text:1']
    snapshot.blocks = [
      {
        id: 1, type: 'text', notaId: 'root', order: 0, version: 1,
        createdAt: timestamp, updatedAt: timestamp, content: 'numeric',
      },
      {
        id: '1', type: 'text', notaId: 'root', order: 1, version: 1,
        createdAt: timestamp, updatedAt: timestamp, content: 'string',
      },
    ]
    expect(() => validateBackupArchive(historical)).toThrow('ambiguous numeric/string keys')
  })

  it('rejects broken hierarchy and canonical block references', () => {
    const missingParent = minimalArchive()
    missingParent.notas[0].parentId = 'absent'
    expect(() => validateBackupArchive(missingParent)).toThrow('refers to missing parent')

    const orphanedBlock = minimalArchive()
    orphanedBlock.blocks.textBlocks.push({
      id: 1, type: 'text', notaId: 'only', order: 0, version: 1,
      createdAt: timestamp, updatedAt: timestamp, content: 'lost',
    })
    expect(() => validateBackupArchive(orphanedBlock)).toThrow('has blocks but no block structure')
  })

  it('rolls back nota metadata, structures, typed rows, and staged Pinia state on write failure', async () => {
    const archive = await createBackupArchive(seededDatabase() as any)
    const database = new MemoryDatabase()
    ;((database as any).pipelineBlocks as MemoryTable).failBulkAdd = true
    const pinia = { notas: ['before'], blocks: ['before'] }

    await expect(restoreBackupArchive(
      archive,
      () => { pinia.notas = ['imported']; pinia.blocks = ['imported'] },
      database as any,
      () => { pinia.notas = ['before']; pinia.blocks = ['before'] },
    )).rejects.toThrow('injected typed-row write failure')

    expect(database.notas.rows).toEqual([])
    expect(database.blockStructures.rows).toEqual([])
    for (const tableName of Object.keys(BLOCK_TABLES) as BlockTableName[]) {
      expect((database as any)[tableName].rows).toEqual([])
    }
    expect(pinia).toEqual({ notas: ['before'], blocks: ['before'] })
  })

  it('rolls back database and Pinia when the transaction fails after Pinia is staged', async () => {
    const archive = await createBackupArchive(seededDatabase() as any)
    const database = new MemoryDatabase()
    database.failCommit = true
    let piniaState = 'before'

    await expect(restoreBackupArchive(
      archive,
      () => { piniaState = 'imported' },
      database as any,
      () => { piniaState = 'before' },
    )).rejects.toThrow('injected transaction commit failure')

    expect(database.notas.rows).toEqual([])
    expect(piniaState).toBe('before')
  })

  it('refuses to merge a backup into a non-empty database', async () => {
    const database = new MemoryDatabase()
    database.notas.rows = [{ id: 'existing' }]
    await expect(restoreBackupArchive(minimalArchive(), () => undefined, database as any))
      .rejects.toBeInstanceOf(BackupArchiveError)
    expect(database.notas.rows).toEqual([{ id: 'existing' }])
  })

  it('restores production Dexie and survives a fresh Pinia reload with exact canonical semantics', async () => {
    const archive = await createBackupArchive(seededDatabase() as any)
    db.close()
    await db.delete()
    await db.open()

    setActivePinia(createPinia())
    await useNotaStore().importAllNotas(archive)

    // Discard every staged in-memory object and prove the persisted archive via
    // the same fresh-store loading paths used after an application restart.
    setActivePinia(createPinia())
    const freshNotaStore = useNotaStore()
    const freshBlockStore = useBlockStore()
    await freshNotaStore.loadNotas()
    for (const nota of freshNotaStore.items) await freshBlockStore.loadNotaBlocks(nota.id, nota)

    expect(freshNotaStore.items.map(({ id, parentId }) => ({ id, parentId })).sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'child', parentId: 'root' },
      { id: 'root', parentId: null },
    ])
    const root = freshNotaStore.getItem('root')!
    expect(root.createdAt).toBeInstanceOf(Date)
    expect(root.updatedAt).toBeInstanceOf(Date)
    expect(root.citations?.[0].createdAt).toBeInstanceOf(Date)
    expect(root.versions?.[0].createdAt).toBeInstanceOf(Date)
    expect(root.versions?.[0].nota.createdAt).toBeInstanceOf(Date)
    expect(root.versions?.[0].canonicalContent?.blocks[0].content).toBe('historical text')
    expect(freshBlockStore.blocks.size).toBe(22)
    expect(freshBlockStore.blocks.get('heading:legacy-heading')?.id).toBe('legacy-heading')
    expect(freshBlockStore.blocks.get('text:1')?.id).toBe(1)
    expect((freshBlockStore.blocks.get('aiGeneration:1') as any)?.timestamp).toBeInstanceOf(Date)
    expect(freshBlockStore.getBlockStructure('root')?.id).toBe(1)
    expect(freshBlockStore.getBlockStructure('child')?.id).toBe('structure-child')

    const persisted = await createBackupArchive(db)
    expect(semanticArchive({ ...persisted, exportedAt: archive.exportedAt })).toEqual(semanticArchive(archive))
  })

  it('round-trips filesystem-authoritative notas with canonical Dexie blocks after fresh adapter and Pinia reload', async () => {
    const source = await createBackupArchive(seededDatabase() as any)
    db.close()
    await db.delete()
    await db.open()
    const storage = new FaithfulFilesystemStorage()
    const adapter = filesystemAdapter(storage)

    await restoreBackupArchive(source, () => undefined, db, () => undefined, adapter)
    expect(await db.notas.count()).toBe(0)

    setActivePinia(createPinia())
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:backup'), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const exported = await useNotaStore().exportAllNotas(adapter)
    expect(exported.notas.find((nota) => nota.id === 'root')?.title).toBe('Root')

    await adapter.saveNota({ ...(await adapter.getNota('root'))!, title: 'mutated filesystem title' })
    await db.textBlocks.update(1, { content: 'mutated Dexie block' })
    await useNotaStore().importAllNotas(exported, adapter)

    setActivePinia(createPinia())
    const freshAdapter = filesystemAdapter(storage)
    const freshNotaStore = useNotaStore()
    const freshBlockStore = useBlockStore()
    await freshNotaStore.loadNotas(freshAdapter)
    for (const nota of freshNotaStore.items) await freshBlockStore.loadNotaBlocks(nota.id, nota)

    expect(freshNotaStore.getItem('root')?.title).toBe('Root')
    expect(freshNotaStore.getItem('root')?.versions?.[0].createdAt).toBeInstanceOf(Date)
    expect(freshBlockStore.blocks.size).toBe(22)
    expect((freshBlockStore.getBlock('text:1') as any)?.content).toBe('text')
    const reexported = await createBackupArchive(db, freshAdapter)
    expect(semanticArchive({ ...reexported, exportedAt: exported.exportedAt })).toEqual(semanticArchive(exported))
  })

  it('compensates filesystem and Dexie state when either authority or canonical block replacement fails', async () => {
    const target = await createBackupArchive(seededDatabase() as any)
    db.close()
    await db.delete()
    await db.open()
    const storage = new FaithfulFilesystemStorage()
    const adapter = filesystemAdapter(storage)
    await restoreBackupArchive(target, () => undefined, db, () => undefined, adapter)
    await adapter.saveNota({ ...(await adapter.getNota('root'))!, title: 'current filesystem state' })
    await db.textBlocks.update(1, { content: 'current canonical state' })
    const before = await createBackupArchive(db, adapter)

    setActivePinia(createPinia())
    const notaStore = useNotaStore()
    const blockStore = useBlockStore()
    await notaStore.loadNotas(adapter)
    for (const nota of notaStore.items) await blockStore.loadNotaBlocks(nota.id, nota)
    const piniaTitles = notaStore.items.map((nota) => nota.title)

    const malformed = structuredClone(target)
    malformed.notas[0].title = 42
    await expect(notaStore.importAllNotas(malformed, adapter)).rejects.toThrow('notas[0].title')
    let after = await createBackupArchive(db, adapter)
    expect(semanticArchive({ ...after, exportedAt: before.exportedAt })).toEqual(semanticArchive(before))

    storage.failNextWrite = true
    await expect(notaStore.importAllNotas(target, adapter)).rejects.toThrow('injected filesystem write failure')
    after = await createBackupArchive(db, adapter)
    expect(semanticArchive({ ...after, exportedAt: before.exportedAt })).toEqual(semanticArchive(before))
    expect(notaStore.items.map((nota) => nota.title)).toEqual(piniaTitles)

    vi.spyOn(db.pipelineBlocks, 'bulkAdd').mockRejectedValueOnce(new Error('injected canonical block write failure'))
    await expect(notaStore.importAllNotas(target, adapter)).rejects.toThrow('injected canonical block write failure')
    after = await createBackupArchive(db, adapter)
    expect(semanticArchive({ ...after, exportedAt: before.exportedAt })).toEqual(semanticArchive(before))
    expect(notaStore.items.map((nota) => nota.title)).toEqual(piniaTitles)
    expect((blockStore.getBlock('text:1') as any)?.content).toBe('current canonical state')
  })
})
