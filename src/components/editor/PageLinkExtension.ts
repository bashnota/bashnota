import { Node } from '@tiptap/core'
import { mergeAttributes } from '@tiptap/core'

export const PageLink = Node.create({
  name: 'pageLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true, // Makes it behave as a single unit

  addAttributes() {
    return {
      href: {
        default: null
      },
      title: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="page-link"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(
      { 'data-type': 'page-link', class: 'nota-link' },
      HTMLAttributes
    ), `📄 ${HTMLAttributes.title}`]
  }
}) 