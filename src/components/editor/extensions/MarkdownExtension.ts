import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { logger } from '@/services/logger'
import { inject, ref } from 'vue'

interface Token {
  type: 'katex-display' | 'katex-inline' | 'bold' | 'italic' | 'code'
  start: number
  end: number
  content: string
}

// Create a global key to store the math rendering state
const MATH_RENDER_KEY = 'markdownAndKatexRenderState'

// Store the render state in a global variable that both the extension and toolbar can access
if (typeof window !== 'undefined' && window) {
  if (!(MATH_RENDER_KEY in window)) {
    // @ts-ignore - adding custom property to window
    window[MATH_RENDER_KEY] = true
  }
}

// Helper function to get the current render state
const getRenderMathState = (): boolean => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore - accessing custom property from window
    return window[MATH_RENDER_KEY] ?? true
  }
  return true
}

// Helper function to set the render state
export const setRenderMathState = (value: boolean): void => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore - setting custom property on window
    window[MATH_RENDER_KEY] = value
  }
}

// Helper to toggle render state and force redraw
export const toggleRenderMathState = (editor: any): void => {
  const newValue = !getRenderMathState()
  setRenderMathState(newValue)
  
  // Force a redraw by creating a transaction with our custom meta
  if (editor) {
    const { state, view } = editor
    if (view) {
      const tr = state.tr.setMeta('forceKatexRedraw', { timestamp: Date.now() })
      view.dispatch(tr)
    }
  }
}

export const MarkdownExtension = Extension.create({
  name: 'markdownAndKatex',

  addProseMirrorPlugins() {
    // Create a plugin key so we can reference this plugin later
    const pluginKey = new PluginKey('markdownAndKatex')
    
    // Create the plugin
    const plugin = new Plugin({
      key: pluginKey,
      props: {
        handleDOMEvents: {
          dblclick: (view, event) => {
            const pos = view.posAtDOM(event.target as Node, 0)
            if (pos < 0) return false
            const node = view.state.doc.nodeAt(pos)
            if (node?.isText) {
              view.dispatch(view.state.tr)
              return true
            }
            return false
          },
          keydown: (view, event) => {
            if (event.key === 'Backspace') {
              view.dispatch(view.state.tr)
              return false
            }
            return false
          },
          paste: (view, event) => {
            // Don't interfere with paste events - let the Markdown extension handle it
            return false
          }
        },
        decorations(state) {
          const decos: Decoration[] = []
          const doc = state.doc
          
          // Get the current render state
          const shouldRenderMath = getRenderMathState()

          doc.descendants((node, pos) => {
            if (!node.isText) return

            const text = node.text || ''
            let lastIndex = 0
            const tokens: Token[] = []

            // Find all tokens with their patterns
            const patterns = [
              { type: 'katex-display', pattern: /\$\$([^$]+)\$\$/g },
              { type: 'katex-inline', pattern: /\$([^$\n]+)\$/g },
              { type: 'bold', pattern: /\*\*([^*]+)\*\*/g },
              { type: 'italic', pattern: /\*([^*]+)\*/g },
              { type: 'code', pattern: /`([^`]+)`/g },
            ] as const

            // Collect all tokens
            patterns.forEach(({ type, pattern }) => {
              let match
              while ((match = pattern.exec(text)) !== null) {
                // Skip if it's part of other syntax
                if (
                  (type === 'katex-inline' && text.slice(match.index - 1, match.index + 2) === '$$$') ||
                  (type === 'italic' && text.slice(match.index - 1, match.index + 2) === '***')
                ) {
                  continue
                }

                tokens.push({
                  type,
                  start: match.index,
                  end: match.index + match[0].length,
                  content: match[1],
                })
              }
            })

            // Sort and apply decorations
            tokens
              .sort((a, b) => a.start - b.start)
              .forEach(token => {
                if (token.start < lastIndex) return
                lastIndex = token.end

                const start = pos + token.start
                const end = pos + token.end

                if ((token.type === 'katex-display' || token.type === 'katex-inline') && shouldRenderMath) {
                  try {
                    const rendered = katex.renderToString(token.content, {
                      throwOnError: false,
                      displayMode: token.type === 'katex-display',
                    })

                    decos.push(
                      Decoration.widget(start, () => {
                        const span = document.createElement('span')
                        span.className = token.type
                        span.innerHTML = rendered
                        return span
                      }),
                      Decoration.inline(start, end, {
                        class: 'katex-source',
                        style: 'display: none',
                      })
                    )
                  } catch (error) {
                    logger.error('KaTeX parsing error:', error)
                  }
                } else if (token.type === 'katex-display' || token.type === 'katex-inline') {
                  // When renderMath is false, just add normal inline decoration with the token type class
                  decos.push(
                    Decoration.inline(start, end, {
                      class: `markdown-${token.type}`,
                    })
                  )
                } else {
                  decos.push(
                    Decoration.inline(start, end, {
                      class: `markdown-${token.type}`,
                    })
                  )
                }
              })
          })

          return DecorationSet.create(doc, decos)
        },
      },

      appendTransaction: (transactions, oldState, newState) => {
        // Check if our custom meta is present
        const forceRedraw = transactions.some(tr => tr.getMeta('forceKatexRedraw'))
        if (forceRedraw) {
          // Just return a transaction with no changes to trigger redraw
          return newState.tr
        }
        return null
      },
    })

    return [plugin]
  },
})