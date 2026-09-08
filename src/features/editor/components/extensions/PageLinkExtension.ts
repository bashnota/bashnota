/**
 * PageLink node — ported onto the raw-ProseMirror primitives.
 *
 * Like-for-like port of the former `Node.create`. It had NO node view (rendered
 * purely from `toDOM`), so ProseMirror renders it without a node view. The `convertPublicPageLinks` helper
 * is preserved verbatim for its existing import sites.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'
import { isSafeLinkUri } from '@/features/editor/pm/stockExtensions'

export const pageLinkNodeDefinition: NodeDefinition = {
  name: 'pageLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true, // Makes it behave as a single unit
  attrs: {
    href: { default: null },
    title: { default: null },
  },
  parseDOM: [{ tag: 'a[data-type="page-link"]' }],
  toDOM: (node) => {
    const a = node.attrs
    const attrs: Record<string, unknown> = {
      'data-type': 'page-link',
      class: 'nota-link',
    }
    if (isSafeLinkUri(a.href)) attrs.href = a.href
    if (a.title != null) attrs.title = a.title
    return ['a', attrs, `📄 ${a.title}`]
  },
}

export const pageLinkDefinition = defineNode(pageLinkNodeDefinition)

export const PageLink = pageLinkDefinition

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
