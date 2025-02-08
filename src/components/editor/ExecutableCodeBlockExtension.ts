import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExecutableCodeBlock from './ExecutableCodeBlock.vue'

export const ExecutableCodeBlockExtension = CodeBlock.extend({
  name: 'executableCodeBlock',

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: element => element.getAttribute('data-language'),
        renderHTML: attributes => {
          return {
            'data-language': attributes.language,
            class: `language-${attributes.language}`
          }
        }
      },
      executeable: {
        default: false,
        parseHTML: element => element.getAttribute('data-executeable') === 'true',
        renderHTML: attributes => {
          return {
            'data-executeable': attributes.executeable
          }
        }
      }
    }
  },

  addNodeView() {
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