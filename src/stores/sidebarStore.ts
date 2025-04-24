import { defineStore } from 'pinia'
import { ref, reactive, watchEffect } from 'vue'

// Define sidebar positions
export type SidebarPosition = 'left' | 'right'

// Define types for sidebar state tracking
export interface SidebarState {
  isOpen: boolean
  width: number
  defaultWidth: number
  position: SidebarPosition
  minWidth: number
  maxWidth: number
}

// Interface for the store
export interface SidebarStoreState {
  sidebars: Record<string, SidebarState>
  globalSettings: {
    responsiveBreakpoint: number
    mobileDefaultWidth: number
  }
}

export const useSidebarStore = defineStore('sidebar', () => {
  // State
  const sidebars = reactive<Record<string, SidebarState>>({})
  const globalSettings = reactive({
    responsiveBreakpoint: 768,
    mobileDefaultWidth: 280
  })
  
  // Register a sidebar with the store
  const registerSidebar = (
    id: string, 
    options: {
      defaultWidth?: number
      position?: SidebarPosition
      minWidth?: number
      maxWidth?: number
      initialState?: boolean
    } = {}
  ) => {
    // Don't re-register if already exists
    if (sidebars[id]) return
    
    // Create with defaults
    sidebars[id] = {
      isOpen: options.initialState || false,
      width: options.defaultWidth || 350,
      defaultWidth: options.defaultWidth || 350,
      position: options.position || 'right',
      minWidth: options.minWidth || 250,
      maxWidth: options.maxWidth || 800
    }
    
    // Try to load persisted state
    const persistedState = loadSidebarState(id)
    if (persistedState) {
      if (persistedState.isOpen !== undefined) {
        sidebars[id].isOpen = persistedState.isOpen
      }
      if (persistedState.width !== undefined) {
        sidebars[id].width = persistedState.width
      }
    }
  }
  
  // Update sidebar width
  const updateSidebarWidth = (id: string, width: number) => {
    if (!sidebars[id]) return
    
    const constrainedWidth = Math.max(
      sidebars[id].minWidth,
      Math.min(sidebars[id].maxWidth, width)
    )
    
    sidebars[id].width = constrainedWidth
    saveSidebarState(id)
  }
  
  // Toggle sidebar visibility
  const toggleSidebar = (id: string, forceState?: boolean) => {
    if (!sidebars[id]) {
      // Auto-register if not found
      registerSidebar(id)
    }
    
    // Set state based on force value or toggle current
    sidebars[id].isOpen = forceState !== undefined ? forceState : !sidebars[id].isOpen
    
    saveSidebarState(id)
    return sidebars[id].isOpen
  }
  
  // Reset sidebar width to default
  const resetSidebarWidth = (id: string) => {
    if (!sidebars[id]) return
    
    sidebars[id].width = sidebars[id].defaultWidth
    saveSidebarState(id)
  }
  
  // Close all sidebars
  const closeAllSidebars = () => {
    Object.keys(sidebars).forEach(id => {
      sidebars[id].isOpen = false
      saveSidebarState(id)
    })
  }
  
  // Load sidebar state from localStorage
  const loadSidebarState = (id: string) => {
    try {
      const key = `sidebar-state-${id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error(`Error loading sidebar state for ${id}:`, error)
    }
    return null
  }
  
  // Save sidebar state to localStorage
  const saveSidebarState = (id: string) => {
    try {
      const key = `sidebar-state-${id}`
      const state = {
        isOpen: sidebars[id].isOpen,
        width: sidebars[id].width
      }
      localStorage.setItem(key, JSON.stringify(state))
      
      // Also dispatch an event for components that need to react to sidebar changes
      window.dispatchEvent(new CustomEvent('sidebar-state-changed', {
        detail: { id, state }
      }))
    } catch (error) {
      console.error(`Error saving sidebar state for ${id}:`, error)
    }
  }
  
  // Set up initial loading of all sidebar states from localStorage
  const initializeSidebars = () => {
    // Look for existing sidebars in localStorage
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sidebar-state-'))
      keys.forEach(key => {
        const id = key.replace('sidebar-state-', '')
        const state = loadSidebarState(id)
        if (state && !sidebars[id]) {
          registerSidebar(id)
        }
      })
    } catch (error) {
      console.error('Error initializing sidebars:', error)
    }
  }
  
  // Initialize sidebars on store creation
  initializeSidebars()
  
  return { 
    sidebars,
    globalSettings,
    registerSidebar,
    updateSidebarWidth,
    toggleSidebar,
    resetSidebarWidth,
    closeAllSidebars
  }
})