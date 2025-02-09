import CodeBlock from '@tiptap/extension-code-block'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExecutableCodeBlock from '../blocks/executable-code-block/ExecutableCodeBlock.vue'

export const ExecutableCodeBlockExtension = CodeBlock.extend({
  name: 'executableCodeBlock',

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-language'),
        renderHTML: (attributes) => ({
          'data-language': attributes.language,
          class: `language-${attributes.language}`,
        }),
      },
      executeable: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-executeable') === 'true',
        renderHTML: (attributes) => ({
          'data-executeable': attributes.executeable,
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attributes) => ({
          'data-block-id': attributes.id,
        }),
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
