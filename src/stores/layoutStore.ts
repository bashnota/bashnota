import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/services/logger'

export interface Pane {
  id: string
  notaId: string | null
  isActive: boolean
  tabHistory: string[] // Array of nota IDs that have been opened in this pane
}

export interface SplitLayout {
  direction: 'horizontal' | 'vertical'
  panes: Pane[]
  sizes: number[] // Percentages for each pane
}

export const useLayoutStore = defineStore('layout', () => {
  const panes = ref<Pane[]>([])
  const activePane = ref<string | null>(null)
  const draggedTab = ref<string | null>(null)
  
  // Initialize with a single pane
  const initializeLayout = () => {
    if (panes.value.length === 0) {
      panes.value = [{
        id: 'pane-0',
        notaId: null,
        isActive: true,
        tabHistory: []
      }]
      activePane.value = 'pane-0'
    }
  }
  
  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const savedPanes = localStorage.getItem('layout-panes')
      const savedActivePane = localStorage.getItem('layout-active-pane')
      
      if (savedPanes) {
        const loadedPanes = JSON.parse(savedPanes)
        // Ensure all panes have tabHistory property (backwards compatibility)
        panes.value = loadedPanes.map((pane: any) => ({
          ...pane,
          tabHistory: pane.tabHistory || (pane.notaId ? [pane.notaId] : [])
        }))
      }
      
      if (savedActivePane) {
        activePane.value = JSON.parse(savedActivePane)
      }
      
      // Initialize if no saved state
      if (panes.value.length === 0) {
        initializeLayout()
      }
    } catch (e) {
      logger.error('Failed to load layout from storage', e)
      initializeLayout()
    }
  }
  
  // Save to localStorage
  watch(
    panes,
    (newPanes) => {
      localStorage.setItem('layout-panes', JSON.stringify(newPanes))
    },
    { deep: true }
  )
  
  watch(
    activePane,
    (newActivePane) => {
      if (newActivePane) {
        localStorage.setItem('layout-active-pane', JSON.stringify(newActivePane))
      }
    }
  )
  
  // Initialize on store creation
  loadFromStorage()
  
  // Computed properties
  const activePaneObj = computed(() => {
    return panes.value.find(pane => pane.id === activePane.value) || null
  })
  
  const getPane = (paneId: string) => {
    return panes.value.find(pane => pane.id === paneId) || null
  }
  
  const getPaneByNotaId = (notaId: string) => {
    return panes.value.find(pane => pane.notaId === notaId) || null
  }
  
  // Actions
  const setActivePane = (paneId: string) => {
    // First deactivate all panes
    panes.value.forEach(pane => {
      pane.isActive = false
    })
    
    // Then activate the requested pane
    const pane = getPane(paneId)
    if (pane) {
      pane.isActive = true
      activePane.value = paneId
    }
  }
  
  const openNotaInPane = (notaId: string, paneId?: string) => {
    let targetPane: Pane | null = null
    
    if (paneId) {
      targetPane = getPane(paneId)
    } else {
      // Find the active pane or first available pane
      targetPane = activePaneObj.value || panes.value[0]
    }
    
    if (targetPane) {
      // Ensure tabHistory exists (backwards compatibility)
      if (!targetPane.tabHistory) {
        targetPane.tabHistory = targetPane.notaId ? [targetPane.notaId] : []
      }
      
      // Add to tab history if not already there
      if (!targetPane.tabHistory.includes(notaId)) {
        targetPane.tabHistory.push(notaId)
      }
      
      targetPane.notaId = notaId
      setActivePane(targetPane.id)
      logger.debug('Opened nota in pane', { notaId, paneId: targetPane.id })
    }
  }
  
  const splitPane = (sourcePaneId: string, direction: 'horizontal' | 'vertical', notaId?: string) => {
    const sourcePane = getPane(sourcePaneId)
    if (!sourcePane) return
    
    const sourcePaneIndex = panes.value.findIndex(pane => pane.id === sourcePaneId)
    if (sourcePaneIndex === -1) return
    
    // Create new pane
    const newPaneId = `pane-${Date.now()}`
    const newPane: Pane = {
      id: newPaneId,
      notaId: notaId || null,
      isActive: false,
      tabHistory: []
    }
    
    // Insert the new pane after the source pane
    panes.value.splice(sourcePaneIndex + 1, 0, newPane)
    
    // Set the new pane as active if it has a nota
    if (notaId) {
      setActivePane(newPaneId)
    }
    
    logger.debug('Split pane', { sourcePaneId, newPaneId, direction, notaId })
    
    return newPaneId
  }
  
  const closePane = (paneId: string) => {
    const paneIndex = panes.value.findIndex(pane => pane.id === paneId)
    if (paneIndex === -1) return
    
    const wasActive = panes.value[paneIndex].isActive
    
    // Don't close if it's the only pane
    if (panes.value.length === 1) {
      // Just clear the nota
      panes.value[0].notaId = null
      return
    }
    
    // Remove the pane
    panes.value.splice(paneIndex, 1)
    
    // If we closed the active pane, activate another one
    if (wasActive && panes.value.length > 0) {
      const newActivePaneIndex = Math.min(paneIndex, panes.value.length - 1)
      setActivePane(panes.value[newActivePaneIndex].id)
    }
    
    logger.debug('Closed pane', { paneId })
  }
  
  const moveNotaBetweenPanes = (notaId: string, fromPaneId: string, toPaneId: string) => {
    const fromPane = getPane(fromPaneId)
    const toPane = getPane(toPaneId)
    
    if (!fromPane || !toPane) return
    
    // Ensure tabHistory exists (backwards compatibility)
    if (!fromPane.tabHistory) fromPane.tabHistory = fromPane.notaId ? [fromPane.notaId] : []
    if (!toPane.tabHistory) toPane.tabHistory = toPane.notaId ? [toPane.notaId] : []
    
    // Remove from source pane tab history
    fromPane.tabHistory = fromPane.tabHistory.filter(id => id !== notaId)
    
    // Clear the source pane if it was showing this nota
    if (fromPane.notaId === notaId) {
      if (fromPane.tabHistory.length > 0) {
        // Switch to the last tab in history
        fromPane.notaId = fromPane.tabHistory[fromPane.tabHistory.length - 1]
      } else {
        // No more tabs, clear the pane
        fromPane.notaId = null
      }
    }
    
    // Add to target pane tab history if not already there
    if (!toPane.tabHistory.includes(notaId)) {
      toPane.tabHistory.push(notaId)
    }
    
    // Set the nota in the target pane
    toPane.notaId = notaId
    setActivePane(toPaneId)
    
    logger.debug('Moved nota between panes', { notaId, fromPaneId, toPaneId })
  }
  
  const setDraggedTab = (notaId: string | null) => {
    draggedTab.value = notaId
  }
  
  const clearEmptyPanes = () => {
    // Don't remove all panes - keep at least one
    if (panes.value.length <= 1) return
    
    const nonEmptyPanes = panes.value.filter(pane => pane.notaId !== null)
    
    if (nonEmptyPanes.length === 0) {
      // Keep one empty pane
      panes.value = [{
        id: 'pane-0',
        notaId: null,
        isActive: true,
        tabHistory: []
      }]
      activePane.value = 'pane-0'
    } else {
      panes.value = nonEmptyPanes
      
      // Make sure we have an active pane
      if (!panes.value.some(pane => pane.isActive)) {
        setActivePane(panes.value[0].id)
      }
    }
  }
  
  const closeTabInPane = (paneId: string, notaId: string) => {
    const pane = getPane(paneId)
    if (!pane) return
    
    // Ensure tabHistory exists (backwards compatibility)
    if (!pane.tabHistory) {
      pane.tabHistory = pane.notaId ? [pane.notaId] : []
    }
    
    // Remove from tab history
    pane.tabHistory = pane.tabHistory.filter(id => id !== notaId)
    
    // If this was the active nota in the pane, switch to the last tab or clear
    if (pane.notaId === notaId) {
      if (pane.tabHistory.length > 0) {
        // Switch to the last tab in history
        pane.notaId = pane.tabHistory[pane.tabHistory.length - 1]
      } else {
        // No more tabs, clear the pane
        pane.notaId = null
      }
    }
    
    logger.debug('Closed tab in pane', { paneId, notaId })
  }
  
  const switchToTabInPane = (paneId: string, notaId: string) => {
    const pane = getPane(paneId)
    if (!pane) return
    
    // Ensure tabHistory exists (backwards compatibility)
    if (!pane.tabHistory) {
      pane.tabHistory = pane.notaId ? [pane.notaId] : []
    }
    
    // Make sure this nota is in the tab history
    if (!pane.tabHistory.includes(notaId)) {
      pane.tabHistory.push(notaId)
    }
    
    // Set as active nota
    pane.notaId = notaId
    setActivePane(paneId)
    
    logger.debug('Switched to tab in pane', { paneId, notaId })
  }
  
  return {
    panes,
    activePane,
    activePaneObj,
    draggedTab,
    getPane,
    getPaneByNotaId,
    setActivePane,
    openNotaInPane,
    splitPane,
    closePane,
    moveNotaBetweenPanes,
    setDraggedTab,
    clearEmptyPanes,
    closeTabInPane,
    switchToTabInPane,
    initializeLayout
  }
}) 