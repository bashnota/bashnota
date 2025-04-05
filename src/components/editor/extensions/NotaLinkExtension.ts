import { Node, Editor } from '@tiptap/core'
import type { RawCommands } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'

interface NotaLinkAttributes {
  notaId: string | null
  title: string | null
  preview: string | null
}

export const NotaLink = Node.create({
  name: 'notaLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      notaId: {
        default: null,
      },
      title: {
        default: null,
      },
      preview: {
        default: null,
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="nota-link"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        { 
          'data-type': 'nota-link',
          class: 'nota-link',
          'data-nota-id': HTMLAttributes.notaId,
          'data-preview': HTMLAttributes.preview
        },
        HTMLAttributes
      ),
      `📝 ${HTMLAttributes.title}`,
    ]
  },

  addCommands() {
    return {
      setNotaLink: (attributes: NotaLinkAttributes) => ({ commands }: { commands: RawCommands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        })
      },
    } as Partial<RawCommands>
  },
}) 