import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BonfireBlock from '@/components/editor/blocks/bonfire-block/BonfireBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bonfire: {
      setBonfire: () => ReturnType
    }
  }
}

export const Bonfire = Node.create({
  name: 'bonfire',
  group: 'block',
  atom: true,
  inline: false,

  addAttributes() {
    return {}
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bonfire"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'bonfire' })]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(BonfireBlock)
  },

  addCommands() {
    return {
      setBonfire:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          })
        },
    }
  },
}) 