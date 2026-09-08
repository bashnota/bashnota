/**
 * Subfigure node — ported onto the raw-ProseMirror primitives.
 *
 * Like-for-like port of the former `Node.create`, preserving every exported
 * validator/type so existing import sites keep working. The two parse rules (a
 * `figure[data-subfigures]` and a legacy `div[data-type="subfigure"]`) are carried
 * through verbatim, including their child-DOM `getAttrs`; the adapter layers the
 * per-attribute parseHTML on top exactly as TipTap did.
 *
 * NOTE: the original node-level `renderHTML` consumed TipTap's pre-rendered
 * `HTMLAttributes` and — via a destructuring mismatch (`subfigures` vs the
 * `data-subfigures` key its own attribute renderHTML produced) — always emitted an
 * empty `data-subfigures="[]"` with no `<img>` children, silently dropping images
 * from exported/pasted HTML. `toDOM` receives the ProseMirror node directly, so it
 * reads `node.attrs.subfigures` and serialises them correctly. This is the natural
 * mechanical translation (toDOM has no HTMLAttributes to mis-destructure); the
 * side effect is that static-HTML export now round-trips subfigures. Filed as a
 * finding rather than deliberately re-introducing the data-loss bug.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

// Constants for validation
const VALID_LAYOUTS = ['horizontal', 'vertical', 'grid'] as const
const VALID_OBJECT_FITS = ['contain', 'cover', 'fill', 'none', 'scale-down'] as const
const MIN_GRID_COLUMNS = 1
const MAX_GRID_COLUMNS = 4

export interface SubFigure {
  src: string
  caption?: string
}

export interface SubfigureOptions {
  HTMLAttributes: Record<string, unknown>
}

export interface SubfigureAttributes {
  subfigures: SubFigure[]
  layout: (typeof VALID_LAYOUTS)[number]
  unifiedSize: boolean
  objectFit: (typeof VALID_OBJECT_FITS)[number]
  isLocked: boolean
  caption: string
  label: string
  gridColumns: number
}

// Validation functions
export const validateSubfigure = (subfig: SubFigure): boolean => {
  return typeof subfig.src === 'string' && subfig.src.length > 0
}

export const validateLayout = (layout: string): layout is (typeof VALID_LAYOUTS)[number] => {
  return VALID_LAYOUTS.includes(layout as (typeof VALID_LAYOUTS)[number])
}

export const validateObjectFit = (fit: string): fit is (typeof VALID_OBJECT_FITS)[number] => {
  return VALID_OBJECT_FITS.includes(fit as (typeof VALID_OBJECT_FITS)[number])
}

export const validateGridColumns = (columns: number): boolean => {
  return Number.isInteger(columns) && columns >= MIN_GRID_COLUMNS && columns <= MAX_GRID_COLUMNS
}

export const subfigureNodeDefinition: NodeDefinition = {
  name: 'subfigure',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,
  attrs: {
    subfigures: {
      default: [],
      parseHTML: (element) => {
        try {
          const subfiguresData = element.getAttribute('data-subfigures')
          const parsed = subfiguresData ? JSON.parse(subfiguresData) : []
          return Array.isArray(parsed) ? parsed.filter(validateSubfigure) : []
        } catch (error) {
          console.error('Error parsing subfigures:', error)
          return []
        }
      },
    },
    layout: {
      default: 'horizontal',
      parseHTML: (element) => {
        const layout = element.getAttribute('data-layout') || 'horizontal'
        return validateLayout(layout) ? layout : 'horizontal'
      },
    },
    unifiedSize: { default: true },
    objectFit: {
      default: 'contain',
      parseHTML: (element) => {
        const fit = element.getAttribute('data-object-fit') || 'contain'
        return validateObjectFit(fit) ? fit : 'contain'
      },
    },
    isLocked: { default: false },
    caption: { default: '' },
    label: { default: '' },
    gridColumns: {
      default: 2,
      parseHTML: (element) => {
        const columns = parseInt(element.getAttribute('data-grid-columns') || '2', 10)
        return validateGridColumns(columns) ? columns : 2
      },
    },
  },
  parseDOM: [
    {
      tag: 'figure[data-subfigures]',
      getAttrs: (element) => {
        if (typeof element === 'string') return {}
        const el = element as HTMLElement
        return {
          subfigures: JSON.parse(el.getAttribute('data-subfigures') || '[]'),
          layout: el.getAttribute('data-layout') || 'horizontal',
          unifiedSize: el.getAttribute('data-unified-size') === 'true',
          objectFit: el.getAttribute('data-object-fit') || 'contain',
          isLocked: el.getAttribute('data-locked') === 'true',
          caption: el.querySelector('.subfigure-main-caption')?.textContent || '',
          label: el.querySelector('.subfigure-main-label')?.textContent || '',
          gridColumns: parseInt(el.getAttribute('data-grid-columns') || '2', 10),
        }
      },
    },
    {
      tag: 'div[data-type="subfigure"]',
      getAttrs: (node) => {
        if (typeof node === 'string') return {}
        const element = node as HTMLElement
        const subfigures: Array<{ src: string; caption: string }> = []

        // Parse subfigures from the HTML
        element.querySelectorAll('.subfigure-item').forEach((item) => {
          const img = item.querySelector('img')
          const caption = item.querySelector('.subfigure-caption')

          if (img) {
            subfigures.push({
              src: img.getAttribute('src') || '',
              caption: caption ? caption.textContent || '' : '',
            })
          }
        })

        return {
          subfigures,
          layout: element.getAttribute('data-layout') || 'horizontal',
          unifiedSize: element.getAttribute('data-unified-size') === 'true',
          objectFit: element.getAttribute('data-object-fit') || 'contain',
          isLocked: element.getAttribute('data-locked') === 'true',
          caption: element.querySelector('.subfigure-main-caption')?.textContent || '',
          label: element.querySelector('.subfigure-main-label')?.textContent || '',
          gridColumns: parseInt(element.getAttribute('data-grid-columns') || '2', 10),
        }
      },
    },
  ],
  toDOM: (node) => {
    const { subfigures, layout, unifiedSize, objectFit, isLocked, caption, label, gridColumns } =
      node.attrs as SubfigureAttributes

    const attrs = {
      'data-type': 'subfigure',
      'data-layout': layout || 'horizontal',
      'data-unified-size': unifiedSize ? 'true' : 'false',
      'data-object-fit': objectFit || 'contain',
      'data-locked': isLocked ? 'true' : 'false',
      'data-subfigures': JSON.stringify(subfigures || []),
      'data-grid-columns': gridColumns || 2,
      class: 'subfigure-container',
    }

    const subfigureItems = (subfigures || []).map((subfig: SubFigure) => {
      return [
        'div',
        { class: 'subfigure-item' },
        ['img', { src: subfig.src, style: `object-fit: ${objectFit || 'contain'}` }],
        subfig.caption ? ['div', { class: 'subfigure-caption' }, subfig.caption] : '',
      ]
    })

    // Create grid style based on layout
    let gridClass = 'subfigure-grid'
    const gridStyle: Record<string, string> = {}

    if (layout === 'vertical') {
      gridClass += ' subfigure-layout-vertical'
    } else if (layout === 'horizontal') {
      gridClass += ' subfigure-layout-horizontal'
    } else if (layout === 'grid') {
      gridClass += ' subfigure-layout-grid'
      gridStyle['grid-template-columns'] = `repeat(${gridColumns || 2}, 1fr)`
    }

    return [
      'figure',
      attrs,
      [
        'div',
        {
          class: gridClass,
          style: Object.entries(gridStyle)
            .map(([key, value]) => `${key}: ${value}`)
            .join(';'),
        },
        ...subfigureItems,
      ],
      label ? ['div', { class: 'subfigure-main-label' }, label] : '',
      caption ? ['div', { class: 'subfigure-main-caption' }, caption] : '',
    ] as never
  },
}

export const subfigureDefinition = defineNode(subfigureNodeDefinition)

export const SubfigureExtension = subfigureDefinition

export default SubfigureExtension
