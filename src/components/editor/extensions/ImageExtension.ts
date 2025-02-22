import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageBlock from '../blocks/image-block/ImageBlock.vue'

export interface ImageAttributes {
  src: string
  caption?: string
  label?: string
  width?: string
  alignment?: 'left' | 'center' | 'right'
  objectFit?: 'contain' | 'cover'
  isLocked?: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageBlock: {
      setImage: (options?: Partial<ImageAttributes>) => ReturnType
    }
  }
}

export const ImageExtension = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
      },
      caption: {
        default: null,
      },
      label: {
        default: null,
      },
      width: {
        default: '100%',
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
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-image-block]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', { 'data-image-block': '', ...HTMLAttributes }]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(ImageBlock)
  },

  addCommands() {
    return {
      setImage:
        (options: Partial<ImageAttributes> = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: '',
              width: '100%',
              alignment: 'center',
              ...options,
            },
          })
        },
    }
  },
})
