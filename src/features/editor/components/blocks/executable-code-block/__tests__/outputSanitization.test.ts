import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import OutputRenderer from '../OutputRenderer.vue'
import ErrorDisplay from '../ErrorDisplay.vue'
import { sanitizeExecutionOutput } from '@/features/editor/utils/sanitizeExecutionOutput'

const executionOutput = vi.hoisted(() => ({ value: '' }))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    getCurrentNota: () => ({ title: 'Test nota' }),
  }),
}))

vi.mock('@/features/editor/stores/codeExecutionStore', () => ({
  useCodeExecutionStore: () => ({
    registerCodeCells: vi.fn(),
    getCellById: () => ({ output: executionOutput.value, hasError: false }),
  }),
}))

vi.mock('@/features/nota/stores/blockStore', () => ({
  useBlockStore: () => ({
    loadNotaBlocks: async () => [{
      id: 'block-1',
      type: 'executableCodeBlock',
      output: executionOutput.value,
      content: '',
      language: 'python',
    }],
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({}),
  useRouter: () => ({}),
}))

vi.mock('@/services/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}))

import CodeBlockOutputView from '@/features/editor/views/CodeBlockOutputView.vue'

const unsafeInlineOutput = '<strong onerror="alert(2)">unsafe</strong><a href="javascript:alert(3)">bad</a><strong>safe</strong><pre><code class="language-python">print(1)</code></pre>'
const unsafeTextOutput = '<strong onerror="alert(2)">unsafe</strong><strong>safe</strong><pre><code class="language-python">print(1)</code></pre>'
const maliciousOutput = `<script>alert(1)</script>${unsafeInlineOutput}`
const policyBypasses = [
  '<img src="data:text/html,<script>alert(1)</script>">',
  '<svg><a href="data:text/html,<script>alert(2)</script>">svg payload</a></svg>',
  '<strong style="background:url(javascript:alert(3))">styled javascript</strong>',
  '<strong style="background:url(data:text/html,<script>alert(4)</script>)">styled data</strong>',
]

const collapsibleStubs = {
  Collapsible: { template: '<div><slot /></div>' },
  CollapsibleTrigger: { template: '<div><slot /></div>' },
  CollapsibleContent: { template: '<div><slot /></div>' },
}

describe('execution output v-html sanitization', () => {
  it('sanitizes every OutputRenderer v-html path while retaining safe formatting', async () => {
    const text = mount(OutputRenderer, {
      props: { content: unsafeTextOutput, type: 'text' },
    })
    await flushPromises()

    const textOutput = text.find('.text-output')
    expect(textOutput.html()).not.toMatch(/onerror=/i)
    expect(textOutput.html()).toContain('<strong>safe</strong>')
    expect(textOutput.html()).toContain('<pre><code class="language-python">print(1)</code></pre>')

    const json = mount(OutputRenderer, {
      props: { content: JSON.stringify({ output: maliciousOutput }), type: 'json' },
    })
    await flushPromises()

    const jsonOutput = json.find('.json-viewer pre')
    expect(jsonOutput.html()).not.toContain('<script')
    expect(jsonOutput.html()).not.toMatch(/onerror=/i)
    expect(jsonOutput.html()).not.toMatch(/href="javascript:/i)
    expect(jsonOutput.html()).toContain('json-key')

    const error = mount(OutputRenderer, {
      props: { content: `Error: ${maliciousOutput}`, type: 'error' },
    })
    await flushPromises()

    const errorOutput = error.find('.error-output-container')
    expect(errorOutput.html()).not.toContain('<script')
    expect(errorOutput.html()).not.toMatch(/onerror=/i)
    expect(errorOutput.html()).not.toMatch(/href="javascript:/i)
    expect(errorOutput.html()).toContain('code-line')
    expect(errorOutput.html()).toContain('line-content')
  })

  it('sanitizes ErrorDisplay error HTML while retaining its safe highlighted markup', () => {
    const wrapper = mount(ErrorDisplay, {
      props: { error: `Error: ${maliciousOutput}` },
      global: { stubs: collapsibleStubs },
    })

    expect(wrapper.html()).not.toContain('<script')
    expect(wrapper.html()).not.toMatch(/onerror=/i)
    expect(wrapper.html()).not.toMatch(/href="javascript:/i)
    expect(wrapper.html()).toContain('text-red-500')
    expect(wrapper.html()).toContain('<strong>safe</strong>')
  })

  it('routes persisted CodeBlockOutputView markup into the isolated renderer', async () => {
    executionOutput.value = maliciousOutput
    const wrapper = mount(CodeBlockOutputView, {
      props: { notaId: 'nota-1', blockId: 'block-1' },
    })
    await flushPromises()

    const iframe = wrapper.get('iframe')
    expect(iframe.attributes('sandbox')).toBe('allow-scripts')
    expect(iframe.attributes('srcdoc')).toContain(maliciousOutput)
  })

  it.each(policyBypasses)('blocks URL and style policy bypasses in mounted output: %s', attack => {
    const wrapper = mount(ErrorDisplay, {
      props: { error: `Error: ${attack}<span class="hljs-keyword">safe class</span>` },
      global: { stubs: collapsibleStubs },
    })

    const html = wrapper.find('pre').html()
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<svg')
    expect(html).not.toMatch(/\sstyle=/i)
    expect(html).not.toMatch(/(?:href|src|xlink:href)=/i)
    expect(html).not.toMatch(/(?:javascript|data):/i)
    expect(html).toContain('hljs-keyword')
  })

  it('uses a stable hook-free policy across successive sanitizer calls', () => {
    expect(sanitizeExecutionOutput(policyBypasses.join(''))).not.toMatch(/(?:style|href|src)=/i)
    expect(sanitizeExecutionOutput('<pre><code class="hljs language-python">print(1)</code></pre><strong>safe</strong>'))
      .toBe('<pre><code class="hljs language-python">print(1)</code></pre><strong>safe</strong>')
  })

  it('restricts persisted classes to syntax, ANSI, and output table vocabularies', () => {
    const sanitized = sanitizeExecutionOutput(`
      <div class="fixed inset-0 z-50 code-line error-line">line</div>
      <span class="hljs-keyword language-python ansi-fg-196 ansi-bold">safe</span>
      <table class="absolute"><tbody><tr><td class="w-screen">cell</td></tr></tbody></table>
    `)

    expect(sanitized).not.toMatch(/\b(?:fixed|inset-0|z-50|absolute|w-screen)\b/)
    expect(sanitized).toContain('class="code-line error-line"')
    expect(sanitized).toContain('class="hljs-keyword language-python ansi-fg-196 ansi-bold"')
    expect(sanitized).toContain('<table><tbody><tr><td>cell</td></tr></tbody></table>')
  })
})
