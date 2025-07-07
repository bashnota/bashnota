import { ref, reactive, computed, nextTick, onUnmounted, watch, type Ref } from 'vue'
import type { ViewportFunctions } from '@vue-flow/core'

export interface ViewportState {
  x: number
  y: number
  zoom: number
  timestamp: number
}

export interface ViewportHistory {
  entries: ViewportState[]
  currentIndex: number
  maxEntries: number
}

export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export function usePipelineViewport(
  flowInstance: Ref<ViewportFunctions | null>,
  initialViewport?: { x: number; y: number; zoom: number }
) {
  // Viewport history
  const history = reactive<ViewportHistory>({
    entries: [],
    currentIndex: -1,
    maxEntries: 50
  })

  // Tracking state
  const isTracking = ref(true)
  const isNavigating = ref(false)
  const showHint = ref(false)

  // Viewport bounds
  const bounds = ref<ViewportBounds>({
    minX: 0, maxX: 0, minY: 0, maxY: 0
  })

  // Node visibility tracking
  const nodeVisibility = reactive(new Map<string, boolean>())
  const containerSize = ref({ width: 800, height: 600 })

  // Computed properties
  const canUndo = computed(() => history.currentIndex > 0)
  const canRedo = computed(() => history.currentIndex < history.entries.length - 1)
  const currentViewport = computed(() => 
    history.entries[history.currentIndex] || null
  )

  // Add viewport state to history
  const addToHistory = (viewport: { x: number; y: number; zoom: number }) => {
    if (!isTracking.value || isNavigating.value) return

    const newEntry: ViewportState = {
      ...viewport,
      timestamp: Date.now()
    }

    // Check if change is significant enough
    const lastEntry = history.entries[history.entries.length - 1]
    if (lastEntry && isMinimalChange(lastEntry, newEntry)) {
      return
    }

    // Remove future entries if we're not at the end
    if (history.currentIndex < history.entries.length - 1) {
      history.entries = history.entries.slice(0, history.currentIndex + 1)
    }

    // Add new entry
    history.entries.push(newEntry)
    history.currentIndex = history.entries.length - 1

    // Maintain max entries
    if (history.entries.length > history.maxEntries) {
      history.entries = history.entries.slice(-history.maxEntries)
      history.currentIndex = Math.min(history.currentIndex, history.maxEntries - 1)
    }
  }

  // Initialize with viewport if provided (defer until flowInstance is available)
  if (initialViewport) {
    watch(
      flowInstance,
      (instance: ViewportFunctions | null) => {
        if (instance) {
          addToHistory(initialViewport)
        }
      },
      { immediate: true }
    )
  }

  // Check if viewport change is minimal
  const isMinimalChange = (prev: ViewportState, next: ViewportState): boolean => {
    return (
      Math.abs(prev.x - next.x) < 10 &&
      Math.abs(prev.y - next.y) < 10 &&
      Math.abs(prev.zoom - next.zoom) < 0.05
    )
  }

  // Undo viewport change
  const undoViewport = () => {
    if (!canUndo.value || !flowInstance.value) return

    history.currentIndex--
    const viewport = history.entries[history.currentIndex]
    
    isNavigating.value = true
    flowInstance.value.setViewport(viewport, { duration: 300 })
    
    setTimeout(() => {
      isNavigating.value = false
    }, 400)
  }

  // Redo viewport change
  const redoViewport = () => {
    if (!canRedo.value || !flowInstance.value) return

    history.currentIndex++
    const viewport = history.entries[history.currentIndex]
    
    isNavigating.value = true
    flowInstance.value.setViewport(viewport, { duration: 300 })
    
    setTimeout(() => {
      isNavigating.value = false
    }, 400)
  }

  // Set zoom level
  const setZoomLevel = (zoom: number) => {
    if (!flowInstance.value) return

    const current = flowInstance.value.getViewport()
    const newViewport = { ...current, zoom }
    
    flowInstance.value.setViewport(newViewport, { duration: 300 })
    addToHistory(newViewport)
  }

  // Fit view to content
  const fitToContent = (padding = 0.2) => {
    if (!flowInstance.value) return
    
    isNavigating.value = true
    flowInstance.value.fitView({ padding, duration: 500 })
    
    setTimeout(() => {
      isNavigating.value = false
      // Add current viewport to history after animation
      const viewport = flowInstance.value?.getViewport()
      if (viewport) addToHistory(viewport)
    }, 600)
  }

  // Center on point
  const centerOn = (x: number, y: number, zoom?: number) => {
    if (!flowInstance.value) return

    const currentViewport = flowInstance.value.getViewport()
    const targetZoom = zoom || currentViewport.zoom

    isNavigating.value = true
    flowInstance.value.setCenter(x, y, { duration: 500, zoom: targetZoom })
    
    setTimeout(() => {
      isNavigating.value = false
      const newViewport = flowInstance.value?.getViewport()
      if (newViewport) addToHistory(newViewport)
    }, 600)
  }

  // Update viewport bounds based on nodes
  const updateBounds = (nodes: Array<{ position: { x: number; y: number } }>) => {
    if (nodes.length === 0) {
      bounds.value = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
      return
    }

    const positions = nodes.map(node => node.position)
    bounds.value = {
      minX: Math.min(...positions.map(p => p.x)) - 150,
      maxX: Math.max(...positions.map(p => p.x)) + 150,
      minY: Math.min(...positions.map(p => p.y)) - 100,
      maxY: Math.max(...positions.map(p => p.y)) + 100
    }
  }

  // Update node visibility
  const updateNodeVisibility = (
    nodes: Array<{ id: string; position: { x: number; y: number } }>,
    container?: HTMLElement
  ) => {
    if (!flowInstance.value) return

    const viewport = flowInstance.value.getViewport()
    
    // Update container size if provided
    if (container) {
      containerSize.value = {
        width: container.clientWidth,
        height: container.clientHeight
      }
    }

    // Calculate visible area in flow coordinates
    const visibleArea = {
      left: -viewport.x / viewport.zoom,
      top: -viewport.y / viewport.zoom,
      right: (-viewport.x + containerSize.value.width) / viewport.zoom,
      bottom: (-viewport.y + containerSize.value.height) / viewport.zoom
    }

    // Check each node
    nodes.forEach(node => {
      const nodeRect = {
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + 300, // Approximate node width
        bottom: node.position.y + 200  // Approximate node height
      }

      const isVisible = !(
        nodeRect.right < visibleArea.left ||
        nodeRect.left > visibleArea.right ||
        nodeRect.bottom < visibleArea.top ||
        nodeRect.top > visibleArea.bottom
      )

      nodeVisibility.set(node.id, isVisible)
    })
  }

  // Get visible nodes count
  const getVisibleNodesCount = () => {
    return Array.from(nodeVisibility.values()).filter(Boolean).length
  }

  // Toggle tracking
  const toggleTracking = () => {
    isTracking.value = !isTracking.value
    showHint.value = true
    setTimeout(() => {
      showHint.value = false
    }, 2000)
  }

  // Handle viewport change from VueFlow
  const handleViewportChange = (viewport: { x: number; y: number; zoom: number }) => {
    addToHistory(viewport)
  }

  // Keyboard shortcuts
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault()
          if (event.shiftKey) {
            redoViewport()
          } else {
            undoViewport()
          }
          break
        case '1':
          event.preventDefault()
          setZoomLevel(1)
          break
        case '2':
          event.preventDefault()
          setZoomLevel(0.5)
          break
        case '3':
          event.preventDefault()
          setZoomLevel(2)
          break
        case 'f':
          event.preventDefault()
          fitToContent()
          break
      }
    } else if (event.key === 'v') {
      event.preventDefault()
      toggleTracking()
    }
  }

  // Reset history
  const resetHistory = () => {
    history.entries = []
    history.currentIndex = -1
    nodeVisibility.clear()
  }

  // Get history info
  const getHistoryInfo = () => ({
    current: history.currentIndex + 1,
    total: history.entries.length,
    canUndo: canUndo.value,
    canRedo: canRedo.value
  })

  // Cleanup
  onUnmounted(() => {
    resetHistory()
  })

  return {
    // State
    history,
    isTracking,
    isNavigating,
    showHint,
    bounds,
    nodeVisibility,
    
    // Computed
    canUndo,
    canRedo,
    currentViewport,
    
    // Methods
    addToHistory,
    undoViewport,
    redoViewport,
    setZoomLevel,
    fitToContent,
    centerOn,
    updateBounds,
    updateNodeVisibility,
    getVisibleNodesCount,
    toggleTracking,
    handleViewportChange,
    handleKeydown,
    resetHistory,
    getHistoryInfo
  }
} 