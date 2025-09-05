import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import NotaTitleComponent from '../blocks/nota-title/NotaTitleComponent.vue'

export interface NotaTitleOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notaTitle: {
      /**
       * Set a nota title
       */
      setNotaTitle: (title: string) => ReturnType
      /**
       * Update the nota title
       */
      updateNotaTitle: (title: string) => ReturnType
    }
  }
}

export const NotaTitleExtension = Node.create<NotaTitleOptions>({
  name: 'notaTitle',

  group: 'block',

  content: 'inline*',

  defining: true,
  
  // This is a display-only node that won't be saved in the content
  // It's only used for the UI title field

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: element => element.textContent || '',
        renderHTML: attributes => {
          return {
            'data-title': attributes.title,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="nota-title"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'nota-title' }), 0]
  },

  addCommands() {
    return {
      setNotaTitle:
        (title: string) =>
        ({ commands }) => {
          return commands.setNode(this.name, { title })
        },
      updateNotaTitle:
        (title: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { title })
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(NotaTitleComponent)
  },
})
