/**
 * YouTube Block Components
 * 
 * This module provides components and utilities for embedding YouTube videos
 * in the editor.
 */

// Main extension — the primitives-based port (youtube.node.ts). The former
// duplicate extension files (youtube-extension.ts = the one live before the port,
// and the never-imported YoutubeExtension.ts) have been removed.
export { Youtube } from './youtube.node'

// Components
export { default as YoutubeBlock } from './YoutubeBlock.vue'
export { default as YoutubePlayer } from './YoutubePlayer.vue'

// Utilities
export { useYoutubeParser } from './useYoutubeParser'
export type { YoutubeVideoInfo } from './useYoutubeParser' 








