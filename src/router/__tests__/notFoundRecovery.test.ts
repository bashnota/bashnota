import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { RouterView } from 'vue-router'

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({
    isInitialized: true,
    isAuthenticated: false,
    init: vi.fn(),
  }),
}))

import router from '@/router'

const recoveryActions = [
  ['Go Home', '/', 'home'],
  ['Open Settings', '/settings', 'settings'],
  ['home page', '/', 'home'],
  ['open settings', '/settings', 'settings'],
] as const

describe('NotFound recovery actions', () => {
  it.each(recoveryActions)('%s leaves the catch-all route', async (label, destination, expectedRoute) => {
    await router.push('/missing-nota')
    await router.isReady()

    const wrapper = mount({
      components: { RouterView },
      template: '<RouterView />',
    }, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    const link = wrapper.findAll('a').find((candidate) => candidate.text() === label)
    expect(link).toBeDefined()

    if (!link) {
      throw new Error(`Could not find the ${label} recovery action`)
    }

    expect(link.text()).toBe(label)
    expect(link.attributes('href')).toBe(`/bashnota${destination}`)

    const resolved = router.resolve(link.attributes('href')!.replace('/bashnota', '') || '/')

    expect(resolved.name).toBe(expectedRoute)
    expect(resolved.name).not.toBe('not-found')

    wrapper.unmount()
  })
})
