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
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type="page-link"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(
        {
          'data-type': 'page-link',
          class: 'nota-link',
        },
        HTMLAttributes,
      ),
      `📄 ${HTMLAttributes.title}`,
    ]
  },
})

// Helper function to convert page link URLs from /nota/ to /p/ for published content
export function convertPublicPageLinks(doc: Document) {
  if (!doc) return

  // Get all page links in the document
  const pageLinks = doc.querySelectorAll('a[data-type="page-link"]')

  // @ts-ignore
  pageLinks.forEach((link: HTMLAnchorElement) => {
    const href = link.getAttribute('href')
    if (href?.startsWith('/nota/')) {
      const linkedNotaId = href.replace('/nota/', '')

      // Update URLs to point to the public version
      link.setAttribute('href', `/p/${linkedNotaId}`)
    }
  })
}
