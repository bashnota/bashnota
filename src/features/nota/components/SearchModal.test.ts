import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchModal from './SearchModal.vue'

const doubles = vi.hoisted(() => ({
  push: vi.fn(),
  deleteNota: vi.fn(),
  toggleFavorite: vi.fn(),
  selectNota: vi.fn(),
}))

const nota = {
  id: 'nota-1',
  title: 'A very long responsive nota title',
  favorite: false,
  tags: ['mobile', 'design'],
  updatedAt: new Date('2026-08-31T12:00:00Z'),
}

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: doubles.push }),
}))
vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    items: [nota],
    loadNotas: vi.fn(),
    deleteItem: vi.fn(),
    updateNota: vi.fn(),
  }),
}))
vi.mock('@/features/nota/composables/useNotaActions', () => ({
  useNotaActions: () => ({
    deleteNota: doubles.deleteNota,
    toggleNotaFavorite: doubles.toggleFavorite,
  }),
}))
vi.mock('@/features/nota/composables/useNotaBatchActions', () => ({
  useNotaBatchActions: () => ({
    isProcessing: ref(false),
    batchToggleFavorite: vi.fn(),
    batchDelete: vi.fn(),
    batchAddTags: vi.fn(),
    batchRemoveTags: vi.fn(),
  }),
}))
vi.mock('@/features/nota/composables/useNotaList', () => ({
  useNotaList: () => ({
    localSearchQuery: ref(''),
    selectedQuickFilters: ref(new Set()),
    selectedTags: ref(new Set()),
    filterOptions: ref([]),
    availableTags: ref(['mobile', 'design']),
    activeFiltersCount: ref(0),
    currentSortOption: ref({ key: 'updated', label: 'Updated' }),
    sortDirection: ref('desc'),
    filteredAndSortedNotas: ref([nota]),
    hasSelection: ref(false),
    selectionCount: ref(0),
    currentPage: ref(1),
    totalPages: ref(1),
    paginatedItems: ref([nota]),
    paginationInfo: ref({ startItem: 1, endItem: 1, totalItems: 1 }),
    getVisiblePages: vi.fn(() => [1]),
    goToPage: vi.fn(),
    nextPage: vi.fn(),
    previousPage: vi.fn(),
    isAllSelected: ref(false),
    isIndeterminate: ref(false),
    handleSelectAll: vi.fn(),
    updateSearch: vi.fn(),
    toggleQuickFilter: vi.fn(),
    toggleTag: vi.fn(),
    handleSort: vi.fn(),
    handleSelectNota: doubles.selectNota,
    isNotaSelected: vi.fn(() => true),
    clearSelection: vi.fn(),
    getSelectedIds: vi.fn(() => []),
    getSelectedNotas: vi.fn(() => []),
    clearAllFilters: vi.fn(),
    formatDate: vi.fn(() => 'Aug 31, 2026'),
    getContentPreview: vi.fn(),
    SORT_OPTIONS: [],
  }),
}))

const DialogContentStub = defineComponent({
  inheritAttrs: false,
  props: { closeClass: { type: [String, Array, Object], default: undefined } },
  template: `
    <section v-bind="$attrs">
      <button aria-label="Close" :class="closeClass" type="button">Close</button>
      <slot />
    </section>
  `,
})

const passthrough = { template: '<div><slot /></div>' }

function mountModal() {
  return mount(SearchModal, {
    props: { open: true },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: DialogContentStub,
        DialogHeader: passthrough,
        DialogTitle: { template: '<h2><slot /></h2>' },
        DialogDescription: { template: '<p><slot /></p>' },
        AlertDialog: {
          props: ['open'],
          template: '<div v-if="open"><slot /></div>',
        },
        AlertDialogContent: { template: '<section><slot /></section>' },
        AlertDialogHeader: passthrough,
        AlertDialogTitle: { template: '<h2><slot /></h2>' },
        AlertDialogDescription: { template: '<p><slot /></p>' },
        AlertDialogFooter: passthrough,
        AlertDialogCancel: {
          inheritAttrs: false,
          template: '<button v-bind="$attrs" type="button"><slot /></button>',
        },
        AlertDialogAction: {
          inheritAttrs: false,
          template: '<button v-bind="$attrs" type="button"><slot /></button>',
        },
        SearchInput: {
          inheritAttrs: false,
          props: ['modelValue', 'size'],
          template: '<input aria-label="Search notas" />',
        },
        QuickFilters: { template: '<div>Quick filters</div>' },
        TagFilter: { template: '<div>Tags</div>' },
        NotaTable: { template: '<table />' },
        NotaQuickPreview: {
          props: ['open', 'nota'],
          template: '<aside v-if="open" data-testid="quick-preview-stub">{{ nota?.title }}</aside>',
        },
        BatchActionsToolbar: true,
        TableRow: passthrough,
        TableCell: passthrough,
        Checkbox: {
          inheritAttrs: false,
          template: '<button v-bind="$attrs" role="checkbox" type="button" />',
        },
        Button: {
          inheritAttrs: false,
          template: '<button v-bind="$attrs" type="button"><slot /></button>',
        },
        Badge: {
          inheritAttrs: false,
          template: '<span v-bind="$attrs"><slot /></span>',
        },
        Search: true,
        X: true,
        Loader2: true,
      },
    },
  })
}

