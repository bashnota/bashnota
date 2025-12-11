import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TheoremBlock from './TheoremBlock.vue'

export interface TheoremOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    theorem: {
      /**
       * Add a theorem block
       */
      setTheorem: (options?: {
        title?: string,
        content?: string,
        proof?: string,
        type?: 'theorem' | 'lemma' | 'proposition' | 'corollary' | 'definition',
        number?: number
      }) => ReturnType
    }
  }
}

export const TheoremExtension = Node.create<TheoremOptions>({
  name: 'theorem',

  group: 'block',

  atom: true,

  draggable: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title') || '',
        renderHTML: attributes => {
          return {
            'data-title': attributes.title,
          }
        },
      },
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content') || '',
        renderHTML: attributes => {
          return {
            'data-content': attributes.content,
          }
        },
      },
      proof: {
        default: '',
        parseHTML: element => element.getAttribute('data-proof') || '',
        renderHTML: attributes => {
          return {
            'data-proof': attributes.proof,
          }
        },
      },
      type: {
        default: 'theorem',
        parseHTML: element => element.getAttribute('data-type') || 'theorem',
        renderHTML: attributes => {
          return {
            'data-type': attributes.type,
          }
        },
      },
      number: {
        default: null,
        parseHTML: element => {
          const num = element.getAttribute('data-number')
          return num ? parseInt(num, 10) : null
        },
        renderHTML: attributes => {
          return attributes.number ? { 'data-number': attributes.number } : {}
        },
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type-theorem]',
        getAttrs: node => {
          if (typeof node === 'string') return {}
          const element = node as HTMLElement
          return {
            title: element.getAttribute('data-title') || '',
            content: element.getAttribute('data-content') || '',
            proof: element.getAttribute('data-proof') || '',
            type: element.getAttribute('data-theorem-type') || 'theorem',
            number: element.getAttribute('data-number')
              ? parseInt(element.getAttribute('data-number') || '0', 10)
              : null
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        'data-type-theorem': '',
        'data-theorem-type': HTMLAttributes.type || 'theorem'
      }
    )]
  },


  addCommands() {
    return {
      setTheorem: (options = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TheoremBlock)
  },
})

export default TheoremExtension








