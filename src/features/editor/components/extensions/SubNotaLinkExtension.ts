import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SubNotaBlock from '../blocks/sub-nota-block/SubNotaBlock.vue'

export interface SubNotaLinkOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subNotaLink: {
      setSubNotaLink: (attributes: {
        targetNotaId: string
        targetNotaTitle: string
        displayText?: string
        linkStyle?: 'inline' | 'button' | 'card'
      }) => ReturnType
    }
  }
}

export const SubNotaLink = Node.create<SubNotaLinkOptions>({
  name: 'subNotaLink',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  selectable: true,

  atom: true,

  content: '', // Empty content since it's an atom

  addAttributes() {
    return {
      targetNotaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-target-nota-id'),
        renderHTML: attributes => {
          if (!attributes.targetNotaId) {
            return {}
          }
          return {
            'data-target-nota-id': attributes.targetNotaId,
          }
        },
      },
      targetNotaTitle: {
        default: null,
        parseHTML: element => element.getAttribute('data-target-nota-title'),
        renderHTML: attributes => {
          if (!attributes.targetNotaTitle) {
            return {}
          }
          return {
            'data-target-nota-title': attributes.targetNotaTitle,
          }
        },
      },
      displayText: {
        default: null,
        parseHTML: element => element.getAttribute('data-display-text'),
        renderHTML: attributes => {
          if (!attributes.displayText) {
            return {}
          }
          return {
            'data-display-text': attributes.displayText,
          }
        },
      },
      linkStyle: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-link-style') || 'inline',
        renderHTML: attributes => {
          return {
            'data-link-style': attributes.linkStyle,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="sub-nota-link"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'sub-nota-link',
      'data-target-nota-id': node.attrs.targetNotaId,
      'data-target-nota-title': node.attrs.targetNotaTitle,
      'data-display-text': node.attrs.displayText,
      'data-link-style': node.attrs.linkStyle,
    }), node.attrs.displayText || node.attrs.targetNotaTitle || 'Sub Nota Link']
  },

  addCommands() {
    return {
      setSubNotaLink: (attributes: {
        targetNotaId: string
        targetNotaTitle: string
        displayText?: string
        linkStyle?: 'inline' | 'button' | 'card'
      }) => ({ commands }) => {
        return commands.insertContent({
          type: 'subNotaLink',
          attrs: attributes
        })
      },
      
      convertToSubNotaLink: (attributes: {
        targetNotaId: string
        targetNotaTitle: string
        displayText?: string
        linkStyle?: 'inline' | 'button' | 'card'
      }) => ({ commands, state }) => {
        const { selection } = state
        if (selection.empty) return false
        
        // Replace the selected content with a subNotaLink
        return commands.replaceSelection({
          type: 'subNotaLink',
          attrs: attributes
        })
      },
      
      insertSubNotaLink: (attributes: {
        targetNotaId: string
        targetNotaTitle: string
        displayText?: string
        linkStyle?: 'inline' | 'button' | 'card'
      }) => ({ commands, state }) => {
        const { selection } = state
        const { $from } = selection
        
        // Insert at the current position, creating a new block
        return commands.insertContentAt($from.pos, {
          type: 'subNotaLink',
          attrs: attributes
        })
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SubNotaBlock as any)
  },
})
