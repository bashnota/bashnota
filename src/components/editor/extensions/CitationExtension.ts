import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { Citation, Bibliography } from '@/components/editor/blocks'

// Citation inline node
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
        parseHTML: element => element.getAttribute('data-citation-key'),
        renderHTML: attributes => {
          if (!attributes.citationKey) {
            return { 'data-citation-key': '' }
          }
          return { 'data-citation-key': attributes.citationKey }
        }
      },
      citationNumber: {
        default: null,
        parseHTML: element => element.getAttribute('data-citation-number'),
        renderHTML: attributes => {
          if (!attributes.citationNumber) {
            return { 'data-citation-number': '?' }
          }
          return { 'data-citation-number': attributes.citationNumber }
        }
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
        { 
          'data-type': 'citation',
          class: 'citation-reference citation-missing',
          'data-citation-key': HTMLAttributes.citationKey || '',
          'data-citation-number': HTMLAttributes.citationNumber || '?'
        }, 
        HTMLAttributes
      ),
      `[${HTMLAttributes.citationNumber || '?'}]`,
    ]
  },

  // Use Vue component to render this node in the editor
  addNodeView() {
    return VueNodeViewRenderer(Citation as any)
  },
})

// Bibliography block node
export const BibliographyExtension = Node.create({
  name: 'bibliography',
  group: 'block',
  content: '',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      style: {
        default: 'apa', // apa, mla, chicago
      },
      title: {
        default: 'References',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bibliography"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'bibliography', class: 'bibliography-block' },
        HTMLAttributes
      ),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(Bibliography as any)
  },
}) 