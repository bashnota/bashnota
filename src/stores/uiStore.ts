import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store for managing UI-related state across the application
 */
export const useUIStore = defineStore('ui', () => {
  // Save indicator states
  const isSaving = ref(false)
  const showSaved = ref(false)
  
  /**
   * Handle saving state changes and show a "saved" indicator briefly after saving completes
   * @param saving - Whether a save operation is in progress
   */
  function setSaving(saving: boolean) {
    isSaving.value = saving
    
    if (!saving) {
      showSaved.value = true
      setTimeout(() => {
        showSaved.value = false
      }, 2000)
    }
  }

  /**
   * Reset all UI state
   */
  function resetState() {
    isSaving.value = false
    showSaved.value = false
  }

  return {
    isSaving,
    showSaved,
    setSaving,
    resetState
  }
})








