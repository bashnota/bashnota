import DOMPurify, { type Config } from 'dompurify'

// Theorem source is persisted user input. It must not be allowed to borrow the
// attributes that MathJax needs for its generated SVG. Keep the two trust
// boundaries separate: clean source before rendering, then clean the complete
// rendered result immediately before it reaches MixedContentDisplay's v-html.
const sourceTags = [
  'br', 'em', 'p', 'span', 'strong', 'sub',
] as const

const renderedTags = [
  ...sourceTags,
  // MathJax tex-svg output is limited to this inert structural subset. In
  // particular, do not admit foreignObject, animation, filters, or shapes
  // that can load external resources.
  'defs', 'div', 'g', 'path', 'svg', 'use',
] as const

// DOMPurify's default import is a process-global singleton. A hook registered
// by another feature can change what it returns, so this component owns a
// private hook-free purifier for both stages of this rendering boundary.
const theoremPurifier = DOMPurify(window)

const sourcePolicy: Config = {
  ALLOWED_TAGS: [...sourceTags],
  ALLOWED_ATTR: [],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
}

const renderedPolicy: Config = {
  ALLOWED_TAGS: [...renderedTags],
  // These are emitted by MathJax's tex-svg renderer. xlink:href is included
  // only for same-document path references (#MJX-...). DOMPurify's default
  // URI checks reject javascript: and data: values; do not replace them with
  // a global regexp because MathJax's SVG path-data attribute is also checked.
  ALLOWED_ATTR: [
    'aria-hidden', 'class', 'd', 'fill', 'height', 'id', 'transform', 'viewBox',
    'width', 'xlink:href',
  ],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
}

/** Remove all attributes from persisted theorem source before MathJax sees it. */
export function sanitizeTheoremSource(html: string): string {
  return theoremPurifier.sanitize(html, sourcePolicy)
}

/** Sanitize normal and error rendering output immediately before the v-html sink. */
export function sanitizeRenderedTheoremContent(html: string): string {
  const cleanHtml = theoremPurifier.sanitize(html, renderedPolicy)

  // DOMPurify correctly removes javascript: and data: URLs, but deliberately
  // permits https: and protocol-relative URLs on SVG <use>. MathJax needs only
  // its own in-document glyph references, so constrain the surviving values to
  // its fragment-id form after DOMPurify has canonicalized the markup and
  // before the v-html boundary. This only removes an attribute; it never
  // constructs or reintroduces markup.
  return cleanHtml.replace(/\s+xlink:href="(?!#MJX-[\w-]+")([^"]*)"/gi, '')
}
