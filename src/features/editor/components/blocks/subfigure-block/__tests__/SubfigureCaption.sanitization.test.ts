import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DOMPurify from 'dompurify'
import SubfigureCaption from '../SubfigureCaption.vue'

vi.mock('@/services/logger', () => ({
  logger: { error: vi.fn() },
}))

const attacks = [
  '<img src=x onerror="window.captionXss = true">',
  '<a href="javascript:window.captionXss = true">link</a>',
  '<svg><a xlink:href="data:text/html,boom">svg</a></svg>',
  '<strong style="background:url(javascript:alert(1))">styled</strong>',
  '<form action="/steal"><input></form><embed src="data:text/html,boom">',
  '<span class="fixed inset-0 z-50 bg-black" style="position:fixed">overlay</span>',
]

const caption = (text: string) => ({
  label: 'Figure 1',
  caption: text,
  isLocked: false,
})

describe('SubfigureCaption rendered-caption sanitization', () => {
  it.each([true, false])('sanitizes stored caption markup at the %s v-html sink', isReadOnly => {
    const persistedCaption = `${attacks.join('')} <strong>bold</strong> <em>emphasis</em> $x^2$`
    const wrapper = mount(SubfigureCaption, {
      props: { modelValue: caption(persistedCaption), isReadOnly },
    })

    const html = wrapper.html()
    expect(html).not.toMatch(/<\/?(?:img|svg|form|input|embed)\b/i)
    expect(html).not.toMatch(/\son\w+=/i)
    expect(html).not.toMatch(/\s(?:href|src|xlink:href)=/i)
    expect(html).not.toContain('fixed inset-0 z-50 bg-black')
    expect(html).not.toMatch(/(?:javascript|data):/i)
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('class="katex"')
    expect(html).toContain('aria-hidden="true"')
    // Sanitizing happens only after reading the persisted data; rendering must
    // never rewrite the caption that will be saved on a later edit.
    expect(wrapper.props('modelValue').caption).toBe(persistedCaption)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps KaTeX layout classes and metrics while removing unsafe source markup', () => {
    const wrapper = mount(SubfigureCaption, {
      props: { modelValue: caption('<span class="caption">safe</span> $\\frac{1}{x^2}$'), isReadOnly: true },
    })

    expect(wrapper.html()).toContain('<span>safe</span>')
    expect(wrapper.html()).toContain('class="katex-html"')
    expect(wrapper.html()).not.toContain('<math')
    expect(wrapper.html()).toMatch(/style="(?:height|top):/)
  })

  it('uses a private hook-free purifier even if the shared singleton is contaminated', () => {
    const hook = (node: Element) => node.setAttribute('onmouseover', 'window.captionXss = true')
    DOMPurify.addHook('afterSanitizeAttributes', hook)

    try {
      const wrapper = mount(SubfigureCaption, {
        props: { modelValue: caption('<span>safe</span> $x^2$'), isReadOnly: true },
      })
      expect(wrapper.html()).not.toMatch(/\sonmouseover=/i)
    } finally {
      DOMPurify.removeHook('afterSanitizeAttributes', hook)
    }
  })
})
