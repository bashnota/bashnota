import { computed, ref, watch } from 'vue'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { logger } from '@/services/logger'

/**
 * Composable for managing shared session state and operations
 * Provides a clean, reactive interface for shared session functionality
 */
export function useSharedSession() {
  const codeExecutionStore = useCodeExecutionStore()
  
  // Reactive computed for shared session state
  const isSharedSessionEnabled = computed(() => codeExecutionStore.sharedSessionMode)
  
  // Loading state for toggle operations
  const isToggling = ref(false)
  
  /**
   * Toggle shared session mode with error handling and state management
   */
  const toggleSharedSession = async (): Promise<boolean> => {
    if (isToggling.value) {
      logger.warn('Shared session toggle already in progress')
      return isSharedSessionEnabled.value
    }
    
    isToggling.value = true
    
    try {
      const notaId = 'shared-global'
      const newState = await codeExecutionStore.toggleSharedSessionMode(notaId)
      
      logger.log(`Shared session mode ${newState ? 'enabled' : 'disabled'}`)
      
      // Force reactivity update by triggering a computed re-evaluation
      await new Promise(resolve => setTimeout(resolve, 0))
      
      return newState
    } catch (error) {
      logger.error('Failed to toggle shared session mode:', error)
      throw error
    } finally {
      isToggling.value = false
    }
  }
  
  /**
   * Force all existing cells to use shared session
   */
  const applySharedSessionToAllCells = async (): Promise<void> => {
    if (!isSharedSessionEnabled.value) {
      logger.warn('Cannot apply shared session: shared mode is disabled')
      return
    }
    
    try {
      // Ensure shared session exists
      await codeExecutionStore.ensureSharedSession()
      
      // Get all cells and apply shared session
      const allCells = Array.from(codeExecutionStore.cells.values())
      
      for (const cell of allCells) {
        if (!cell.isPublished && !cell.isPipelineCell) {
          codeExecutionStore.applySharedSessionToCell(cell.id)
        }
      }
      
      logger.log(`Applied shared session to ${allCells.length} cells`)
    } catch (error) {
      logger.error('Failed to apply shared session to all cells:', error)
      throw error
    }
  }
  
  /**
   * Get shared session status information
   */
  const getSharedSessionInfo = computed(() => {
    if (!isSharedSessionEnabled.value) {
      return {
        enabled: false,
        sessionId: null,
        cellCount: 0
      }
    }
    
    const sessionId = codeExecutionStore.sharedSessionId
    const cells = Array.from(codeExecutionStore.cells.values())
    const sharedCells = cells.filter(cell => cell.sessionId === sessionId)
    
    return {
      enabled: true,
      sessionId,
      cellCount: sharedCells.length
    }
  })
  
  /**
   * Validate and ensure proper shared session setup
   */
  const validateSharedSession = async (): Promise<boolean> => {
    if (!isSharedSessionEnabled.value) {
      return true // Valid state when disabled
    }
    
    try {
      const sessionId = await codeExecutionStore.ensureSharedSession()
      const hasValidSession = Boolean(sessionId)
      
      if (!hasValidSession) {
        logger.error('Failed to create or validate shared session')
        return false
      }
      
      logger.log(`Shared session validated: ${sessionId}`)
      return true
    } catch (error) {
      logger.error('Shared session validation failed:', error)
      return false
    }
  }
  
  // Watch for changes in shared session mode and apply to all cells
  watch(
    isSharedSessionEnabled,
    async (newValue, oldValue) => {
      if (newValue && !oldValue) {
        // Shared session was just enabled
        try {
          await applySharedSessionToAllCells()
        } catch (error) {
          logger.error('Failed to apply shared session after enabling:', error)
        }
      }
    },
    { flush: 'post' }
  )
  
  return {
    // State
    isSharedSessionEnabled,
    isToggling,
    
    // Actions
    toggleSharedSession,
    applySharedSessionToAllCells,
    validateSharedSession,
    
    // Computed info
    getSharedSessionInfo
  }
}