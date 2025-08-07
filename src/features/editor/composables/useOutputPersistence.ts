import { ref, watch, nextTick } from 'vue'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { logger } from '@/services/logger'

/**
 * Configuration for output persistence
 */
interface PersistenceConfig {
  cellId: string
  notaId?: string
  autoSave?: boolean
  saveDelay?: number // Debounce delay in milliseconds
}

/**
 * Output data for persistence
 */
interface PersistedOutput {
  cellId: string
  content: string
  hasError: boolean
  timestamp: string
  executionCount?: number
}

/**
 * Composable for robust output persistence
 * Handles saving output to database and loading on page refresh
 */
export function useOutputPersistence(config: PersistenceConfig) {
  const codeExecutionStore = useCodeExecutionStore()
  
  // State
  const isSaving = ref(false)
  const lastSaved = ref<string | null>(null)
  const saveError = ref<string | null>(null)
  
  // Debounce timer for auto-save
  let saveTimer: NodeJS.Timeout | null = null
  
  /**
   * Save output to database via updateAttributes
   * This is the proper way to persist data in the editor
   */
  const saveOutputToDatabase = async (output: PersistedOutput): Promise<boolean> => {
    try {
      isSaving.value = true
      saveError.value = null
      
      // Get the cell from store and update it
      const cell = codeExecutionStore.getCellById(config.cellId)
      if (!cell) {
        throw new Error(`Cell ${config.cellId} not found`)
      }
      
      // Update the cell output in the store
      cell.output = output.content
      cell.hasError = output.hasError
      cell.error = output.hasError ? new Error(output.content) : null
      
      // The output persistence to database should be handled by the EditorView
      // when it detects changes in the document structure
      // For now, we save to localStorage as the primary persistence mechanism
      await saveToLocalStorage(output)
      
      lastSaved.value = new Date().toISOString()
      
      logger.log(`[OutputPersistence] Saved output for cell ${config.cellId}`, {
        length: output.content.length,
        hasError: output.hasError
      })
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      saveError.value = errorMessage
      logger.error(`[OutputPersistence] Failed to save output for cell ${config.cellId}:`, error)
      return false
    } finally {
      isSaving.value = false
    }
  }
  
  /**
   * Save to localStorage as backup
   */
  const saveToLocalStorage = async (output: PersistedOutput): Promise<void> => {
    try {
      const key = `output_${config.cellId}`
      const data = {
        ...output,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      logger.warn('[OutputPersistence] Failed to save to localStorage:', error)
    }
  }
  
  /**
   * Load output from localStorage backup
   */
  const loadFromLocalStorage = (): PersistedOutput | null => {
    try {
      const key = `output_${config.cellId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      logger.warn('[OutputPersistence] Failed to load from localStorage:', error)
    }
    return null
  }
  
  /**
   * Debounced save function
   */
  const debouncedSave = (output: PersistedOutput) => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    saveTimer = setTimeout(() => {
      saveOutputToDatabase(output)
    }, config.saveDelay || 1000)
  }
  
  /**
   * Save output immediately
   */
  const saveOutput = async (content: string, hasError: boolean = false): Promise<boolean> => {
    const output: PersistedOutput = {
      cellId: config.cellId,
      content,
      hasError,
      timestamp: new Date().toISOString()
    }
    
    if (config.autoSave) {
      debouncedSave(output)
      return true
    } else {
      return await saveOutputToDatabase(output)
    }
  }
  
  /**
   * Load output on initialization
   */
  const loadOutput = (): PersistedOutput | null => {
    // First try to get from the code execution store
    const cell = codeExecutionStore.getCellById(config.cellId)
    if (cell && cell.output) {
      return {
        cellId: config.cellId,
        content: cell.output,
        hasError: cell.hasError,
        timestamp: new Date().toISOString()
      }
    }
    
    // Fallback to localStorage
    return loadFromLocalStorage()
  }
  
  /**
   * Clear saved output
   */
  const clearOutput = async (): Promise<boolean> => {
    try {
      // Clear from store
      const cell = codeExecutionStore.getCellById(config.cellId)
      if (cell) {
        cell.output = ''
        cell.hasError = false
        cell.error = null
      }
      
      // Clear from localStorage
      const key = `output_${config.cellId}`
      localStorage.removeItem(key)
      
      lastSaved.value = new Date().toISOString()
      
      logger.log(`[OutputPersistence] Cleared output for cell ${config.cellId}`)
      return true
    } catch (error) {
      logger.error(`[OutputPersistence] Failed to clear output:`, error)
      return false
    }
  }
  
  /**
   * Watch for changes in cell output and auto-save if enabled
   */
  if (config.autoSave) {
    watch(
      () => {
        const cell = codeExecutionStore.getCellById(config.cellId)
        return cell ? {
          output: cell.output,
          hasError: cell.hasError,
          isExecuting: cell.isExecuting
        } : null
      },
      (newValue, oldValue) => {
        // Only save when execution is complete and output has changed
        if (newValue && !newValue.isExecuting && newValue.output !== oldValue?.output) {
          const output: PersistedOutput = {
            cellId: config.cellId,
            content: newValue.output || '',
            hasError: newValue.hasError,
            timestamp: new Date().toISOString()
          }
          debouncedSave(output)
        }
      },
      { deep: true }
    )
  }
  
  /**
   * Restore output on page load
   */
  const restoreOutput = () => {
    const savedOutput = loadOutput()
    if (savedOutput && savedOutput.content) {
      logger.log(`[OutputPersistence] Restored output for cell ${config.cellId}`, {
        length: savedOutput.content.length,
        hasError: savedOutput.hasError
      })
    }
    return savedOutput
  }
  
  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }
  
  // Auto-restore on initialization
  nextTick(() => {
    restoreOutput()
  })
  
  return {
    // State
    isSaving,
    lastSaved,
    saveError,
    
    // Actions
    saveOutput,
    loadOutput,
    clearOutput,
    restoreOutput,
    cleanup
  }
}