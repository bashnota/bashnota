/**
 * YouTube node — ported onto the raw-ProseMirror primitives (Phase 0 spike).
 *
 * This is a like-for-like port of the LIVE youtube extension. Grep evidence for
 * which of the two youtube files is actually registered:
 *
 *   src/features/editor/components/extensions/index.ts:35
 *     } from '@/features/editor/components/blocks/youtube-block/youtube-extension'
 *
 * i.e. the lowercase `youtube-extension.ts` is live; the capital
 * `YoutubeExtension.ts` is only re-exported by this folder's `index.ts` barrel,
 * and nothing imports that barrel. So this port reproduces the LIVE spec exactly:
 *   attrs = { url, videoId }   (NOT the dead file's startTime/autoplay)
 *   parseDOM tag = div[data-type="youtube"]
 *   toDOM       = div[data-type="youtube"] with url/videoId attributes.
 *
 * Behaviour is preserved verbatim; no redesign (per the porting brief).
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

/**
 * The declarative node definition is the single source of truth consumed by the
 * raw schema and the live editor.
 */
export const youtubeNodeDefinition: NodeDefinition = {
  name: 'youtube',
  group: 'block',
  atom: true,
  attrs: {
    url: {
      default: null,
      parseHTML: (element) => element.getAttribute('url'),
    },
    videoId: {
      default: null,
      parseHTML: (element) => element.getAttribute('videoId'),
    },
    title: {
      default: '',
      parseHTML: (element) => element.getAttribute('title') ?? '',
    },
  },
  parseDOM: [{ tag: 'div[data-type="youtube"]' }],
  toDOM: (node) => {
    const attrs: Record<string, string> = { 'data-type': 'youtube' }
    if (node.attrs.url != null) attrs.url = String(node.attrs.url)
    if (node.attrs.videoId != null) attrs.videoId = String(node.attrs.videoId)
    if (node.attrs.title) attrs.title = String(node.attrs.title)
    return ['div', attrs]
  },
}

/** The ProseMirror `{ name, spec }` produced from the definition (raw-PM path). */
export const youtubeDefinition = defineNode(youtubeNodeDefinition)

/** Extract an 11-char YouTube video id from a URL (verbatim from the live file). */
function extractYoutubeId(url: string): string | null {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : null
}

/**
 * Compatibility export retained for existing barrels; the live registry uses
 * the raw definition directly.
 */
export const Youtube = youtubeDefinition
