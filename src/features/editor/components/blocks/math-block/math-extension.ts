import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MathBlock from './MathBlock.vue'

export interface MathOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      /**
       * Add a math block
       */
      setMath: (options?: { latex?: string }) => ReturnType
    }
  }
}

export const MathExtension = Node.create<MathOptions>({
  name: 'math',
  
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
      latex: {
        default: '',
        parseHTML: element => element.getAttribute('data-latex') || '',
        renderHTML: attributes => {
          return {
            'data-latex': attributes.latex,
          }
        },
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math"]',
        getAttrs: node => {
          if (typeof node === 'string') return {}
          const element = node as HTMLElement
          return {
            latex: element.getAttribute('data-latex') || ''
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'math' }), 0]
  },

  addCommands() {
    return {
      setMath: (options = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(MathBlock)
  },
})

export default MathExtension 








