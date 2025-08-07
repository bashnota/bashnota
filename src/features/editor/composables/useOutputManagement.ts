import { ref, computed, watch } from 'vue'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useOutputPersistence } from './useOutputPersistence'
import { logger } from '@/services/logger'

/**
 * Interface for output management configuration
 */
interface OutputConfig {
  cellId: string
  autoSave?: boolean
  persistOutput?: boolean
}

/**
 * Interface for output data
 */
interface OutputData {
  content: string
  type: 'text' | 'html' | 'json' | 'error' | 'image' | 'table'
  hasError: boolean
  executionTime?: number
  timestamp: string
}

/**
 * Interface for output display preferences
 */
interface OutputPreferences {
  isCollapsed: boolean
  showMetadata: boolean
  wordWrap: boolean
}

/**
 * Robust composable for managing code block output
 * Handles display, persistence, and user preferences
 */
export function useOutputManagement(config: OutputConfig) {
  const codeExecutionStore = useCodeExecutionStore()
  
  // Initialize persistence system
  const {
    isSaving,
    saveOutput: persistOutput,
    restoreOutput
  } = useOutputPersistence({
    cellId: config.cellId,
    autoSave: config.autoSave || true,
    saveDelay: 500
  })
  
  // Output state
  const outputData = ref<OutputData | null>(null)
  const preferences = ref<OutputPreferences>({
    isCollapsed: false,
    showMetadata: true,
    wordWrap: true
  })
  
  // Loading and error states
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  /**
   * Get current cell output from store
   */
  const cellOutput = computed(() => {
    const cell = codeExecutionStore.getCellById(config.cellId)
    return cell ? {
      content: cell.output || '',
      hasError: cell.hasError,
      isExecuting: cell.isExecuting,
      error: cell.error
    } : null
  })
  
  /**
   * Computed output information
   */
  const outputInfo = computed(() => {
    const cell = cellOutput.value
    if (!cell) {
      return {
        hasOutput: false,
        hasError: false,
        isEmpty: true,
        content: '',
        type: 'text' as const
      }
    }
    
    const content = cell.content
    const hasOutput = Boolean(content && content.trim())
    const hasError = cell.hasError
    
    // Determine output type based on content
    let type: OutputData['type'] = 'text'
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
      isExecuting: cell.isExecuting
    }
  })
  
  /**
   * Toggle output collapse state
   */
  const toggleCollapse = () => {
    preferences.value.isCollapsed = !preferences.value.isCollapsed
    savePreferences()
  }
  
  /**
   * Toggle metadata display
   */
  const toggleMetadata = () => {
    preferences.value.showMetadata = !preferences.value.showMetadata
    savePreferences()
  }
  
  /**
   * Toggle word wrap
   */
  const toggleWordWrap = () => {
    preferences.value.wordWrap = !preferences.value.wordWrap
    savePreferences()
  }
  
  /**
   * Clear output
   */
  const clearOutput = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Clear output in the store
      const cell = codeExecutionStore.getCellById(config.cellId)
      if (cell) {
        cell.output = ''
        cell.hasError = false
        cell.error = null
      }
      
      logger.log(`[OutputManagement] Cleared output for cell ${config.cellId}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear output'
      logger.error(`[OutputManagement] Failed to clear output:`, err)
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
      logger.log(`[OutputManagement] Output copied to clipboard`)
      return true
    } catch (err) {
      logger.error(`[OutputManagement] Failed to copy output:`, err)
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
  
  /**
   * Save preferences to localStorage
   */
  const savePreferences = () => {
    try {
      const key = `output-preferences-${config.cellId}`
      localStorage.setItem(key, JSON.stringify(preferences.value))
    } catch (err) {
      logger.warn('[OutputManagement] Failed to save preferences:', err)
    }
  }
  
  /**
   * Load preferences from localStorage
   */
  const loadPreferences = () => {
    try {
      const key = `output-preferences-${config.cellId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        preferences.value = { ...preferences.value, ...parsed }
      }
    } catch (err) {
      logger.warn('[OutputManagement] Failed to load preferences:', err)
    }
  }
  
  /**
   * Validate output data
   */
  const validateOutput = (content: string): boolean => {
    try {
      // Basic validation
      if (typeof content !== 'string') {
        return false
      }
      
      // Check for reasonable size limits
      if (content.length > 10 * 1024 * 1024) { // 10MB limit
        logger.warn('[OutputManagement] Output exceeds size limit')
        return false
      }
      
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Update output with validation and persistence
   */
  const updateOutput = async (content: string, hasError: boolean = false) => {
    if (!validateOutput(content)) {
      error.value = 'Invalid output data'
      return false
    }
    
    outputData.value = {
      content,
      type: hasError ? 'error' : 'text',
      hasError,
      timestamp: new Date().toISOString()
    }
    
    // Persist the output
    try {
      await persistOutput(content, hasError)
    } catch (err) {
      logger.warn('[OutputManagement] Failed to persist output:', err)
    }
    
    return true
  }
  
  // Watch for changes in cell output and update local state
  watch(
    () => cellOutput.value,
    (newOutput) => {
      if (newOutput) {
        updateOutput(newOutput.content, newOutput.hasError)
      }
    },
    { immediate: true, deep: true }
  )
  
  // Load preferences on initialization
  loadPreferences()
  
  return {
    // State
    outputData,
    preferences,
    isLoading: computed(() => isLoading.value || isSaving.value),
    error,
    
    // Computed
    outputInfo,
    formatOutput,
    outputStats,
    
    // Actions
    toggleCollapse,
    toggleMetadata,
    toggleWordWrap,
    clearOutput,
    copyOutput,
    updateOutput,
    
    // Utilities
    validateOutput,
    
    // Persistence
    isSaving,
    restoreOutput
  }
}