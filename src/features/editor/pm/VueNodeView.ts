/**
 * VueNodeView — the Vue-to-ProseMirror node view bridge.
 *
 * This bridge mounts
 * one Vue component per node instance and implements the full ProseMirror
 * `NodeView` contract. Node-view bugs surface as cursor jumps, swallowed
 * keystrokes and lost selection — the hardest editor bugs to diagnose — so every
 * contract member below documents exactly what breaks if it is wrong.
 *
 * Rendering uses a reactive props object passed
 * to `h(component, props)`, rendered with Vue's low-level `render(vNode, el)`,
 * and torn down with `render(null, el)`. When an `appContext` is supplied the
 * mounted component inherits the host app's plugins/provides (Pinia, global
 * components) by threading the host `appContext`.
 */
import { h, markRaw, reactive, render } from 'vue'
import type { AppContext, Component } from 'vue'
import type { Node as ProseMirrorNode } from 'prosemirror-model'
import type { EditorView, NodeView } from 'prosemirror-view'

/** The props every mounted node-view component receives. */
export interface VueNodeViewProps {
  node: ProseMirrorNode
  view: EditorView
  getPos: () => number | undefined
  selected: boolean
  /** Merge a partial attribute patch into this node. */
  updateAttributes: (attrs: Record<string, unknown>) => void
  /** Remove this node from the document. */
  deleteNode: () => void
  /**
   * The application editor handle used by block commands.
   */
  editor: unknown
}

export interface VueNodeViewOptions {
  node: ProseMirrorNode
  view: EditorView
  getPos: () => number | undefined
  component: Component
  /** Wrapper element tag. Defaults to `div`. */
  as?: string
  /** CSS class applied to the wrapper element. */
  className?: string
  /**
   * Pass-through editor handle; omit to get a view-backed shim.
   */
  editor?: unknown
  /** Host app context so the component sees the app's plugins/provides. */
  appContext?: AppContext | null
  /**
   * Selectors whose events the Vue component owns. Events targeting a match are
   * kept away from ProseMirror. Defaults cover the common interactive controls.
   */
  interactiveSelector?: string
}

const DEFAULT_INTERACTIVE_SELECTOR =
  'input, textarea, select, button, [contenteditable="true"], a[href]'

export class VueNodeView implements NodeView {
  /** The DOM node ProseMirror inserts for this node. Vue renders into it. */
  public dom: HTMLElement

  public node: ProseMirrorNode

  private readonly view: EditorView
  private readonly getPosFn: () => number | undefined
  private readonly component: Component
  private readonly interactiveSelector: string
  private readonly appContext?: AppContext | null

  /** Reactive props handed to the Vue component; mutating these re-renders it. */
  private readonly props: VueNodeViewProps
  /** Whether Vue is currently mounted into `dom` (guards double-destroy). */
  private mounted = false

  constructor(options: VueNodeViewOptions) {
    this.node = options.node
    this.view = options.view
    this.getPosFn = options.getPos
    this.component = markRaw(options.component) as Component
    this.interactiveSelector =
      options.interactiveSelector ?? DEFAULT_INTERACTIVE_SELECTOR
    this.appContext = options.appContext

    this.dom = document.createElement(options.as ?? 'div')
    this.dom.classList.add('pm-vue-node-view')
    if (options.className) this.dom.classList.add(options.className)
    // The Vue component owns everything inside this wrapper. Marking it
    // non-editable stops ProseMirror from treating the component's DOM as
    // editable document text (which would corrupt the doc on keypress).
    this.dom.contentEditable = 'false'

    const editor =
      options.editor ?? { commands: { focus: () => this.view.focus() } }

    this.props = reactive({
      node: options.node,
      view: this.view,
      getPos: this.getPosFn,
      selected: false,
      updateAttributes: (attrs: Record<string, unknown>) =>
        this.updateAttributes(attrs),
      deleteNode: () => this.deleteNode(),
      editor,
    }) as VueNodeViewProps

    this.mount()
  }

