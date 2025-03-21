import { Node, type NodeViewRenderer } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VibeBlock from '../blocks/vibe-block/VibeBlock.vue'

// Add type declaration for the Vibe command
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vibe: {
      /**
       * Insert a Vibe block
       */
      insertVibe: (options?: Partial<VibeAttributes>) => ReturnType
      /**
       * Update a Vibe block
       */
      updateVibe: (options: Record<string, any>) => ReturnType
    }
  }
}

export interface VibeAttributes {
  query: string
  sessionId: string
  isActive: boolean
  taskBoardId: string
  isLoading: boolean
  error: string
}

export interface VibeOptions {
  HTMLAttributes: Record<string, any>
}

export const VibeExtension = Node.create<VibeOptions>({
  name: 'vibe',
  
  group: 'block',
  
  content: '',
  
  atom: true,
  
  addAttributes() {
    return {
      query: {
        default: '',
      },
      sessionId: {
        default: '',
      },
      isActive: {
        default: false,
      },
      taskBoardId: {
        default: '',
      },
      isLoading: {
        default: false,
      },
      error: {
        default: '',
      }
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="vibe-block"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'vibe-block', ...HTMLAttributes }, 0]
  },
  
  addCommands() {
    return {
      insertVibe: (options = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            query: '',
            isActive: false,
            ...options
          },
        })
      },
      updateVibe: (options = {}) => ({ commands }) => {
        return commands.updateAttributes(this.name, options)
      },
    }
  },
  
  addNodeView() {
    // @ts-ignore Vue component compatibility issues
    return VueNodeViewRenderer(VibeBlock)
  }
})

// Export as default for compatibility
export default VibeExtension 