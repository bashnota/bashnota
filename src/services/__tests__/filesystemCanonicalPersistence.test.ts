import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import type { Nota } from '@/features/nota/types/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { BLOCK_TABLES, type BlockTableName } from '@/features/nota/services/backupArchiveService'
import { FileSystemBackend } from '@/services/fileSystemBackend'

const timestamp = '2026-08-26T12:00:00.000Z'

class MemoryFileSystem {
  files = new Map<string, string>()
  failNextClose = false
  private closeGate: Promise<void> | null = null
  private announceClose: (() => void) | null = null
  private releaseClose: (() => void) | null = null

  handle = { name: 'canonical-notas' } as any

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
            close: async () => {
              if (this.closeGate) {
                this.announceClose?.()
                await this.closeGate
                this.closeGate = null
              }
              if (this.failNextClose) {
                this.failNextClose = false
                throw new Error('injected atomic close failure')
              }
              this.files.set(name, staged)
            },
            abort: async () => undefined,
          }
        },
      }
    }
    this.handle.removeEntry = async (name: string) => { this.files.delete(name) }
    this.handle.entries = async function* (this: any) {
      for (const name of [...this.owner.files.keys()].sort()) {
        yield [name, await this.owner.handle.getFileHandle(name)]
      }
    }.bind({ owner: this })
  }

  deferNextClose() {
    const started = new Promise<void>((resolve) => { this.announceClose = resolve })
    this.closeGate = new Promise<void>((resolve) => { this.releaseClose = resolve })
    return { started, release: () => this.releaseClose?.() }
  }
}

function payload(type: string): Record<string, unknown> {
  switch (type) {
    case 'text': return { content: 'rich text' }
    case 'heading': return { content: 'Heading', level: 2 }
    case 'code':
    case 'executableCodeBlock': return { content: 'print(1)', language: 'python' }
    case 'math': return { latex: 'x^2', displayMode: true }
    case 'table': return { headers: ['A'], rows: [['1']] }
    case 'image': return { src: 'data:image/png;base64,AA==' }
    case 'quote': return { content: 'quote' }
    case 'list': return { listType: 'task', items: ['todo'], checked: [true] }
    case 'youtube': return { videoId: 'video' }
    case 'drawio': return { diagramData: '<mxfile />' }
    case 'citation': return { citationKey: 'key', citationData: { title: 'Paper' } }
    case 'bibliography': return { citations: ['key'] }
    case 'subfigure': return { images: [{ src: 'image.png' }], layout: 'grid' }
    case 'notaTable': return { tableData: [{ id: 1 }], columns: ['id'] }
    case 'aiGeneration': return { prompt: 'prompt', generatedContent: 'answer', timestamp: new Date(timestamp) }
    case 'confusionMatrix': return { title: 'Matrix', source: 'upload', filePath: '' }
    case 'theorem': return { title: 'Theorem', content: 'Statement', proof: '' }
    case 'pipeline': return { title: 'Pipeline', nodes: [], edges: [] }
    case 'mermaid': return { content: 'graph TD', theme: 'default' }
    case 'subNotaLink': return { targetNotaId: 'child', targetNotaTitle: 'Child' }
    default: return {}
  }
}

async function seedCanonicalHierarchy(): Promise<{ root: Nota; child: Nota }> {
  const rootOrder: string[] = []
  for (const [index, type] of Object.values(BLOCK_TABLES).entries()) {
    const id = index % 2 === 0 ? index + 1 : `stable-${index + 1}`
    await db.getBlockTable(type).put({
      id,
      type,
      notaId: 'root',
      order: index,
      version: 3,
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
      ...payload(type),
    } as never)
    rootOrder.push(`${type}:${String(id)}`)
  }
  await db.textBlocks.put({
    id: 1001, type: 'text', notaId: 'child', order: 0, version: 1,
    createdAt: new Date(timestamp), updatedAt: new Date(timestamp), content: 'child body',
  })
  const rootStructureId = await db.blockStructures.add({
    notaId: 'root', blockOrder: rootOrder, version: 9, lastModified: new Date(timestamp),
  })
  const childStructureId = await db.blockStructures.add({
    notaId: 'child', blockOrder: ['text:1001'], version: 2, lastModified: new Date(timestamp),
  })
  const root: Nota = {
    id: 'root', title: 'Root', parentId: null, tags: ['filesystem'],
    blockStructureId: rootStructureId, createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
    versions: [{
      id: 'version-1', notaId: 'root', versionName: 'Initial', createdAt: new Date(timestamp),
      nota: { id: 'root', title: 'Earlier', parentId: null, tags: [], createdAt: timestamp, updatedAt: timestamp },
    }],
  }
  const child: Nota = {
    id: 'child', title: 'Child', parentId: 'root', tags: [], blockStructureId: childStructureId,
    createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
  }
  return { root, child }
}

