import { beforeEach, describe, expect, it, vi } from 'vitest'

const doubles = vi.hoisted(() => ({
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  toggleFavorite: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: doubles.push }),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    createItem: doubles.createItem,
    deleteItem: doubles.deleteItem,
    toggleFavorite: doubles.toggleFavorite,
  }),
}))

vi.mock('@/services/toast', () => ({
  toast: doubles.toast,
}))

import { useNotaActions } from '../useNotaActions'

describe('useNotaActions notification ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not duplicate the store success notification when creating a nota', async () => {
    doubles.createItem.mockResolvedValue({ id: 'nota-1' })

    const { createNewNota } = useNotaActions()

    await expect(createNewNota()).resolves.toBe('nota-1')
    expect(doubles.push).toHaveBeenCalledWith('/nota/nota-1')
    expect(doubles.toast).not.toHaveBeenCalled()
  })

  it('does not duplicate store success notifications for delete and favorite actions', async () => {
    doubles.deleteItem.mockResolvedValue(undefined)
    doubles.toggleFavorite.mockResolvedValue(undefined)

    const { deleteNota, toggleNotaFavorite } = useNotaActions()

    await expect(deleteNota('nota-1')).resolves.toBe(true)
    await expect(toggleNotaFavorite('nota-1')).resolves.toBe(true)
    expect(doubles.toast).not.toHaveBeenCalled()
  })
})
