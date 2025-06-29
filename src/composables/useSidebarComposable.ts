import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useSidebarStore } from '@/stores/sidebarStore'

export interface SidebarComposableOptions {
  id: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  position?: 'left' | 'right'
  initialState?: boolean
  keyboard?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    key: string
  }
  onToggle?: (isOpen: boolean) => void
  onResize?: (width: number) => void
}

/**
 * Composable for managing sidebar state consistently across the application
 */
export function useSidebarComposable(options: SidebarComposableOptions) {
  const sidebarStore = useSidebarStore()
  
  // Register sidebar with the store
  sidebarStore.registerSidebar(options.id, {
    defaultWidth: options.defaultWidth || 350,
    position: options.position || 'right',
    minWidth: options.minWidth || 240,
    maxWidth: options.maxWidth || 600,
    initialState: options.initialState
  })
  
  // Computed refs for sidebar state from the store
  const isOpen = computed({
    get: () => sidebarStore.sidebars[options.id]?.isOpen || false,
    set: (value) => {
      toggle(value)
    }
  })
  
  const width = computed({
    get: () => sidebarStore.sidebars[options.id]?.width || options.defaultWidth || 350,
    set: (value) => {
      sidebarStore.updateSidebarWidth(options.id, value)
      if (options.onResize) {
        options.onResize(value)
      }
    }
  })
  
  // Toggle sidebar visibility
  const toggle = (forceState?: boolean) => {
    const newState = sidebarStore.toggleSidebar(options.id, forceState)
    if (options.onToggle) {
      options.onToggle(newState)
    }
    return newState
  }
  
  // Reset sidebar width to default
  const resetWidth = () => {
    sidebarStore.resetSidebarWidth(options.id)
  }
  
  // Setup keyboard shortcut if configured
  if (options.keyboard) {
    const setupKeyboardShortcut = () => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Check if the keyboard shortcut matches
        if (
          e.key.toLowerCase() === options.keyboard!.key.toLowerCase() &&
          (!options.keyboard!.ctrl || e.ctrlKey) &&
          (!options.keyboard!.shift || e.shiftKey) &&
          (!options.keyboard!.alt || e.altKey)
        ) {
          // Don't trigger if user is typing in an input/textarea/etc
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
            return
          }
          
          e.preventDefault()
          toggle()
        }
      }
      
      // Add the event listener
      window.addEventListener('keydown', handleKeyDown)
      
      // Return a cleanup function
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
    
    // Setup on mount
    onMounted(() => {
      const cleanup = setupKeyboardShortcut()
      onBeforeUnmount(cleanup)
    })
  }
  
  return {
    isOpen,
    width,
    toggle,
    resetWidth
  }
}








