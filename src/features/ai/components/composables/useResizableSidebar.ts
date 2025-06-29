import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'

export function useResizableSidebar() {
  const aiSettings = useAISettingsStore()
  const sidebarWidth = ref(aiSettings.settings.sidebarWidth || 350)
  const isResizing = ref(false)
  const minWidth = 250 // Minimum sidebar width
  const maxWidth = 800 // Maximum sidebar width
  
  // Use computed for actual width to apply constraints
  const constrainedWidth = computed(() => {
    return Math.max(minWidth, Math.min(maxWidth, sidebarWidth.value))
  })
  
  // Load sidebar width from localStorage for backward compatibility
  const loadSidebarWidth = () => {
    try {
      const savedWidth = localStorage.getItem('ai-sidebar-width')
      if (savedWidth) {
        const width = parseInt(savedWidth, 10)
        if (!isNaN(width) && width >= minWidth && width <= maxWidth) {
          sidebarWidth.value = width
        }
      }
    } catch (error) {
      console.error('Error loading sidebar width from localStorage:', error)
    }
  }
  
  // Set sidebar width and save to settings
  const setSidebarWidth = (width: number) => {
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    sidebarWidth.value = constrainedWidth
    
    // Save to localStorage for backward compatibility
    try {
      localStorage.setItem('ai-sidebar-width', constrainedWidth.toString())
    } catch (error) {
      console.error('Error saving sidebar width to localStorage:', error)
    }
    
    // Save to settings store
    aiSettings.updateSettings({
      ...aiSettings.settings,
      sidebarWidth: constrainedWidth
    })
  }
  
  // Reset to default width
  const resetToDefaultWidth = () => {
    setSidebarWidth(350) // Default width
  }
  
  // Start resizing
  const startResizing = (event: MouseEvent) => {
    event.preventDefault()
    isResizing.value = true
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopResizing)
    
    // Disable text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ew-resize'
  }
  
  // Handle mouse move during resize
  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) return
    
    // Calculate new width based on mouse position
    let newWidth = event.clientX
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    
    // Update sidebar width
    sidebarWidth.value = newWidth
  }
  
  // Stop resizing
  const stopResizing = () => {
    isResizing.value = false
    
    // Remove event listeners
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    
    // Restore text selection and cursor
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    // Save the final width to settings
    aiSettings.updateSettings({
      ...aiSettings.settings,
      sidebarWidth: sidebarWidth.value
    })
  }
  
  // Clean up event listeners
  const cleanupResizeListeners = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    
    // Restore text selection and cursor
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }
  
  // Add media query listener for responsive design
  const setupResponsiveDesign = () => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    
    const handleMediaQueryChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        // On mobile, set to minimum width
        sidebarWidth.value = minWidth
      } else {
        // On desktop, restore saved width
        const savedWidth = aiSettings.settings.sidebarWidth || 350
        sidebarWidth.value = Math.max(minWidth, Math.min(maxWidth, savedWidth))
      }
    }
    
    // Initial check
    handleMediaQueryChange(mediaQuery)
    
    // Add listener for changes
    mediaQuery.addEventListener('change', handleMediaQueryChange)
    
    // Cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }
  
  // Set up responsive design on mount
  onMounted(() => {
    const cleanup = setupResponsiveDesign()
    
    // Cleanup on unmount
    onBeforeUnmount(() => {
      cleanup()
      cleanupResizeListeners()
    })
  })
  
  return {
    sidebarWidth,
    constrainedWidth,
    isResizing,
    minWidth,
    maxWidth,
    startResizing,
    loadSidebarWidth,
    setSidebarWidth,
    resetToDefaultWidth,
    cleanupResizeListeners
  }
}







