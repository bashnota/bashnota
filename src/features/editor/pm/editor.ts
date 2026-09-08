import type { AppContext } from 'vue'
import { DOMParser as PMDOMParser, DOMSerializer, Fragment, Schema, Slice } from 'prosemirror-model'
import type { Node as ProseMirrorNode } from 'prosemirror-model'
import { AllSelection, EditorState, NodeSelection, Selection, TextSelection } from 'prosemirror-state'
import type { Command, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { DirectEditorProps, NodeViewConstructor } from 'prosemirror-view'
import type { EditorConfiguration, JSONContent } from './types'

export interface EditorCallbackPayload {
  editor: Editor
  transaction: Transaction
}

export interface EditorOptions {
  element?: HTMLElement | null
  content?: JSONContent | string | null
  extensions?: EditorConfiguration | EditorConfiguration[]
  editable?: boolean
  editorProps?: Omit<DirectEditorProps, 'state' | 'dispatchTransaction' | 'nodeViews'> & {
    attributes?: Record<string, string>
  }
  nodeViews?: Record<string, NodeViewConstructor>
  onCreate?: (payload: { editor: Editor }) => void
  onUpdate?: (payload: EditorCallbackPayload) => void
  onSelectionUpdate?: (payload: EditorCallbackPayload) => void
  onBlur?: (payload: { editor: Editor; event: FocusEvent }) => void
  onFocus?: (payload: { editor: Editor; event: FocusEvent }) => void
  onDestroy?: () => void
  onContentError?: (payload: { editor: Editor; operation: 'initialization' | 'setContent'; error: Error }) => void
}

export type EditorCommands = Record<string, (...args: any[]) => boolean>

type Chain = Record<string, (...args: any[]) => Chain> & { run: () => boolean }

function configurations(value?: EditorConfiguration | EditorConfiguration[]): EditorConfiguration[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function elementFromHTML(html: string): HTMLElement {
  const element = document.createElement('div')
  element.innerHTML = html
  return element
}

/**
 * Application-facing editor API backed exclusively by ProseMirror. The small
 * command facade intentionally preserves the API used by existing Vue UI while
 * commands themselves are native `(state, dispatch, view) => boolean` values.
 */
export class Editor {
  public readonly schema: Schema
  public readonly commands: EditorCommands
  public appContext: AppContext | null = null
  public options: EditorOptions

  private currentState: EditorState
  private editorView: EditorView | null = null
  private readonly commandFactories: Record<string, (...args: any[]) => Command>
  private readonly nodeViewFactories: Array<(editor: Editor) => Record<string, NodeViewConstructor>>
  private readonly eventHandlers = new Map<string, Set<(...args: any[]) => void>>()
  private commandContext: {
    state: EditorState
    dispatch: (transaction: Transaction) => void
    view: EditorView | undefined
  } | null = null
  private created = false

  constructor(options: EditorOptions) {
    this.options = { editable: true, ...options }
    const configs = configurations(options.extensions)
    const nodes = Object.assign({}, ...configs.map((config) => config.nodes ?? {}))
    const marks = Object.assign({}, ...configs.map((config) => config.marks ?? {}))
    this.schema = new Schema({ nodes, marks })
    this.commandFactories = Object.assign({}, ...configs.map((config) => config.commands ?? {}))
    this.nodeViewFactories = configs.flatMap((config) => config.nodeViews ? [config.nodeViews] : [])
    this.commands = this.createCommandsProxy(true)

    const doc = this.parseContent(options.content, 'initialization')
      ?? this.schema.topNodeType.createAndFill()
      ?? this.schema.topNodeType.create()
    this.currentState = EditorState.create({ schema: this.schema, doc })
    const plugins = configs.flatMap((config) => config.plugins?.(this.schema, this) ?? [])
    this.currentState = this.currentState.reconfigure({ plugins })

    if (options.element) this.mount(options.element)
  }

  get state(): EditorState {
    return this.editorView?.state ?? this.currentState
  }

  get view(): EditorView {
    if (!this.editorView) throw new Error('The editor view is not mounted')
    return this.editorView
  }

  get viewOrNull(): EditorView | null {
    return this.editorView
  }

  get isEditable(): boolean {
    return this.options.editable !== false
  }

  get isFocused(): boolean {
    return this.editorView?.hasFocus() ?? false
  }

  mount(element: HTMLElement): EditorView {
    if (this.editorView?.dom.parentElement === element) return this.editorView
    this.unmount()

    const configuredNodeViews = Object.assign(
      {},
      ...this.nodeViewFactories.map((factory) => factory(this)),
      this.options.nodeViews ?? {},
    )
    const configuredProps = this.options.editorProps ?? {}
    const configuredDOMEvents = configuredProps.handleDOMEvents ?? {}
    const attributes = configuredProps.attributes ?? {}
    let pendingState: EditorState | null = null
    const nextView = new EditorView(element, {
      ...configuredProps,
      attributes,
      state: this.currentState,
      editable: () => this.isEditable,
      nodeViews: configuredNodeViews,
      dispatchTransaction: (transaction) => {
        this.dispatchTransaction(transaction)
        if (!this.editorView) pendingState = this.currentState
      },
      handleDOMEvents: {
        ...configuredDOMEvents,
        focus: (view, event) => {
          const handled = configuredDOMEvents.focus?.(view, event) ?? false
          this.options.onFocus?.({ editor: this, event })
          return handled
        },
        blur: (view, event) => {
          const handled = configuredDOMEvents.blur?.(view, event) ?? false
          this.options.onBlur?.({ editor: this, event })
          return handled
        },
      },
    })
    this.editorView = nextView
    if (pendingState) this.editorView.updateState(pendingState)
    if (!this.created) {
      this.created = true
      this.options.onCreate?.({ editor: this })
    }
    return this.editorView
  }

  unmount(): void {
    if (!this.editorView) return
    this.currentState = this.editorView.state
    this.editorView.destroy()
    this.editorView = null
  }

  destroy(): void {
    this.unmount()
    this.options.onDestroy?.()
    this.eventHandlers.clear()
  }

  setEditable(editable: boolean): void {
    this.options.editable = editable
    this.editorView?.setProps({ editable: () => editable })
  }

  setAppContext(appContext: AppContext | null): void {
    this.appContext = appContext
  }

  setOptions(options: Partial<EditorOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      editorProps: { ...this.options.editorProps, ...options.editorProps },
    }
    if (typeof options.editable === 'boolean') this.setEditable(options.editable)
    if (this.editorView && options.editorProps) {
      this.editorView.setProps({ ...this.editorView.props, ...this.options.editorProps })
    }
  }

  getJSON(): JSONContent {
    return this.state.doc.toJSON()
  }

  getHTML(): string {
    const container = document.createElement('div')
    container.appendChild(DOMSerializer.fromSchema(this.schema).serializeFragment(this.state.doc.content))
    return container.innerHTML
  }

  getText(options: { blockSeparator?: string } = {}): string {
    return this.state.doc.textBetween(0, this.state.doc.content.size, options.blockSeparator ?? '\n\n')
  }

  chain(): Chain {
    return this.createChain(true)
  }

  can(): { chain: () => Chain } & EditorCommands {
    const commands = this.createCommandsProxy(false)
    return new Proxy({ chain: () => this.createChain(false) } as { chain: () => Chain } & EditorCommands, {
      get: (target, key) => key === 'chain' ? target.chain : commands[key as string],
    })
  }

  isActive(name: string, attrs: Record<string, unknown> = {}): boolean {
    const { $from, from, to, empty } = this.state.selection
    const nodeType = this.schema.nodes[name]
    if (nodeType) {
      if (this.state.selection instanceof NodeSelection && this.state.selection.node.type === nodeType) {
        return Object.entries(attrs).every(([key, value]) => this.state.selection instanceof NodeSelection && this.state.selection.node.attrs[key] === value)
      }
      for (let depth = $from.depth; depth >= 0; depth -= 1) {
        const node = $from.node(depth)
        if (node.type === nodeType && Object.entries(attrs).every(([key, value]) => node.attrs[key] === value)) return true
      }
      if (!empty) {
        let active = false
        this.state.doc.nodesBetween(from, to, (node) => {
          if (node.type === nodeType && Object.entries(attrs).every(([key, value]) => node.attrs[key] === value)) active = true
          return !active
        })
        if (active) return true
      }
      return false
    }
    const markType = this.schema.marks[name]
    if (!markType) return false
    const marks = empty ? (this.state.storedMarks ?? $from.marks()) : []
    if (empty) return marks.some((mark) => mark.type === markType && Object.entries(attrs).every(([key, value]) => mark.attrs[key] === value))
    return this.state.doc.rangeHasMark(from, to, markType)
  }

  getAttributes(name: string): Record<string, unknown> {
    const { $from } = this.state.selection
    const markType = this.schema.marks[name]
    if (markType) return ($from.marks().find((mark) => mark.type === markType)?.attrs ?? {}) as Record<string, unknown>
    const nodeType = this.schema.nodes[name]
    if (!nodeType) return {}
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      if ($from.node(depth).type === nodeType) return $from.node(depth).attrs as Record<string, unknown>
    }
    return {}
  }

  on(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.eventHandlers.get(event) ?? new Set()
    handlers.add(handler)
    this.eventHandlers.set(event, handlers)
    return this
  }

  off(event: string, handler?: (...args: any[]) => void): this {
    if (handler) this.eventHandlers.get(event)?.delete(handler)
    else this.eventHandlers.delete(event)
    return this
  }

  emit(event: string, ...args: any[]): void {
    for (const handler of this.eventHandlers.get(event) ?? []) handler(...args)
  }

  private dispatchTransaction(transaction: Transaction): void {
    const previousSelection = this.state.selection
    const applied = this.state.applyTransaction(transaction)
    const nextState = applied.state
    this.currentState = nextState
    this.editorView?.updateState(nextState)
    if (applied.transactions.some((appliedTransaction) => appliedTransaction.docChanged)) {
      this.options.onUpdate?.({ editor: this, transaction })
    }
    if (!transaction.selection.eq(previousSelection)) {
      this.options.onSelectionUpdate?.({ editor: this, transaction })
    }
    this.emit('transaction', { editor: this, transaction })
  }

  private reportContentError(
    operation: 'initialization' | 'setContent',
    cause: unknown,
  ): void {
    const error = cause instanceof Error ? cause : new Error(String(cause))
    console.error(`[Editor] Refused invalid content during ${operation}; the current document was preserved.`, error)
    this.options.onContentError?.({ editor: this, operation, error })
    this.emit('contentError', { editor: this, operation, error })
  }

  private parseContent(
    content: JSONContent | string | null | undefined,
    operation: 'initialization' | 'setContent',
  ): ProseMirrorNode | null {
    if (content && typeof content === 'object') {
      try {
        const isExplicitlyEmptyDocument = content.type === this.schema.topNodeType.name
          && Array.isArray(content.content)
          && content.content.length === 0
        const document = isExplicitlyEmptyDocument
          ? this.schema.topNodeType.createAndFill()
          : this.schema.nodeFromJSON(content)
        if (!document || document.type !== this.schema.topNodeType) {
          throw new RangeError(`Expected a ${this.schema.topNodeType.name} document`)
        }
        document.check()
        return document
      } catch (error) {
        this.reportContentError(operation, error)
        return null
      }
    }
    if (typeof content === 'string' && content.length > 0) {
      return PMDOMParser.fromSchema(this.schema).parse(elementFromHTML(content))
    }
    return this.schema.topNodeType.createAndFill() ?? this.schema.topNodeType.create()
  }

  private contentFragment(content: unknown): Fragment {
    const values = Array.isArray(content) ? content : [content]
    const nodes: ProseMirrorNode[] = []
    for (const value of values) {
      if (typeof value === 'string') {
        const parsed = PMDOMParser.fromSchema(this.schema).parse(elementFromHTML(value))
        parsed.content.forEach((node) => nodes.push(node))
      } else if (value && typeof value === 'object') {
        const json = value as JSONContent
        try {
          if (json.type === 'doc') {
            this.schema.nodeFromJSON(json).content.forEach((node) => nodes.push(node))
          } else {
            nodes.push(this.schema.nodeFromJSON(json))
          }
        } catch {
          // Ignore unknown nodes rather than corrupting the document.
        }
      }
    }
    return Fragment.fromArray(nodes)
  }

  private createCommandsProxy(withDispatch: boolean): EditorCommands {
    const builtins: Record<string, (...args: any[]) => Command> = {
      focus: (position?: 'start' | 'end' | number) => (state, dispatch, view) => {
        if (dispatch && position !== undefined) {
          const pos = position === 'start' ? 1 : position === 'end' ? state.doc.content.size : position
          dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(Math.max(0, Math.min(pos, state.doc.content.size))))))
        }
        if (dispatch) view?.focus()
        return true
      },
      blur: () => (_state, dispatch, view) => {
        if (dispatch) view?.dom.blur()
        return true
      },
      deleteSelection: () => (state, dispatch) => {
        if (dispatch) dispatch(state.tr.deleteSelection().scrollIntoView())
        return true
      },
      deleteRange: (range: { from: number; to: number }) => (state, dispatch) => {
        if (dispatch) dispatch(state.tr.delete(range.from, range.to).scrollIntoView())
        return true
      },
      deleteNode: (nameOrType: string | { name: string }) => (state, dispatch) => {
        const name = typeof nameOrType === 'string' ? nameOrType : nameOrType.name
        const type = state.schema.nodes[name]
        if (!type) return false
        let from: number | null = null
        let to: number | null = null
        if (state.selection instanceof NodeSelection && state.selection.node.type === type) {
          from = state.selection.from
          to = state.selection.to
        } else {
          for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
            if (state.selection.$from.node(depth).type === type) {
              from = state.selection.$from.before(depth)
              to = state.selection.$from.after(depth)
              break
            }
          }
        }
        if (from == null || to == null) return false
        if (dispatch) dispatch(state.tr.delete(from, to))
        return true
      },
      unsetAllMarks: () => (state, dispatch) => {
        if (dispatch) {
          const tr = state.tr.removeMark(state.selection.from, state.selection.to)
          for (const mark of state.storedMarks ?? state.selection.$from.marks()) {
            tr.removeStoredMark(mark.type)
          }
          dispatch(tr)
        }
        return true
      },
      insertContent: (content: unknown) => (state, dispatch) => {
        if (typeof content === 'string' && !/<[a-z][\s\S]*>/i.test(content)) {
          if (dispatch) dispatch(state.tr.insertText(content).scrollIntoView())
          return content.length > 0
        }
        const fragment = this.contentFragment(content)
        if (!fragment.size) return false
        if (dispatch) dispatch(state.tr.replaceSelection(new Slice(fragment, 0, 0)).scrollIntoView())
        return true
      },
      insertContentAt: (position: number | { from: number; to: number }, content: unknown) => (state, dispatch) => {
        if (typeof content === 'string' && !/<[a-z][\s\S]*>/i.test(content)) {
          const from = typeof position === 'number' ? position : position.from
          const to = typeof position === 'number' ? position : position.to
          if (dispatch) dispatch(state.tr.insertText(content, from, to).scrollIntoView())
          return content.length > 0
        }
        const fragment = this.contentFragment(content)
        if (!fragment.size) return false
        if (dispatch) {
          const from = typeof position === 'number' ? position : position.from
          const to = typeof position === 'number' ? position : position.to
          dispatch(state.tr.replace(from, to, new Slice(fragment, 0, 0)).scrollIntoView())
        }
        return true
      },
      replaceSelection: (content: unknown) => builtins.insertContent(content),
      setContent: (content: JSONContent | string) => (state, dispatch) => {
        const doc = this.parseContent(content, 'setContent')
        if (!doc) return false
        let transaction: Transaction
        try {
          transaction = state.tr.replaceWith(0, state.doc.content.size, doc.content)
        } catch (error) {
          this.reportContentError('setContent', error)
          return false
        }
        if (dispatch) dispatch(transaction)
        return true
      },
      setTextSelection: (position: number | { from: number; to?: number }) => (state, dispatch) => {
        const from = typeof position === 'number' ? position : position.from
        const to = typeof position === 'number' ? position : position.to ?? from
        if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
        return true
      },
      selectAll: () => (state, dispatch) => {
        if (dispatch) dispatch(state.tr.setSelection(new AllSelection(state.doc)))
        return true
      },
      updateAttributes: (name: string, attrs: Record<string, unknown>) => (state, dispatch) => {
        const nodeType = state.schema.nodes[name]
        if (nodeType) {
          let pos: number | null = null
          let node: ProseMirrorNode | null = null
          if (state.selection instanceof NodeSelection && state.selection.node.type === nodeType) {
            pos = state.selection.from
            node = state.selection.node
          } else {
            for (let depth = state.selection.$from.depth; depth >= 0; depth -= 1) {
              const candidate = state.selection.$from.node(depth)
              if (candidate.type === nodeType) {
                pos = depth === 0 ? 0 : state.selection.$from.before(depth)
                node = candidate
                break
              }
            }
          }
          if (pos == null || !node) return false
          if (dispatch) dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }))
          return true
        }
        const markType = state.schema.marks[name]
        if (!markType) return false
        if (dispatch) dispatch(state.tr.addMark(state.selection.from, state.selection.to, markType.create(attrs)))
        return true
      },
      setNode: (name: string, attrs: Record<string, unknown> = {}) => (state, dispatch) => {
        const type = state.schema.nodes[name]
        if (!type) return false
        if (dispatch) dispatch(state.tr.setBlockType(state.selection.from, state.selection.to, type, attrs))
        return true
      },
      command: (callback: (props: any) => boolean) => (state, dispatch, view) => {
        const tr = state.tr
        const result = callback({
          editor: this,
          state,
          tr,
          dispatch,
          view,
          commands: this.commands,
          chain: () => this.chain(),
        })
        if (result && dispatch && (tr.steps.length > 0 || tr.selectionSet || tr.storedMarksSet || tr.scrolledIntoView)) dispatch(tr)
        return result
      },
    }

    return new Proxy({} as EditorCommands, {
      get: (_target, property) => {
        if (typeof property !== 'string') return undefined
        const factory = builtins[property] ?? this.commandFactories[property]
        if (!factory) return () => false
        return (...args: any[]) => {
          const command = factory(...args)
          const context = this.commandContext
          const dispatch = context?.dispatch
            ?? (withDispatch ? (transaction: Transaction) => this.dispatchTransaction(transaction) : undefined)
          return command(context?.state ?? this.state, dispatch, context ? context.view : (this.editorView ?? undefined))
        }
      },
    })
  }

  private createChain(withDispatch: boolean): Chain {
    const queue: Array<{ name: string; args: any[] }> = []
    const target = { run: () => {
      const startState = this.state
      const combined = startState.tr
      let didDispatch = false
      const context = {
        state: startState,
        dispatch: (transaction: Transaction) => {
          for (const step of transaction.steps) combined.step(step)
          if (transaction.selectionSet) {
            combined.setSelection(Selection.fromJSON(combined.doc, transaction.selection.toJSON()))
          }
          if (transaction.storedMarksSet) combined.setStoredMarks(transaction.storedMarks)
          if (transaction.scrolledIntoView) combined.scrollIntoView()
          const meta = (transaction as unknown as { meta: Record<string, unknown> }).meta
          for (const [key, value] of Object.entries(meta)) combined.setMeta(key, value)
          context.state = context.state.apply(transaction)
          didDispatch = true
        },
        // A capability check must never focus or otherwise mutate the live view.
        view: withDispatch ? (this.editorView ?? undefined) : undefined,
      }
      const previousContext = this.commandContext
      this.commandContext = context
      try {
        // Supplying the local dispatcher lets every command see the state
        // produced by earlier commands while keeping the live editor unchanged
        // until the complete chain succeeds.
        const commands = this.createCommandsProxy(true)
        for (const item of queue) {
          if (!commands[item.name](...item.args)) return false
        }
      } finally {
        this.commandContext = previousContext
      }
      if (withDispatch && didDispatch) this.dispatchTransaction(combined)
      return true
    } } as Chain
    let proxy: Chain
    proxy = new Proxy(target, {
      get: (chain, property) => {
        if (property === 'run') return chain.run
        return (...args: any[]) => {
          queue.push({ name: property as string, args })
          return proxy
        }
      },
    }) as Chain
    return proxy
  }
}
