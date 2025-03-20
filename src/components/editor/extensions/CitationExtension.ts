import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Citation from '@/components/editor/blocks/Citation.vue'

export const CitationExtension = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true, // Makes it behave as a single unit
  selectable: true,

  addAttributes() {
    return {
      citationKey: {
        default: null,
      },
      // We'll store a reference to the actual citation data that can be used for rendering
      citationNumber: {
        default: null,
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="citation"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'citation', class: 'citation-reference' }, 
        HTMLAttributes
      ),
      `[${HTMLAttributes.citationNumber || '?'}]`,
    ]
  },

  // Use Vue component to render this node in the editor
  addNodeView() {
    return VueNodeViewRenderer(Citation)
  },
}) 