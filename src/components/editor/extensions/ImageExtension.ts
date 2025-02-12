import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageBlock from '@/components/editor/blocks/image-block/ImageBlock.vue'
import type { ImageFit } from './types'

export interface SubFigure {
  src: string
  caption?: string
  label?: string
}

export interface ImageAttributes {
  src: string
  caption?: string
  label?: string
  isSubfigureContainer?: boolean
  subfigures?: SubFigure[]
  layout?: 'horizontal' | 'vertical' | 'grid'
  width?: string
  alignment?: 'left' | 'center' | 'right'
  objectFit?: ImageFit
  unifiedSize?: boolean // For subfigures to maintain same size
  isLocked?: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notaImage: {
      setNotaImage: (options: ImageAttributes) => ReturnType
      setNotaImageSubfigureContainer: (options: Partial<ImageAttributes>) => ReturnType
    }
  }
}

export const ImageExtension = Node.create({
  name: 'notaImage',
  
  group: 'block',
  
  atom: true,

  addAttributes() {
    return {
      src: {
        default: ''
      },
      caption: {
        default: null
      },
      label: {
        default: null
      },
      isSubfigureContainer: {
        default: false,
        parseHTML: element => element.hasAttribute('data-subfigure-container'),
        renderHTML: attributes => {
          if (attributes.isSubfigureContainer) {
            return { 'data-subfigure-container': 'true' }
          }
          return {}
        }
      },
      subfigures: {
        default: [],
        parseHTML: element => {
          const subfiguresData = element.getAttribute('data-subfigures')
          return subfiguresData ? JSON.parse(subfiguresData) : []
        },
        renderHTML: attributes => {
          if (attributes.subfigures?.length) {
            return { 'data-subfigures': JSON.stringify(attributes.subfigures) }
          }
          return {}
        }
      },
      layout: {
        default: 'horizontal'
      },
      width: {
        default: '100%'
      },
      alignment: {
        default: 'center'
      },
      objectFit: {
        default: 'contain'
      },
      unifiedSize: {
        default: false
      },
      isLocked: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-subfigure-container]',
        getAttrs: element => ({
          isSubfigureContainer: true,
          subfigures: JSON.parse((element as HTMLElement).getAttribute('data-subfigures') || '[]')
        })
      },
      {
        tag: 'figure',
      },
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { isSubfigureContainer, subfigures, ...rest } = HTMLAttributes
    const attrs = {
      ...rest,
      ...(isSubfigureContainer ? { 'data-subfigure-container': 'true' } : {}),
      ...(subfigures?.length ? { 'data-subfigures': JSON.stringify(subfigures) } : {})
    }
    return ['figure', attrs]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageBlock)
  },

  addCommands() {
    return {
      setNotaImage: (options: ImageAttributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options
        })
      },
      setNotaImageSubfigureContainer: (options: Partial<ImageAttributes> = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            isSubfigureContainer: true,
            subfigures: [],
            layout: 'horizontal',
            ...options
          }
        })
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-i': () => this.editor.commands.setNotaImage({ src: '' }),
      'Mod-Alt-f': () => this.editor.commands.setNotaImageSubfigureContainer()
    }
  }
}) 