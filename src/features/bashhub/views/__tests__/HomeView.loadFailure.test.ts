import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'

const storeState = vi.hoisted(() => ({
  rootItems: [] as Nota[],
  loadNotas: vi.fn(),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => storeState,
}))

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

import HomeView from '../HomeView.vue'

describe('HomeView authority load failures', () => {
  beforeEach(() => {
    storeState.rootItems = [{
      id: 'prior-nota', title: 'Last known good nota', parentId: null, tags: [],
      createdAt: new Date(), updatedAt: new Date(),
    }]
    storeState.loadNotas.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the failure visible with an accessible retry instead of rendering an empty success state', async () => {
    storeState.loadNotas
      .mockRejectedValueOnce(new Error('IndexedDB is unavailable'))
      .mockResolvedValueOnce(undefined)

    const wrapper = mount(HomeView, {
      global: {
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

    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your nota library')
    expect(wrapper.get('[data-testid="nota-list"]').text()).toBe('1')
    const retry = wrapper.get('button[aria-label="Retry loading nota library"]')
    expect(retry.text()).toContain('Retry')

    await retry.trigger('click')
    await flushPromises()

    expect(storeState.loadNotas).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
