import { flushPromises, mount } from '@vue/test-utils'
import DOMPurify from 'dompurify'
import { describe, expect, it, vi } from 'vitest'
import TheoremBlock from '../TheoremBlock.vue'

const mathJax = vi.hoisted(() => ({
  init: vi.fn(async () => true),
  render: vi.fn<(value: string) => string>(),
}))

vi.mock('@/features/editor/composables/useMathJax', () => ({
  useMathJax: () => ({
    initMathJax: mathJax.init,
    isMathJaxLoaded: { value: true },
    renderLatexInline: mathJax.render,
  }),
}))

vi.mock('@/features/editor/pm', () => ({
  NodeViewWrapper: { template: '<div><slot /></div>' },
}))

vi.mock('@/services/logger', () => ({
  logger: {
    createPrefixedLogger: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn() }),
    error: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({ toast: vi.fn() }))

const mathJaxSvg = `
  <span><svg xmlns="http://www.w3.org/2000/svg" role="img" focusable="false" viewBox="0 -1 10 10" width="1em" height="1em" aria-hidden="true">
    <g fill="currentColor" stroke-width="0" data-mml-node="math"><use data-c="1D465" xlink:href="#MJX-TEX-I-1D465"></use><path id="MJX-TEX-I-1D465" data-c="1D465" d="M1 2" transform="scale(1)"></path></g>
  </svg></span>`

const attacks = [
  '<script>window.theoremXss = true</script>',
  '<img src=x onerror="window.theoremXss = true">',
  '<a href="javascript:window.theoremXss = true">link</a>',
  '<svg><foreignObject><img onerror="window.theoremXss = true"></foreignObject><use xlink:href="data:text/html,boom"></use></svg>',
  '<svg><use xlink:href="https://attacker.example/glyph.svg#x"></use><use xlink:href="//attacker.example/glyph.svg#x"></use></svg>',
  '<strong style="background:url(javascript:alert(1))">styled</strong>',
  '<form action="/steal"><input></form><embed src="data:text/html,boom">',
]

const globalStubs = {
  Card: { template: '<section><slot /></section>' },
  CardHeader: { template: '<header><slot /></header>' },
  CardContent: { template: '<main><slot /></main>' },
  Badge: { template: '<span><slot /></span>' },
  Button: { template: '<button><slot /></button>' },
  Collapsible: { template: '<section><slot /></section>' },
  CollapsibleContent: { template: '<section><slot /></section>' },
  CollapsibleTrigger: { template: '<button><slot /></button>' },
  ChevronRight: true,
  ChevronDown: true,
}

function mountTheorem(content: string, proof: string) {
  const node = {
    attrs: { title: 'Safe theorem', content, proof, type: 'theorem', number: 1 },
    nodeSize: 1,
  }
  const wrapper = mount(TheoremBlock, {
    props: {
      node: node as any,
      editor: { isEditable: false, chain: () => ({ focus: () => ({ insertContentAt: () => ({ run: vi.fn() }) }) }) } as any,
      updateAttributes: vi.fn(),
      deleteNode: vi.fn(),
      getPos: () => 0,
      selected: false,
      decorations: [],
      innerDecorations: [],
      view: {} as any,
      extension: {},
      HTMLAttributes: {},
    },
    global: { stubs: globalStubs },
  })
  return { node, wrapper }
}

describe('TheoremBlock rendered content sanitization', () => {
  it('sanitizes persisted statement and proof source and preserves safe MathJax SVG', async () => {
    mathJax.render.mockImplementation(content => `${content
      .replace(/\$\$x\$\$/g, `<div class="mathjax-display-wrapper">${mathJaxSvg}</div>`)
      .replace(/\$x\$/g, mathJaxSvg)}
      <svg><use xlink:href="javascript:window.theoremXss = true"></use><use xlink:href="https://attacker.example/glyph.svg#x"></use><use xlink:href="//attacker.example/glyph.svg#x"></use><foreignObject>boom</foreignObject></svg>
      <span style="position:fixed">overlay</span><form><input></form>`)

    const persistedStatement = `Statement ${attacks.join('')}\n\nSecond paragraph with <strong>bold</strong> and $x$`
    const persistedProof = `Proof ${attacks.join('')}\nA second line with <em>emphasis</em> and $$x$$`
    const { node, wrapper } = mountTheorem(persistedStatement, persistedProof)
    await flushPromises()

    const html = wrapper.html()
    const renderedHtml = wrapper.findAll('.mixed-content-wrapper').map(display => display.html()).join('')
    expect(wrapper.findAll('.mixed-content-wrapper')).toHaveLength(2)
    expect(renderedHtml).not.toMatch(/<\/?(?:img|form|input|embed|foreignObject)\b/i)
    expect(renderedHtml).not.toMatch(/\son\w+=/i)
    expect(renderedHtml).not.toMatch(/\s(?:href|src|style)=/i)
    expect(renderedHtml).not.toMatch(/(?:javascript|data):/i)
    expect(html).toContain('<p>Statement')
    expect(html).toContain('<p>Second paragraph with <strong>bold</strong>')
    expect(html).toContain('<br>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('<span><svg')
    expect(html).toContain('class="mathjax-display-wrapper"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('xlink:href="#MJX-TEX-I-1D465"')
    expect(html).toContain('d="M1 2"')
    expect(renderedHtml).not.toContain('attacker.example')
    // Rendering is a view concern: neither theorem attribute is rewritten.
    expect(node.attrs.content).toBe(persistedStatement)
    expect(node.attrs.proof).toBe(persistedProof)
  })

  it('sanitizes statement and proof through the renderer-error fallback', async () => {
    mathJax.render.mockImplementation(() => {
      throw new Error('renderer failure')
    })

    const persistedStatement = `Fallback statement ${attacks.join('')}\n\nSafe paragraph <strong>bold</strong>`
    const persistedProof = `Fallback proof ${attacks.join('')}\nSafe line <em>emphasis</em>`
    const { node, wrapper } = mountTheorem(persistedStatement, persistedProof)
    await flushPromises()

    const html = wrapper.html()
    const renderedHtml = wrapper.findAll('.mixed-content-wrapper').map(display => display.html()).join('')
    expect(wrapper.findAll('.mixed-content-wrapper')).toHaveLength(2)
    expect(html).toContain('Fallback statement')
    expect(html).toContain('Fallback proof')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('<br>')
    expect(renderedHtml).not.toMatch(/<\/?(?:img|svg|form|input|embed|foreignObject)\b/i)
    expect(renderedHtml).not.toMatch(/\son\w+=|\s(?:href|src|style)=|(?:javascript|data):/i)
    expect(node.attrs.content).toBe(persistedStatement)
    expect(node.attrs.proof).toBe(persistedProof)
  })

  it('uses a private hook-free purifier even if the shared singleton is contaminated', async () => {
    mathJax.render.mockImplementation(content => content.replace(/\$x\$/g, mathJaxSvg))
    const hook = (node: Element) => node.setAttribute('onmouseover', 'window.theoremXss = true')
    DOMPurify.addHook('afterSanitizeAttributes', hook)

    try {
      const { wrapper } = mountTheorem('Safe $x$', 'Proof $x$')
      await flushPromises()
      expect(wrapper.html()).not.toMatch(/\sonmouseover=/i)
    } finally {
      DOMPurify.removeHook('afterSanitizeAttributes', hook)
    }
  })
})
