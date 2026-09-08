import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import HelpDialog from './HelpDialog.vue'

const DialogContentStub = defineComponent({
  inheritAttrs: false,
  props: { closeClass: { type: [String, Array, Object], default: undefined } },
  template: `
    <section v-bind="$attrs">
      <button aria-label="Close" :class="closeClass" type="button">Close</button>
      <slot />
    </section>
  `,
})

const passthrough = { template: '<div><slot /></div>' }

function mountDialog() {
  return mount(HelpDialog, {
    props: { open: true },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: DialogContentStub,
        DialogHeader: passthrough,
        DialogTitle: { template: '<h2><slot /></h2>' },
        DialogDescription: { template: '<p><slot /></p>' },
        BookOpen: true,
        Search: true,
        Input: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Button: {
          inheritAttrs: false,
          template: '<button v-bind="$attrs" type="button"><slot /></button>',
        },
      },
    },
  })
}

describe('HelpDialog responsive structure', () => {
  it('uses a viewport-contained dialog with a collapsible mobile index and desktop rail', () => {
    const wrapper = mountDialog()
    const dialog = wrapper.get('[data-testid="help-dialog"]')

    expect(dialog.classes()).toEqual(
      expect.arrayContaining(['h-[calc(100dvh-1rem)]', 'w-[calc(100vw-1rem)]', 'overflow-hidden']),
    )

    const navigation = wrapper.get('[data-testid="help-topic-navigation"]')
    const article = wrapper.get('[data-testid="help-article"]')
    expect(navigation.classes()).toContain('data-[state=closed]:hidden')
    expect(navigation.classes()).toContain('md:max-h-none')
    expect(article.classes()).toEqual(expect.arrayContaining(['min-w-0', 'overflow-x-hidden']))

    const trigger = wrapper.get('[data-testid="help-mobile-topic-trigger"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.text()).toContain('Welcome to BashNota')
  })

  it('provides mobile-sized navigation and close targets', () => {
    const wrapper = mountDialog()

    expect(wrapper.get('label[for="help-search"]').text()).toBe('Search help topics')
    expect(wrapper.get('button[aria-label="Close"]').classes()).toEqual(
      expect.arrayContaining(['h-12', 'w-12']),
    )
    expect(wrapper.get('[data-testid="help-mobile-topic-trigger"]').classes()).toContain('min-h-12')
    expect(wrapper.get('[data-testid="help-topic-navigation"] button').classes()).toContain(
      'min-h-11',
    )
    expect(wrapper.get('[data-testid="help-footer"] button').classes()).toEqual(
      expect.arrayContaining(['min-h-11', 'w-full']),
    )
  })

  it('collapses the mobile index after topic selection and closes from the persistent footer', async () => {
    const wrapper = mountDialog()
    const editorTopic = wrapper.get('button[aria-current="page"]')
    expect(editorTopic.text()).toBe('Welcome to BashNota')

    const trigger = wrapper.get('[data-testid="help-mobile-topic-trigger"]')
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    const topic = wrapper
      .findAll('[data-testid="help-topic-navigation"] button')
      .find((button) => button.text() === 'Rich Text Editor Basics')
    expect(topic).toBeDefined()
    await topic!.trigger('click')
    expect(wrapper.get('[data-testid="help-article"] h1').text()).toBe('Rich Text Editor Basics')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.text()).toContain('Rich Text Editor Basics')

    await wrapper.get('[data-testid="help-footer"] button').trigger('click')
    await nextTick()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })
})
