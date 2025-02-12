import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Token {
  type: 'katex-display' | 'katex-inline' | 'bold' | 'italic' | 'code'
  start: number
  end: number
  content: string
}

export const MarkdownExtension = Extension.create({
  name: 'markdownAndKatex',

  addProseMirrorPlugins() {
    let isEditing = false

    return [
      new Plugin({
        key: new PluginKey('markdownAndKatex'),
        props: {
          handleDOMEvents: {
            dblclick: (view, event) => {
              const pos = view.posAtDOM(event.target as Node, 0)
              const node = view.state.doc.nodeAt(pos)
              if (node?.isText) {
                isEditing = true
                view.dispatch(view.state.tr)
                return true
              }
              return false
            },
            keydown: (view, event) => {
              if (event.key === 'Backspace') {
                isEditing = true
                view.dispatch(view.state.tr)
                return false
              }
              return false
            },
          },
          decorations(state) {
            const decos: Decoration[] = []
            const doc = state.doc

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

                  if ((token.type === 'katex-display' || token.type === 'katex-inline') && !isEditing) {
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
                          // Add double-click handler to enter edit mode
                          span.addEventListener('dblclick', () => {
                            isEditing = true
                            state.tr
                          })
                          return span
                        }),
                        Decoration.inline(start, end, {
                          class: 'katex-source',
                          style: isEditing ? '' : 'display: none',
                        })
                      )
                    } catch (error) {
                      console.error('KaTeX parsing error:', error)
                    }
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
          // Reset editing mode when content changes
          if (transactions.some(tr => tr.docChanged)) {
            isEditing = false
          }
          return null
        },
      }),
    ]
  },
}) 