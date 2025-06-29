import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import SubfigureBlock from './SubfigureBlock.vue'
import type { ImageFit } from '@/features/editor/components/extensions/types'

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
  HTMLAttributes: Record<string, any>
}

export interface SubfigureAttributes {
  subfigures: SubFigure[]
  layout: typeof VALID_LAYOUTS[number]
  unifiedSize: boolean
  objectFit: typeof VALID_OBJECT_FITS[number]
  isLocked: boolean
  caption: string
  label: string
  gridColumns: number
}

// Validation functions
export const validateSubfigure = (subfig: SubFigure): boolean => {
  return typeof subfig.src === 'string' && subfig.src.length > 0
}

export const validateLayout = (layout: string): layout is typeof VALID_LAYOUTS[number] => {
  return VALID_LAYOUTS.includes(layout as any)
}

export const validateObjectFit = (fit: string): fit is typeof VALID_OBJECT_FITS[number] => {
  return VALID_OBJECT_FITS.includes(fit as any)
}

export const validateGridColumns = (columns: number): boolean => {
  return Number.isInteger(columns) && columns >= MIN_GRID_COLUMNS && columns <= MAX_GRID_COLUMNS
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subfigure: {
      /**
       * Add a subfigure block
       */
      setSubfigure: (options?: Partial<SubfigureAttributes>) => ReturnType
      /**
       * Update a subfigure block
       */
      updateSubfigure: (options: Partial<SubfigureAttributes>) => ReturnType
    }
  }
}

export const SubfigureExtension = Node.create<SubfigureOptions>({
  name: 'subfigure',
  
  group: 'block',
  
  selectable: true,
  
  draggable: true,
  
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
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
        renderHTML: (attributes) => {
          if (attributes.subfigures?.length) {
            return { 'data-subfigures': JSON.stringify(attributes.subfigures) }
          }
          return {}
        },
      },
      layout: {
        default: 'horizontal',
        parseHTML: (element) => {
          const layout = element.getAttribute('data-layout') || 'horizontal'
          return validateLayout(layout) ? layout : 'horizontal'
        },
      },
      unifiedSize: {
        default: true,
      },
      objectFit: {
        default: 'contain',
        parseHTML: (element) => {
          const fit = element.getAttribute('data-object-fit') || 'contain'
          return validateObjectFit(fit) ? fit : 'contain'
        },
      },
      isLocked: {
        default: false,
      },
      caption: {
        default: '',
      },
      label: {
        default: '',
      },
      gridColumns: {
        default: 2,
        parseHTML: (element) => {
          const columns = parseInt(element.getAttribute('data-grid-columns') || '2', 10)
          return validateGridColumns(columns) ? columns : 2
        },
      },
    }
  },

  parseHTML() {
    return [
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
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { subfigures, layout, unifiedSize, objectFit, isLocked, caption, label, gridColumns, ...rest } = HTMLAttributes
    
    const attrs = {
      ...rest,
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
    let gridClass = 'subfigure-grid';
    const gridStyle: Record<string, string> = {};
    
    if (layout === 'vertical') {
      gridClass += ' subfigure-layout-vertical';
    } else if (layout === 'horizontal') {
      gridClass += ' subfigure-layout-horizontal';
    } else if (layout === 'grid') {
      gridClass += ' subfigure-layout-grid';
      gridStyle['grid-template-columns'] = `repeat(${gridColumns || 2}, 1fr)`;
    }
    
    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, attrs),
      [
        'div',
        { 
          class: gridClass,
          style: Object.entries(gridStyle).map(([key, value]) => `${key}: ${value}`).join(';')
        },
        ...subfigureItems,
      ],
      label ? ['div', { class: 'subfigure-main-label' }, label] : '',
      caption ? ['div', { class: 'subfigure-main-caption' }, caption] : '',
    ]
  },

  addCommands() {
    return {
      setSubfigure: (options = {}) => ({ commands }) => {
        // Validate and sanitize options
        const sanitizedOptions = {
          subfigures: Array.isArray(options.subfigures) ? options.subfigures.filter(validateSubfigure) : [],
          layout: validateLayout(options.layout || 'horizontal') ? options.layout : 'horizontal',
          unifiedSize: typeof options.unifiedSize === 'boolean' ? options.unifiedSize : true,
          objectFit: validateObjectFit(options.objectFit || 'contain') ? options.objectFit : 'contain',
          isLocked: typeof options.isLocked === 'boolean' ? options.isLocked : false,
          caption: typeof options.caption === 'string' ? options.caption : '',
          label: typeof options.label === 'string' ? options.label : '',
          gridColumns: validateGridColumns(options.gridColumns || 2) ? options.gridColumns : 2,
        }

        return commands.insertContent({
          type: this.name,
          attrs: sanitizedOptions,
        })
      },
      updateSubfigure: (options) => ({ commands, editor }) => {
        const { state } = editor
        const { tr } = state
        const { selection } = tr
        
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          // Validate and sanitize update options
          const sanitizedOptions = {
            ...options,
            layout: options.layout && validateLayout(options.layout) ? options.layout : undefined,
            objectFit: options.objectFit && validateObjectFit(options.objectFit) ? options.objectFit : undefined,
            gridColumns: options.gridColumns && validateGridColumns(options.gridColumns) ? options.gridColumns : undefined,
            subfigures: options.subfigures ? options.subfigures.filter(validateSubfigure) : undefined,
          }

          return commands.updateAttributes(this.name, sanitizedOptions)
        }

        return false
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SubfigureBlock)
  },
})

export default SubfigureExtension 








