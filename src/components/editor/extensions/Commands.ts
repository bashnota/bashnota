import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { Editor, Range } from '@tiptap/vue-3'
import { PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

// Extend Navigator interface to support Brave browser detection
declare global {
  interface Navigator {
    brave?: {
      isBrave: boolean | (() => Promise<boolean>)
    }
  }
}

// Helper function to detect Firefox and Brave
const isFirefoxOrBrave = () => {
  const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
  // Brave uses the same UA as Chrome but with a special JavaScript API
  const isBrave = navigator.brave?.isBrave || false;
  return isFirefox || isBrave;
}

export default Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
          props.command({ editor, range })
        },
        // Add special handling for Firefox and Brave
        filterBrowserSpecific: isFirefoxOrBrave(),
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('slash-commands'),
        editor: this.editor,
        ...this.options.suggestion,
        // For Firefox/Brave: adjust event handling
        mousedownHandler: (view: EditorView, event: MouseEvent) => {
          if (this.options.suggestion.filterBrowserSpecific) {
            // Prevent Firefox and Brave from losing focus when clicking on the suggestion menu
            event.preventDefault();
            event.stopPropagation();
            return true;
          }
          return false;
        },
      }),
    ]
  },
})
