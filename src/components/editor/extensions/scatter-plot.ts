import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ScatterPlotBlock from '../blocks/scatter-plot-block/ScatterPlotBlock.vue'

export interface ScatterPlotOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    scatterPlot: {
      setScatterPlot: (attributes?: { 
        title?: string
        apiUrl?: string
        isLocked?: boolean
        savedData?: any[]
        csvContent?: string
        xAxisLabel?: string
        yAxisLabel?: string
      }) => ReturnType
    }
  }
}

export const ScatterPlot = Node.create<ScatterPlotOptions>({
  name: 'scatterPlot',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      title: {
        default: 'Scatter Plot'
      },
      apiUrl: {
        default: ''
      },
      isLocked: {
        default: false
      },
      savedData: {
        default: null
      },
      csvContent: {
        default: null
      },
      xAxisLabel: {
        default: 'X Axis'
      },
      yAxisLabel: {
        default: 'Y Axis'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="scatter-plot"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'scatter-plot' })]
  },

  addCommands() {
    return {
      setScatterPlot:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes
          })
        }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ScatterPlotBlock)
  }
}) 