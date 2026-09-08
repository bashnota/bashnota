import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  notaStore: {
    getItem: vi.fn(),
    loadNota: vi.fn(),
  },
  layoutStore: {} as Record<string, any>,
}))

vi.mock('vue-router', () => ({
  NavigationFailureType: { duplicated: 16 },
  isNavigationFailure: vi.fn(() => false),
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => mocks.notaStore,
}))

vi.mock('@/stores/layoutStore', () => ({
  useLayoutStore: () => mocks.layoutStore,
}))

import {
  pendingNotaNavigationPane,
  useNotaNavigation,
} from '@/features/nota/composables/useNotaNavigation'

describe('useNotaNavigation', () => {
  beforeEach(() => {
    const first = { id: 'pane-a', notaId: 'parent', isActive: true, tabHistory: ['parent'] }
    const second = { id: 'pane-b', notaId: 'sibling', isActive: false, tabHistory: ['sibling'] }
    Object.assign(mocks.layoutStore, {
      panes: [first, second],
      activePane: 'pane-a',
      activePaneObj: first,
      getPane: vi.fn((id: string) => mocks.layoutStore.panes.find((pane: any) => pane.id === id)),
      setActivePane: vi.fn((id: string) => {
        mocks.layoutStore.activePane = id
        mocks.layoutStore.activePaneObj = mocks.layoutStore.getPane(id)
      }),
      openNotaInPane: vi.fn((notaId: string, paneId: string) => {
        const pane = mocks.layoutStore.getPane(paneId)
        pane.notaId = notaId
        if (!pane.tabHistory.includes(notaId)) pane.tabHistory.push(notaId)
        mocks.layoutStore.setActivePane(paneId)
      }),
    })
    mocks.notaStore.getItem.mockReset().mockReturnValue({ id: 'child' })
    mocks.notaStore.loadNota.mockReset()
    mocks.push.mockReset().mockResolvedValue(undefined)
  })

  it('routes with the intended pane registered, then commits that pane state', async () => {
    mocks.push.mockImplementation(async () => {
      expect(pendingNotaNavigationPane('child')).toBe('pane-b')
      return undefined
    })

    await useNotaNavigation().openNota('child', 'pane-b')

    expect(mocks.layoutStore.setActivePane).toHaveBeenCalledWith('pane-b')
    expect(mocks.push).toHaveBeenCalledWith({ name: 'nota', params: { id: 'child' } })
    expect(mocks.layoutStore.openNotaInPane).toHaveBeenCalledWith('child', 'pane-b')
    expect(mocks.layoutStore.getPane('pane-b').notaId).toBe('child')
    expect(pendingNotaNavigationPane('child')).toBeUndefined()
  })

  it('restores the pane and tab history when routing fails', async () => {
    mocks.push.mockRejectedValue(new Error('navigation failed'))

    await expect(useNotaNavigation().openNota('child', 'pane-b')).rejects.toThrow('navigation failed')

    expect(mocks.layoutStore.getPane('pane-b')).toMatchObject({
      notaId: 'sibling',
      tabHistory: ['sibling'],
    })
    expect(mocks.layoutStore.activePane).toBe('pane-a')
    expect(pendingNotaNavigationPane('child')).toBeUndefined()
  })

  it('does not mutate panes when the target cannot be loaded', async () => {
    mocks.notaStore.getItem.mockReturnValue(undefined)
    mocks.notaStore.loadNota.mockResolvedValue(undefined)

    await expect(useNotaNavigation().openNota('missing')).rejects.toThrow('no longer exists')
    expect(mocks.layoutStore.setActivePane).not.toHaveBeenCalled()
    expect(mocks.layoutStore.openNotaInPane).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
