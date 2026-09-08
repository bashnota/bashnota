import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublishNotaModal from './PublishNotaModal.vue'

const doubles = vi.hoisted(() => ({
  getSubPages: vi.fn(),
  loadPublishedNotas: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    getPublicLink: vi.fn(() => 'https://example.test/p/nota-1'),
    getSubPages: doubles.getSubPages,
    isPublished: vi.fn(() => true),
    loadPublishedNotas: doubles.loadPublishedNotas,
    publishNota: vi.fn(),
    unpublishNota: vi.fn(),
  }),
}))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}))

vi.mock('@/services/toast', () => ({ toast: doubles.toast }))

describe('PublishNotaModal publication reconciliation trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    doubles.getSubPages.mockResolvedValue([])
    doubles.loadPublishedNotas.mockResolvedValue(
      Array.from({ length: 125 }, (_, index) => `publication-${index}`),
    )
  })

  it('loads the complete publication set when the modal opens', async () => {
    const wrapper = shallowMount(PublishNotaModal, {
      props: { notaId: 'nota-1', open: false },
    })

    expect(doubles.loadPublishedNotas).not.toHaveBeenCalled()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(doubles.loadPublishedNotas).toHaveBeenCalledOnce()
    expect(doubles.getSubPages).toHaveBeenCalledWith('nota-1')
  })

  it('reports a failed refresh without turning it into an unhandled modal error', async () => {
    doubles.loadPublishedNotas.mockRejectedValueOnce(new Error('page two unavailable'))
    const wrapper = shallowMount(PublishNotaModal, {
      props: { notaId: 'nota-1', open: false },
    })

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(doubles.toast).toHaveBeenCalledWith(
      'Unable to refresh published status. Your existing status was kept.',
    )
    expect(doubles.getSubPages).toHaveBeenCalledWith('nota-1')
  })
})
