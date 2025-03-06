import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { Editor, Range } from '@tiptap/vue-3'
import { PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'


export default Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
          props.command({ editor, range })
        }
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('slash-commands'),
        editor: this.editor,
        ...this.options.suggestion
      }),
    ]
  },
})
