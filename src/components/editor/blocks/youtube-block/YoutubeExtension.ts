import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import YoutubeBlock from './YoutubeBlock.vue'
import type { Component } from 'vue'
import type { NodeViewProps } from '@tiptap/vue-3'

export interface YoutubeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      /**
       * Add a YouTube video
       */
      setYoutube: (url: string) => ReturnType
    }
  }
}

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
        parseHTML: element => {
          const startTime = element.getAttribute('data-start-time')
          return startTime ? parseInt(startTime, 10) : 0
        },
        renderHTML: attributes => {
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
        parseHTML: element => {
          return element.getAttribute('data-autoplay') === 'true'
        },
        renderHTML: attributes => {
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
      setYoutube: url => ({ commands }) => {
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
    // @ts-ignore - Vue component compatibility with NodeViewRenderer
    return VueNodeViewRenderer(YoutubeBlock)
  },
}) 