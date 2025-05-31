import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ConfusionMatrixBlock from './ConfusionMatrixBlock.vue'

export interface ConfusionMatrixOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    confusionMatrix: {
      /**
       * Insert a confusion matrix block
       */
      insertConfusionMatrix: (options?: {
        data?: number[][]
        labels?: string[]
        title?: string
        source?: 'upload' | 'jupyter'
        filePath?: string
      }) => ReturnType
    }
  }
}

export const ConfusionMatrixExtension = Node.create<ConfusionMatrixOptions>({
  name: 'confusionMatrix',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'confusion-matrix-block',
      },
    }
  },

  addAttributes() {
    return {
      data: {
        default: null,
        parseHTML: element => {
          const data = element.getAttribute('data-matrix')
          return data ? JSON.parse(data) : null
        },
        renderHTML: attributes => {
          if (!attributes.data) return {}
          return {
            'data-matrix': JSON.stringify(attributes.data),
          }
        },
      },
      labels: {
        default: [],
        parseHTML: element => {
          const labels = element.getAttribute('data-labels')
          return labels ? JSON.parse(labels) : []
        },
        renderHTML: attributes => {
          if (!attributes.labels?.length) return {}
          return {
            'data-labels': JSON.stringify(attributes.labels),
          }
        },
      },
      title: {
        default: 'Confusion Matrix',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => {
          if (!attributes.title) return {}
          return {
            'data-title': attributes.title,
          }
        },
      },
      source: {
        default: 'upload',
        parseHTML: element => element.getAttribute('data-source'),
        renderHTML: attributes => {
          if (!attributes.source) return {}
          return {
            'data-source': attributes.source,
          }
        },
      },
      filePath: {
        default: '',
        parseHTML: element => element.getAttribute('data-file-path'),
        renderHTML: attributes => {
          if (!attributes.filePath) return {}
          return {
            'data-file-path': attributes.filePath,
          }
        },
      },
      stats: {
        default: null,
        parseHTML: element => {
          const stats = element.getAttribute('data-stats')
          return stats ? JSON.parse(stats) : null
        },
        renderHTML: attributes => {
          if (!attributes.stats) return {}
          return {
            'data-stats': JSON.stringify(attributes.stats),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'confusion-matrix',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['confusion-matrix', HTMLAttributes]
  },

  addNodeView() {
    return VueNodeViewRenderer(ConfusionMatrixBlock)
  },

  addCommands() {
    return {
      insertConfusionMatrix:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              data: options.data || null,
              labels: options.labels || [],
              title: options.title || 'Confusion Matrix',
              source: options.source || 'upload',
              filePath: options.filePath || '',
              stats: null,
            },
          })
        },
    }
  },
}) 