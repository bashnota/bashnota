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
        
        // Don't prevent default immediately - let the context menu component handle it
        // But ensure the right node is selected BEFORE the menu opens
        const selectedNode = selectNode(view, { x: e.clientX, y: e.clientY }, options)
        
        if (selectedNode) {
          // Dispatch a custom event with the updated selection
          // This ensures the BlockCommandMenu can capture the correct selection
          setTimeout(() => {
            const contextMenuEvent = new CustomEvent('editor-selection-updated', {
              detail: {
                selection: view.state.selection,
                editorView: view,
                position: { x: e.clientX, y: e.clientY }
              }
            })
            document.dispatchEvent(contextMenuEvent)
          }, 0)
        }
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
