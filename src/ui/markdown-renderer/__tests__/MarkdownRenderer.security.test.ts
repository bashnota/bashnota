import { flushPromises, mount } from '@vue/test-utils'
import DOMPurify from 'dompurify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarkdownRenderer from '../MarkdownRenderer.vue'

const rangeErrorAttack = `${'> '.repeat(2000)}<img src="javascript:alert(1)" onerror="window.markdownXss = true" style="position:fixed">` +
  '<script>window.markdownXss = true</script><a href="data:text/html,boom">visible fallback</a>'

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as typeof window & { markdownXss?: boolean }).markdownXss
})

describe('MarkdownRenderer security boundary', () => {
  it('renders a real marked RangeError payload only as visible text', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const persistedContent = rangeErrorAttack
    const wrapper = mount(MarkdownRenderer, { props: { content: persistedContent } })
    await flushPromises()

    const fallback = wrapper.get('[data-markdown-fallback]')
    expect(errorSpy).toHaveBeenCalledWith('Error processing markdown:', expect.any(RangeError))
    expect(fallback.text()).toContain('<img src="javascript:alert(1)"')
    expect(fallback.text()).toContain('visible fallback')
    expect(fallback.find('img').exists()).toBe(false)
    expect(fallback.find('script').exists()).toBe(false)
    expect(fallback.find('a').exists()).toBe(false)
    expect(fallback.find('[onerror], [style], [href], [src]').exists()).toBe(false)
    expect((window as typeof window & { markdownXss?: boolean }).markdownXss).toBeUndefined()
    expect(wrapper.props('content')).toBe(persistedContent)
  })

  it('preserves safe Markdown, links and highlighting while stripping active markup', async () => {
    const persistedContent = [
      '# Safe heading',
      '[safe link](https://example.com/docs) [relative link](/guide) [unsafe link](javascript:alert(1))',
      '<img src="https://example.com/safe.png" alt="safe"><img src="data:text/html,boom" onerror="window.markdownXss = true" style="position:fixed"><img src="//attacker.example/x"><img src="\\\\attacker.example\\x">',
      '<span class="fixed inset-0 z-50 hljs-keyword" style="position:fixed">styled token</span>',
      '```js',
      'const answer = 42',
      '```',
    ].join('\n\n')

    const wrapper = mount(MarkdownRenderer, { props: { content: persistedContent } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Safe heading')
    expect(wrapper.get('a[href="https://example.com/docs"]').text()).toBe('safe link')
    expect(wrapper.get('a[href="/guide"]').text()).toBe('relative link')
    expect(wrapper.findAll('a').find(link => link.text() === 'unsafe link')?.attributes('href')).toBeUndefined()
    expect(wrapper.find('img[src="https://example.com/safe.png"]').exists()).toBe(true)
    expect(wrapper.find('img[src^="data:"]').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('attacker.example')
    expect(wrapper.find('[onerror], [style], script, style, iframe, svg, form').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('fixed inset-0 z-50')
    expect(wrapper.get('span').attributes('class')).toBe('hljs-keyword')
    expect(wrapper.find('code.hljs').exists()).toBe(true)
    expect(wrapper.find('code .hljs-keyword').exists()).toBe(true)
    expect(wrapper.props('content')).toBe(persistedContent)
  })

  it('uses a private purifier even if the shared DOMPurify singleton is contaminated', async () => {
    const hook = (node: Element) => node.setAttribute('onmouseover', 'window.markdownXss = true')
    DOMPurify.addHook('afterSanitizeAttributes', hook)

    try {
      const wrapper = mount(MarkdownRenderer, { props: { content: '**safe**' } })
      await flushPromises()
      expect(wrapper.html()).toContain('<strong>safe</strong>')
      expect(wrapper.find('[onmouseover]').exists()).toBe(false)
    } finally {
      DOMPurify.removeHook('afterSanitizeAttributes', hook)
    }
  })
})
