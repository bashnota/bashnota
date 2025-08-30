import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import SubNotaLinkSuggestionList from './SubNotaLinkSuggestionList.vue'
import { subNotaLinkService, type SubNotaLinkItem, type SubNotaLinkAttributes } from './services/SubNotaLinkService'

export const SubNotaLinkSlashCommand = Extension.create({
  name: 'subNotaLinkSlashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        debounce: 100,
        
        command: ({ editor, range, props }: any) => {
          try {
            // Validate range before proceeding
            if (!editor || !editor.state || !range) {
              console.warn('Invalid editor or range for subNotaLink command')
              return false
            }

            const docSize = editor.state.doc.content.size
            if (range.from < 0 || range.to > docSize || range.from >= range.to) {
              console.warn('Invalid range for subNotaLink command:', { range, docSize })
              return false
            }

            // Check if the range is still valid in the current document
            try {
              editor.state.doc.resolve(range.from)
              editor.state.doc.resolve(range.to)
            } catch (error) {
              console.warn('Range no longer valid in current document:', error)
              return false
            }

            // Validate attributes before insertion
            if (!subNotaLinkService.validateAttributes(props)) {
              console.warn('Invalid subNotaLink attributes:', props)
              return false
            }

            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertSubNotaLink(props)
              .run()
            
            return true
          } catch (error) {
            console.error('Error executing subNotaLink command:', error)
            return false
          }
        },

        allow: ({ state, range }: any) => {
          try {
            if (!state || !range || !state.doc) {
              return false
            }

            // Validate range bounds
            const docSize = state.doc.content.size
            if (range.from < 0 || range.to > docSize || range.from >= range.to) {
              return false
            }

            const $from = state.doc.resolve(range.from)
            const type = state.schema.nodes.paragraph
            const allow = !!type && $from.parent && $from.parent.type === type
            return allow
          } catch (error) {
            console.warn('Error in subNotaLink allow function:', error)
            return false
          }
        },

        items: ({ query }: any) => {
          try {
            return subNotaLinkService.getFilteredNotas(query)
          } catch (error) {
            console.error('Error getting items for subNotaLink slash command:', error)
            return []
          }
        },

        render: () => {
          let component: any
          let popup: any

          return {
            onStart: (props: any) => {
              try {
                component = new VueRenderer(SubNotaLinkSuggestionList, {
                  props,
                  editor: props.editor,
                })

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'sub-nota-link-suggestion',
                })
              } catch (error) {
                console.error('Error starting subNotaLink suggestion:', error)
              }
            },

            onUpdate: (props: any) => {
              try {
                if (component && popup && popup[0]) {
                  component.updateProps(props)
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                  })
                }
              } catch (error) {
                console.error('Error updating subNotaLink suggestion:', error)
              }
            },

            onKeyDown: (props: any) => {
              try {
                if (props.event.key === 'Escape' && popup && popup[0]) {
                  popup[0].hide()
                  return true
                }

                // Delegate keyboard navigation to the Vue component
                if (component && component.exposed) {
                  const { navigateUp, navigateDown, selectCurrentItem } = component.exposed
                  
                  switch (props.event.key) {
                    case 'ArrowUp':
                      props.event.preventDefault()
                      navigateUp?.()
                      return true
                    case 'ArrowDown':
                      props.event.preventDefault()
                      navigateDown?.()
                      return true
                    case 'Enter':
                      props.event.preventDefault()
                      selectCurrentItem?.()
                      return true
                  }
                }

                return false
              } catch (error) {
                console.error('Error handling keydown in subNotaLink suggestion:', error)
                return false
              }
            },

            onExit: () => {
              try {
                if (popup && popup[0]) {
                  popup[0].destroy()
                }
                if (component) {
                  component.destroy()
                }
              } catch (error) {
                console.error('Error exiting subNotaLink suggestion:', error)
              }
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
