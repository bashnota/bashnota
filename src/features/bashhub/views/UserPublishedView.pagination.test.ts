import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserPublishedView from './UserPublishedView.vue'
import type { PublishedNota } from '@/features/nota/types/nota'

const publications: PublishedNota[] = Array.from({ length: 125 }, (_, index) => ({
  id: `publication-${index}`,
  title: `Publication ${index}`,
  content: { type: 'doc' },
  authorId: 'owner-1',
  authorName: 'Portfolio Owner',
  authorTag: 'portfolio_owner',
  isPublic: true,
  isSubPage: false,
  parentId: null,
  tags: [],
  citations: [],
  publishedSubPages: [],
  publishedAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  viewCount: index + 1,
  likeCount: 1,
  dislikeCount: 0,
  cloneCount: 2,
  commentCount: 0,
}))

const doubles = vi.hoisted(() => ({
  getPublishedNotasByUser: vi.fn(),
  getPublicProfile: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { userId: 'owner-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    getPublishedNotasByUser: doubles.getPublishedNotasByUser,
    loadNota: vi.fn(),
    unpublishNota: vi.fn(),
  }),
}))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: false, currentUser: null }),
}))

vi.mock('@/features/auth/services/supabaseAuth', () => ({
  supabaseAuthService: {
    getPublicProfile: doubles.getPublicProfile,
  },
}))

vi.mock('@/services/toast', () => ({ toast: vi.fn() }))

describe('UserPublishedView complete portfolio totals', () => {
  beforeEach(() => {
    doubles.getPublishedNotasByUser.mockReset().mockResolvedValue(publications)
    doubles.getPublicProfile.mockReset().mockResolvedValue({
      userId: 'owner-1',
      userTag: 'portfolio_owner',
      displayName: 'Portfolio Owner',
      photoUrl: '',
      updatedAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('labels and calculates statistics from all 125 cursor-loaded publications', async () => {
    const wrapper = mount(UserPublishedView)
    await flushPromises()

    expect(doubles.getPublishedNotasByUser).toHaveBeenCalledWith('owner-1', 'portfolio_owner')
    expect(wrapper.text()).toContain('125 Publications')
    expect(wrapper.text()).toContain('7875 Views')
    expect(wrapper.text()).toContain('125 Likes')
    expect(wrapper.text()).toContain('250 Clones')
  })

  it('renders the public display name for a profile with no publications', async () => {
    doubles.getPublishedNotasByUser.mockResolvedValueOnce([])
    doubles.getPublicProfile.mockResolvedValueOnce({
      userId: 'owner-1',
      userTag: 'portfolio_owner',
      displayName: 'Zero Publication Owner',
      photoUrl: '',
      updatedAt: '2026-09-01T00:00:00.000Z',
    })

    const wrapper = mount(UserPublishedView)
    await flushPromises()

    expect(wrapper.text()).toContain('Zero Publication Owner')
    expect(wrapper.text()).toContain('No Published Notas')
    expect(wrapper.text()).not.toContain('Failed to load')
  })

  it('distinguishes a profile outage and retries it without showing an empty portfolio', async () => {
    doubles.getPublicProfile
      .mockRejectedValueOnce(new Error('profile service unavailable'))
      .mockResolvedValueOnce({
        userId: 'owner-1',
        userTag: 'portfolio_owner',
        displayName: 'Recovered Owner',
        photoUrl: '',
        updatedAt: '2026-09-01T00:00:00.000Z',
      })
    doubles.getPublishedNotasByUser.mockResolvedValueOnce([])

    const wrapper = mount(UserPublishedView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load public profile')
    expect(wrapper.text()).not.toContain("hasn't published any notas")

    const retry = wrapper.findAll('button').find(button => button.text() === 'Retry')
    expect(retry).toBeDefined()
    await retry!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Recovered Owner')
    expect(wrapper.text()).toContain('No Published Notas')
  })

  it('keeps a publication RPC outage distinct from a truthful empty portfolio', async () => {
    doubles.getPublishedNotasByUser
      .mockRejectedValueOnce(new Error('publication RPC unavailable'))
      .mockResolvedValueOnce([])

    const wrapper = mount(UserPublishedView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load published notas')
    expect(wrapper.text()).not.toContain("hasn't published any notas")

    const retry = wrapper.findAll('button').find(button => button.text() === 'Retry')
    expect(retry).toBeDefined()
    await retry!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No Published Notas')
    expect(wrapper.text()).toContain("hasn't published any notas")
  })
})
