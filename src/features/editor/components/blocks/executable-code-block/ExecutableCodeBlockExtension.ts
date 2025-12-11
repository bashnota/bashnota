import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { mergeAttributes } from '@tiptap/core'
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

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'executableCodeBlock' }),
      [
        'pre',
        {},
        [
          'code',
          { class: node.attrs.language ? `language-${node.attrs.language}` : '' },
          0,
        ],
      ],
      // We add a special div for output that export service can pick up
      node.attrs.output ?
        ['div', { class: 'export-code-output', 'data-output': node.attrs.output }] :
        ['div', { style: 'display: none' }]
    ]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(ExecutableCodeBlock)
  },
})









