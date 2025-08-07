import { ref, computed, watch } from 'vue'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { logger } from '@/services/logger'

/**
 * Enhanced output management configuration
 */
interface EnhancedOutputConfig {
  cellId: string
  autoSave?: boolean
  updateAttributes?: (attrs: any) => void // Function to update nota attributes
  onOutputUpdate?: (output: string) => void // Callback when output updates
}

/**
 * Enhanced composable for managing code block output with proper nota persistence
 * This composable ensures that both the store and the nota are kept in sync
 */
export function useEnhancedOutputManagement(config: EnhancedOutputConfig) {
  const codeExecutionStore = useCodeExecutionStore()
  
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastSaved = ref<string | null>(null)
  const updateInProgress = ref(false)
  const lastUpdateTime = ref(0)
  
  /**
   * Get current cell output from store
   */
  const cellOutput = computed(() => {
    try {
      const cell = codeExecutionStore.getCellById(config.cellId)
      return cell ? {
        content: cell.output || '',
        hasError: cell.hasError || false,
        isExecuting: cell.isExecuting || false,
        error: cell.error
      } : null
    } catch (error) {
      logger.error(`[EnhancedOutputManagement] Error accessing cell ${config.cellId}:`, error)
      return null
    }
  })
  
  /**
   * Computed output information
   */
  const outputInfo = computed(() => {
    try {
      const cell = cellOutput.value
      if (!cell) {
        return {
          hasOutput: false,
          hasError: false,
          isEmpty: true,
          content: '',
          type: 'text' as const,
          isExecuting: false
        }
      }
      
      const content = cell.content || ''
      const hasOutput = Boolean(content && content.trim())
      const hasError = cell.hasError || false
      
      // Determine output type based on content
      let type: 'text' | 'html' | 'json' | 'error' | 'image' | 'table' = 'text'
      if (hasError) {
        type = 'error'
      } else if (content) {
        try {
          JSON.parse(content)
          type = 'json'
        } catch {
          if (content.includes('<html>') || content.includes('<div>')) {
            type = 'html'
          } else if (content.includes('|') && content.includes('\n')) {
            type = 'table'
          }
        }
      }
      
      return {
        hasOutput,
        hasError,
        isEmpty: !hasOutput,
        content,
        type,
        isExecuting: cell.isExecuting || false
      }
    } catch (error) {
      logger.error(`[EnhancedOutputManagement] Error computing output info for cell ${config.cellId}:`, error)
      return {
        hasOutput: false,
        hasError: false,
        isEmpty: true,
        content: '',
        type: 'text' as const,
        isExecuting: false
      }
    }
  })
  
  /**
   * Update output with both store and nota persistence
   */
  const updateOutput = async (content: string, hasError: boolean = false): Promise<boolean> => {
    try {
      // Throttle updates to prevent rapid-fire TipTap attribute updates
      const now = Date.now()
      if (updateInProgress.value || (now - lastUpdateTime.value) < 100) {
        logger.log(`[EnhancedOutputManagement] Throttling update for cell ${config.cellId}`)
        return false
      }
      
      updateInProgress.value = true
      lastUpdateTime.value = now
      isLoading.value = true
      error.value = null
      
      // Update the store first
      const cell = codeExecutionStore.getCellById(config.cellId)
      if (cell) {
        cell.output = content
        cell.hasError = hasError
        cell.error = hasError ? new Error(content) : null
      }
      
      // Update the nota via updateAttributes for persistence
      if (config.updateAttributes) {
        try {
          config.updateAttributes({ output: content })
          logger.log(`[EnhancedOutputManagement] Updated nota attributes for cell ${config.cellId}`)
        } catch (attributeError) {
          logger.error(`[EnhancedOutputManagement] Failed to update attributes for cell ${config.cellId}:`, attributeError)
          // Don't throw here - continue with other operations
          const errorMessage = attributeError instanceof Error ? attributeError.message : 'Unknown error during attribute update'
          error.value = `Failed to save output: ${errorMessage}`
        }
      }
      
      // Trigger callback if provided
      if (config.onOutputUpdate) {
        config.onOutputUpdate(content)
      }
      
      lastSaved.value = new Date().toISOString()
      
      logger.log(`[EnhancedOutputManagement] Updated output for cell ${config.cellId}`, {
        length: content.length,
        hasError,
        persistedToNota: !!config.updateAttributes
      })
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update output'
      error.value = errorMessage
      logger.error(`[EnhancedOutputManagement] Failed to update output for cell ${config.cellId}:`, err)
      return false
    } finally {
      isLoading.value = false
      updateInProgress.value = false
    }
  }
  
  /**
   * Clear output with both store and nota persistence
   */
  const clearOutput = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      // Clear from store
      const cell = codeExecutionStore.getCellById(config.cellId)
      if (cell) {
        cell.output = ''
        cell.hasError = false
        cell.error = null
      }
      
      // Clear from nota via updateAttributes for persistence
      if (config.updateAttributes) {
        config.updateAttributes({ output: '' })
        logger.log(`[EnhancedOutputManagement] Cleared nota attributes for cell ${config.cellId}`)
      }
      
      // Trigger callback if provided
      if (config.onOutputUpdate) {
        config.onOutputUpdate('')
      }
      
      lastSaved.value = new Date().toISOString()
      
      logger.log(`[EnhancedOutputManagement] Cleared output for cell ${config.cellId}`, {
        persistedToNota: !!config.updateAttributes
      })
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear output'
      error.value = errorMessage
      logger.error(`[EnhancedOutputManagement] Failed to clear output for cell ${config.cellId}:`, err)
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Copy output to clipboard
   */
  const copyOutput = async (): Promise<boolean> => {
    try {
      const content = outputInfo.value.content
      if (!content) {
        return false
      }
      
      await navigator.clipboard.writeText(content)
      logger.log(`[EnhancedOutputManagement] Output copied to clipboard for cell ${config.cellId}`)
      return true
    } catch (err) {
      logger.error(`[EnhancedOutputManagement] Failed to copy output for cell ${config.cellId}:`, err)
      return false
    }
  }
  
  /**
   * Format output content for display
   */
  const formatOutput = computed(() => {
    const info = outputInfo.value
    if (!info.content) {
      return ''
    }
    
    try {
      switch (info.type) {
        case 'json':
          return JSON.stringify(JSON.parse(info.content), null, 2)
        case 'error':
          return info.content
        default:
          return info.content
      }
    } catch {
      return info.content
    }
  })
  
  /**
   * Get output statistics
   */
  const outputStats = computed(() => {
    const content = outputInfo.value.content
    if (!content) {
      return {
        lines: 0,
        characters: 0,
        words: 0,
        size: '0 B'
      }
    }
    
    const lines = content.split('\n').length
    const characters = content.length
    const words = content.split(/\s+/).filter(w => w.length > 0).length
    const bytes = new Blob([content]).size
    
    let size = `${bytes} B`
    if (bytes > 1024) {
      size = `${(bytes / 1024).toFixed(1)} KB`
    }
    if (bytes > 1024 * 1024) {
      size = `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    
    return { lines, characters, words, size }
  })
  
  // Watch for changes in cell output and auto-sync if enabled
  if (config.autoSave) {
    watch(
      () => cellOutput.value,
      (newValue, oldValue) => {
        try {
          // Auto-update nota when output changes in store (from execution)
          if (newValue && !newValue.isExecuting && newValue.content !== oldValue?.content) {
            logger.log(`[EnhancedOutputManagement] Auto-sync triggered for cell ${config.cellId}`, {
              newContent: newValue.content?.length || 0,
              oldContent: oldValue?.content?.length || 0,
              hasError: newValue.hasError
            })
            updateOutput(newValue.content || '', newValue.hasError || false)
          }
        } catch (error) {
          logger.error(`[EnhancedOutputManagement] Error in output watcher for cell ${config.cellId}:`, error)
        }
      },
      { deep: true, immediate: true }
    )
  }
  
  // Initialize the composable safely
  try {
    logger.log(`[EnhancedOutputManagement] Initialized for cell ${config.cellId}`)
  } catch (error) {
    logger.error(`[EnhancedOutputManagement] Initialization error for cell ${config.cellId}:`, error)
  }
  
  return {
    // State
    isLoading,
    error,
    lastSaved,
    
    // Computed
    outputInfo,
    formatOutput,
    outputStats,
    cellOutput,
    
    // Actions
    updateOutput,
    clearOutput,
    copyOutput
  }
}

