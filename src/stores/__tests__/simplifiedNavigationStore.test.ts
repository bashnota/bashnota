import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

/**
 * Tests for SimplifiedNavigationStore
 * 
 * Simplifies navigation from 7 sidebars across 4 categories to 3 core panels
 */
describe('SimplifiedNavigationStore', () => {
  let useSimplifiedNavigationStore: any

  beforeEach(async () => {
    setActivePinia(createPinia())
    
    const module = await import('../simplifiedNavigationStore')
    useSimplifiedNavigationStore = module.useSimplifiedNavigationStore
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const store = useSimplifiedNavigationStore()
      
      expect(store.leftSidebarOpen).toBe(true)
      expect(store.rightPanelContent).toBe('none')
      expect(store.bottomPanelContent).toBe('none')
      expect(store.commandPaletteOpen).toBe(false)
    })
  })

  describe('left sidebar', () => {
    it('should toggle left sidebar', () => {
      const store = useSimplifiedNavigationStore()
      
      const initial = store.leftSidebarOpen
      store.toggleLeftSidebar()
      expect(store.leftSidebarOpen).toBe(!initial)
    })
  })

  describe('right panel', () => {
    it('should toggle AI panel', () => {
      const store = useSimplifiedNavigationStore()
      
      store.toggleRightPanel('ai')
      expect(store.rightPanelContent).toBe('ai')
      expect(store.isRightPanelOpen).toBe(true)
    })
  })

  describe('bottom panel', () => {
    it('should toggle Jupyter console', () => {
      const store = useSimplifiedNavigationStore()
      
      store.toggleBottomPanel('jupyter')
      expect(store.bottomPanelContent).toBe('jupyter')
      expect(store.isBottomPanelOpen).toBe(true)
    })
  })

  describe('command palette', () => {
    it('should toggle command palette', () => {
      const store = useSimplifiedNavigationStore()
      
      store.toggleCommandPalette()
      expect(store.commandPaletteOpen).toBe(true)
    })
  })

  describe('quick actions', () => {
    it('should close all panels', () => {
      const store = useSimplifiedNavigationStore()
      
      store.toggleRightPanel('ai')
      store.closeAllPanels()
      
      expect(store.isRightPanelOpen).toBe(false)
    })
  })
})
