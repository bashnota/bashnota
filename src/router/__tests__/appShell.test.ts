import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loadEditorAppShell } = vi.hoisted(() => ({ loadEditorAppShell: vi.fn() }))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({
    isInitialized: true,
    isAuthenticated: false,
    init: vi.fn(),
  }),
}))
vi.mock('@/components/editorAppShellLoader', () => ({ loadEditorAppShell }))

import App from '@/App.vue'
import router from '@/router'
import { reportStorageAuthorityFailure, reportStorageAuthorityReady } from '@/services/storageAuthority'

const mountApp = () => mount(App, {
  global: {
    plugins: [router],
    stubs: { RouterView: { template: '<div data-test="route-view" />' } },
  },
})

describe('route-aware application shell', () => {
  beforeEach(async () => {
    reportStorageAuthorityReady('indexeddb', 'indexeddb')
    loadEditorAppShell.mockReset()
    loadEditorAppShell.mockResolvedValue({ template: '<div data-test="editor-shell" />' })
    await router.push('/')
  })

  it('blocks the library and offers retry or recovery after filesystem startup fails', async () => {
    reportStorageAuthorityFailure('filesystem', new Error('Permission denied for directory'))
    const wrapper = mountApp()
    await flushPromises()

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Permission denied for directory')
    expect(alert.text()).toContain('Retry')
    expect(alert.text()).toContain('Use IndexedDB instead')
    expect(wrapper.find('[data-test="route-view"]').exists()).toBe(false)
  })

  it('labels automatic memory fallback as temporary instead of IndexedDB', async () => {
    reportStorageAuthorityReady(undefined, 'memory')
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Temporary memory storage is active')
    expect(wrapper.get('[role="status"]').text()).toContain('lost when this tab closes')
    expect(wrapper.find('[data-test="route-view"]').exists()).toBe(true)
  })

  it.each([
    ['/', 'home'],
    ['/login', 'login'],
    ['/p/published-nota', 'public-nota'],
    ['/settings', 'settings-detail'],
  ])('mounts %s without the editor shell', async (destination, expectedRoute) => {
    await router.push(destination)
    const wrapper = mountApp()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(expectedRoute)
    expect(wrapper.find('[data-test="route-view"]').exists()).toBe(true)
  })

  it('classifies editor-capable routes for the lazy shell', () => {
    // Classification is static router metadata. Resolving it directly avoids
    // coupling this assertion to async navigation guards and lazy imports.
    expect(router.resolve('/nota/local-nota').meta.editorShell).toBe(true)
  })

  it('keeps an accessible loading state until the editor shell resolves', async () => {
    let resolveLoader: (component: object) => void = () => undefined
    loadEditorAppShell.mockImplementation(() => new Promise((resolve) => { resolveLoader = resolve }))
    await router.push('/nota/local-nota')
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Loading editor')
    resolveLoader({ template: '<div data-test="editor-shell" />' })
    await flushPromises()
    expect(wrapper.find('[data-test="editor-shell"]').exists()).toBe(true)
  }, 10_000)

  it('shows recovery after a rejected editor chunk and retries the loader', async () => {
    loadEditorAppShell.mockRejectedValue(new Error('chunk unavailable'))
    await router.push('/nota/local-nota')
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('chunk unavailable')
    loadEditorAppShell.mockResolvedValue({ template: '<div data-test="editor-shell" />' })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="editor-shell"]').exists()).toBe(true)
  })
})
