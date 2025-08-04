import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store for managing UI-related state across the application
 */
export const useUIStore = defineStore('ui', () => {
  // Save indicator states
  const isSaving = ref(false)
  const showSaved = ref(false)
  
  // Toolbar states
  const isToolbarVisible = ref(false)
  const isToolbarLocked = ref(false)

  // Initialize from localStorage
  if (typeof window !== 'undefined') {
    const savedLockState = localStorage.getItem('toolbar-locked')
    if (savedLockState) {
      isToolbarLocked.value = JSON.parse(savedLockState)
      if (isToolbarLocked.value) {
        isToolbarVisible.value = true
      }
    }
  }
  
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
   * Show toolbar (on hover or manual trigger)
   */
  function showToolbar() {
    isToolbarVisible.value = true
  }

  /**
   * Hide toolbar (only if not locked)
   */
  function hideToolbar() {
    if (!isToolbarLocked.value) {
      isToolbarVisible.value = false
    }
  }

  /**
   * Toggle toolbar lock state
   */
  function toggleToolbarLock() {
    isToolbarLocked.value = !isToolbarLocked.value
    if (isToolbarLocked.value) {
      isToolbarVisible.value = true
    }
    localStorage.setItem('toolbar-locked', JSON.stringify(isToolbarLocked.value))
  }

  /**
   * Reset all UI state
   */
  function resetState() {
    isSaving.value = false
    showSaved.value = false
    isToolbarVisible.value = false
    isToolbarLocked.value = false
  }

  return {
    isSaving,
    showSaved,
    isToolbarVisible,
    isToolbarLocked,
    setSaving,
    showToolbar,
    hideToolbar,
    toggleToolbarLock,
    resetState
  }
})








