import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'
import NotaPane from '../NotaPane.vue'

const mocks = vi.hoisted(() => ({
  loadNota: vi.fn(),
  saveItem: vi.fn(),
  getCurrentNota: vi.fn(),
  closeTabInPane: vi.fn(),
  closePane: vi.fn(),
  setActivePane: vi.fn(),
  push: vi.fn(),
  panes: [] as Array<{
    id: string
    notaId: string | null
    isActive: boolean
    tabHistory: string[]
  }>,
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    loadNota: mocks.loadNota,
    saveItem: mocks.saveItem,
    getCurrentNota: mocks.getCurrentNota,
    getItem: mocks.getCurrentNota,
    toggleFavorite: vi.fn(),
    exportNota: vi.fn(),
  }),
}))
vi.mock('@/features/jupyter/stores/jupyterStore', () => ({
  useJupyterStore: () => ({ jupyterServers: [{}] }),
}))
vi.mock('@/features/editor/stores/codeExecutionStore', () => ({
  useCodeExecutionStore: () => ({ executeAll: vi.fn() }),
}))
vi.mock('@/features/editor/stores/editorStore', () => ({
  useEditorStore: () => ({
    activeEditor: null,
    setActiveEditor: vi.fn(),
    setActiveEditorComponent: vi.fn(),
  }),
}))
vi.mock('@/stores/layoutStore', () => ({
  useLayoutStore: () => ({
    panes: mocks.panes,
    draggedTab: null,
    setActivePane: mocks.setActivePane,
    closeTabInPane: mocks.closeTabInPane,
    closePane: mocks.closePane,
    splitPane: vi.fn(),
    openNotaInPane: vi.fn(),
    setDraggedTab: vi.fn(),
  }),
}))
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: mocks.push }) }
})
vi.mock('vue-sonner', () => ({ toast: vi.fn() }))
vi.mock('@/services/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }))

const nota = (id: string): Nota => ({
  id,
  title: `Nota ${id}`,
  parentId: null,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const stubs = {
  PaneTabs: { template: '<div />' },
  NotaEditor: { template: '<div data-testid="nota-editor" />' },
  BlockCommandMenu: { template: '<div><slot /></div>' },
  NotaConfigModal: { template: '<div />' },
  PublishNotaModal: { template: '<div />' },
}

describe('mounted NotaPane recovery states', () => {
  const notas = reactive<Record<string, Nota>>({})

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    Object.keys(notas).forEach((id) => delete notas[id])
    mocks.panes.splice(0)
    mocks.getCurrentNota.mockImplementation((id: string) => notas[id] ?? null)
    mocks.closeTabInPane.mockImplementation((paneId: string, notaId: string) => {
      const pane = mocks.panes.find((candidate) => candidate.id === paneId)
      if (!pane) return
      pane.tabHistory = pane.tabHistory.filter((id) => id !== notaId)
      if (pane.notaId === notaId) pane.notaId = pane.tabHistory.at(-1) ?? null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountPane = (id: string) => {
    const pane = reactive({ id: 'pane-missing', notaId: id, isActive: true, tabHistory: [id] })
    mocks.panes.push(pane)
    return mount(NotaPane, { props: { pane }, global: { stubs } })
  }

  const finishLoad = async () => {
    await flushPromises()
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
  }

  it('shows loading before a missing nota resolves, then presents accessible recovery actions', async () => {
    let resolveLoad: (value: null) => void = () => undefined
    mocks.loadNota.mockReturnValueOnce(
      new Promise<null>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const wrapper = mountPane('missing')

    expect(wrapper.get('[role="status"]').text()).toContain('Loading Nota')
    resolveLoad(null)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Nota not found')
    expect(wrapper.get('button').text()).toBe('Retry')
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Close stale tab')

    await wrapper.get('button:nth-of-type(2)').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ name: 'home' })
    wrapper.unmount()
  })

  it('presents an adapter rejection as a read error and preserves other panes when closing the stale tab', async () => {
    mocks.loadNota.mockRejectedValueOnce(new Error('Adapter unavailable'))
    const otherPane = { id: 'pane-other', notaId: 'other', isActive: false, tabHistory: ['other'] }
    mocks.panes.push(otherPane)
    const wrapper = mountPane('broken')
    await finishLoad()

    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to read nota')
    expect(wrapper.text()).toContain('Adapter unavailable')

    await wrapper.get('button:nth-of-type(3)').trigger('click')
    expect(mocks.closeTabInPane).toHaveBeenCalledWith('pane-missing', 'broken')
    expect(mocks.panes.find((pane) => pane.id === 'pane-other')).toEqual(otherPane)
    wrapper.unmount()
  })

  it('retries a failed read and renders the editor after the adapter succeeds', async () => {
    mocks.loadNota
      .mockRejectedValueOnce(new Error('Adapter unavailable'))
      .mockImplementationOnce(async (id: string) => {
        const loaded = nota(id)
        notas[id] = loaded
        return loaded
      })
    const wrapper = mountPane('retryable')
    await finishLoad()

    await wrapper.get('button').trigger('click')
    await finishLoad()

    expect(mocks.loadNota).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="nota-editor"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
