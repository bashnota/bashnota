import { defineStore } from 'pinia'
import type { Editor } from '@tiptap/vue-3'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

export const useEditorStore = defineStore('editor', () => {
  const activeEditor = ref<Editor | null>(null)
  const activeEditorComponent = ref<any>(null)

  function setActiveEditor(editor: Editor | null) {
    activeEditor.value = editor
  }

  function setActiveEditorComponent(component: any) {
    activeEditorComponent.value = component
  }

  async function saveVersion() {
    try {
      if (activeEditorComponent.value && activeEditorComponent.value.saveVersion) {
        await activeEditorComponent.value.saveVersion()
        toast('Version saved successfully', {
          description: 'A new version of your document has been created.',
          duration: 3000
        })
      } else {
        toast('Unable to save version', {
          description: 'No active editor found.',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Error saving version:', error)
      toast('Failed to save version', {
        description: 'An error occurred while saving the document version.',
        duration: 3000
      })
    }
  }

  function openHistory() {
    try {
      if (activeEditorComponent.value && activeEditorComponent.value.showVersionHistory !== undefined) {
        activeEditorComponent.value.showVersionHistory = true
        toast('Version history opened', {
          description: 'You can now view and restore previous versions.',
          duration: 3000
        })
      } else {
        toast('Unable to open history', {
          description: 'No active editor found.',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Error opening history:', error)
      toast('Failed to open version history', {
        description: 'An error occurred while opening the version history.',
        duration: 3000
      })
    }
  }

  return { 
    activeEditor, 
    activeEditorComponent,
    setActiveEditor, 
    setActiveEditorComponent,
    saveVersion,
    openHistory
  }
}) 