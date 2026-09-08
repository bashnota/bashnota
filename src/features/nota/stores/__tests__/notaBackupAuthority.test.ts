import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

const authority = vi.hoisted(() => ({
  notas: [] as Nota[],
}))

vi.mock('@/services/databaseAdapter', () => ({
  useDatabaseAdapter: () => ({
    isUsingNewStorage: () => true,
    getStorageService: () => ({ getBackendType: () => 'filesystem' }),
    getAllNotas: async () => structuredClone(authority.notas),
    getNota: async (id: string) => structuredClone(authority.notas.find((nota) => nota.id === id)),
    saveNota: async (nota: Nota) => {
      authority.notas = [...authority.notas.filter((existing) => existing.id !== nota.id), structuredClone(nota)]
    },
    deleteNota: async (id: string) => {
      authority.notas = authority.notas.filter((nota) => nota.id !== id)
    },
  }),
}))

import { db } from '@/db'
import { useNotaStore } from '@/features/nota/stores/nota'

const timestamp = '2026-08-19T12:00:00.000Z'

describe('nota backup configured storage authority', () => {
  beforeEach(async () => {
    db.close()
    await db.delete()
    await db.open()
    authority.notas = [{
      id: 'filesystem-nota',
      title: 'Filesystem source',
      parentId: null,
      tags: ['authoritative'],
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    }]
    setActivePinia(createPinia())
    const NativeURL = URL
    class TestURL extends NativeURL {}
    TestURL.createObjectURL = vi.fn(() => 'blob:backup')
    TestURL.revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', TestURL)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    db.close()
    await db.delete()
  })

  it('uses the configured filesystem authority by default for export, restore, and fresh load', async () => {
    const archive = await useNotaStore().exportAllNotas()
    expect(archive.notas).toHaveLength(1)
    expect(archive.notas[0].title).toBe('Filesystem source')
    expect(await db.notas.count()).toBe(0)

    authority.notas[0].title = 'mutated after export'
    await useNotaStore().importAllNotas(archive)

    setActivePinia(createPinia())
    const freshStore = useNotaStore()
    await freshStore.loadNotas()
    expect(freshStore.items).toHaveLength(1)
    expect(freshStore.items[0].title).toBe('Filesystem source')
    expect(freshStore.items[0].createdAt).toBeInstanceOf(Date)
  })
})
