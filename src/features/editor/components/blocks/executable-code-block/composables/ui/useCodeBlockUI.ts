import { ref } from 'vue'

export function useCodeBlockUI() {
  // UI state
  const isHovered = ref(false)
  const showToolbar = ref(false)
  const isCodeVisible = ref(true)
  const isFullScreen = ref(false)
  const isTemplateDialogOpen = ref(false)
  const isCodeCopied = ref(false)
  
  // UI methods
  const toggleCodeVisibility = () => {
    isCodeVisible.value = !isCodeVisible.value
  }
  
  const showTemplateDialog = () => {
    isTemplateDialogOpen.value = true
  }
  
  return {
    // State
    isHovered,
    showToolbar,
    isCodeVisible,
    isFullScreen,
    isTemplateDialogOpen,
    isCodeCopied,
    
    // Methods
    toggleCodeVisibility,
    showTemplateDialog
  }
}
