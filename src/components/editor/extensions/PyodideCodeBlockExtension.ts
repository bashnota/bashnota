import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import PyodideCodeBlock from '../blocks/pyodide-code-block/PyodideCodeBlock.vue'

export const PyodideCodeBlockExtension = CodeBlock.extend({
  name: 'pyodideCodeBlock',
  atom: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'python',
      },
      output: {
        default: null,
      },
      id: {
        default: null,
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(PyodideCodeBlock)
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="pyodide"]',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', { 'data-type': 'pyodide', ...HTMLAttributes }, ['code', {}, 0]]
  },
}) 