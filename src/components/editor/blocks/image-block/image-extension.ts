import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import ImageBlock from './ImageBlock.vue'

export interface ImageOptions {
  HTMLAttributes: Record<string, any>
}

export interface ImageAttributes {
  src: string
  alt: string
  title: string
  width: string
  height: string
  alignment: 'left' | 'center' | 'right'
  objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  isLocked: boolean
  caption: string
  label: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       */
      setImage: (options: Partial<ImageAttributes>) => ReturnType
      /**
       * Update an image
       */
      updateImage: (options: Partial<ImageAttributes>) => ReturnType
    }
  }
}

export const ImageExtension = Node.create<ImageOptions>({
  name: 'image',
  
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
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: 'auto',
      },
      alignment: {
        default: 'center',
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
        tag: 'img[src]',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          
          const element = node as HTMLElement
          
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.getAttribute('width') || '100%',
            height: element.getAttribute('height') || 'auto',
          }
        },
      },
      {
        tag: 'figure',
        getAttrs: (node) => {
          if (typeof node === 'string') return false
          
          const element = node as HTMLElement
          const img = element.querySelector('img')
          const figcaption = element.querySelector('figcaption')
          const label = element.querySelector('figcaption strong')
          
          if (!img) return false
          
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width') || '100%',
            height: img.getAttribute('height') || 'auto',
            caption: figcaption ? figcaption.textContent?.replace(label?.textContent || '', '').trim() : '',
            label: label ? label.textContent : '',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { caption, label, alignment, isLocked, ...attrs } = HTMLAttributes

    if (caption || label) {
      return [
        'figure',
        {
          class: `image-figure alignment-${alignment || 'center'}`,
        },
        ['img', mergeAttributes(this.options.HTMLAttributes, attrs)],
        [
          'figcaption',
          {},
          label ? ['strong', {}, label] : null,
          caption ? [' ', caption] : null,
        ],
      ]
    }

    return ['img', mergeAttributes(this.options.HTMLAttributes, attrs)]
  },

  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
      updateImage: (options) => ({ commands, editor }) => {
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
    return VueNodeViewRenderer(ImageBlock)
  },
})

export default ImageExtension 