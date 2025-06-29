import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'

interface SidebarsGroupOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  onWidthChange?: (width: number) => void;
  position?: 'left' | 'right';
}

export function useSidebarsGroup(options: SidebarsGroupOptions = {}) {
  // Default options with fallbacks
  const {
    defaultWidth = 350,
    minWidth = 250,
    maxWidth = 800,
    storageKey = 'sidebar-width',
    onWidthChange,
    position = 'right'
  } = options
  
  const sidebarWidth = ref(defaultWidth) // Start with default width
  const isResizing = ref(false)
  const resizeStartX = ref(0) // Track starting X position for smoother resizing
  const startWidth = ref(0) // Track starting width for smoother resizing
  const hasLoadedFromStorage = ref(false) // Track if we've loaded from storage
  
  // Use computed for actual width to apply constraints
  const constrainedWidth = computed(() => {
    return Math.max(minWidth, Math.min(maxWidth, sidebarWidth.value))
  })
  
  // Load sidebar width from localStorage
  const loadSidebarWidth = () => {
    if (hasLoadedFromStorage.value) return // Only load once
    
    try {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const width = parseInt(savedWidth, 10)
        if (!isNaN(width) && width >= minWidth && width <= maxWidth) {
          sidebarWidth.value = width
          hasLoadedFromStorage.value = true
          if (onWidthChange) onWidthChange(width)
        }
      }
    } catch (error) {
      console.error(`Error loading sidebar width from localStorage (${storageKey}):`, error)
    }
  }
  
  // Set sidebar width and save to localStorage
  const setSidebarWidth = (width: number) => {
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    sidebarWidth.value = constrainedWidth
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, constrainedWidth.toString())
      if (onWidthChange) onWidthChange(constrainedWidth)
    } catch (error) {
      console.error(`Error saving sidebar width to localStorage (${storageKey}):`, error)
    }
  }
  
  // Reset to default width
  const resetToDefaultWidth = () => {
    setSidebarWidth(defaultWidth)
  }
  
  // Start resizing
  const startResizing = (event: MouseEvent) => {
    event.preventDefault()
    isResizing.value = true
    resizeStartX.value = event.clientX
    startWidth.value = sidebarWidth.value
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopResizing)
    
    // Disable text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ew-resize'
    
    // Add a class to the body to indicate resizing is happening
    document.body.classList.add('sidebar-resizing')
  }
  
  // Handle mouse move during resize
  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) return
    
    // Calculate the delta movement from the start position
    const deltaX = event.clientX - resizeStartX.value
    
    // Calculate new width based on the sidebar position
    // For left sidebars: positive deltaX increases width
    // For right sidebars: positive deltaX decreases width
    let newWidth: number
    
    if (position === 'left') {
      newWidth = startWidth.value + deltaX
    } else { // right sidebar (default)
      newWidth = startWidth.value - deltaX
    }
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    
    // Update sidebar width
    sidebarWidth.value = newWidth
    
    // Call the width change callback if provided
    if (onWidthChange) onWidthChange(newWidth)
  }
  
  // Stop resizing
  const stopResizing = () => {
    if (!isResizing.value) return
    
    isResizing.value = false
    
    // Remove event listeners
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    
    // Restore text selection and cursor
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.body.classList.remove('sidebar-resizing')
    
    // Save the final width to localStorage
    try {
      localStorage.setItem(storageKey, sidebarWidth.value.toString())
    } catch (error) {
      console.error(`Error saving sidebar width to localStorage (${storageKey}):`, error)
    }
  }
  
  // Clean up event listeners
  const cleanupResizeListeners = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    
    // Restore text selection and cursor
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.body.classList.remove('sidebar-resizing')
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
        loadSidebarWidth()
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
    loadSidebarWidth() // Load saved width on mount
    const cleanup = setupResponsiveDesign()
    
    // Cleanup on unmount
    onBeforeUnmount(() => {
      cleanup()
      cleanupResizeListeners()
    })
  })
  
  // Watch for width changes to apply constraints
  watch(sidebarWidth, (newWidth) => {
    if (newWidth < minWidth || newWidth > maxWidth) {
      setSidebarWidth(newWidth)
    }
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









