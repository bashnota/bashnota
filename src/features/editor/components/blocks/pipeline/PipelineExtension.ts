import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import PipelineNode from './PipelineNode.vue'

export interface PipelineAttributes {
  id: string
  nodes: any[]
  edges: any[]
  viewport: { x: number; y: number; zoom: number }
  title: string
  kernelMode: 'shared' | 'isolated' | 'mixed'
  sharedKernelName: string
  executionOrder: 'topological' | 'sequential' | 'parallel'
  stopOnError: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pipeline: {
      /**
       * Insert a pipeline
       */
      insertPipeline: (attributes?: Partial<PipelineAttributes>) => ReturnType
    }
  }
}

export const PipelineExtension = Node.create({
  name: 'pipeline',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: () => `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
      nodes: {
        default: [],
      },
      edges: {
        default: [],
      },
      viewport: {
        default: { x: 0, y: 0, zoom: 1 },
      },
      title: {
        default: 'Execution Pipeline',
      },
      kernelMode: {
        default: 'mixed',
      },
      sharedKernelName: {
        default: '',
      },
      executionOrder: {
        default: 'topological',
      },
      stopOnError: {
        default: true,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pipeline"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'pipeline', ...HTMLAttributes }]
  },

  addNodeView() {
    return VueNodeViewRenderer(PipelineNode)
  },

  addCommands() {
    return {
      insertPipeline: (attributes?: Partial<PipelineAttributes>) => ({ commands, state }) => {
        // Ensure we're inserting at a valid position
        const { selection } = state;
        const { from } = selection;
        
        // Validate position
        if (from < 0 || from > state.doc.content.size) {
          console.warn('Invalid position for pipeline insertion:', from, 'Document size:', state.doc.content.size);
          return false;
        }
        
        return commands.insertContent({
          type: this.name,
          attrs: {
            id: `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            title: 'Execution Pipeline',
            kernelMode: 'mixed',
            sharedKernelName: '',
            executionOrder: 'topological',
            stopOnError: true,
            ...attributes,
          },
        })
      },
    }
  },
}) 