describe('SearchModal responsive layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    doubles.deleteNota.mockResolvedValue(true)
  })

  it('constrains the dialog and gives filters and results intentional scroll ownership', () => {
    const wrapper = mountModal()
    expect(wrapper.get('[data-testid="search-dialog"]').classes()).toEqual(
      expect.arrayContaining(['h-[calc(100dvh-1rem)]', 'w-[calc(100vw-1rem)]', 'overflow-hidden']),
    )
    expect(wrapper.get('[data-testid="search-filters"]').classes()).toContain('flex-wrap')
    expect(wrapper.get('[data-testid="search-results"]').classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'overflow-y-auto', 'overflow-x-hidden']),
    )
    expect(wrapper.get('button[aria-label="Close"]').classes()).toEqual(
      expect.arrayContaining(['h-12', 'w-12']),
    )
  })

  it('renders phone cards with every result action at a 44px target size', async () => {
    const wrapper = mountModal()
    const cards = wrapper.get('[data-testid="search-result-cards"]')
    expect(cards.classes()).toContain('md:hidden')
    expect(wrapper.get('table').element.parentElement?.classList.contains('md:block')).toBe(true)

    for (const label of ['Preview', 'Favorite', 'Open', 'Delete']) {
      const action = cards.findAll('button').find((button) => button.text() === label)
      expect(action).toBeDefined()
      expect(action!.classes()).toContain('min-h-12')
    }

    const favorite = cards.findAll('button').find((button) => button.text() === 'Favorite')
    await favorite!.trigger('click')
    expect(doubles.toggleFavorite).toHaveBeenCalledWith('nota-1')

    const tag = cards.get('button[aria-pressed="false"]')
    expect(tag.element.tagName).toBe('BUTTON')
    expect(tag.text()).toBe('mobile')
  })

  it('opens a real preview surface without navigating away from search', async () => {
    const wrapper = mountModal()
    const preview = wrapper
      .get('[data-testid="search-result-cards"]')
      .findAll('button')
      .find((button) => button.text() === 'Preview')!

    await preview.trigger('click')

    expect(wrapper.get('[data-testid="quick-preview-stub"]').text()).toBe(nota.title)
    expect(doubles.push).not.toHaveBeenCalled()
  })

  it('cancels without deleting and confirms deletion for the exact nota', async () => {
    const wrapper = mountModal()
    const cards = wrapper.get('[data-testid="search-result-cards"]')
    const deleteAction = cards.findAll('button').find((button) => button.text() === 'Delete')!

    await deleteAction.trigger('click')
    expect(wrapper.get('[data-testid="delete-confirmation"]').text()).toContain(
      'A very long responsive nota title',
    )
    await wrapper.get('[data-testid="delete-confirmation"] button').trigger('click')
    expect(doubles.deleteNota).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="delete-confirmation"]').exists()).toBe(false)
    expect(cards.text()).toContain('A very long responsive nota title')

    await deleteAction.trigger('click')
    const confirm = wrapper
      .get('[data-testid="delete-confirmation"]')
      .findAll('button')
      .find((button) => button.text() === 'Delete nota')!
    await confirm.trigger('click')
    await flushPromises()
    expect(doubles.deleteNota).toHaveBeenCalledOnce()
    expect(doubles.deleteNota).toHaveBeenCalledWith('nota-1')
    expect(doubles.selectNota).toHaveBeenCalledWith('nota-1', false)
    expect(wrapper.find('[data-testid="delete-confirmation"]').exists()).toBe(false)
  })

  it('keeps the confirmation open when deletion fails so the user can retry or cancel', async () => {
    doubles.deleteNota.mockResolvedValueOnce(false)
    const wrapper = mountModal()
    const deleteAction = wrapper
      .get('[data-testid="search-result-cards"]')
      .findAll('button')
      .find((button) => button.text() === 'Delete')!

    await deleteAction.trigger('click')
    const confirm = wrapper
      .get('[data-testid="delete-confirmation"]')
      .findAll('button')
      .find((button) => button.text() === 'Delete nota')!
    await confirm.trigger('click')
    await flushPromises()

    expect(doubles.deleteNota).toHaveBeenCalledWith('nota-1')
    expect(doubles.selectNota).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="delete-confirmation"]').exists()).toBe(true)
  })
})
