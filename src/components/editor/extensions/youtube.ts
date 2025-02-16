import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import YoutubeBlock from '../blocks/youtube-block/YoutubeBlock.vue'

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

export const Youtube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute('url'),
      },
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute('videoId'),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="youtube"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'youtube', ...HTMLAttributes }]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(YoutubeBlock)
  },

  addCommands() {
    return {
      setYoutube:
        (url) =>
        ({ commands }) => {
          const videoId = extractYoutubeId(url)
          if (!videoId) return false
          return commands.insertContent({
            type: this.name,
            attrs: { url, videoId },
          })
        },
    }
  },
})

function extractYoutubeId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : null
}
