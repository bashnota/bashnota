import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MessageItem from '../MessageItem.vue'

vi.mock('vue-sonner', () => ({ toast: vi.fn() }))

const rangeErrorAttack = `${'> '.repeat(2000)}<img src="javascript:alert(1)" onerror="window.remoteMessageXss = true" style="position:fixed">` +
  '<script>window.remoteMessageXss = true</script><a href="data:text/html,boom">remote persisted fallback</a>'

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as typeof window & { remoteMessageXss?: boolean }).remoteMessageXss
})

describe('MessageItem persisted assistant-message rendering', () => {
  it('routes remote assistant content through the fail-closed Markdown renderer without mutation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const remotePersistedMessage = {
      id: 'remote-assistant-1',
      role: 'assistant' as const,
      content: rangeErrorAttack,
      timestamp: new Date('2026-08-13T12:00:00Z'),
    }
    const originalSnapshot = { ...remotePersistedMessage }

    const wrapper = mount(MessageItem, {
      props: {
        message: remotePersistedMessage,
        providerName: 'Remote provider',
        timestamp: '12:00 PM',
      },
      global: {
        stubs: {
          Button: { template: '<button><slot /></button>' },
        },
      },
    })
    await flushPromises()

    const fallback = wrapper.get('.assistant-message[data-markdown-fallback]')
    expect(fallback.text()).toContain('remote persisted fallback')
    expect(fallback.find('img, script, a, [onerror], [style], [href], [src]').exists()).toBe(false)
    expect((window as typeof window & { remoteMessageXss?: boolean }).remoteMessageXss).toBeUndefined()
    expect(remotePersistedMessage).toEqual(originalSnapshot)
    expect(wrapper.emitted('copy')).toBeUndefined()
    expect(wrapper.emitted('insert')).toBeUndefined()
  })
})
