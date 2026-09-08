import DOMPurify, { type Config } from 'dompurify'

// Captions are persisted user input. KaTeX emits nested spans, classes,
// aria-hidden attributes, and inline layout metrics; plain user captions do
// not need any attributes. Keep source and rendered markup separate so an
// attacker cannot borrow KaTeX's styling/class allowance for UI redress.
const allowedTags = [
  'b', 'br', 'code', 'del', 'div', 'em', 'i', 'p', 's', 'span', 'strong',
  'sub', 'sup', 'u',
] as const

const forbiddenTags = [
  'embed', 'form', 'iframe', 'img', 'math', 'object', 'style', 'svg',
] as const

const forbiddenAttributes = [
  'action', 'formaction', 'href', 'src', 'srcset', 'style', 'xlink:href',
] as const

// DOMPurify's default import is a process-global singleton: third-party code
// can add hooks to it. Create a private instance that this module never exposes
// so a hook added elsewhere cannot reintroduce unsafe attributes at a v-html
// boundary.
const captionPurifier = DOMPurify(window)

const renderedCaptionPolicy: Config = {
  ALLOWED_TAGS: [...allowedTags],
  // These attributes are emitted by trusted KaTeX only. Source caption markup
  // is stripped of every attribute before KaTeX is invoked.
  ALLOWED_ATTR: ['aria-hidden', 'class', 'style'],
  FORBID_TAGS: [...forbiddenTags],
  FORBID_ATTR: [...forbiddenAttributes.filter(attribute => attribute !== 'style')],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

const sourceCaptionPolicy: Config = {
  ...renderedCaptionPolicy,
  ALLOWED_ATTR: [],
  FORBID_ATTR: [...forbiddenAttributes],
}

/** Remove attributes from persisted markup before it can be combined with KaTeX output. */
export function sanitizeSubfigureCaptionSource(html: string): string {
  return captionPurifier.sanitize(html, sourceCaptionPolicy)
}

/** Sanitize post-KaTeX caption markup immediately before a caption v-html sink. */
export function sanitizeSubfigureCaption(html: string): string {
  return captionPurifier.sanitize(html, renderedCaptionPolicy)
}
