import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const persisted = vi.hoisted(() => ({
  structures: [
    { id: 1, notaId: 'nota-a', blockOrder: ['text:1'], version: 1, lastModified: '2026-08-19T12:00:00.000Z' },
    { id: 2, notaId: 'nota-b', blockOrder: ['heading:1'], version: 1, lastModified: '2026-08-19T12:00:00.000Z' },
  ],
  blocks: {
    'nota-a': [{
      id: 1, type: 'text', notaId: 'nota-a', order: 0, content: 'A', version: 1,
      createdAt: new Date('2026-08-19T12:00:00.000Z'), updatedAt: new Date('2026-08-19T12:00:00.000Z'),
    }],
    'nota-b': [{
      id: 1, type: 'heading', notaId: 'nota-b', order: 0, level: 2, content: 'B', version: 1,
      createdAt: new Date('2026-08-19T12:00:00.000Z'), updatedAt: new Date('2026-08-19T12:00:00.000Z'),
    }],
  } as Record<string, any[]>,
}))

vi.mock('@/db', () => ({
  db: {
    blockStructures: {
      where: () => ({
        equals: (notaId: string) => ({
          toArray: async () => persisted.structures.filter((structure) => structure.notaId === notaId),
        }),
      }),
    },
    getAllBlocksForNota: async (notaId: string) => persisted.blocks[notaId] || [],
  },
}))

import { useBlockStore } from '../blockStore'

describe('block store fresh reload', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('retains canonical rows from every nota loaded after a backup restore', async () => {
    const store = useBlockStore()

    await store.loadNotaBlocks('nota-a')
    await store.loadNotaBlocks('nota-b')

    expect(store.blockStructures.has('nota-a')).toBe(true)
    expect(store.blockStructures.has('nota-b')).toBe(true)
    expect(store.blocks.get('text:1')).toMatchObject({ notaId: 'nota-a', content: 'A' })
    expect(store.blocks.get('heading:1')).toMatchObject({ notaId: 'nota-b', content: 'B' })
  })
})
