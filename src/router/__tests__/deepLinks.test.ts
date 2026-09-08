import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({
    isInitialized: true,
    isAuthenticated: false,
    init: vi.fn(),
  }),
}))

import router from '@/router'

const destinations = [
  ['/p/public-nota', 'public-nota'],
  ['/auth/callback?code=oauth-code&next=%2Fnota%2Flocal%252Fid', 'auth-callback'],
  ['/auth/reset-password?token=recovery-token', 'auth-reset-password'],
  ['/settings/advanced?tab=storage', 'settings-detail'],
  ['/nota/local%2Ffolder%2Fnotebook%20one?focus=block%3A1#cell-2', 'nota'],
  ['/@alice/research%2Fnotes?ref=shared#discussion', 'user-tag-nota'],
] as const

describe('GitHub Pages deep-link destinations', () => {
  it.each(destinations)('resolves %s through the real route table as %s', (destination, expectedRoute) => {
    const resolved = router.resolve(destination)

    expect(resolved.name).toBe(expectedRoute)
    expect(resolved.fullPath).toBe(destination)
    expect(resolved.href).toBe(`/bashnota${destination}`)
  })
})
