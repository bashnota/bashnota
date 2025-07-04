import { defineStore } from 'pinia'
import type { Editor } from '@tiptap/vue-3'
import { ref, onMounted } from 'vue'

export const useEditorStore = defineStore('editor', () => {
  const activeEditor = ref<Editor | null>(null)
  const isToolbarCollapsed = ref(false)

  function setActiveEditor(editor: Editor | null) {
    activeEditor.value = editor
  }

  function toggleToolbar() {
    isToolbarCollapsed.value = !isToolbarCollapsed.value
    localStorage.setItem('toolbar-collapsed', JSON.stringify(isToolbarCollapsed.value))
  }
  
  onMounted(() => {
    const savedState = localStorage.getItem('toolbar-collapsed')
    if (savedState) {
      isToolbarCollapsed.value = JSON.parse(savedState)
    }
  })

  return { activeEditor, setActiveEditor, isToolbarCollapsed, toggleToolbar }
}) 