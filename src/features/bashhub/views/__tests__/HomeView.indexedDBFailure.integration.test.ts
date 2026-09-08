import 'fake-indexeddb/auto'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

vi.mock('@/features/bashhub/composables/useHomePreferences', () => ({
  useHomePreferences: () => ({
    viewType: ref('list'),
    showFavorites: ref(false),
    searchQuery: ref(''),
    selectedTag: ref(''),
    clearFilters: vi.fn(),
  }),
}))

vi.mock('@/features/nota/composables/useNotaActions', () => ({
  useNotaActions: () => ({ createNewNota: vi.fn() }),
}))

vi.mock('@/features/bashhub/composables/useFilesystemNotas', () => ({
  useFilesystemNotas: () => ({
    filesystemNotas: ref([]),
    isLoadingFilesystem: ref(false),
    hasDirectoryAccess: ref(false),
    directoryName: ref(null),
    isFilesystemMode: ref(false),
    checkDirectoryAccess: vi.fn(),
    loadFilesystemNotas: vi.fn(),
    selectDirectory: vi.fn(),
    getFilesystemOnlyNotas: vi.fn(() => []),
  }),
}))

vi.mock('vue-sonner', () => ({ toast: vi.fn() }))

import { db } from '@/db'
import HomeView from '../HomeView.vue'
import { DatabaseAdapter, installDatabaseAdapter } from '@/services/databaseAdapter'
import { NotaLoadError, useNotaStore } from '@/features/nota/stores/nota'
import { StorageReadError, StorageService } from '@/services/storageService'

const priorNota: Nota = {
  id: 'prior-indexeddb-nota',
  title: 'Last known good IndexedDB nota',
  parentId: null,
  tags: [],
  createdAt: new Date('2026-08-26T12:00:00.000Z'),
  updatedAt: new Date('2026-08-26T12:00:00.000Z'),
}

async function installInitializedIndexedDBAdapter(): Promise<void> {
  const storage = new StorageService()
  await storage.initialize('indexeddb')
  expect(storage.getBackendType()).toBe('indexeddb')
  installDatabaseAdapter(new DatabaseAdapter(storage, true))
}

describe('HomeView initialized IndexedDB authority failure', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    db.close()
    await db.delete()
    await db.open()
    setActivePinia(createPinia())
    await installInitializedIndexedDBAdapter()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    db.close()
    await db.delete()
  })

  it('propagates the typed storage failure through the real adapter and retains prior items', async () => {
    const store = useNotaStore()
    store.items = [priorNota]
    vi.spyOn(db.notas, 'toArray').mockRejectedValueOnce(new Error('IndexedDB connection was lost'))

    const failure = await store.loadNotas().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(NotaLoadError)
    expect((failure as NotaLoadError).cause).toBeInstanceOf(StorageReadError)
    expect(((failure as NotaLoadError).cause as StorageReadError).backend).toBe('indexeddb')
    expect((failure as Error).message).toContain('Check storage access and retry')
    expect(store.items).toEqual([priorNota])
  })

  it('keeps the retained library and actionable error visible in HomeView', async () => {
    vi.spyOn(db.notas, 'toArray').mockRejectedValueOnce(new Error('IndexedDB connection was lost'))

    const pinia = createPinia()
    setActivePinia(pinia)
    const mountedStore = useNotaStore()
    mountedStore.items = [priorNota]

    const wrapper = mount(HomeView, {
      global: {
        plugins: [pinia],
        stubs: {
          HomeHeader: true,
          HomeNotaList: {
            props: ['notas'],
            template: '<div data-testid="nota-list">{{ notas.length }}</div>',
          },
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Check storage access and retry')
    expect(wrapper.get('button[aria-label="Retry loading nota library"]').text()).toContain('Retry')
    expect(wrapper.get('[data-testid="nota-list"]').text()).toBe('1')
    expect(mountedStore.items).toEqual([priorNota])
    wrapper.unmount()
  })
})
