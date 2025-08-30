import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

// Types
export type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites' | 'subNotas'
export type SidebarPosition = 'left' | 'right'
export type SidebarCategory = 'navigation' | 'content' | 'development' | 'analysis'

export interface SidebarConfig {
  id: SidebarId
  title: string
  icon: any
  position: SidebarPosition
  category: SidebarCategory
  description: string
  isOpen: boolean
  isAvailable: boolean
  order: number
}

export interface SidebarCategoryConfig {
  id: SidebarCategory
  title: string
  description: string
  isCollapsed: boolean
  order: number
}

// Sidebar configurations
const sidebarConfigs: Record<SidebarId, Omit<SidebarConfig, 'isOpen' | 'isAvailable'>> = {
  toc: {
    id: 'toc',
    title: 'Table of Contents',
    icon: 'Menu',
    position: 'left',
    category: 'navigation',
    description: 'Document structure and navigation',
    order: 1,
  },
  references: {
    id: 'references',
    title: 'References',
    icon: 'BookIcon',
    position: 'right',
    category: 'content',
    description: 'Citations and bibliography',
    order: 2,
  },
  jupyter: {
    id: 'jupyter',
    title: 'Jupyter Servers',
    icon: 'ServerIcon',
    position: 'right',
    category: 'development',
    description: 'Jupyter kernel connections',
    order: 3,
  },
  ai: {
    id: 'ai',
    title: 'AI Assistant',
    icon: 'BrainIcon',
    position: 'right',
    category: 'analysis',
    description: 'AI-powered writing assistance',
    order: 4,
  },
  metadata: {
    id: 'metadata',
    title: 'Metadata',
    icon: 'Tag',
    position: 'right',
    category: 'content',
    description: 'Document properties and tags',
    order: 5,
  },
  favorites: {
    id: 'favorites',
    title: 'Favorite Blocks',
    icon: 'Star',
    position: 'right',
    category: 'content',
    description: 'Saved content blocks',
    order: 6,
  },
  subNotas: {
    id: 'subNotas',
    title: 'Sub-Notas',
    icon: 'SubNotasIcon',
    position: 'right',
    category: 'content',
    description: 'Sub-nota management',
    order: 7,
  },
}

// Category configurations
const categoryConfigs: Record<SidebarCategory, Omit<SidebarCategoryConfig, 'isCollapsed'>> = {
  navigation: {
    id: 'navigation',
    title: 'Navigation',
    description: 'Document structure and navigation tools',
    order: 1,
  },
  content: {
    id: 'content',
    title: 'Content',
    description: 'Content management and organization',
    order: 2,
  },
  development: {
    id: 'development',
    title: 'Development',
    description: 'Code execution and development tools',
    order: 3,
  },
  analysis: {
    id: 'analysis',
    title: 'Analysis',
    description: 'AI and analysis tools',
    order: 4,
  },
}

// Global state
const sidebarStates = reactive<Record<SidebarId, { isOpen: boolean; isAvailable: boolean; isPinned: boolean }>>({
  toc: { isOpen: false, isAvailable: true, isPinned: false },
  references: { isOpen: false, isAvailable: true, isPinned: false },
  jupyter: { isOpen: false, isAvailable: true, isPinned: false },
  ai: { isOpen: false, isAvailable: true, isPinned: false },
  metadata: { isOpen: false, isAvailable: true, isPinned: false },
  favorites: { isOpen: false, isAvailable: true, isPinned: false },
  subNotas: { isOpen: false, isAvailable: true, isPinned: false },
})

const categoryStates = reactive<Record<SidebarCategory, { isCollapsed: boolean }>>({
  navigation: { isCollapsed: false },
  content: { isCollapsed: false },
  development: { isCollapsed: false },
  analysis: { isCollapsed: false },
})

const isSidebarPanelOpen = ref(false)

// Persistence keys
const SIDEBAR_STATES_KEY = 'editor-sidebar-states'
const CATEGORY_STATES_KEY = 'editor-category-states'
const SIDEBAR_PANEL_KEY = 'editor-sidebar-panel-open'

