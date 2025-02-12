import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExecutableCodeBlock from '../blocks/executable-code-block/ExecutableCodeBlock.vue'

export const ExecutableCodeBlockExtension = CodeBlock.extend({
  name: 'executableCodeBlock',
  atom: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'python',
      },
      executable: {
        default: true,
      },
      output: {
        default: null,
      },
      kernelName: {
        default: null,
      },
      serverID: {
        default: null,
      },
      id: {
        default: null,
      },
    }
  },

  addNodeView() {
    // eslint-disable-next-line
    // @ts-ignore
    return VueNodeViewRenderer(ExecutableCodeBlock)
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', HTMLAttributes, ['code', {}, 0]]
  },
})
