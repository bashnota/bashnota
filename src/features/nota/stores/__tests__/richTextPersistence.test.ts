import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { db } from '@/db'
import { getEditorExtensions } from '@/features/editor/components/extensions'
import { Editor } from '@/features/editor/pm/editor'
import {
  PERSISTED_PROSEMIRROR_MARK_POLICIES,
  PERSISTED_PROSEMIRROR_NODE_POLICIES,
  persistedBlockDataFromNode,
} from '@/features/editor/pm/persistedBlockConversion'
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'
import {
  createBackupArchive,
  restoreBackupArchive,
  validateBackupArchive,
} from '@/features/nota/services/backupArchiveService'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Block } from '@/features/nota/types/blocks'

const notaId = 'rich-text-round-trip'

function liveEditor(content: any) {
  return new Editor({ content, extensions: getEditorExtensions() })
}

function richDocument() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' and ' },
          {
            type: 'text',
            text: 'linked italic',
            marks: [
              { type: 'italic' },
              { type: 'link', attrs: { href: 'https://example.test/a?b=1#c' } },
            ],
          },
          { type: 'hardBreak' },
          { type: 'text', text: 'code', marks: [{ type: 'code' }] },
          { type: 'citation', attrs: { citationKey: 'smith', citationData: { title: 'Paper' } } },
          { type: 'pageLink', attrs: { href: '/nota/child', title: 'Child' } },
          { type: 'image', attrs: { src: '/diagram.png', alt: 'diagram', title: 'Figure 1' } },
        ],
      },
      {
        type: 'blockquote',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'first quote paragraph', marks: [{ type: 'strike' }] }] },
          {
            type: 'orderedList',
            attrs: { start: 3 },
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'nested first' }] },
                  {
                    type: 'bulletList',
                    content: [{
                      type: 'listItem',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nested second', marks: [{ type: 'bold' }] }] }],
                    }],
                  },
                ],
              },
            ],
          },
          { type: 'paragraph', content: [{ type: 'text', text: 'last quote paragraph' }] },
        ],
      },
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'checked task' }] }],
          },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                attrs: { colspan: 1, rowspan: 1, colwidth: [180] },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'rich header', marks: [{ type: 'bold' }] }] }],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                attrs: { colspan: 1, rowspan: 2, colwidth: null },
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'cell paragraph one' }] },
                  { type: 'paragraph', content: [{ type: 'text', text: 'cell paragraph two', marks: [{ type: 'italic' }] }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  setActivePinia(createPinia())
})

afterEach(async () => {
  await db.delete()
})