  private mount(): void {
    // A thin reactive wrapper: its render function reads the reactive `props`
    // (via spread), so ProseMirror-driven mutations to those props — a new node
    // from `update`, a flipped `selected` from selectNode — automatically
    // re-render the child component. Rendering the child directly with a
    // one-shot `render(h(component, props))` would NOT re-render on prop change,
    // because nothing would be re-invoking that render.
    const component = this.component
    const props = this.props
    const wrapper = {
      name: 'PmVueNodeViewRoot',
      setup() {
        return () => h(component, { ...props })
      },
    }
    const vNode = h(wrapper)
    if (this.appContext) {
      vNode.appContext = this.appContext
    }
    render(vNode, this.dom)
    this.mounted = true
  }

  /**
   * update — called by ProseMirror when the node at this position changes.
   * Returning `false` tells ProseMirror to destroy this view and build a new
   * one; returning `true` keeps it and lets us patch in place.
   *
   * WHAT BREAKS IF WRONG: if we return `true` for a node of a DIFFERENT type,
   * the view goes stale and renders the wrong content over the new node. So we
   * reject a type change and only accept same-type updates, pushing the new
   * node into the reactive props so the Vue component re-renders with fresh
   * attributes.
   */
  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    this.props.node = node
    return true
  }

  /**
   * stopEvent — return `true` for events the Vue component handles itself, so
   * ProseMirror does not also act on them.
   *
   * WHAT BREAKS IF WRONG: return `false` too eagerly and ProseMirror steals
   * clicks/keystrokes aimed at the component's inputs (typing in the URL field
   * moves the editor selection instead of the caret, or the field never
   * receives the key). Return `true` too eagerly and ProseMirror can no longer
   * select/drag the node from its chrome. We keep events that target an
   * interactive control inside our DOM, and let everything else through.
   */
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null
    if (!target || !this.dom.contains(target)) return false
    return !!target.closest(this.interactiveSelector)
  }

  /**
   * ignoreMutation — return `true` for DOM changes ProseMirror should ignore
   * because Vue made them.
   *
   * WHAT BREAKS IF WRONG: this node view has no `contentDOM` — Vue owns the
   * entire subtree. If we let ProseMirror observe Vue's mutations it tries to
   * re-parse them as document content and fights Vue's renderer, producing
   * cursor jumps and redraw loops. We ignore every mutation except a change to
   * the node's own selection state, which ProseMirror must still handle.
   */
  ignoreMutation(mutation: MutationRecord | { type: 'selection'; target: Node }): boolean {
    return mutation.type !== 'selection'
  }

  /**
   * selectNode — ProseMirror selected this node (NodeSelection).
   *
   * WHAT BREAKS IF WRONG: skip this and a selected node shows no highlight, so
   * the user cannot see what delete/replace will act on. We add the standard
   * class and flip the reactive `selected` prop for component-level styling.
   */
  selectNode(): void {
    this.dom.classList.add('ProseMirror-selectednode')
    this.props.selected = true
  }

  /**
   * deselectNode — selection moved off this node.
   *
   * WHAT BREAKS IF WRONG: skip this and the highlight from selectNode sticks
   * forever, so the node looks permanently selected. We undo exactly what
   * selectNode did.
   */
  deselectNode(): void {
    this.dom.classList.remove('ProseMirror-selectednode')
    this.props.selected = false
  }

  /**
   * destroy — ProseMirror removed this node (edit, undo, document switch).
   *
   * WHAT BREAKS IF WRONG: skip this and the Vue app for every node stays mounted
   * with its watchers, timers and listeners live — a leak that accumulates on
   * every document switch until the tab is sluggish. We unmount by rendering
   * `null` into the wrapper, the mirror image of `mount()`.
   */
  destroy(): void {
    if (!this.mounted) return
    render(null, this.dom)
    this.mounted = false
  }

  /** Merge an attribute patch into this node via a ProseMirror transaction. */
  private updateAttributes(attrs: Record<string, unknown>): void {
    const pos = this.getPosFn()
    if (pos == null) return
    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      ...attrs,
    })
    this.view.dispatch(tr)
  }

  /** Delete this node from the document. */
  private deleteNode(): void {
    const pos = this.getPosFn()
    if (pos == null) return
    const tr = this.view.state.tr.delete(pos, pos + this.node.nodeSize)
    this.view.dispatch(tr)
  }
}
