import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db } from '@/db'
import { persistedBlockDataFromDocument } from '@/features/editor/pm/persistedBlockConversion'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'

vi.mock('vue-sonner', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return { toast }
})

describe('nota cloning', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map(table => table.clear()))
    })
  })

  it('copies the complete canonical document into a new nota', async () => {
    const notaStore = useNotaStore()
    const blockStore = useBlockStore()
    const original = await notaStore.createItem('Original')
    const document = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Body content' }] },
      ],
    }
    await blockStore.replaceNotaContent(
      original.id,
      persistedBlockDataFromDocument(document, original.id),
    )

    const clone = await notaStore.cloneLocalNota(original.id)

    expect(clone.id).not.toBe(original.id)
    expect(blockStore.getTiptapContent(clone.id)).toEqual(document)
  })

  it('clears every persisted structure by notaId even when none is loaded in memory', async () => {
    const blockStore = useBlockStore()
    await db.blockStructures.bulkAdd([
      { notaId: 'orphaned', blockOrder: [], version: 1, lastModified: new Date() },
      { notaId: 'orphaned', blockOrder: [], version: 2, lastModified: new Date() },
    ])

    await blockStore.clearNotaBlocks('orphaned')

    await expect(db.blockStructures.where('notaId').equals('orphaned').count()).resolves.toBe(0)
  })
})
