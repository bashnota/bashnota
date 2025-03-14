import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import SubfigureBlock from './SubfigureBlock.vue'

export interface SubfigureOptions {
  HTMLAttributes: Record<string, any>
}

export interface SubfigureAttributes {
  subfigures: Array<{
    src: string
    caption: string
  }>
  layout: 'horizontal' | 'vertical' | 'grid'
  unifiedSize: boolean
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  isLocked: boolean
  caption: string
  label: string
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
      },
      layout: {
        default: 'horizontal',
      },
      unifiedSize: {
        default: true,
      },
      objectFit: {
        default: 'contain',
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
    }
  },

  parseHTML() {
    return [
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
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { subfigures, layout, unifiedSize, objectFit, isLocked, caption, label } = HTMLAttributes
    
    const subfigureItems = (subfigures || []).map((subfig: any) => {
      return [
        'div', 
        { class: 'subfigure-item' }, 
        ['img', { src: subfig.src, style: `object-fit: ${objectFit || 'contain'}` }],
        subfig.caption ? ['div', { class: 'subfigure-caption' }, subfig.caption] : '',
      ]
    })
    
    return [
      'div',
      mergeAttributes(
        this.options.HTMLAttributes,
        {
          'data-type': 'subfigure',
          'data-layout': layout || 'horizontal',
          'data-unified-size': unifiedSize ? 'true' : 'false',
          'data-object-fit': objectFit || 'contain',
          'data-locked': isLocked ? 'true' : 'false',
          class: 'subfigure-container',
        }
      ),
      [
        'div',
        { class: `subfigure-grid subfigure-layout-${layout || 'horizontal'}` },
        ...subfigureItems,
      ],
      label ? ['div', { class: 'subfigure-main-label' }, label] : '',
      caption ? ['div', { class: 'subfigure-main-caption' }, caption] : '',
    ]
  },

  addCommands() {
    return {
      setSubfigure: (options = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
      updateSubfigure: (options) => ({ commands, editor }) => {
        const { state } = editor
        const { tr } = state
        const { selection } = tr
        
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          return commands.updateAttributes(this.name, options)
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