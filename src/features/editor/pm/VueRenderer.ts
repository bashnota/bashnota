/**
 * VueRenderer — mount a standalone Vue component and drive it imperatively.
 *
 * An in-house Vue renderer used by the
 * suggestion popups (e.g. SubNotaLinkSlashCommand) that render a Vue list into a
 * detached element handed to tippy.js. The API surface the call sites rely on is
 * reproduced exactly:
 *   - `new VueRenderer(component, { props, editor })`
 *   - `.element`   — the rendered root DOM element (for tippy `content`)
 *   - `.ref`       — the component's exposed API (Composition `defineExpose`)
 *   - `.updateProps(props)` — patch reactive props and re-render
 *   - `.destroy()` — unmount
 *
 * When `editor.appContext` is present, the mounted component inherits the host
 * app's plugins/provides, including Pinia and global components.
 */
import { h, markRaw, reactive, render } from 'vue'
import type { Component, VNode } from 'vue'

export interface VueRendererOptions {
  props?: Record<string, any>
  editor: any
}

interface RenderedComponent {
  vNode: VNode | null
  destroy: () => void
  el: Element | null
}

export class VueRenderer {
  private readonly editor: any
  private readonly component: Component
  private el: HTMLElement | null
  private readonly props: Record<string, any>
  private renderedComponent: RenderedComponent

  constructor(component: Component, { props = {}, editor }: VueRendererOptions) {
    this.editor = editor
    this.component = markRaw(component) as Component
    this.el = document.createElement('div')
    this.props = reactive(props)
    this.renderedComponent = this.renderComponent()
  }

  get element(): Element | null {
    return this.renderedComponent.el
  }

  get ref(): any {
    // Composition API — the component's `defineExpose` surface.
    if (this.renderedComponent.vNode?.component?.exposed) {
      return this.renderedComponent.vNode.component.exposed
    }
    // Options API fallback.
    return this.renderedComponent.vNode?.component?.proxy
  }

  private renderComponent(): RenderedComponent {
    let vNode: VNode | null = h(this.component, this.props)

    if (this.editor?.appContext) {
      vNode.appContext = this.editor.appContext
    }

    if (typeof document !== 'undefined' && this.el) {
      render(vNode, this.el)
    }

    const destroy = () => {
      if (this.el) {
        render(null, this.el)
      }
      this.el = null
      vNode = null
    }

    return { vNode, destroy, el: this.el ? this.el.firstElementChild : null }
  }

  updateProps(props: Record<string, any> = {}): void {
    Object.entries(props).forEach(([key, value]) => {
      this.props[key] = value
    })
    // Re-render into the same element without swapping the
    // stored handle, so `.element` stays stable across prop updates.
    this.renderComponent()
  }

  destroy(): void {
    this.renderedComponent.destroy()
  }
}

export default VueRenderer
