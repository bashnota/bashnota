import DOMPurify from 'dompurify'

// Execution output is untrusted. These sinks only need structural and
// syntax-highlighting markup; links, images, inline CSS, and embedded document
// formats are rendered by the sandboxed output path instead.
const allowedTags = [
  'b', 'br', 'code', 'div', 'em', 'i', 'p', 'pre', 'span', 'strong', 'u',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
] as const

const forbiddenTags = ['embed', 'form', 'iframe', 'img', 'math', 'object', 'style', 'svg'] as const
const forbiddenAttributes = ['action', 'formaction', 'href', 'src', 'srcset', 'style', 'xlink:href'] as const

const inertOutputClasses = new Set([
  'code-line', 'error-line', 'hljs', 'json-key', 'json-literal', 'json-number',
  'json-string', 'line-content', 'line-number',
])

export function isInertExecutionOutputClass(token: string): boolean {
  return inertOutputClasses.has(token)
    || /^hljs-[a-z0-9_-]+$/i.test(token)
    || /^language-[a-z0-9_+-]+$/i.test(token)
    || /^ansi-(?:fg|bg)-(?:[0-9]{1,3}|default)$/.test(token)
    || /^ansi-(?:bold|dim|italic|underline|strike)$/.test(token)
    || /^(?:dataframe|table)(?:-[a-z0-9_-]+)?$/i.test(token)
}

const outputPurifier = DOMPurify(window)

outputPurifier.addHook('uponSanitizeAttribute', (_node, event) => {
  if (event.attrName !== 'class') return

  event.attrValue = event.attrValue
    .split(/\s+/)
    .filter(isInertExecutionOutputClass)
    .join(' ')
  event.keepAttr = event.attrValue.length > 0
})

/** Sanitize markup immediately before it reaches an execution-output v-html sink. */
export function sanitizeExecutionOutput(html: string): string {
  return outputPurifier.sanitize(html, {
    ALLOWED_TAGS: [...allowedTags],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: [...forbiddenTags],
    FORBID_ATTR: [...forbiddenAttributes],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  })
}
