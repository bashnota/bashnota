import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import JupyterSettings from './JupyterSettings.vue'

const doubles = vi.hoisted(() => ({
  toast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('@/services/toast', () => ({
  toast: Object.assign(doubles.toast, {
    success: doubles.success,
    error: doubles.error,
  }),
}))

vi.mock('@/features/jupyter/services/jupyterService', () => ({
  JupyterService: class {
    testConnection = doubles.testConnection
    parseJupyterUrl = vi.fn()
  },
}))

const passthrough = { template: '<div><slot /></div>' }
const buttonStub = {
  inheritAttrs: false,
  template: '<button v-bind="$attrs" type="button"><slot /></button>',
}
const serverItemStub = defineComponent({
  props: ['server'],
  emits: ['remove', 'kernels-updated'],
  template: `
    <button type="button" :aria-label="'Request removal of ' + server.ip" @click="$emit('remove', server)">
      Request removal
    </button>
  `,
})

function mountSettings() {
  return mount(JupyterSettings, {
    global: {
      plugins: [createPinia()],
      stubs: {
        Card: passthrough,
        CardHeader: passthrough,
        CardTitle: { template: '<h2><slot /></h2>' },
        CardDescription: { template: '<p><slot /></p>' },
        CardContent: passthrough,
        Button: buttonStub,
        Input: { template: '<input />' },
        Label: { template: '<label><slot /></label>' },
        ServerListItem: serverItemStub,
        AlertDialog: {
          props: ['open'],
          template: '<div v-if="open" data-testid="destructive-dialog"><slot /></div>',
        },
        AlertDialogContent: passthrough,
        AlertDialogHeader: passthrough,
        AlertDialogTitle: { template: '<h2><slot /></h2>' },
        AlertDialogDescription: { template: '<p><slot /></p>' },
        AlertDialogFooter: passthrough,
        AlertDialogCancel: buttonStub,
        AlertDialogAction: buttonStub,
        Plus: true,
        Link: true,
        Server: true,
        RotateCw: true,
      },
    },
  })
}

describe('JupyterSettings destructive actions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('uses an accessible confirmation dialog to remove one exact server', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const wrapper = mountSettings()
    const store = useJupyterStore()
    store.addServer({ ip: '127.0.0.1', port: '8888', token: '' })
    store.addServer({ ip: 'localhost', port: '9999', token: '' })
    await wrapper.vm.$nextTick()

    await wrapper.get('[aria-label="Request removal of 127.0.0.1"]').trigger('click')
    expect(wrapper.get('[data-testid="destructive-dialog"]').text()).toContain(
      'Remove this Jupyter server?',
    )
    expect(wrapper.get('[data-testid="destructive-dialog"]').text()).toContain('127.0.0.1:8888')

    const confirm = wrapper
      .get('[data-testid="destructive-dialog"]')
      .findAll('button')
      .find((button) => button.text() === 'Remove server')!
    await confirm.trigger('click')

    expect(store.servers).toHaveLength(1)
    expect(store.servers[0]).toMatchObject({ ip: 'localhost', port: '9999' })
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('removes all servers with one confirmation and one result notification', async () => {
    const wrapper = mountSettings()
    const store = useJupyterStore()
    store.addServer({ ip: '127.0.0.1', port: '8888', token: '' })
    store.addServer({ ip: 'localhost', port: '9999', token: '' })
    await wrapper.vm.$nextTick()
    vi.clearAllMocks()

    const reset = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reset All Servers'))!
    await reset.trigger('click')
    const confirm = wrapper
      .get('[data-testid="destructive-dialog"]')
      .findAll('button')
      .find((button) => button.text() === 'Remove all servers')!
    await confirm.trigger('click')

    expect(store.servers).toEqual([])
    expect(doubles.toast).not.toHaveBeenCalled()
    expect(doubles.success).toHaveBeenCalledOnce()
    expect(doubles.success).toHaveBeenCalledWith('All Jupyter servers removed')
  })
})
