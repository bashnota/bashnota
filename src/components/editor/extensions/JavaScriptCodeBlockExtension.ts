import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import JavaScriptCodeBlock from '../blocks/javascript-code-block/JavaScriptCodeBlock.vue'

export const JavaScriptCodeBlockExtension = CodeBlock.extend({
  name: 'javascriptCodeBlock',
  atom: true,

  addAttributes() {
    return {
      language: {
        default: 'javascript',
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
    return VueNodeViewRenderer(JavaScriptCodeBlock)
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="javascript-code"]',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', { 'data-type': 'javascript-code', ...HTMLAttributes }, ['code', {}, 0]]
  },
}) 