describe('self-contained filesystem nota persistence', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('rebuilds a multi-nota hierarchy and all 22 typed payloads from only .nota files', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root, child } = await seedCanonicalHierarchy()

    await backend.writeNota(root)
    await backend.writeNota(child)
    const rootDocument = JSON.parse(memory.files.get('root.nota')!)
    expect(rootDocument.canonicalContent.blocks).toHaveLength(Object.keys(BLOCK_TABLES).length)
    expect(rootDocument.nota.versions[0].id).toBe('version-1')

    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    setActivePinia(createPinia())

    const notas = await backend.listNotas()
    expect(notas.map(({ id, parentId }) => ({ id, parentId }))).toEqual([
      { id: 'child', parentId: 'root' },
      { id: 'root', parentId: null },
    ])
    expect(notas.find((nota) => nota.id === 'root')?.versions?.[0].createdAt).toBeInstanceOf(Date)

    const blockStore = useBlockStore()
    const loadedRoot = await blockStore.loadNotaBlocks('root', notas.find((nota) => nota.id === 'root'))
    const loadedChild = await blockStore.loadNotaBlocks('child', notas.find((nota) => nota.id === 'child'))
    expect(loadedRoot).toHaveLength(Object.keys(BLOCK_TABLES).length)
    expect(loadedChild).toEqual([expect.objectContaining({ id: 1001, content: 'child body' })])
    expect(blockStore.getBlockStructure('root')?.id).toBe(root.blockStructureId)
    expect(blockStore.getBlockStructure('child')?.id).toBe(child.blockStructureId)
    for (const tableName of Object.keys(BLOCK_TABLES) as BlockTableName[]) {
      expect(await db[tableName].count()).toBeGreaterThan(0)
    }
  })

  it('keeps the previous file committed when an atomic close fails', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root } = await seedCanonicalHierarchy()
    await backend.writeNota(root)
    const before = memory.files.get('root.nota')

    memory.failNextClose = true
    await expect(backend.writeNota({ ...root, title: 'must not commit' })).rejects.toThrow('atomic close')
    expect(memory.files.get('root.nota')).toBe(before)
  })

  it('waits for an in-flight write before deleting the nota file', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root } = await seedCanonicalHierarchy()
    await backend.writeNota(root)

    const deferred = memory.deferNextClose()
    const write = backend.writeNota({ ...root, title: 'last queued write' })
    await deferred.started
    const deletion = backend.deleteNota(root.id)
    deferred.release()
    await Promise.all([write, deletion])

    expect(memory.files.has('root.nota')).toBe(false)
  })

  it('keeps an empty child order empty after loading a populated parent first', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root } = await seedCanonicalHierarchy()
    const emptyStructureId = await db.blockStructures.add({
      notaId: 'empty-child', blockOrder: [], version: 1, lastModified: new Date(timestamp),
    })
    const emptyChild: Nota = {
      id: 'empty-child', title: 'Empty', parentId: 'root', tags: [],
      blockStructureId: emptyStructureId, createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
    }
    await backend.writeNota(root)
    await backend.writeNota(emptyChild)
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    setActivePinia(createPinia())

    const notas = await backend.listNotas()
    const blockStore = useBlockStore()
    await blockStore.loadNotaBlocks('root', notas.find((nota) => nota.id === 'root'))
    expect(await blockStore.loadNotaBlocks('empty-child', emptyChild)).toEqual([])
    expect(blockStore.getBlockStructure('empty-child')?.blockOrder).toEqual([])
    expect((await db.blockStructures.get(emptyStructureId))?.blockOrder).toEqual([])

    const legacyStructureId = await db.blockStructures.add({
      notaId: 'legacy-child', blockOrder: ['2001'], version: 1, lastModified: new Date(timestamp),
    })
    await db.textBlocks.put({
      id: 2001, type: 'text', notaId: 'legacy-child', order: 0, version: 1,
      createdAt: new Date(timestamp), updatedAt: new Date(timestamp), content: 'legacy child only',
    })
    await blockStore.loadNotaBlocks('legacy-child', {
      id: 'legacy-child', title: 'Legacy', parentId: 'root', tags: [],
      blockStructureId: legacyStructureId, createdAt: new Date(timestamp), updatedAt: new Date(timestamp),
    })
    expect(blockStore.getBlockStructure('legacy-child')?.blockOrder).toEqual(['text:2001'])
  })

  it('validates every directory document before hydrating any canonical row', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root, child } = await seedCanonicalHierarchy()
    await backend.writeNota(root)
    await backend.writeNota(child)

    const corrupt = JSON.parse(memory.files.get('child.nota')!)
    corrupt.canonicalContent.blocks[0].notaId = 'another-nota'
    memory.files.set('child.nota', JSON.stringify(corrupt))
    await db.textBlocks.put({
      id: 2002, type: 'text', notaId: 'sentinel', order: 0, version: 1,
      createdAt: new Date(timestamp), updatedAt: new Date(timestamp), content: 'unchanged',
    })

    await expect(backend.listNotas()).rejects.toThrow('another nota')
    expect(await db.textBlocks.get(2002)).toEqual(expect.objectContaining({ content: 'unchanged' }))
    expect(await db.textBlocks.get(1001)).toEqual(expect.objectContaining({ content: 'child body' }))
  })

  it('scans migration documents without hydrating or replacing live canonical rows', async () => {
    const memory = new MemoryFileSystem()
    const backend = new FileSystemBackend()
    ;(backend as any).directoryHandle = memory.handle
    ;(backend as any).initialized = true
    const { root } = await seedCanonicalHierarchy()
    await backend.writeNota(root)

    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    await db.textBlocks.put({
      id: 'sentinel-block', type: 'text', notaId: 'sentinel', order: 0, version: 1,
      createdAt: new Date(timestamp), updatedAt: new Date(timestamp), content: 'must remain live',
    })
    await db.blockStructures.put({
      id: 'sentinel-structure', notaId: 'sentinel', blockOrder: ['text:sentinel-block'],
      version: 1, lastModified: new Date(timestamp),
    })

    const documents = await backend.listNotaDocuments()

    expect(documents.map((document) => document.nota.id)).toEqual(['root'])
    expect(await db.textBlocks.toArray()).toEqual([
      expect.objectContaining({ id: 'sentinel-block', content: 'must remain live' }),
    ])
    expect(await db.blockStructures.toArray()).toEqual([
      expect.objectContaining({ id: 'sentinel-structure', notaId: 'sentinel' }),
    ])
  })
})
