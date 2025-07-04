import { defineStore } from 'pinia'
import type { Editor } from '@tiptap/vue-3'
import { ref } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const activeEditor = ref<Editor | null>(null)

  function setActiveEditor(editor: Editor | null) {
    activeEditor.value = editor
  }

  return { activeEditor, setActiveEditor }
}) 