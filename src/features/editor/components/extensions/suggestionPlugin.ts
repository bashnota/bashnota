/**
 * Hand-written ProseMirror suggestion plugin.
 *
 * A like-for-like local suggestion implementation, lifted onto raw
 * ProseMirror so the slash-command extensions no longer depend on TipTap. The
 * algorithm — regex match of `char` + query before the cursor, a plugin state
 * machine tracking active/range/query, a decoration anchoring the popup, and a
 * `render()` lifecycle (`onStart` / `onUpdate` / `onKeyDown` / `onExit`) — is
 * reproduced exactly, including the `apply` reset rules and the async `items`
 * flow, so existing suggestion configs (Commands.ts, SubNotaLinkSlashCommand.ts)
 * keep behaving identically.
 *
 * `editor` is still whatever the caller passes (during this phase the live
 * TipTap editor); this plugin only reads `editor.isEditable`, `editor.view`,
 * `editor.state` and forwards `editor` into the config callbacks — the same
 * surface the previous helper used.
 */
import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { ResolvedPos } from 'prosemirror-model'

/** Escape a string for safe use inside a RegExp. */
export function escapeForRegEx(string: string): string {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export interface Range {
  from: number
  to: number
}

export interface SuggestionMatch {
  range: Range
  query: string
  text: string
}

export interface FindSuggestionMatchConfig {
  char: string
  allowSpaces: boolean
  allowToIncludeChar?: boolean
  allowedPrefixes: string[] | null
  startOfLine: boolean
  $position: ResolvedPos
}

/**
 * Find the suggestion match immediately before the resolved position. Direct
 * local `findSuggestionMatch` implementation.
 */
export function findSuggestionMatch(config: FindSuggestionMatchConfig): SuggestionMatch | null {
  const {
    char,
    allowSpaces: allowSpacesOption,
    allowToIncludeChar,
    allowedPrefixes,
    startOfLine,
    $position,
  } = config

  const allowSpaces = allowSpacesOption && !allowToIncludeChar
  const escapedChar = escapeForRegEx(char)
  const suffix = new RegExp(`\\s${escapedChar}$`)
  const prefix = startOfLine ? '^' : ''
  const finalEscapedChar = allowToIncludeChar ? '' : escapedChar
  const regexp = allowSpaces
    ? new RegExp(`${prefix}${escapedChar}.*?(?=\\s${finalEscapedChar}|$)`, 'gm')
    : new RegExp(`${prefix}(?:^)?${escapedChar}[^\\s${finalEscapedChar}]*`, 'gm')

  const text = $position.nodeBefore?.isText && $position.nodeBefore.text
  if (!text) {
    return null
  }

  const textFrom = $position.pos - text.length
  const match = Array.from(text.matchAll(regexp)).pop()

  if (!match || match.input === undefined || match.index === undefined) {
    return null
  }

  // JavaScript doesn't have lookbehinds. This hacks a check that first character
  // is a space or the start of the line.
  const matchPrefix = match.input.slice(Math.max(0, match.index - 1), match.index)
  const matchPrefixIsAllowed = new RegExp(
    `^[${allowedPrefixes?.join('') ?? ''}\0]?$`,
  ).test(matchPrefix)

  if (allowedPrefixes !== null && !matchPrefixIsAllowed) {
    return null
  }

  // The absolute position of the match in the document.
  const from = textFrom + match.index
  let to = from + match[0].length

  // Edge case: spaces allowed and we're directly between two triggers.
  if (allowSpaces && suffix.test(text.slice(to - 1, to + 1))) {
    match[0] += ' '
    to += 1
  }

  // If the $position is located within the matched substring, return that range.
  if (from < $position.pos && to >= $position.pos) {
    return {
      range: { from, to },
      query: match[0].slice(char.length),
      text: match[0],
    }
  }

  return null
}

export interface SuggestionState {
  active: boolean
  range: Range
  query: string | null
  text: string | null
  composing: boolean
  decorationId?: string | null
}

/** Props handed to the render lifecycle callbacks. */
export interface SuggestionProps {
  editor: any
  range: Range
  query: string | null
  text: string | null
  items: any[]
  command: (props: any) => any
  decorationNode: Element | null
  clientRect: (() => DOMRect | null) | null
}

export interface SuggestionKeyDownProps {
  view: EditorView
  event: KeyboardEvent
  range: Range
}

export interface SuggestionRenderer {
  onBeforeStart?: (props: SuggestionProps) => void
  onStart?: (props: SuggestionProps) => void
  onBeforeUpdate?: (props: SuggestionProps) => void
  onUpdate?: (props: SuggestionProps) => void
  onExit?: (props: SuggestionProps) => void
  onKeyDown?: (props: SuggestionKeyDownProps) => boolean
}

export interface SuggestionOptions {
  pluginKey?: PluginKey
  editor: any
  char?: string
  allowSpaces?: boolean
  allowToIncludeChar?: boolean
  allowedPrefixes?: string[] | null
  startOfLine?: boolean
  decorationTag?: string
  decorationClass?: string
  command?: (props: { editor: any; range: Range; props: any }) => any
  items?: (props: { editor: any; query: string }) => any[] | Promise<any[]>
  render?: () => SuggestionRenderer
  allow?: (props: {
    editor: any
    state: EditorState
    range: Range
    isActive?: boolean
  }) => boolean
  findSuggestionMatch?: (config: FindSuggestionMatchConfig) => SuggestionMatch | null
  // Extra keys some callers pass through are ignored for compatibility.
  [key: string]: unknown
}

export const SuggestionPluginKey = new PluginKey('suggestion')

/**
 * Create a suggestion plugin with the application's established
 * `Suggestion(...)` factory.
 */
export function Suggestion({
  pluginKey = SuggestionPluginKey,
  editor,
  char = '@',
  allowSpaces = false,
  allowToIncludeChar = false,
  allowedPrefixes = [' '],
  startOfLine = false,
  decorationTag = 'span',
  decorationClass = 'suggestion',
  command = () => null,
  items = () => [],
  render = () => ({}),
  allow = () => true,
  findSuggestionMatch: findSuggestionMatchFn = findSuggestionMatch,
}: SuggestionOptions): Plugin {
  let props: SuggestionProps | undefined
  const renderer = render?.()

  const plugin: Plugin<SuggestionState> = new Plugin<SuggestionState>({
    key: pluginKey,

    view(editorView: EditorView) {
      const handleKeyDownCapture = (event: KeyboardEvent) => {
        const state = pluginKey.getState(editorView.state) as SuggestionState
        if (!state.active) return

        const handled = renderer?.onKeyDown?.({
          view: editorView,
          event,
          range: state.range,
        }) ?? false
        if (handled) {
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      }
      editorView.dom.addEventListener('keydown', handleKeyDownCapture, true)

      return {
        update: async (view: EditorView, prevState: EditorState) => {
          const prev = pluginKey.getState(prevState) as SuggestionState
          const next = pluginKey.getState(view.state) as SuggestionState

          // See how the state changed.
          const moved = prev.active && next.active && prev.range.from !== next.range.from
          const started = !prev.active && next.active
          const stopped = prev.active && !next.active
          const changed = !started && !stopped && prev.query !== next.query
          const handleStart = started || (moved && changed)
          const handleChange = changed || moved
          const handleExit = stopped || (moved && changed)

          // Cancel when suggestion isn't active.
          if (!handleStart && !handleChange && !handleExit) {
            return
          }

          const state = handleExit && !handleStart ? prev : next
          const decorationNode = view.dom.querySelector(
            `[data-decoration-id="${state.decorationId}"]`,
          )

          props = {
            editor,
            range: state.range,
            query: state.query,
            text: state.text,
            items: [],
            command: (commandProps: any) =>
              command({
                editor,
                range: state.range,
                props: commandProps,
              }),
            decorationNode,
            // Virtual node for popper.js / tippy.js — this can build popups
            // without an on-screen DOM node.
            clientRect: decorationNode
              ? () => {
                  // `items` may be async, so re-query the current decoration node.
                  const { decorationId } = pluginKey.getState(editor.state) as SuggestionState
                  const currentDecorationNode = view.dom.querySelector(
                    `[data-decoration-id="${decorationId}"]`,
                  )
                  return currentDecorationNode?.getBoundingClientRect() || null
                }
              : null,
          }

          if (handleStart) {
            renderer?.onBeforeStart?.(props)
          }

          if (handleChange) {
            renderer?.onBeforeUpdate?.(props)
          }

          if (handleChange || handleStart) {
            props.items = await items({
              editor,
              query: state.query ?? '',
            })
          }

          if (handleExit) {
            renderer?.onExit?.(props)
          }

          if (handleChange) {
            renderer?.onUpdate?.(props)
          }

          if (handleStart) {
            renderer?.onStart?.(props)
          }
        },

        destroy: () => {
          editorView.dom.removeEventListener('keydown', handleKeyDownCapture, true)
          if (!props) {
            return
          }
          renderer?.onExit?.(props)
        },
      }
    },

    state: {
      // Initialize the plugin's internal state.
      init(): SuggestionState {
        return {
          active: false,
          range: { from: 0, to: 0 },
          query: null,
          text: null,
          composing: false,
        }
      },

      // Apply changes to the plugin state from a view transaction.
      apply(transaction: Transaction, prev: SuggestionState, _oldState, state): SuggestionState {
        const { isEditable } = editor
        const composing = editor.viewOrNull?.composing ?? false
        const { selection } = transaction
        const { empty, from } = selection
        const next = { ...prev }

        next.composing = composing

        // We can only be suggesting if the view is editable, and:
        //   * there is no selection, or
        //   * a composition is active.
        if (isEditable && (empty || composing)) {
          // Reset active state if we just left the previous suggestion range.
          if ((from < prev.range.from || from > prev.range.to) && !composing && !prev.composing) {
            next.active = false
          }

          // Try to match against where our cursor currently is.
          const match = findSuggestionMatchFn({
            char,
            allowSpaces,
            allowToIncludeChar,
            allowedPrefixes,
            startOfLine,
            $position: selection.$from,
          })
          const decorationId = `id_${Math.floor(Math.random() * 0xffffffff)}`

          // If we found a match, update the current state to show it.
          if (
            match &&
            allow({ editor, state, range: match.range, isActive: prev.active })
          ) {
            next.active = true
            next.decorationId = prev.decorationId ? prev.decorationId : decorationId
            next.range = match.range
            next.query = match.query
            next.text = match.text
          } else {
            next.active = false
          }
        } else {
          next.active = false
        }

        // Make sure to empty the range if suggestion is inactive.
        if (!next.active) {
          next.decorationId = null
          next.range = { from: 0, to: 0 }
          next.query = null
          next.text = null
        }

        return next
      },
    },

    props: {
      // Call the keydown hook if suggestion is active.
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        const { active, range } = pluginKey.getState(view.state) as SuggestionState
        if (!active) {
          return false
        }
        return renderer?.onKeyDown?.({ view, event, range }) || false
      },

      // Setup decorator on the currently active suggestion.
      decorations(state: EditorState) {
        const { active, range, decorationId } = pluginKey.getState(state) as SuggestionState
        if (!active) {
          return null
        }
        return DecorationSet.create(state.doc, [
          Decoration.inline(range.from, range.to, {
            nodeName: decorationTag,
            class: decorationClass,
            'data-decoration-id': decorationId ?? '',
          }),
        ])
      },
    },
  })

  return plugin
}

export default Suggestion
