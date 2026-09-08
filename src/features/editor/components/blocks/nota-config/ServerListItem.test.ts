import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ServerListItem from './ServerListItem.vue'

const doubles = vi.hoisted(() => ({
  testConnection: vi.fn(),
  getAvailableKernels: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/features/jupyter/services/jupyterService', () => ({
  JupyterService: class {
    testConnection = doubles.testConnection
    getAvailableKernels = doubles.getAvailableKernels
  },
}))

vi.mock('@/services/toast', () => ({
  toast: {
    success: doubles.success,
    error: doubles.error,
  },
}))

const server = { ip: '127.0.0.1', port: '8888', token: '' }
const kernel = {
  name: 'python3',
  spec: { display_name: 'Python 3', language: 'python' },
}

describe('ServerListItem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    doubles.testConnection.mockResolvedValue({ success: true, message: 'Connection successful' })
    doubles.getAvailableKernels.mockResolvedValue([kernel])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses named single-layer controls and reports a successful refresh', async () => {
    const wrapper = mount(ServerListItem, { props: { server, kernels: [] } })
    await flushPromises()

    expect(wrapper.find('button button').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toBe('Online')
    expect(wrapper.get('[aria-label="Refresh kernels for 127.0.0.1:8888"]')).toBeTruthy()
    expect(wrapper.get('[aria-label="Remove Jupyter server 127.0.0.1:8888"]')).toBeTruthy()

    const details = wrapper.get('[aria-label="Show details for Jupyter server 127.0.0.1:8888"]')
    expect(details.attributes('aria-expanded')).toBe('false')
    await details.trigger('click')
    expect(
      wrapper
        .get('[aria-label="Hide details for Jupyter server 127.0.0.1:8888"]')
        .attributes('aria-expanded'),
    ).toBe('true')

    await wrapper.get('[aria-label="Refresh kernels for 127.0.0.1:8888"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('kernels-updated')).toEqual([[server, [kernel]]])
    expect(doubles.success).toHaveBeenCalledWith('Refreshed 127.0.0.1:8888', {
      description: 'Connected. 1 kernel available.',
    })
    wrapper.unmount()
  })

  it('shows and announces refresh failures without pretending kernels changed', async () => {
    doubles.getAvailableKernels.mockRejectedValueOnce(new Error('Kernel endpoint unavailable'))
    const wrapper = mount(ServerListItem, { props: { server, kernels: [] } })
    await flushPromises()

    await wrapper.get('[aria-label="Refresh kernels for 127.0.0.1:8888"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Offline')
    expect(wrapper.emitted('kernels-updated')).toBeUndefined()
    expect(doubles.error).toHaveBeenCalledWith('Could not refresh 127.0.0.1:8888', {
      description: 'Kernel endpoint unavailable',
    })
    wrapper.unmount()
  })

  it('does not poll while hidden and resumes when the page becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    const wrapper = mount(ServerListItem, { props: { server, kernels: [] } })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(doubles.testConnection).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(doubles.testConnection).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(30_000)
    expect(doubles.testConnection).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
