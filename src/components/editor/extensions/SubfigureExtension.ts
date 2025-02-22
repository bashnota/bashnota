import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SubfigureBlock from '@/components/editor/blocks/subfigure-block/SubfigureBlock.vue'
import type { ImageFit } from './types'

export interface SubFigure {
  src: string
  caption?: string
}

export interface SubfigureAttributes {
  subfigures: SubFigure[]
  caption?: string
  label?: string
  layout?: 'horizontal' | 'vertical' | 'grid'
  objectFit?: ImageFit
  unifiedSize?: boolean
  isLocked?: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subfigures: {
      setSubfigures: (options?: Partial<SubfigureAttributes>) => ReturnType
    }
  }
}

export const SubfigureExtension = Node.create({
  name: 'subfigures',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      subfigures: {
        default: [],
        parseHTML: (element) => {
          const subfiguresData = element.getAttribute('data-subfigures')
          return subfiguresData ? JSON.parse(subfiguresData) : []
        },
        renderHTML: (attributes) => {
          if (attributes.subfigures?.length) {
            return { 'data-subfigures': JSON.stringify(attributes.subfigures) }
          }
          return {}
        },
      },
      caption: {
        default: null,
      },
      label: {
        default: null,
      },
      layout: {
        default: 'horizontal',
      },
      objectFit: {
        default: 'contain',
      },
      unifiedSize: {
        default: false,
      },
      isLocked: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-subfigures]',
        getAttrs: (element) => ({
          subfigures: JSON.parse((element as HTMLElement).getAttribute('data-subfigures') || '[]'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { subfigures, ...rest } = HTMLAttributes
    const attrs = {
      ...rest,
      ...(subfigures?.length ? { 'data-subfigures': JSON.stringify(subfigures) } : {}),
    }
    return ['figure', attrs]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(SubfigureBlock)
  },

  addCommands() {
    return {
      setSubfigures:
        (options: Partial<SubfigureAttributes> = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              subfigures: [],
              layout: 'horizontal',
              ...options,
            },
          })
        },
    }
  },
})
