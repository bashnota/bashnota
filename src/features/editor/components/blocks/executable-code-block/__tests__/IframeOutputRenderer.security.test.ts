import { flushPromises, mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IframeOutputRenderer from '../IframeOutputRenderer.vue'
import OutputRenderer from '../OutputRenderer.vue'
import { getTrustedIframeOutputHeight } from '../iframeOutputSecurity'

const hostileOutput = `
  <p id="safe-output">safe <strong>HTML</strong></p>
  <script>
    window.__isolatedScriptRan = true
    window.parent.localStorage.getItem('bashnota-token')
    window.parent.document.querySelector('[data-private]')
    window.parent.__bashnotaParentApi()
  </script>
`

const getMessageChannel = (srcdoc: string) => {
  const match = srcdoc.match(/const channel\s*=\s*("[^"]+")/)
  expect(match).not.toBeNull()
  return JSON.parse(match![1]) as string
}

const dispatchResize = (
  source: MessageEventSource | null,
  data: unknown,
) => {
  // jsdom drops a WindowProxy passed through MessageEventInit.source. Define
  // the read-only browser property explicitly so the mounted handler sees the
  // same source identity a real postMessage event provides.
  const event = new MessageEvent('message', { data })
  Object.defineProperty(event, 'source', { value: source })
  window.dispatchEvent(event)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('IframeOutputRenderer security boundary', () => {
  it('renders hostile persisted output in an opaque-origin srcdoc without parent document writes', async () => {
    const open = vi.spyOn(Document.prototype, 'open')
    const write = vi.spyOn(Document.prototype, 'write')
    const close = vi.spyOn(Document.prototype, 'close')

    const wrapper = mount(IframeOutputRenderer, {
      props: { content: hostileOutput, type: 'html' },
    })
    await flushPromises()

    const iframe = wrapper.get('iframe')
    const sandboxTokens = iframe.attributes('sandbox')!.split(/\s+/)
    const srcdoc = iframe.attributes('srcdoc')!

    expect(sandboxTokens).toEqual(['allow-scripts'])
    expect(sandboxTokens).not.toContain('allow-same-origin')
    expect(srcdoc).toContain('<p id="safe-output">safe <strong>HTML</strong></p>')
    expect(srcdoc).toContain('window.__isolatedScriptRan = true')
    expect(srcdoc).toContain("window.parent.localStorage.getItem('bashnota-token')")
    expect(open).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  })

  it('accepts only a source-bound, exact, finite and bounded resize message', async () => {
    const wrapper = mount(IframeOutputRenderer, {
      props: { content: '<p>safe</p>', type: 'html' },
    })
    await flushPromises()

    const iframe = wrapper.get('iframe')
    const element = iframe.element as HTMLIFrameElement
    const channel = getMessageChannel(iframe.attributes('srcdoc')!)
    const validData = { type: 'bashnota:iframe-output:resize', channel, height: 240 }
    const expectedSource = {} as Window
    const trustedEvent = (data: unknown, source: Window | null = expectedSource) => ({
      data,
      source,
    } as MessageEvent<unknown>)

    expect(getTrustedIframeOutputHeight(trustedEvent(validData), expectedSource, channel)).toBe(240)
    expect(getTrustedIframeOutputHeight(trustedEvent(validData, null), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent(validData), {} as Window, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent(null), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, type: 'other' }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, channel: 'other' }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: '240' }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: Number.NaN }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: Number.POSITIVE_INFINITY }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: 240.5 }), expectedSource, channel)).toBe(240.5)
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: 99 }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, height: 601 }), expectedSource, channel)).toBeNull()
    expect(getTrustedIframeOutputHeight(trustedEvent({ ...validData, extra: true }), expectedSource, channel)).toBeNull()

    dispatchResize(window, validData)
    expect(element.style.height).toBe('')
  })

  it.each([false, true])(
    'routes %s published state HTML output through the same opaque iframe',
    async (isPublished) => {
      const wrapper = mount(OutputRenderer, {
        props: {
          content: hostileOutput,
          type: 'html',
          isPublished,
        },
      })
      await flushPromises()

      const iframe = wrapper.get('iframe')
      expect(iframe.attributes('sandbox')).toBe('allow-scripts')
      expect(iframe.attributes('srcdoc')).toContain('window.__isolatedScriptRan = true')
    },
  )

  it('has no same-origin or parent-side document-write fallback in the renderer source', () => {
    const componentPath = resolve(
      process.cwd(),
      'src/features/editor/components/blocks/executable-code-block/IframeOutputRenderer.vue',
    )
    const source = readFileSync(componentPath, 'utf8')

    expect(source).not.toContain('allow-same-origin')
    expect(source).not.toMatch(/contentDocument|contentWindow\?\.document/)
    expect(source).not.toMatch(/\.write\s*\(/)
    expect(source).toContain(':srcdoc="iframeDocument"')
  })
})
