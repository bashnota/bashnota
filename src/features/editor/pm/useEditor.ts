import { getCurrentInstance, onBeforeUnmount, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import { Editor } from './editor'
import type { EditorOptions } from './editor'

/** Create one raw ProseMirror editor for a Vue component lifecycle. */
export function useEditor(options: EditorOptions): ShallowRef<Editor | null> {
  const editor = shallowRef<Editor | null>(new Editor(options))
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      editor.value?.destroy()
      editor.value = null
    })
  }
  return editor
}

export type UseEditorOptions = EditorOptions
export type UseEditorReturn = ShallowRef<Editor | null>
