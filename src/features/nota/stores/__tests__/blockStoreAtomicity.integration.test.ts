import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { db } from '@/db'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import type { Block, NotaBlockStructure, TextBlock } from '@/features/nota/types/blocks'

vi.mock('vue-sonner', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return { toast }
})

const notaId = 'atomic-blocks'

function textBlockData(content: string) {
  return {
    type: 'text' as const,
    notaId,
    order: 0,
    content,
  }
}

async function persistedState() {
  return {
    blocks: await db.textBlocks.where('notaId').equals(notaId).sortBy('id'),
    structures: await db.blockStructures.where('notaId').equals(notaId).sortBy('id'),
  }
}

async function initializedStore() {
  const store = useBlockStore()
  await store.initializeNotaBlocks(notaId, 'Atomic blocks')
  return store
}

async function seededStore() {
  const store = await initializedStore()
  const first = await store.createBlock(textBlockData('first'))
  const second = await store.createBlock(textBlockData('second'))
  return { store, first, second }
}

describe('block store transactional mutations', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    db.close()
    await db.delete()
  })

  it('creates the typed row and canonical structure together for a direct caller', async () => {
    const store = useBlockStore()

    const created = await store.createBlock(textBlockData('direct create'))

    expect(created.order).toBe(0)
    expect(store.getNotaBlocks(notaId).map((block) => block.id)).toEqual([created.id])
    expect((await persistedState()).structures).toHaveLength(1)
    expect((await persistedState()).structures[0].blockOrder).toEqual([`text:${created.id}`])
  })

  it('rolls create back when failure follows the typed-row write', async () => {
    const store = await initializedStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    const saveBlock = db.saveBlock.bind(db)
    vi.spyOn(db, 'saveBlock').mockImplementationOnce(async (block) => {
      await saveBlock(block)
      throw new Error('injected after typed create')
    })

    await expect(store.createBlock(textBlockData('must roll back')))
      .rejects.toThrow('injected after typed create')

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('rolls create back when the structure write fails', async () => {
    const store = await initializedStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    vi.spyOn(db.blockStructures, 'put').mockRejectedValueOnce(new Error('injected structure create failure'))

    await expect(store.createBlock(textBlockData('must roll back')))
      .rejects.toThrow('injected structure create failure')

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('rolls update back after either durable write boundary', async () => {
    for (const boundary of ['typed-row', 'structure'] as const) {
      setActivePinia(createPinia())
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((table) => table.clear()))
      })
      const { store, first } = await seededStore()
      const compositeId = `text:${first.id}`
      const beforeDurable = await persistedState()
      const beforeMemory = store.captureNotaMemoryState(notaId)

      if (boundary === 'typed-row') {
        const saveBlock = db.saveBlock.bind(db)
        vi.spyOn(db, 'saveBlock').mockImplementationOnce(async (block) => {
          await saveBlock(block)
          throw new Error('injected after typed update')
        })
      } else {
        vi.spyOn(db.blockStructures, 'put').mockRejectedValueOnce(new Error('injected structure update failure'))
      }

      await expect(store.updateBlock(compositeId, { content: 'changed' } as Partial<Block>)).rejects.toThrow('injected')
      expect(await persistedState()).toEqual(beforeDurable)
      expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
      vi.restoreAllMocks()
    }
  })

  it.each([1, 2])('rolls reorder back when typed-row write %i fails after writing', async (failureCall) => {
    const { store, first, second } = await seededStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    const saveBlock = db.saveBlock.bind(db)
    let calls = 0
    vi.spyOn(db, 'saveBlock').mockImplementation(async (block) => {
      const result = await saveBlock(block)
      calls += 1
      if (calls === failureCall) throw new Error(`injected after reorder row ${failureCall}`)
      return result
    })

    await expect(store.reorderBlocks(notaId, [`text:${second.id}`, `text:${first.id}`]))
      .rejects.toThrow(`injected after reorder row ${failureCall}`)

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('rolls every reordered row back when the structure write fails', async () => {
    const { store, first, second } = await seededStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    vi.spyOn(db.blockStructures, 'put').mockRejectedValueOnce(new Error('injected reorder structure failure'))

    await expect(store.reorderBlocks(notaId, [`text:${second.id}`, `text:${first.id}`]))
      .rejects.toThrow('injected reorder structure failure')

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('persists reordered structure and typed-row order across a fresh load', async () => {
    const { store, first, second } = await seededStore()
    const expectedOrder = [`text:${second.id}`, `text:${first.id}`]

    await store.reorderBlocks(notaId, expectedOrder)

    expect((await persistedState()).structures[0].blockOrder).toEqual(expectedOrder)
    expect((await persistedState()).blocks.map((block) => [block.id, block.order, block.version])).toEqual([
      [first.id, 1, 2],
      [second.id, 0, 2],
    ])
    setActivePinia(createPinia())
    const reloaded = useBlockStore()
    await reloaded.loadNotaBlocks(notaId)
    expect(reloaded.getNotaBlocks(notaId).map((block) => block.id)).toEqual([second.id, first.id])
  })

  it('rolls clear back when failure follows typed-row deletion', async () => {
    const { store } = await seededStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    const deleteAllBlocks = db.deleteAllBlocksForNota.bind(db)
    vi.spyOn(db, 'deleteAllBlocksForNota').mockImplementationOnce(async (id) => {
      await deleteAllBlocks(id)
      throw new Error('injected after typed clear')
    })

    await expect(store.clearNotaBlocks(notaId)).rejects.toThrow('injected after typed clear')

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('rolls clear back when deleting a structure fails', async () => {
    const { store } = await seededStore()
    const beforeDurable = await persistedState()
    const beforeMemory = store.captureNotaMemoryState(notaId)
    const failure = () => { throw new Error('injected structure clear failure') }
    db.blockStructures.hook('deleting', failure)

    try {
      await expect(store.clearNotaBlocks(notaId)).rejects.toThrow('injected structure clear failure')
    } finally {
      db.blockStructures.hook('deleting').unsubscribe(failure)
    }

    expect(await persistedState()).toEqual(beforeDurable)
    expect(store.captureNotaMemoryState(notaId)).toEqual(beforeMemory)
  })

  it('clears every duplicate structure through the notaId index', async () => {
    const { store } = await seededStore()
    await db.blockStructures.add({
      notaId,
      blockOrder: ['text:999'],
      version: 0,
      lastModified: new Date('2020-01-01T00:00:00.000Z'),
    })

    await store.clearNotaBlocks(notaId)

    expect(await persistedState()).toEqual({ blocks: [], structures: [] })
    expect(store.captureNotaMemoryState(notaId)).toEqual({ blocks: [], structure: undefined })
  })

  it('loads the newest duplicate structure once and removes stale alternatives', async () => {
    const first = await db.textBlocks.add({
      ...textBlockData('first'),
      order: 0,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      version: 1,
    } as TextBlock)
    const second = await db.textBlocks.add({
      ...textBlockData('second'),
      order: 1,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-01T10:00:00.000Z'),
      version: 1,
    } as TextBlock)
    const structures: NotaBlockStructure[] = [
      {
        notaId,
        blockOrder: [`text:${second}`, `text:${first}`],
        version: 1,
        lastModified: new Date('2025-01-01T00:00:00.000Z'),
      },
      {
        notaId,
        blockOrder: [`text:${first}`, `text:${second}`],
        version: 4,
        lastModified: new Date('2026-09-01T10:00:00.000Z'),
      },
    ]
    const [staleId] = await db.blockStructures.bulkAdd(structures, { allKeys: true })

    const store = useBlockStore()
    await store.loadNotaBlocks(notaId, { blockStructureId: staleId })

    expect(store.getBlockStructure(notaId)?.version).toBe(4)
    expect(store.getBlockStructure(notaId)?.blockOrder).toEqual([`text:${first}`, `text:${second}`])
    expect((await persistedState()).structures).toHaveLength(1)
    expect((await persistedState()).structures[0].version).toBe(4)
  })
})
