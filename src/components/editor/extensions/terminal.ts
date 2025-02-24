import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/core'
import TerminalBlock from '../blocks/terminal/TerminalBlock.vue'

export interface TerminalOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    terminal: {
      setTerminal: (attributes?: { 
        name?: string
        serverId?: string
        terminalId?: string
      }) => ReturnType
    }
  }
}

export const Terminal = Node.create<TerminalOptions>({
  name: 'terminal',
  
  group: 'block',
  
  atom: true,

  addAttributes() {
    return {
      name: {
        default: 'Terminal'
      },
      serverId: {
        default: null
      },
      terminalId: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="terminal"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'terminal' })]
  },

  addCommands() {
    return {
      setTerminal: (attributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes
        })
      }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TerminalBlock as any)
  }
}) 