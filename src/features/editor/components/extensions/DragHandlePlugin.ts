import { Extension } from '@tiptap/core'
import DragHandle from './DragHandle'
import ContextMenu from './ContextMenu'

export interface GlobalDragHandleOptions {
  /**
   * The width of the drag handle
   */
  dragHandleWidth: number

  /**
   * The treshold for scrolling
   */
  scrollTreshold: number

  /*
   * The css selector to query for the drag handle. (eg: '.custom-handle').
   * If handle element is found, that element will be used as drag handle. If not, a default handle will be created
   */
  dragHandleSelector?: string

  /**
   * Tags to be excluded for drag handle
   */
  excludedTags: string[]

  /**
   * Custom nodes to be included for drag handle
   */
  customNodes: string[]

  /**
   * Whether to enable the context menu on right-click
   */
  enableContextMenu: boolean
}

const GlobalDragHandle = Extension.create({
  name: 'globalDragHandle',

  addOptions() {
    return {
      dragHandleWidth: 20,
      scrollTreshold: 100,
      excludedTags: [],
      customNodes: [],
      enableContextMenu: true,
    }
  },

  addExtensions() {
    return [
      DragHandle.configure({
        dragHandleWidth: this.options.dragHandleWidth,
        scrollTreshold: this.options.scrollTreshold,
        dragHandleSelector: this.options.dragHandleSelector,
        excludedTags: this.options.excludedTags,
        customNodes: this.options.customNodes,
      }),
      ContextMenu.configure({
        enableContextMenu: this.options.enableContextMenu,
        dragHandleWidth: this.options.dragHandleWidth,
        scrollTreshold: this.options.scrollTreshold,
        dragHandleSelector: this.options.dragHandleSelector,
        excludedTags: this.options.excludedTags,
        customNodes: this.options.customNodes,
      }),
    ]
  },
})

export default GlobalDragHandle

// Re-export utilities that might be used elsewhere
export { serializeForClipboard, selectNode } from './DragHandle'









