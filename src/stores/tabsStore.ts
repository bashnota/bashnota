import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { logger } from '@/services/logger'
import { toast } from 'vue-sonner'

export interface Tab {
  id: string       // Unique ID for the tab (same as nota ID)
  title: string    // Title of the nota
  route: {
    name: string   // Route name
    params: Record<string, string> // Route params
  }
  isDirty?: boolean // Whether the tab has unsaved changes
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)
  const router = useRouter()
  const notaStore = useNotaStore()
  
  // Initialize from localStorage if available
  const initializeFromStorage = () => {
    try {
      const savedTabs = localStorage.getItem('open-tabs')
      if (savedTabs) {
        tabs.value = JSON.parse(savedTabs)
        logger.debug('Loaded tabs from storage', tabs.value)
      }
      
      const savedActiveTab = localStorage.getItem('active-tab')
      if (savedActiveTab) {
        activeTabId.value = JSON.parse(savedActiveTab)
      }
    } catch (e) {
      logger.error('Failed to load tabs from storage', e)
    }
  }
  
  // Call initialization on store creation
  initializeFromStorage()
  
  // Save tabs to localStorage when they change
  watch(
    tabs,
    (newTabs) => {
      localStorage.setItem('open-tabs', JSON.stringify(newTabs))
    },
    { deep: true }
  )
  
  // Save active tab to localStorage when it changes
  watch(
    activeTabId,
    (newActiveTabId) => {
      if (newActiveTabId) {
        localStorage.setItem('active-tab', JSON.stringify(newActiveTabId))
      }
    }
  )

  // Get the active tab
  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value) || null
  })

  // Add a new tab or switch to existing one
  const openTab = (tab: Omit<Tab, 'title'> & { title?: string }) => {
    logger.debug('Opening tab', tab)
    
    // If the tab already exists, make it active
    const existingTabIndex = tabs.value.findIndex(t => t.id === tab.id)
    
    if (existingTabIndex !== -1) {
      activeTabId.value = tab.id
      return
    }
    
    // Fetch title from nota store if not provided
    let tabTitle = tab.title
    if (!tabTitle && tab.route.name === 'nota') {
      const nota = notaStore.getItem(tab.id)
      tabTitle = nota?.title || 'Untitled'
    }
    
    // Add the new tab
    tabs.value.push({
      ...tab,
      title: tabTitle || 'Untitled'
    })
    
    // Set as active tab
    activeTabId.value = tab.id
  }

  // Close a tab
  const closeTab = async (id: string) => {
    logger.debug('Closing tab', id)
    const tabIndex = tabs.value.findIndex(tab => tab.id === id)
    
    if (tabIndex === -1) return
    
    // If closing the active tab, activate another tab
    if (id === activeTabId.value) {
      if (tabs.value.length > 1) {
        // Try to activate the tab to the left, or the tab to the right if it's the first tab
        const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : tabIndex + 1 < tabs.value.length ? tabIndex + 1 : 0
        // Make sure the new index is valid
        if (newActiveIndex >= 0 && newActiveIndex < tabs.value.length) {
          activeTabId.value = tabs.value[newActiveIndex]?.id || null
          
          // Navigate to the new active tab
          if (activeTabId.value) {
            const newActiveTab = tabs.value.find(tab => tab.id === activeTabId.value)
            if (newActiveTab) {
              router.push({
                name: newActiveTab.route.name,
                params: newActiveTab.route.params
              })
            }
          } else {
            // If no tabs left, go to home
            router.push({ name: 'home' })
          }
        }
      } else {
        // No tabs left, go to home
        activeTabId.value = null
        router.push({ name: 'home' })
      }
    }
    
    // Remove the tab
    tabs.value.splice(tabIndex, 1)
    
    // Also try to remove the nota from layout panes if using layout store
    try {
      const { useLayoutStore } = await import('./layoutStore')
      const layoutStore = useLayoutStore()
      const pane = layoutStore.getPaneByNotaId(id)
      if (pane) {
        if (layoutStore.panes.length === 1) {
          // Clear the pane instead of closing it if it's the only one
          pane.notaId = null
        } else {
          layoutStore.closePane(pane.id)
        }
      }
    } catch (error) {
      // Layout store might not be available in some contexts, ignore
      logger.debug('Could not access layout store:', error)
    }
  }

  // Update a tab's properties
  const updateTab = (id: string, updates: Partial<Omit<Tab, 'id'>>) => {
    const tabIndex = tabs.value.findIndex(tab => tab.id === id)
    if (tabIndex !== -1) {
      // Create a new tab object with the updates to trigger reactivity
      tabs.value[tabIndex] = { ...tabs.value[tabIndex], ...updates }
    }
  }

  // Set the active tab
  const setActiveTab = (id: string) => {
    const tab = tabs.value.find(tab => tab.id === id)
    if (tab) {
      activeTabId.value = id
      router.push({
        name: tab.route.name,
        params: tab.route.params
      })
    }
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    updateTab,
    setActiveTab
  }
}) 








