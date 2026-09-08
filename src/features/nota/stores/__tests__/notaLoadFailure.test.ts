import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Nota } from '@/features/nota/types/nota'

const adapterState = vi.hoisted(() => ({
  adapter: null as { getAllNotas: () => Promise<Nota[]> } | null,
}))

vi.mock('@/services/databaseAdapter', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/databaseAdapter')>()
  return {
    ...original,
    useDatabaseAdapter: () => {
      if (!adapterState.adapter) throw new Error('DatabaseAdapter not initialized')
      return adapterState.adapter
    },
  }
})

import { db } from '@/db'
import { NotaLoadError, useNotaStore } from '@/features/nota/stores/nota'

const priorNota: Nota = {
  id: 'prior-nota',
  title: 'Last known good nota',
  parentId: null,
  tags: [],
  createdAt: new Date('2026-08-26T12:00:00.000Z'),
  updatedAt: new Date('2026-08-26T12:00:00.000Z'),
}

const refreshedNota: Nota = {
  ...priorNota,
  id: 'refreshed-nota',
  title: 'Freshly loaded nota',
}

describe('nota authority load failures', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    adapterState.adapter = { getAllNotas: () => db.notas.toArray() }
    setActivePinia(createPinia())
  })

  it('throws a typed error and retains prior notas when Dexie cannot be read', async () => {
    const store = useNotaStore()
    store.items = [priorNota]
    vi.spyOn(db.notas, 'toArray').mockRejectedValueOnce(new Error('IndexedDB is unavailable'))

    await expect(store.loadNotas()).rejects.toBeInstanceOf(NotaLoadError)

    expect(store.items).toEqual([priorNota])
    expect(store.error).toContain('IndexedDB is unavailable')
    expect(store.loading).toBe(false)
  })

  it('throws a typed error and retains prior notas when the filesystem adapter cannot be read', async () => {
    adapterState.adapter = {
      getAllNotas: vi.fn().mockRejectedValueOnce(new Error('Directory permission was revoked')),
    }
    const store = useNotaStore()
    store.items = [priorNota]

    await expect(store.loadNotas()).rejects.toBeInstanceOf(NotaLoadError)

    expect(store.items).toEqual([priorNota])
    expect(store.error).toContain('Directory permission was revoked')
  })

  it('recovers on an explicit retry and clears the previous load error', async () => {
    const store = useNotaStore()
    vi.spyOn(db.notas, 'toArray')
      .mockRejectedValueOnce(new Error('IndexedDB is temporarily unavailable'))
      .mockResolvedValueOnce([refreshedNota])

    await expect(store.loadNotas()).rejects.toBeInstanceOf(NotaLoadError)
    await expect(store.loadNotas()).resolves.toEqual([
      expect.objectContaining({ id: refreshedNota.id, title: refreshedNota.title }),
    ])

    expect(store.items).toEqual([
      expect.objectContaining({ id: refreshedNota.id, title: refreshedNota.title }),
    ])
    expect(store.error).toBeNull()
  })

  it('preserves the last successful library when a later refresh fails', async () => {
    const store = useNotaStore()
    vi.spyOn(db.notas, 'toArray')
      .mockResolvedValueOnce([priorNota])
      .mockRejectedValueOnce(new Error('IndexedDB refresh failed'))

    await store.loadNotas()
    await expect(store.loadNotas()).rejects.toBeInstanceOf(NotaLoadError)

    expect(store.items).toEqual([
      expect.objectContaining({ id: priorNota.id, title: priorNota.title }),
    ])
    expect(store.error).toContain('IndexedDB refresh failed')
  })
})
