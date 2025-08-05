import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { selectNode } from './DragHandle'
import type { DragHandleOptions } from './DragHandle'

export interface ContextMenuOptions extends DragHandleOptions {
  /**
   * Whether to show context menu on right-click
   */
  enableContextMenu: boolean
}

export function ContextMenuPlugin(options: ContextMenuOptions & { pluginKey: string }) {
  return new Plugin({
    key: new PluginKey(options.pluginKey),
    view: (view) => {
      function handleEditorContextMenu(e: MouseEvent) {
        if (!options.enableContextMenu) return
        
        // Don't prevent default - let the ContextMenu component handle it
        // Just ensure the right node is selected
        selectNode(view, { x: e.clientX, y: e.clientY }, options)
      }

      // Add context menu listener to the editor DOM
      view.dom.addEventListener('contextmenu', handleEditorContextMenu)

      return {
        destroy: () => {
          // Remove editor context menu listener
          view.dom.removeEventListener('contextmenu', handleEditorContextMenu)
        },
      }
    },
  })
}

const ContextMenu = Extension.create({
  name: 'contextMenu',

  addOptions() {
    return {
      enableContextMenu: true,
      dragHandleWidth: 20,
      scrollTreshold: 100,
      excludedTags: [],
      customNodes: [],
    }
  },

  addProseMirrorPlugins() {
    return [
      ContextMenuPlugin({
        pluginKey: 'contextMenu',
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

export default ContextMenu
