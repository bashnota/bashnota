import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

const authority = vi.hoisted(() => ({
  nota: {
    id: 'rename-me', title: 'Before', parentId: null, tags: [],
    createdAt: new Date('2026-08-26T12:00:00.000Z'),
    updatedAt: new Date('2026-08-26T12:00:00.000Z'),
  } as Nota,
  failWrite: false,
  deferWrite: false,
  writeStarted: undefined as (() => void) | undefined,
  releaseWrite: undefined as (() => void) | undefined,
}))

vi.mock('@/services/databaseAdapter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/databaseAdapter')>()),
  useDatabaseAdapter: () => ({
    isUsingNewStorage: () => true,
    getStorageService: () => ({ getBackendType: () => 'filesystem' }),
    getAllNotas: async () => [structuredClone(authority.nota)],
    getNota: async () => structuredClone(authority.nota),
    saveNotaWithinMutation: async (nota: Nota) => {
      if (authority.failWrite) throw new Error('injected filesystem rename failure')
      if (authority.deferWrite) {
        authority.writeStarted?.()
        await new Promise<void>((resolve) => { authority.releaseWrite = resolve })
        authority.deferWrite = false
      }
      authority.nota = structuredClone(nota)
    },
  }),
}))

import { useNotaStore } from '@/features/nota/stores/nota'

describe('filesystem metadata rollback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    authority.nota.title = 'Before'
    authority.failWrite = false
    authority.deferWrite = false
    authority.writeStarted = undefined
    authority.releaseWrite = undefined
  })

  it('does not stage a renamed title in Pinia when the atomic file commit fails', async () => {
    const store = useNotaStore()
    await store.loadNotas()
    authority.failWrite = true

    await expect(store.renameItem('rename-me', 'After')).rejects.toThrow('injected filesystem rename failure')
    expect(store.getItem('rename-me')?.title).toBe('Before')
    expect(authority.nota.title).toBe('Before')
  })

  it('serializes rename and autosave snapshots so the old title cannot overwrite the rename', async () => {
    const store = useNotaStore()
    await store.loadNotas()
    authority.deferWrite = true
    const started = new Promise<void>((resolve) => { authority.writeStarted = resolve })

    const rename = store.renameItem('rename-me', 'After')
    await started
    const autosave = store.persistCanonicalContent('rename-me')
    authority.releaseWrite?.()
    await Promise.all([rename, autosave])

    expect(store.getItem('rename-me')?.title).toBe('After')
    expect(authority.nota.title).toBe('After')
  })
})
