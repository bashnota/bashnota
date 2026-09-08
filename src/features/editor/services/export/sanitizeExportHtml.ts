import DOMPurify, { type Config } from 'dompurify'
import { isInertExecutionOutputClass } from '@/features/editor/utils/sanitizeExecutionOutput'

const generatedKatexMarker = 'data-export-generated-katex'
const transformedExportHtml = Symbol('transformedExportHtml')

const allowedTags = [
  'a', 'annotation', 'article', 'b', 'blockquote', 'br', 'caption', 'code', 'col',
  'colgroup', 'del', 'div', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'i', 'iframe', 'img', 'li', 'math', 'mfrac', 'mi', 'mn',
  'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'mspace', 'msqrt',
  'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder',
  'munderover', 'ol', 'p', 'path', 'pre', 'semantics', 'span', 'strong', 'sub', 'sup', 'svg',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
] as const

const sourceTags = [
  ...allowedTags.filter(tag => tag !== 'iframe' && tag !== 'svg' && tag !== 'path'),
  // The production editor serializes this atom as a custom element. It exists
  // only long enough for processCustomBlocks() to replace it with an inert table.
  'confusion-matrix',
]
const safeLinkUrl = /^(?:(?:https?|mailto):[^\r\n\\]*|\/(?!\/)[^\r\n\\]*|\.{1,2}\/[^\r\n\\]*|[#?][^\r\n\\]*|[^:/?#\\\r\n]+(?:[/?#][^\r\n\\]*)?)$/i
const canonicalArchiveAssetUrl = /^(?:\.\.\/)?assets\/(?:image|output)_[0-9]+\.(?:png|jpg|gif|webp)$/
const safeYoutubeUrl = /^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+$/
const plausibleExportImage = /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/i

const exactClasses = new Set([
  'base', 'bibliography-item', 'bibliography-list', 'citation-interactive', 'confusion-matrix-block',
  'confusion-matrix-table', 'drawio-placeholder', 'katex-display', 'mermaid-placeholder',
  'nota-data-table', 'nota-link', 'output', 'pipeline-placeholder', 'sub-nota-link',
  'theorem', 'theorem-content', 'theorem-header', 'theorem-proof',
])
const sourceStructuralClasses = new Set(['drawio-diagram', 'export-code-output'])
const generatedSvgAttributes = new Set(['aria-hidden', 'height', 'preserveaspectratio', 'viewbox', 'width', 'xmlns'])
const confusionMatrixSourceAttributes = new Set(['data-labels', 'data-matrix', 'data-title'])

const sourceDataAttributes = new Set([
  'data-citation-key', 'data-citation-number', 'data-checked', 'data-content', 'data-labels',
  'data-latex', 'data-matrix', 'data-number', 'data-output', 'data-proof', 'data-table-data',
  'data-target-nota-id', 'data-target-nota-title', 'data-theorem-type', 'data-title', 'data-type',
  'data-type-theorem',
])

const finalPolicy: Config = {
  ALLOWED_TAGS: [...allowedTags],
  ALLOWED_ATTR: [
    'allowfullscreen', 'alt', 'aria-hidden', 'class', 'colspan', 'columnalign', 'columnspacing',
    'data-citation-json', generatedKatexMarker, 'displaystyle', 'display', 'encoding', 'fence',
    'd', 'frameborder', 'height', 'href', 'id', 'mathvariant', 'preserveaspectratio', 'rel', 'rowspan', 'rowspacing',
    'scriptlevel', 'src', 'style', 'target', 'title', 'width', 'xmlns',
    'viewbox',
  ],
  ALLOWED_URI_REGEXP: safeLinkUrl,
  ALLOW_ARIA_ATTR: false,
  // Hooks keep the generated marker and citation metadata to an exact set.
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['embed', 'form', 'link', 'meta', 'object', 'script', 'style'],
  FORBID_ATTR: ['action', 'formaction', 'srcdoc', 'xlink:href'],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

const sourcePolicy: Config = {
  ALLOWED_TAGS: [...sourceTags],
  ALLOWED_ATTR: [
    'alt', 'class', 'colspan', 'data-citation-key', 'data-citation-number', 'data-checked',
    'data-content', 'data-labels', 'data-latex', 'data-matrix', 'data-number', 'data-output',
    'data-proof', 'data-table-data', 'data-target-nota-id', 'data-target-nota-title',
    'data-theorem-type', 'data-title', 'data-type', 'data-type-theorem', 'height', 'href', 'rowspan', 'src', 'tabledata',
    'title', 'videoid', 'width',
  ],
  ALLOWED_URI_REGEXP: safeLinkUrl,
  ALLOW_ARIA_ATTR: false,
  // Hooks retain only source attributes needed by known export transforms.
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['embed', 'form', 'iframe', 'link', 'meta', 'object', 'script', 'style', 'svg'],
  FORBID_ATTR: ['action', 'formaction', 'srcdoc', 'style', 'xlink:href'],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
}

function isGeneratedKatex(node: Node): boolean {
  return node.nodeType === 1
    && typeof (node as Element).closest === 'function'
    && Boolean((node as Element).closest(`[${generatedKatexMarker}="true"]`))
}

function createSourcePurifier() {
  const purifier = DOMPurify(window)
  purifier.addHook('uponSanitizeAttribute', (node, event) => {
    const tagName = node.nodeName.toLowerCase()

    if (event.attrName === 'class') {
      event.attrValue = event.attrValue
        .split(/\s+/)
        .filter(token => sourceStructuralClasses.has(token))
        .join(' ')
      event.keepAttr = event.attrValue.length > 0
    }
    if (event.attrName === 'href' && !safeLinkUrl.test(event.attrValue)) event.keepAttr = false
    if (event.attrName === 'src' && !(tagName === 'img' && (plausibleExportImage.test(event.attrValue) || canonicalArchiveAssetUrl.test(event.attrValue)))) event.keepAttr = false
    if (event.attrName.startsWith('data-') && !sourceDataAttributes.has(event.attrName)) event.keepAttr = false
    if (tagName === 'confusion-matrix' && !confusionMatrixSourceAttributes.has(event.attrName)) event.keepAttr = false
  })
  return purifier
}

function createFinalPurifier(allowedAssetUrls: ReadonlySet<string>) {
  const purifier = DOMPurify(window)
  purifier.addHook('uponSanitizeElement', node => {
    const tagName = node.nodeName.toLowerCase()
    if ((tagName === 'svg' || tagName === 'path') && !isGeneratedKatex(node)) node.parentNode?.removeChild(node)
  })
  purifier.addHook('uponSanitizeAttribute', (node, event) => {
    const tagName = node.nodeName.toLowerCase()
    const generated = isGeneratedKatex(node)

    if (tagName === 'svg') {
      if (!generated || !generatedSvgAttributes.has(event.attrName.toLowerCase())) event.keepAttr = false
    }
    if (tagName === 'path' && (!generated || event.attrName.toLowerCase() !== 'd')) event.keepAttr = false

    if (event.attrName === 'class' && !generated) {
      event.attrValue = event.attrValue
        .split(/\s+/)
        .filter(token => exactClasses.has(token) || isInertExecutionOutputClass(token))
        .join(' ')
      event.keepAttr = event.attrValue.length > 0
    }
    if (event.attrName === 'style' && !generated) event.keepAttr = false
    if (event.attrName === 'href' && !safeLinkUrl.test(event.attrValue)) event.keepAttr = false
    if (event.attrName === 'src') {
      const allowed = tagName === 'img'
        ? canonicalArchiveAssetUrl.test(event.attrValue) && allowedAssetUrls.has(event.attrValue)
        : tagName === 'iframe' && safeYoutubeUrl.test(event.attrValue)
      if (!allowed) event.keepAttr = false
    }
    if (event.attrName === 'id' && !/^ref-[a-zA-Z0-9_-]+$/.test(event.attrValue)) event.keepAttr = false
    if (event.attrName.startsWith('data-') && event.attrName !== 'data-citation-json' && event.attrName !== generatedKatexMarker) event.keepAttr = false
  })
  return purifier
}

/**
 * First trust boundary: persisted editor HTML is stripped of presentation and
 * executable markup before export transforms run. The small retained data/class
 * set exists only to identify transforms; it never reaches the final export.
 */
export function sanitizeExportSourceHtml(html: string): string {
  return createSourcePurifier().sanitize(html, sourcePolicy)
}

/** Mark KaTeX generated by this module's export pipeline for the final policy. */
export function markGeneratedKatex(element: Element): void {
  element.setAttribute(generatedKatexMarker, 'true')
}

export interface TransformedExportHtml {
  readonly html: string
  readonly [transformedExportHtml]: true
}

/**
 * Final trust boundary. Only KaTeX emitted after source sanitization can retain
 * KaTeX's generated classes and layout styles; persisted source cannot forge
 * the private marker because the source policy removes it.
 */
export interface ExportSanitizationOptions {
  allowedAssetUrls?: ReadonlySet<string>
}

export function sanitizeExportHtml(html: string, options: ExportSanitizationOptions = {}): string {
  const sanitized = createFinalPurifier(options.allowedAssetUrls ?? new Set()).sanitize(html, finalPolicy)
  const parsed = new DOMParser().parseFromString(sanitized, 'text/html')
  parsed.querySelectorAll(`[${generatedKatexMarker}]`).forEach(element => element.removeAttribute(generatedKatexMarker))
  return parsed.body.innerHTML
}

/** Seal post-transform HTML so templates cannot mistake caller strings for generated markup. */
export function finalizeExportHtml(html: string, options: ExportSanitizationOptions = {}): TransformedExportHtml {
  return Object.freeze({ html: sanitizeExportHtml(html, options), [transformedExportHtml]: true as const })
}

export function isFinalizedExportHtml(value: unknown): value is TransformedExportHtml {
  return Boolean(value && typeof value === 'object' && (value as TransformedExportHtml)[transformedExportHtml] === true)
}
