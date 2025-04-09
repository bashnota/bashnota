import { Node, type NodeViewRenderer } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VibeBlock from '../blocks/vibe-block/VibeBlock.vue'

// Add custom event to EditorEvents
declare module '@tiptap/core' {
  interface EditorEvents {
    'vibe:command': { 
      query: string; 
      isActive: boolean 
    }
  }
  
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
  useTerminal?: boolean
}

export const VibeExtension = Node.create<VibeOptions>({
  name: 'vibe',
  
  group: 'block',
  
  content: '',
  
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      useTerminal: true,
    }
  },
  
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
      insertVibe: (options = {}) => ({ commands, editor }) => {
        // If terminal mode is enabled, emit an event instead of inserting a block
        if (this.options.useTerminal) {
          // Emit an event that can be caught by the terminal component
          editor.emit('vibe:command', {
            query: options.query || '',
            isActive: options.isActive || false,
          })
          
          return true
        }
        
        // Otherwise insert a block as usual
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