/**
 * YouTube Block Components
 * 
 * This module provides components and utilities for embedding YouTube videos
 * in the editor.
 */

// Main extension
export { Youtube } from './YoutubeExtension'

// Components
export { default as YoutubeBlock } from './YoutubeBlock.vue'
export { default as YoutubePlayer } from './YoutubePlayer.vue'

// Utilities
export { useYoutubeParser } from './useYoutubeParser'
export type { YoutubeVideoInfo } from './useYoutubeParser' 








