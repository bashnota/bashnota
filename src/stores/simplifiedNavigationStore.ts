/**
 * Simplified Navigation Store
 * 
 * Replaces complex 7-sidebar system with 3 simple panels:
 * - Left: Documents/File tree
 * - Right: AI Assistant  
 * - Bottom: Jupyter/Terminal
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type RightPanelContent = 'ai' | 'none'
export type BottomPanelContent = 'jupyter' | 'terminal' | 'none'

export const useSimplifiedNavigationStore = defineStore('simplified-navigation', () => {
  // State
  const leftSidebarOpen = ref(true)  // Documents panel
  const rightPanelContent = ref<RightPanelContent>('none')
  const bottomPanelContent = ref<BottomPanelContent>('none')
  const commandPaletteOpen = ref(false)

  // Computed
  const isRightPanelOpen = computed(() => rightPanelContent.value !== 'none')
  const isBottomPanelOpen = computed(() => bottomPanelContent.value !== 'none')
  const hasAnyPanelOpen = computed(() => 
    leftSidebarOpen.value || isRightPanelOpen.value || isBottomPanelOpen.value
  )
  const activePanels = computed(() => {
    const panels: string[] = []
    if (leftSidebarOpen.value) panels.push('documents')
    if (rightPanelContent.value !== 'none') panels.push(rightPanelContent.value)
    if (bottomPanelContent.value !== 'none') panels.push(bottomPanelContent.value)
    return panels
  })

  // Actions - Left Sidebar
  function toggleLeftSidebar() {
    leftSidebarOpen.value = !leftSidebarOpen.value
  }

  function setLeftSidebarOpen(open: boolean) {
    leftSidebarOpen.value = open
  }

  // Actions - Right Panel
  function toggleRightPanel(content: RightPanelContent) {
    if (content === 'none') {
      rightPanelContent.value = 'none'
    } else {
      rightPanelContent.value = rightPanelContent.value === content ? 'none' : content
    }
  }

  function closeRightPanel() {
    rightPanelContent.value = 'none'
  }

  // Actions - Bottom Panel
  function toggleBottomPanel(content: BottomPanelContent) {
    if (content === 'none') {
      bottomPanelContent.value = 'none'
    } else {
      bottomPanelContent.value = bottomPanelContent.value === content ? 'none' : content
    }
  }

  function closeBottomPanel() {
    bottomPanelContent.value = 'none'
  }

  // Actions - Command Palette
  function toggleCommandPalette() {
    commandPaletteOpen.value = !commandPaletteOpen.value
  }

  function openCommandPalette() {
    commandPaletteOpen.value = true
  }

  function closeCommandPalette() {
    commandPaletteOpen.value = false
  }

  // Actions - Quick actions
  function closeAllPanels() {
    leftSidebarOpen.value = false
    rightPanelContent.value = 'none'
    bottomPanelContent.value = 'none'
  }

  function resetToDefault() {
    leftSidebarOpen.value = true
    rightPanelContent.value = 'none'
    bottomPanelContent.value = 'none'
    commandPaletteOpen.value = false
  }

  return {
    // State
    leftSidebarOpen,
    rightPanelContent,
    bottomPanelContent,
    commandPaletteOpen,
    
    // Computed
    isRightPanelOpen,
    isBottomPanelOpen,
    hasAnyPanelOpen,
    activePanels,
    
    // Actions
    toggleLeftSidebar,
    setLeftSidebarOpen,
    toggleRightPanel,
    closeRightPanel,
    toggleBottomPanel,
    closeBottomPanel,
    toggleCommandPalette,
    openCommandPalette,
    closeCommandPalette,
    closeAllPanels,
    resetToDefault
  }
})
