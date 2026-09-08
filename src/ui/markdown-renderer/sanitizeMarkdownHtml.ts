import DOMPurify, { type Config } from 'dompurify'

// Markdown arrives from local persistence and remote assistant responses. Keep
// the renderer's formatting vocabulary deliberately small, but retain the
// structures emitted by marked and highlight.js.
const allowedTags = [
  'a', 'blockquote', 'br', 'caption', 'code', 'del', 'div', 'em', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'li', 'ol', 'p', 'pre', 'span',
  'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
] as const

// Allow ordinary web links and same-origin/relative references, while
// rejecting executable and opaque schemes (javascript:, data:, vbscript:,
// blob:) as well as protocol-relative and backslash-confusable URLs.
const safeUrlPattern = /^(?:(?:https?|mailto):[^\r\n\\]*|\/(?!\/)[^\r\n\\]*|\.{1,2}\/[^\r\n\\]*|[#?][^\r\n\\]*|[^:/?#\\\r\n]+(?:[/?#][^\r\n\\]*)?)$/i

// DOMPurify's default export is a shared singleton in the browser. A hook
// installed by another feature must not be able to relax this v-html boundary,
// so the Markdown renderer owns a private instance that is never exported.
const markdownPurifier = DOMPurify(window)

// DOMPurify deliberately permits data: URLs on images even when an
// ALLOWED_URI_REGEXP is supplied. This renderer does not need inline data
// resources, so enforce the same URL policy on both href and src inside the
// private instance. No caller can register or alter this hook.
markdownPurifier.addHook('uponSanitizeAttribute', (_node, hookEvent) => {
  if (
    (hookEvent.attrName === 'href' || hookEvent.attrName === 'src') &&
    !safeUrlPattern.test(hookEvent.attrValue)
  ) {
    hookEvent.keepAttr = false
  }

  // Raw Markdown HTML must not borrow application/Tailwind classes for UI
  // redress. Only highlight.js' own generated class vocabulary crosses the
  // boundary; the renderer itself adds `hljs`, and highlighted token spans use
  // `hljs-*` classes.
  if (hookEvent.attrName === 'class') {
    hookEvent.attrValue = hookEvent.attrValue
      .split(/\s+/)
      .filter(className => className === 'hljs' || className.startsWith('hljs-'))
      .join(' ')
    hookEvent.keepAttr = hookEvent.attrValue.length > 0
  }
})

const markdownPolicy: Config = {
  ALLOWED_TAGS: [...allowedTags],
  // highlight.js requires class. Markdown links/images require href/src plus
  // inert descriptive attributes. Event handlers are excluded by construction.
  ALLOWED_ATTR: ['alt', 'class', 'href', 'src', 'title'],
  ALLOWED_URI_REGEXP: safeUrlPattern,
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

/** Sanitize the complete marked/highlight.js result at the final v-html boundary. */
export function sanitizeMarkdownHtml(html: string): string {
  return markdownPurifier.sanitize(html, markdownPolicy)
}
