import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OAuthCallbackView from './OAuthCallbackView.vue'

const doubles = vi.hoisted(() => ({
  callback: vi.fn(async () => true),
  clearError: vi.fn(),
  replace: vi.fn(async () => undefined),
  query: { redirect: '/' } as { redirect?: string },
}))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({
    completeOAuthCallback: doubles.callback,
    clearError: doubles.clearError,
    errorMessage: null,
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: doubles.query }),
  useRouter: () => ({ replace: doubles.replace }),
}))

describe('OAuth callback view', () => {
  beforeEach(() => {
    doubles.callback.mockClear()
    doubles.clearError.mockClear()
    doubles.replace.mockClear()
    doubles.query.redirect = '/profile'
    window.history.replaceState({}, '', '/auth/callback?code=one-time-code&redirect=%2Fprofile')
  })

  it('exchanges the current callback URL and resumes an internal route', async () => {
    mount(OAuthCallbackView)
    await flushPromises()

    expect(doubles.callback).toHaveBeenCalledWith(expect.stringContaining('code=one-time-code'))
    expect(doubles.replace).toHaveBeenCalledWith('/profile')
  })

  it('rejects protocol-relative post-login redirects', async () => {
    doubles.query.redirect = '//attacker.example/path'
    mount(OAuthCallbackView)
    await flushPromises()

    expect(doubles.replace).toHaveBeenCalledWith('/')
  })

  it.each(['/\\attacker.example/path', '/%5c%5cattacker.example/path'])(
    'rejects backslash-confusable redirect %s',
    async redirect => {
      doubles.query.redirect = redirect
      mount(OAuthCallbackView)
      await flushPromises()
      expect(doubles.replace).toHaveBeenCalledWith('/')
    },
  )
})
