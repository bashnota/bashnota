import { Node, mergeAttributes } from '@tiptap/core'
import type { RawCommands } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Citation from './Citation.vue'
import Bibliography from './Bibliography.vue'
import type { CitationEntry } from '@/features/nota/types/nota'
import { updateCitationNumbers } from '@/features/editor/services/citationService'

// Citation inline node
export const CitationExtension = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

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
      },
      citationStyle: {
        default: 'numeric',
        parseHTML: element => element.getAttribute('data-citation-style'),
        renderHTML: attributes => {
          return { 'data-citation-style': attributes.citationStyle }
        }
      },
      citationFormat: {
        default: 'short',
        parseHTML: element => element.getAttribute('data-citation-format'),
        renderHTML: attributes => {
          return { 'data-citation-format': attributes.citationFormat }
        }
      },
      citationStatus: {
        default: 'missing',
        parseHTML: element => element.getAttribute('data-citation-status'),
        renderHTML: attributes => {
          return { 'data-citation-status': attributes.citationStatus }
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
          class: `citation-reference citation-${HTMLAttributes.citationStatus || 'missing'}`,
          'data-citation-key': HTMLAttributes.citationKey || '',
          'data-citation-number': HTMLAttributes.citationNumber || '?',
          'data-citation-style': HTMLAttributes.citationStyle || 'numeric',
          'data-citation-format': HTMLAttributes.citationFormat || 'short',
          'data-citation-status': HTMLAttributes.citationStatus || 'missing'
        },
        HTMLAttributes
      ),
      `[${HTMLAttributes.citationNumber || '?'}]`,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(Citation as any)
  },

  onUpdate() {
    updateCitationNumbers(this.editor)
  },



  addCommands() {
    return {
      setCitation: (attributes: Partial<CitationEntry>) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('citation', attributes)
      },
      updateCitationNumber: (number: number) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('citation', { citationNumber: number })
      },
      updateCitationStyle: (style: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('citation', { citationStyle: style })
      },
      updateCitationFormat: (format: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('citation', { citationFormat: format })
      }
    } as Partial<RawCommands>
  }
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
        default: 'apa',
      },
      title: {
        default: 'References',
      },
      sortBy: {
        default: 'citation-number',
      },
      groupBy: {
        default: 'none',
      },
      showType: {
        default: true,
      },
      showDOI: {
        default: true,
      },
      showURL: {
        default: true,
      }
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
        {
          'data-type': 'bibliography',
          class: 'bibliography-block',
          'data-style': HTMLAttributes.style,
          'data-sort-by': HTMLAttributes.sortBy,
          'data-group-by': HTMLAttributes.groupBy,
          'data-show-type': HTMLAttributes.showType,
          'data-show-doi': HTMLAttributes.showDOI,
          'data-show-url': HTMLAttributes.showURL
        },
        HTMLAttributes
      ),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(Bibliography as any)
  },

  addCommands() {
    return {
      setBibliographyStyle: (style: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('bibliography', { style })
      },
      setBibliographyTitle: (title: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('bibliography', { title })
      },
      setBibliographySortBy: (sortBy: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('bibliography', { sortBy })
      },
      setBibliographyGroupBy: (groupBy: string) => ({ commands }: { commands: RawCommands }) => {
        return commands.updateAttributes('bibliography', { groupBy })
      }
    } as Partial<RawCommands>
  }
})







