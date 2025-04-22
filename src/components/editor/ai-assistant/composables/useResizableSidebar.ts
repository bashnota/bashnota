import { ref, onBeforeUnmount } from 'vue'

export function useResizableSidebar() {
  const sidebarWidth = ref(350) // Default width
  const minWidth = 250 // Minimum sidebar width
  const maxWidth = 600 // Maximum sidebar width
  const isResizing = ref(false)

  // Save sidebar width to localStorage
  const saveSidebarWidth = () => {
    localStorage.setItem('ai-sidebar-width', sidebarWidth.value.toString())
  }

  // Load sidebar width from localStorage
  const loadSidebarWidth = () => {
    const savedWidth = localStorage.getItem('ai-sidebar-width')
    if (savedWidth) {
      sidebarWidth.value = parseInt(savedWidth)
    }
  }

  // Start resizing the sidebar
  const startResizing = (event: MouseEvent) => {
    isResizing.value = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
  }

  // Handle mouse movement during resizing
  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) return
    
    // Calculate new width based on mouse position
    const newWidth = event.clientX
    
    // Apply constraints
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      sidebarWidth.value = newWidth
    }
  }

  // Stop resizing
  const stopResizing = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    // Restore normal text selection
    document.body.style.userSelect = ''
    // Save width preference
    saveSidebarWidth()
  }

  // Clean up event listeners
  const cleanupResizeListeners = () => {
    if (isResizing.value) {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResizing)
    }
  }
  
  return {
    sidebarWidth,
    isResizing,
    startResizing,
    loadSidebarWidth,
    cleanupResizeListeners
  }
}