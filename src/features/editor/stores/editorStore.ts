import { defineStore } from 'pinia'
import type { Editor } from '@/features/editor/pm'
import type { NotaVersion } from '@/features/nota/types/nota'
import { markRaw, shallowRef } from 'vue'
import { toast } from '@/services/toast'

export const useEditorStore = defineStore('editor', () => {
  // Use shallowRef so Vue does not deep-proxy the TipTap Editor instance
  const activeEditor = shallowRef<Editor | null>(null)
  // Component public instances also contain deeply nested, cyclic framework
  // state. Keeping one in a normal ref makes devtools/watch traversal recurse
  // through that graph when panes switch.
  const activeEditorComponent = shallowRef<any>(null)
  let saveVersionInFlight: Promise<NotaVersion> | null = null

  function setActiveEditor(editor: Editor | null) {
    activeEditor.value = editor ? markRaw(editor) : null
  }

  function setActiveEditorComponent(component: any) {
    activeEditorComponent.value = component ? markRaw(component) : null
  }

  function saveVersion(): Promise<NotaVersion> {
    if (saveVersionInFlight) return saveVersionInFlight
    if (!activeEditorComponent.value?.saveVersion) {
      return Promise.reject(new Error('No active editor found.'))
    }
    saveVersionInFlight = Promise.resolve()
      .then(() => activeEditorComponent.value.saveVersion())
      .then((committed) => {
        if (!committed?.id) throw new Error('The editor did not commit a version.')
        return committed as NotaVersion
      })
      .finally(() => { saveVersionInFlight = null })
    return saveVersionInFlight
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
