import type { Plugin } from 'prosemirror-state'
import { DragHandlePlugin } from './DragHandle'
import { ContextMenuPlugin } from './ContextMenu'

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

const DEFAULT_OPTIONS: GlobalDragHandleOptions = {
  dragHandleWidth: 20,
  scrollTreshold: 100,
  excludedTags: [],
  customNodes: [],
  enableContextMenu: true,
}

/**
 * Build the global drag-handle plugins.
 *
 * Previously a TipTap `Extension.create` that composed the `DragHandle` and
 * `ContextMenu` sub-extensions via `addExtensions`. Now a plain ProseMirror
 * plugin factory returning both plugins in the same order (drag handle first,
 * then context menu). The registration site wraps these back into the editor.
 */
export function globalDragHandlePlugins(
  options: Partial<GlobalDragHandleOptions> = {},
): Plugin[] {
  const opts: GlobalDragHandleOptions = { ...DEFAULT_OPTIONS, ...options }

  return [
    DragHandlePlugin({
      pluginKey: 'dragHandle',
      dragHandleWidth: opts.dragHandleWidth,
      scrollTreshold: opts.scrollTreshold,
      dragHandleSelector: opts.dragHandleSelector,
      excludedTags: opts.excludedTags,
      customNodes: opts.customNodes,
    }),
    ContextMenuPlugin({
      pluginKey: 'contextMenu',
      enableContextMenu: opts.enableContextMenu,
      dragHandleWidth: opts.dragHandleWidth,
      scrollTreshold: opts.scrollTreshold,
      dragHandleSelector: opts.dragHandleSelector,
      excludedTags: opts.excludedTags,
      customNodes: opts.customNodes,
    }),
  ]
}

// Re-export utilities that might be used elsewhere
export { serializeForClipboard, selectNode } from './DragHandle'