export function useSidebarManager() {
  const route = useRoute()

  // Computed properties
  const availableSidebars = computed(() => {
    return Object.values(sidebarConfigs)
      .filter(config => sidebarStates[config.id].isAvailable)
      .map(config => ({
        ...config,
        isOpen: sidebarStates[config.id].isOpen,
        isAvailable: sidebarStates[config.id].isAvailable,
        isPinned: sidebarStates[config.id].isPinned,
      }))
      .sort((a, b) => a.order - b.order)
  })

  const pinnedSidebars = computed(() => {
    return availableSidebars.value.filter(sidebar => sidebar.isPinned)
  })

  const unpinnedSidebars = computed(() => {
    return availableSidebars.value.filter(sidebar => !sidebar.isPinned)
  })

  const sidebarsByCategory = computed(() => {
    const categories = Object.values(categoryConfigs).map(config => ({
      ...config,
      isCollapsed: categoryStates[config.id].isCollapsed,
      sidebars: unpinnedSidebars.value.filter(sidebar => sidebar.category === config.id),
    })).sort((a, b) => a.order - b.order)

    return categories.filter(category => category.sidebars.length > 0)
  })

  const activeSidebar = computed(() => {
    return availableSidebars.value.find(sidebar => sidebar.isOpen)
  })

  const hasActiveSidebar = computed(() => {
    return availableSidebars.value.some(sidebar => sidebar.isOpen)
  })

  const isNotaView = computed(() => {
    return route.name === 'nota' || route.name === 'split-nota'
  })

  // Actions
  const toggleSidebar = (id: SidebarId) => {
    const currentState = sidebarStates[id].isOpen
    
    // Close all other sidebars
    Object.keys(sidebarStates).forEach(key => {
      sidebarStates[key as SidebarId].isOpen = false
    })
    
    // Toggle the selected sidebar
    sidebarStates[id].isOpen = !currentState
    
    // Save to localStorage
    saveSidebarStates()
  }

  const closeSidebar = (id: SidebarId) => {
    sidebarStates[id].isOpen = false
    saveSidebarStates()
  }

  const closeAllSidebars = () => {
    Object.keys(sidebarStates).forEach(key => {
      sidebarStates[key as SidebarId].isOpen = false
    })
    saveSidebarStates()
  }

  const toggleCategory = (categoryId: SidebarCategory) => {
    categoryStates[categoryId].isCollapsed = !categoryStates[categoryId].isCollapsed
    saveCategoryStates()
  }

  const toggleSidebarPanel = () => {
    isSidebarPanelOpen.value = !isSidebarPanelOpen.value
    localStorage.setItem(SIDEBAR_PANEL_KEY, JSON.stringify(isSidebarPanelOpen.value))
  }

  const setSidebarAvailability = (id: SidebarId, available: boolean) => {
    sidebarStates[id].isAvailable = available
    if (!available) {
      sidebarStates[id].isOpen = false
    }
    saveSidebarStates()
  }

  const toggleSidebarPin = (id: SidebarId) => {
    sidebarStates[id].isPinned = !sidebarStates[id].isPinned
    saveSidebarStates()
  }

  const pinSidebar = (id: SidebarId) => {
    sidebarStates[id].isPinned = true
    saveSidebarStates()
  }

  const unpinSidebar = (id: SidebarId) => {
    sidebarStates[id].isPinned = false
    saveSidebarStates()
  }

  // Persistence
  const saveSidebarStates = () => {
    localStorage.setItem(SIDEBAR_STATES_KEY, JSON.stringify(sidebarStates))
  }

  const saveCategoryStates = () => {
    localStorage.setItem(CATEGORY_STATES_KEY, JSON.stringify(categoryStates))
  }

  const loadSidebarStates = () => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STATES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.keys(parsed).forEach(key => {
          if (sidebarStates[key as SidebarId]) {
            Object.assign(sidebarStates[key as SidebarId], parsed[key])
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load sidebar states:', error)
    }
  }

  const loadCategoryStates = () => {
    try {
      const saved = localStorage.getItem(CATEGORY_STATES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.keys(parsed).forEach(key => {
          if (categoryStates[key as SidebarCategory]) {
            Object.assign(categoryStates[key as SidebarCategory], parsed[key])
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load category states:', error)
    }
  }

  const loadSidebarPanelState = () => {
    try {
      const saved = localStorage.getItem(SIDEBAR_PANEL_KEY)
      if (saved) {
        isSidebarPanelOpen.value = JSON.parse(saved)
      }
    } catch (error) {
      console.warn('Failed to load sidebar panel state:', error)
    }
  }

  // Initialize
  const initialize = () => {
    loadSidebarStates()
    loadCategoryStates()
    loadSidebarPanelState()
  }

  // Watch for route changes to update sidebar availability
  watch(
    () => route.name,
    (newRoute) => {
      // Update sidebar availability based on route
      const isInEditor = newRoute === 'nota' || newRoute === 'split-nota'
      
      Object.keys(sidebarStates).forEach(key => {
        const id = key as SidebarId
        // All sidebars are available in editor views
        setSidebarAvailability(id, isInEditor)
      })
    },
    { immediate: true }
  )

      return {
      // State
      sidebarStates,
      categoryStates,
      isSidebarPanelOpen,
      
      // Computed
      availableSidebars,
      pinnedSidebars,
      unpinnedSidebars,
      sidebarsByCategory,
      activeSidebar,
      hasActiveSidebar,
      isNotaView,
      
      // Actions
      toggleSidebar,
      closeSidebar,
      closeAllSidebars,
      toggleCategory,
      toggleSidebarPanel,
      toggleSidebarPin,
      pinSidebar,
      unpinSidebar,
      setSidebarAvailability,
      initialize,
      
      // Configs
      sidebarConfigs,
      categoryConfigs,
    }
} 