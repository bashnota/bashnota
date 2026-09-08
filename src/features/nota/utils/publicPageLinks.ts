/**
 * Convert local nota links in a rendered public document to their public URL.
 * This intentionally stays outside the editor extension module so public-route
 * boot does not import the ProseMirror schema just to rewrite anchors.
 */
export function convertPublicPageLinks(doc: Document) {
  const isUserTagFormat = window.location.pathname.startsWith('/@')
  const userTag = isUserTagFormat ? window.location.pathname.split('/')[1] : ''

  doc.querySelectorAll<HTMLAnchorElement>('a[data-type="page-link"]').forEach((link) => {
    const href = link.getAttribute('href')
    if (!href?.startsWith('/nota/')) return

    const linkedNotaId = href.slice('/nota/'.length)
    link.setAttribute('href', isUserTagFormat && userTag
      ? `/${userTag}/${linkedNotaId}`
      : `/p/${linkedNotaId}`)
  })
}
