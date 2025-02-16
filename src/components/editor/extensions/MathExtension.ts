import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MathBlock from '@/components/editor/blocks/math-block/MathBlock.vue'

export const MathExtension = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'math-block',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['math-block', HTMLAttributes]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(MathBlock)
  },
})
