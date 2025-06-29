import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import YoutubeBlock from './YoutubeBlock.vue'

type HTMLAttributeMap = Record<string, any>

export interface YoutubeOptions {
  /**
   * HTML attributes to add to the rendered element
   */
  HTMLAttributes: HTMLAttributeMap
}

export interface YoutubeAttributes {
  /**
   * Original YouTube URL
   */
  url: string | null
  /**
   * YouTube video ID extracted from URL
   */
  videoId: string | null
  /**
   * Start time in seconds
   */
  startTime: number
  /**
   * Whether to autoplay the video
   */
  autoplay: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      /**
       * Add a YouTube video
       * @param url - YouTube URL to embed
       */
      setYoutube: (url: string) => ReturnType
    }
  }
}

/**
 * YouTube extension for TipTap editor
 * Allows embedding YouTube videos as blocks
 */
export const Youtube = Node.create<YoutubeOptions>({
  name: 'youtube',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  selectable: true,
  
  inline: false,
  
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'youtube-embed',
      },
    }
  },
  
  addAttributes() {
    return {
      url: {
        default: null,
      },
      videoId: {
        default: null,
      },
      startTime: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const startTime = element.getAttribute('data-start-time')
          return startTime ? parseInt(startTime, 10) : 0
        },
        renderHTML: (attributes: {startTime?: number}) => {
          if (!attributes.startTime) {
            return {}
          }
          
          return {
            'data-start-time': attributes.startTime,
          }
        },
      },
      autoplay: {
        default: false,
        parseHTML: (element: HTMLElement) => {
          return element.getAttribute('data-autoplay') === 'true'
        },
        renderHTML: (attributes: {autoplay?: boolean}) => {
          if (!attributes.autoplay) {
            return {}
          }
          
          return {
            'data-autoplay': 'true',
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { 'data-youtube-video': '' }
      ),
      '',
    ]
  },
  
  addCommands() {
    return {
      setYoutube: (url: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            url,
          },
        })
      },
    }
  },
  
  addNodeView() {
    return VueNodeViewRenderer(YoutubeBlock as any)
  },
}) 








