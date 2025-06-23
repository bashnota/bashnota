import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExecutableCodeBlock from './ExecutableCodeBlock.vue'

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
      sessionId: {
        default: null,
      },
      id: {
        default: null,
      },
    }
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(ExecutableCodeBlock)
  },
})
