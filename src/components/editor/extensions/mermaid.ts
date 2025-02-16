import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidBlock from '../blocks/mermaid-block/MermaidBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (content: string) => ReturnType
    }
  }
}

export const Mermaid = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  inline: false,

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-content'),
        renderHTML: (attributes) => {
          return {
            'data-content': attributes.content,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {}
          const element = dom as HTMLElement
          return {
            content: element.getAttribute('data-content'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(MermaidBlock)
  },

  addCommands() {
    return {
      setMermaid:
        (content) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          })
        },
    }
  },
})
