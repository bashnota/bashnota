import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import NewsletterModal from './NewsletterModal.vue'

vi.mock('../composables/useNewsletter', () => ({
  useNewsletter: () => ({ subscribeToNewsletter: vi.fn(), isSubscribing: false }),
}))

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

describe('NewsletterModal responsive layout', () => {
  it('keeps its scrollable content between a compact header and persistent action footer', () => {
    const wrapper = mount(NewsletterModal, {
      props: { open: true },
      global: {
        stubs: {
          Dialog: passthrough,
          DialogContent: DialogContentStub,
          DialogHeader: passthrough,
          DialogTitle: { template: '<h2><slot /></h2>' },
          DialogDescription: passthrough,
          DialogFooter: { template: '<footer><slot /></footer>' },
          Button: {
            inheritAttrs: false,
            template: '<button v-bind="$attrs" type="button"><slot /></button>',
          },
          Badge: passthrough,
          Skeleton: true,
          Mail: true,
          Zap: true,
          Shield: true,
          Coffee: true,
        },
      },
    })

    expect(wrapper.get('[data-testid="newsletter-dialog"]').classes()).toEqual(
      expect.arrayContaining([
        'h-[calc(100dvh-1rem)]',
        'w-[calc(100vw-1rem)]',
        'grid-rows-[auto_minmax(0,1fr)_auto]',
        'overflow-hidden',
      ]),
    )
    expect(wrapper.get('[data-testid="newsletter-dialog"]').classes()).toContain('sm:h-auto')
    expect(wrapper.get('[data-testid="newsletter-content"]').classes()).toEqual(
      expect.arrayContaining(['min-h-0', 'overflow-y-auto']),
    )
    expect(wrapper.get('button[aria-label="Close"]').classes()).toEqual(
      expect.arrayContaining(['h-12', 'w-12']),
    )
    expect(wrapper.get('footer button').classes()).toContain('min-h-12')
  })
})
