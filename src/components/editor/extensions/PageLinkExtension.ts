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

  console.log('Converting page links, found document:', doc.title)

  // Get all page links in the document
  const pageLinks = doc.querySelectorAll('a[data-type="page-link"]')
  console.log('Found page links:', pageLinks.length)
  
  // Get the current URL path to determine if we're using a user tag format
  const currentPath = window.location.pathname
  console.log('Current path:', currentPath)
  
  const isUserTagFormat = currentPath.startsWith('/@')
  
  // Extract user tag if present (format: /@username/notaId)
  let userTag = ''
  if (isUserTagFormat) {
    const pathParts = currentPath.split('/')
    if (pathParts.length >= 2) {
      userTag = pathParts[1] // Will include the @ symbol
    }
    console.log('Using user tag format with tag:', userTag)
  }

  // @ts-ignore
  pageLinks.forEach((link: HTMLAnchorElement) => {
    const href = link.getAttribute('href')
    console.log('Processing link with href:', href)
    
    if (href?.startsWith('/nota/')) {
      const linkedNotaId = href.replace('/nota/', '')
      console.log('Found internal nota link to:', linkedNotaId)

      // Update URLs to point to the public version using the same format as the current page
      let newHref = ''
      if (isUserTagFormat && userTag) {
        newHref = `/${userTag}/${linkedNotaId}`
      } else {
        newHref = `/p/${linkedNotaId}`
      }
      
      console.log('Converting link from', href, 'to', newHref)
      link.setAttribute('href', newHref)
    }
  })
  
  console.log('Conversion complete')
}
