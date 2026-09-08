import { mount, shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SideToolbar from './SideToolbar.vue'
import StatusIndicator from './StatusIndicator.vue'

const toolbarProps = {
  isVisible: true,
  isReadOnly: false,
  isExecuting: false,
  isPublished: false,
  isReadyToExecute: true,
  isCodeVisible: true,
  hasUnsavedChanges: false,
  isCodeCopied: false,
  isConfigurationIncomplete: false,
}

function mountToolbar(isExecuting: boolean) {
  return mount(SideToolbar, {
    props: { ...toolbarProps, isExecuting },
    global: {
      stubs: {
        Tooltip: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('code execution lifecycle controls', () => {
  it('replaces Run with an enabled interrupt action for the whole running lifecycle', async () => {
    const wrapper = mountToolbar(true)
    const interrupt = wrapper.get('[aria-label="Interrupt execution"]')

    expect(interrupt.attributes('disabled')).toBeUndefined()
    await interrupt.trigger('click')
    await wrapper.get('[aria-label="Cancel execution"]').trigger('click')
    expect(wrapper.emitted('interrupt-execution')).toHaveLength(1)
    expect(wrapper.emitted('cancel-execution')).toHaveLength(1)
    expect(wrapper.emitted('execute-code')).toBeUndefined()
  })

  it('announces queued, interrupting, timed-out, and failed states with elapsed time', async () => {
    const wrapper = shallowMount(StatusIndicator, {
      props: {
        isExecuting: true,
        hasError: false,
        isPublished: false,
        executionState: 'queued',
        elapsedMs: 1250,
      },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('Queued · 1.3s')
    for (const [state, label] of [
      ['interrupting', 'Interrupting'],
      ['timed_out', 'Timed out'],
      ['failed', 'Failed'],
    ] as const) {
      await wrapper.setProps({ executionState: state })
      expect(wrapper.get('[role="status"]').text()).toContain(label)
    }
  })
})
