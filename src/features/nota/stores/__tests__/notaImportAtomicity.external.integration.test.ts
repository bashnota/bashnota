import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { db } from '@/db'
import { persistedBlockDataFromDocument } from '@/features/editor/pm/persistedBlockConversion'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Nota } from '@/features/nota/types/nota'
import {
  createDatabaseAdapterForBackend,
  installDatabaseAdapter,
} from '@/services/databaseAdapter'
import { IndexedDBBackend, MemoryBackend } from '@/services/storageService'

class FailingMemoryBackend extends MemoryBackend {
  private failOnWrite = 0
  private writes = 0

  failOnceOn(writeNumber: number): void {
    this.failOnWrite = writeNumber
    this.writes = 0
  }

  override async writeNota(nota: Nota): Promise<void> {
    this.writes += 1
    if (this.failOnWrite > 0 && this.writes === this.failOnWrite) {
      this.failOnWrite = 0
      throw new Error('injected external metadata failure')
    }
    await super.writeNota(nota)
  }
}

const originalDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'original body' }] }],
}
const importedDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'imported body' }] }],
}
const linkedParentDocument = {
  type: 'doc',
  content: [{
    type: 'subNotaLink',
    attrs: {
      targetNotaId: 'linked-child',
      targetNotaTitle: 'Linked child',
      displayText: 'Linked child',
      linkStyle: 'inline',
    },
  }],
}

describe('external-authority import compensation', () => {
  let backend: FailingMemoryBackend
  let existing: Nota

  beforeEach(async () => {
    await db.delete()
    await db.open()
    setActivePinia(createPinia())
    backend = new FailingMemoryBackend()
    await backend.initialize()
    installDatabaseAdapter(createDatabaseAdapterForBackend(backend))

    existing = {
      id: 'existing-external',
      title: 'Original title',
      parentId: null,
      tags: [],
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    }
    await backend.writeNota(existing)
    useNotaStore().items = [existing]
    await useBlockStore().importTiptapContent(existing.id, originalDocument)
  })

  afterEach(async () => {
    const indexedDBBackend = new IndexedDBBackend()
    await indexedDBBackend.initialize()
    installDatabaseAdapter(createDatabaseAdapterForBackend(indexedDBBackend, true))
    await db.delete()
  })

  it('restores metadata, canonical rows, and Pinia when a later external write fails', async () => {
    const now = new Date('2026-09-02T00:00:00.000Z')
    const incoming: Nota = {
      id: 'incoming-external',
      title: 'Incoming',
      parentId: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    backend.failOnceOn(2)

    await expect(useNotaStore().commitPreparedImport([
      {
        nota: { ...existing, title: 'Mutated title', updatedAt: now },
        blocks: persistedBlockDataFromDocument(importedDocument, existing.id),
      },
      {
        nota: incoming,
        blocks: persistedBlockDataFromDocument(importedDocument, incoming.id),
      },
    ])).rejects.toThrow('injected external metadata failure')

    expect((await backend.readNota(existing.id))?.title).toBe('Original title')
    expect(await backend.readNota(incoming.id)).toBeNull()
    expect(useBlockStore().getTiptapContent(existing.id)).toEqual(originalDocument)
    expect(await db.blockStructures.where('notaId').equals(incoming.id).count()).toBe(0)
    expect(await db.getAllBlocksForNota(incoming.id)).toEqual([])
    expect(useNotaStore().items.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: existing.id, title: 'Original title' },
    ])
  })

  it('commits the parent link and child as one external-authority outcome', async () => {
    const child = await useNotaStore().createLinkedSubNota(
      existing.id,
      'linked-child',
      'Linked child',
      linkedParentDocument,
    )

    expect(child.parentId).toBe(existing.id)
    expect((await backend.readNota('linked-child'))?.title).toBe('Linked child')
    expect(useBlockStore().getTiptapContent(existing.id)).toEqual(linkedParentDocument)
    expect(useBlockStore().getTiptapContent('linked-child')).toEqual({ type: 'doc', content: [] })
    expect(useNotaStore().items.map(({ id }) => id)).toEqual([existing.id, 'linked-child'])
  })

  it('restores the parent and removes the child when linked creation fails', async () => {
    backend.failOnceOn(2)

    await expect(useNotaStore().createLinkedSubNota(
      existing.id,
      'linked-child',
      'Linked child',
      linkedParentDocument,
    )).rejects.toThrow('injected external metadata failure')

    expect(await backend.readNota('linked-child')).toBeNull()
    expect((await backend.readNota(existing.id))?.title).toBe('Original title')
    expect(useBlockStore().getTiptapContent(existing.id)).toEqual(originalDocument)
    expect(await db.getAllBlocksForNota('linked-child')).toEqual([])
    expect(useNotaStore().items.map(({ id }) => id)).toEqual([existing.id])
  })
})