describe('semantically lossless rich-text persistence', () => {
  it('has an explicit persistence policy for every live schema node and mark', () => {
    const editor = liveEditor({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(Object.keys(PERSISTED_PROSEMIRROR_NODE_POLICIES).sort()).toEqual(Object.keys(editor.schema.nodes).sort())
    expect(Object.keys(PERSISTED_PROSEMIRROR_MARK_POLICIES).sort()).toEqual(Object.keys(editor.schema.marks).sort())

    for (const [name, policy] of Object.entries(PERSISTED_PROSEMIRROR_NODE_POLICIES)) {
      if (!['top-level-block', 'legacy-compatible-block', 'editor-title-block'].includes(policy)) continue
      // The live pipeline command always supplies its generated stable ID; its
      // NodeSpec's legacy function-valued default is intentionally not persisted.
      const node = editor.schema.nodes[name].createAndFill(name === 'pipeline' ? { id: 'pipeline-fixture' } : undefined)
      expect(node, `${name} must have a constructible persistence fixture`).not.toBeNull()
      expect(
        () => persistedBlockDataFromNode(node!.toJSON(), notaId, 0),
        `${name} must have an executable top-level conversion policy`,
      ).not.toThrow()
    }
    editor.destroy()
  })

  it('round-trips rich nested editor JSON through a fresh Dexie-backed store', async () => {
    const sourceEditor = liveEditor(richDocument())
    const expected = sourceEditor.getJSON()
    const expectedAfterReload = JSON.parse(JSON.stringify(expected))
    sourceEditor.destroy()

    const importingStore = useBlockStore()
    await db.notas.put({
      id: notaId,
      title: 'Rich content',
      parentId: null,
      tags: [],
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
      updatedAt: new Date('2026-08-20T00:00:00.000Z'),
    })
    await importingStore.importTiptapContent(notaId, expected)

    const stored = await db.getAllBlocksForNota(notaId)
    expect(stored).toHaveLength(expected.content?.length ?? 0)
    expect(stored.every((block) => block.proseMirrorNode?.version === 1)).toBe(true)

    // Prove the persisted snapshot does not alias the caller's mutable object.
    ;(expected.content![0].content![0] as any).text = 'mutated after persistence'

    // Exercise the production disaster-recovery export/import boundary too.
    const archive = await createBackupArchive()
    await db.delete()
    await db.open()
    await restoreBackupArchive(archive, () => undefined)

    setActivePinia(createPinia())
    const reloadedStore = useBlockStore()
    await reloadedStore.loadNotaBlocks(notaId)
    const reloadedDocument = reloadedStore.getTiptapContent(notaId)
    const reloadedEditor = liveEditor(reloadedDocument)
    expect(reloadedEditor.getJSON()).toEqual(expectedAfterReload)
    reloadedEditor.destroy()

    const corruptArchive = structuredClone(archive)
    const corrupt = corruptArchive.blocks.textBlocks[0].proseMirrorNode as any
    corrupt.value.content[0].marks = [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
    expect(() => validateBackupArchive(corruptArchive)).toThrow('proseMirrorNode is invalid')
  })

  it('rejects unsupported content and unsafe links before changing stored state', async () => {
    const store = useBlockStore()
    const priorEditor = liveEditor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'keep me' }] }] })
    const prior = priorEditor.getJSON()
    priorEditor.destroy()
    await store.importTiptapContent(notaId, prior)
    const structureBefore = JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))
    const rowsBefore = await db.getAllBlocksForNota(notaId)

    const editorBridge = useBlockEditor(notaId)
    await expect(editorBridge.syncContentToBlocks({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'would overwrite' }] },
        { type: 'removedExperimentalBlock', attrs: { payload: 'not representable' } },
      ],
    })).rejects.toThrow('removedExperimentalBlock')
    await expect(store.importTiptapContent(notaId, {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
      }],
    })).rejects.toThrow('Unsafe link')

    expect(JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))).toEqual(structureBefore)
    expect(await db.getAllBlocksForNota(notaId)).toEqual(rowsBefore)
    expect(store.getTiptapContent(notaId)).toEqual(prior)
  })

  it('atomically replaces changed types, reordered content, and trailing rows', async () => {
    const store = useBlockStore()
    await db.notas.put({
      id: notaId,
      title: 'Atomic replacement',
      parentId: null,
      tags: [],
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
      updatedAt: new Date('2026-08-20T00:00:00.000Z'),
    })
    await store.importTiptapContent(notaId, {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'alpha' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'beta' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'delete me' }] },
      ],
    })

    const editorBridge = useBlockEditor(notaId)
    const replacement = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'beta' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'alpha' }] },
      ],
    }
    await editorBridge.syncContentToBlocks(replacement)

    const rows = await db.getAllBlocksForNota(notaId)
    expect(rows.map((row) => [row.type, row.order])).toEqual([['text', 1], ['heading', 0]])
    expect(rows.some((row: any) => row.content === 'delete me')).toBe(false)
    const structure = store.getBlockStructure(notaId)!
    expect(structure.blockOrder).toHaveLength(2)
    expect(structure.blockOrder.every((id) => store.getBlock(id) !== undefined)).toBe(true)
    expect(store.getTiptapContent(notaId)).toEqual(replacement)

    const archive = await createBackupArchive()
    expect(() => validateBackupArchive(archive)).not.toThrow()
    await db.delete()
    await db.open()
    await restoreBackupArchive(archive, () => undefined)
    setActivePinia(createPinia())
    const fresh = useBlockStore()
    await fresh.loadNotaBlocks(notaId)
    expect(fresh.getTiptapContent(notaId)).toEqual(replacement)
  })

  it('rolls database and Pinia back when a canonical replacement write fails', async () => {
    const store = useBlockStore()
    const original = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
      ],
    }
    await store.importTiptapContent(notaId, original)
    const rowsBefore = await db.getAllBlocksForNota(notaId)
    const structureBefore = JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))
    const saveBlock = db.saveBlock.bind(db)
    let calls = 0
    const write = vi.spyOn(db, 'saveBlock').mockImplementation(async (block: any) => {
      calls += 1
      if (calls === 2) throw new Error('injected canonical replacement failure')
      return saveBlock(block)
    })

    await expect(store.importTiptapContent(notaId, {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'changed' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'also changed' }] },
      ],
    })).rejects.toThrow('injected canonical replacement failure')
    write.mockRestore()

    expect(await db.getAllBlocksForNota(notaId)).toEqual(rowsBefore)
    expect(JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))).toEqual(structureBefore)
    expect(store.getTiptapContent(notaId)).toEqual(original)
  })

  it('rolls canonical rows and Pinia back when the authoritative filesystem snapshot fails', async () => {
    const blockStore = useBlockStore()
    const notaStore = useNotaStore()
    await db.notas.put({
      id: notaId, title: 'Filesystem rollback', parentId: null, tags: [],
      createdAt: new Date('2026-08-20T00:00:00.000Z'), updatedAt: new Date('2026-08-20T00:00:00.000Z'),
    })
    await notaStore.loadNotas()
    const original = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'committed content' }] }],
    }
    await blockStore.importTiptapContent(notaId, original)
    const rowsBefore = await db.getAllBlocksForNota(notaId)
    const structureBefore = JSON.parse(JSON.stringify(blockStore.getBlockStructure(notaId)))
    vi.spyOn(notaStore, 'persistCanonicalContent').mockRejectedValueOnce(new Error('injected filesystem close failure'))

    const editorBridge = useBlockEditor(notaId)
    await expect(editorBridge.syncContentToBlocks({
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'not committed' }] }],
    })).rejects.toThrow('injected filesystem close failure')

    expect(await db.getAllBlocksForNota(notaId)).toEqual(rowsBefore)
    expect(JSON.parse(JSON.stringify(blockStore.getBlockStructure(notaId)))).toEqual(structureBefore)
    expect(blockStore.getTiptapContent(notaId)).toEqual(original)
  })

  it('uses the live schema to reject structurally invalid documents before mutation', async () => {
    const store = useBlockStore()
    const original = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'safe' }] }] }
    await store.importTiptapContent(notaId, original)
    const rowsBefore = await db.getAllBlocksForNota(notaId)
    const structureBefore = JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))
    const invalidDocuments = [
      { type: 'doc', content: [{ type: 'bulletList', content: [] }] },
      { type: 'doc', content: [{ type: 'taskList', content: [] }] },
      { type: 'doc', content: [{ type: 'table', content: [] }] },
      { type: 'doc', content: [{ type: 'blockquote', content: [] }] },
      { type: 'doc', content: [{ type: 'heading', attrs: { level: 2, undeclared: true } }] },
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'paragraph' }] }] },
    ]

    for (const invalid of invalidDocuments) {
      await expect(store.importTiptapContent(notaId, invalid)).rejects.toThrow()
      expect(await db.getAllBlocksForNota(notaId)).toEqual(rowsBefore)
      expect(JSON.parse(JSON.stringify(store.getBlockStructure(notaId)))).toEqual(structureBefore)
      expect(store.getTiptapContent(notaId)).toEqual(original)
    }
  })

  it('persists a canonical empty document as an intentional blank nota', async () => {
    const store = useBlockStore()
    await store.importTiptapContent(notaId, {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'remove me' }] }],
    })

    await store.importTiptapContent(notaId, { type: 'doc', content: [] })

    expect(await db.getAllBlocksForNota(notaId)).toEqual([])
    expect(store.getBlockStructure(notaId)?.blockOrder).toEqual([])
    expect(store.getTiptapContent(notaId)).toEqual({ type: 'doc', content: [] })
  })

  it('reads legacy rows but fails closed on a corrupt versioned snapshot', () => {
    const store = useBlockStore()
    const legacy = {
      id: 1,
      type: 'heading',
      level: 2,
      content: '  legacy whitespace  ',
      notaId,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    } as Block
    expect(store.convertBlockToTiptap(legacy)).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '  legacy whitespace  ' }],
    })

    const corrupt = {
      ...legacy,
      proseMirrorNode: {
        format: 'prosemirror-node',
        version: 1,
        value: { type: 'paragraph', content: [{ type: 'text', text: 'wrong block kind' }] },
      },
    } as Block
    expect(() => store.convertBlockToTiptap(corrupt)).toThrow('does not match heading block')

    const aiTimestamp = new Date('2026-08-20T01:02:03.000Z')
    const migratedAi = persistedBlockDataFromNode({
      type: 'aiGeneration',
      attrs: { prompt: 'legacy', model: 'model', timestamp: aiTimestamp },
      content: [{ type: 'text', text: 'answer' }],
    }, notaId, 1)
    expect(migratedAi.proseMirrorNode?.value.attrs?.timestamp).toBe(aiTimestamp.toISOString())

    const legacyTasks = {
      id: 2,
      type: 'list',
      listType: 'task',
      items: ['done', 'pending'],
      checked: [true, false],
      notaId,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    } as Block
    expect(store.convertBlockToTiptap(legacyTasks)).toEqual({
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'pending' }] }] },
      ],
    })
  })
})
