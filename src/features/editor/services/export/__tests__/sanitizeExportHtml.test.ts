import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { buildHtmlPage } from '../templates/defaultTemplate'
import { markGeneratedKatex, sanitizeExportHtml, sanitizeExportSourceHtml } from '../sanitizeExportHtml'

function renderedKatex(latex: string): Element {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false })
  markGeneratedKatex(wrapper)
  return wrapper
}

function katexLayout(element: ParentNode) {
  return Array.from(element.querySelectorAll('[class], [style]')).map(node => ({
    className: node.getAttribute('class'),
    style: node.getAttribute('style'),
  }))
}

describe('export KaTeX trust boundary', () => {
  it.each([
    ['superscript', 'x^2'],
    ['fraction', '\\frac{a}{b}'],
    ['matrix', '\\begin{matrix}a&b\\\\c&d\\end{matrix}'],
    ['alignment', '\\begin{aligned}a&=b\\\\c&=d\\end{aligned}'],
    ['delimiters', '\\left\\lbrace \\frac{a}{b} \\right\\rbrace'],
    ['braces and over', '{a+b}\\over{c+d}'],
    ['radical SVG', '\\sqrt{x}'],
    ['arrow SVG', '\\overrightarrow{AB}'],
  ])('retains real KaTeX classes and layout styles for %s', (_name, latex) => {
    const generated = renderedKatex(latex)
    const expectedLayout = katexLayout(generated)
    const sanitized = new DOMParser().parseFromString(sanitizeExportHtml(generated.outerHTML), 'text/html')

    expect(sanitized.querySelector('.katex-display')).not.toBeNull()
    expect(katexLayout(sanitized.body)).toEqual(expectedLayout)
    expect(sanitized.body.innerHTML).not.toContain('data-export-generated-katex')
  })

  it.each(['\\sqrt{x}', '\\overrightarrow{AB}', '\\widehat{abc}'])(
    'retains only the SVG geometry emitted by KaTeX for %s',
    latex => {
      const generated = renderedKatex(latex)
      const expectedSvgs = Array.from(generated.querySelectorAll('svg')).map(svg => ({
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        viewBox: svg.getAttribute('viewBox'),
        preserveAspectRatio: svg.getAttribute('preserveAspectRatio'),
        paths: Array.from(svg.querySelectorAll('path'), path => path.getAttribute('d')),
      }))
      const sanitized = new DOMParser().parseFromString(sanitizeExportHtml(generated.outerHTML), 'text/html')
      const actualSvgs = Array.from(sanitized.querySelectorAll('svg')).map(svg => ({
        width: svg.getAttribute('width'),
        height: svg.getAttribute('height'),
        viewBox: svg.getAttribute('viewBox'),
        preserveAspectRatio: svg.getAttribute('preserveAspectRatio'),
        paths: Array.from(svg.querySelectorAll('path'), path => path.getAttribute('d')),
      }))

      expect(expectedSvgs.length).toBeGreaterThan(0)
      expect(actualSvgs).toEqual(expectedSvgs)
      expect(sanitized.querySelector('svg [href], svg [style], svg script, svg foreignObject')).toBeNull()
    },
  )

  it('never lets persisted classes, styles, or a forged generated marker survive', () => {
    const stored = '<span data-export-generated-katex="true" class="katex fixed z-50 mord" style="position:fixed;top:0">x<svg viewBox="0 0 1 1"><path d="M0 0" onload="alert(1)"/></svg></span>'
    const source = sanitizeExportSourceHtml(stored)
    const page = buildHtmlPage('safe', stored)
    const parsed = new DOMParser().parseFromString(page, 'text/html')

    expect(source).toBe('<span>x</span>')
    expect(parsed.querySelector('article [class], article [style], article [data-export-generated-katex]')).toBeNull()
  })

  it('retains only the exact confusion-matrix transform inputs at the source boundary', () => {
    const stored = `<confusion-matrix
      data-matrix="[[1]]"
      data-labels='["safe"]'
      data-title="Matrix"
      data-output="&lt;img src=x onerror=alert(1)&gt;"
      data-matrix-data="{&quot;forged&quot;:true}"
      data-source="&lt;script&gt;alert(2)&lt;/script&gt;"
      class="confusion-matrix-block fixed z-50"
      style="position:fixed"
      onclick="alert(3)"
    ></confusion-matrix>`

    const source = new DOMParser().parseFromString(sanitizeExportSourceHtml(stored), 'text/html')
    const matrix = source.querySelector('confusion-matrix')!

    expect(matrix).not.toBeNull()
    expect(Array.from(matrix.attributes, attribute => attribute.name).sort()).toEqual([
      'data-labels', 'data-matrix', 'data-title',
    ])
    expect(sanitizeExportHtml(source.body.innerHTML)).not.toContain('confusion-matrix')
  })
})
