import { ref, computed } from 'vue'
import { logger } from '@/services/logger'
import { getFileWatcher, type FileWatcherService } from '@/services/fileWatcherService'

/**
 * Storage mode types
 */
export type StorageMode = 'indexeddb' | 'filesystem'

/**
 * Storage mode configuration
 */
interface StorageModeConfig {
  mode: StorageMode
  autoWatch: boolean // For filesystem mode: watch for file changes
  directoryHandle?: FileSystemDirectoryHandle | null
}

// Storage key for persistence
const STORAGE_KEY = 'bashnota-storage-mode'

// File watcher instance
let fileWatcher: FileWatcherService | null = null

// Load initial configuration from localStorage
function loadStorageConfig(): StorageModeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const config = JSON.parse(saved)
      return {
        mode: config.mode || 'indexeddb',
        autoWatch: config.autoWatch ?? true,
        directoryHandle: null // Can't persist this
      }
    }
  } catch (error) {
    logger.error('Failed to load storage mode config:', error)
  }

  // Default configuration
  return {
    mode: 'indexeddb',
    autoWatch: true,
    directoryHandle: null
  }
}

// Save configuration to localStorage
function saveStorageConfig(config: StorageModeConfig): void {
  try {
    const toSave = {
      mode: config.mode,
      autoWatch: config.autoWatch
      // Don't save directoryHandle as it can't be serialized
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    logger.info('[StorageMode] Configuration saved:', toSave)
  } catch (error) {
    logger.error('Failed to save storage mode config:', error)
  }
}

// Reactive configuration
const config = ref<StorageModeConfig>(loadStorageConfig())

/**
 * Composable for managing storage mode
 */
export function useStorageMode() {
  // Current storage mode
  const storageMode = computed({
    get: () => config.value.mode,
    set: (value: StorageMode) => {
      config.value.mode = value
      saveStorageConfig(config.value)
      logger.info('[StorageMode] Mode changed to:', value)
    }
  })

  // Auto-watch setting for filesystem mode
  const autoWatch = computed({
    get: () => config.value.autoWatch,
    set: (value: boolean) => {
      config.value.autoWatch = value
      saveStorageConfig(config.value)
      logger.info('[StorageMode] Auto-watch changed to:', value)
      
      // Update file watcher
      if (fileWatcher) {
        if (value && config.value.mode === 'filesystem') {
          fileWatcher.start().catch(error => {
            logger.error('[StorageMode] Failed to start file watcher:', error)
          })
        } else {
          fileWatcher.stop()
        }
      }
    }
  })

  // Check if filesystem mode is supported
  const isFilesystemSupported = computed(() => {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  })

  // Check if currently using filesystem mode
  const isFilesystemMode = computed(() => config.value.mode === 'filesystem')

  // Check if currently using IndexedDB mode
  const isIndexedDBMode = computed(() => config.value.mode === 'indexeddb')

  // Check if file watcher is active
  const isWatchingFiles = computed(() => {
    return fileWatcher?.isActive() || false
  })

  // Switch to filesystem mode
  const switchToFilesystem = async () => {
    if (!isFilesystemSupported.value) {
      throw new Error('File System Access API is not supported in this browser')
    }
    
    storageMode.value = 'filesystem'
    logger.info('[StorageMode] Switched to filesystem mode')
  }

  // Switch to IndexedDB mode
  const switchToIndexedDB = () => {
    storageMode.value = 'indexeddb'
    
    // Stop file watcher if running
    if (fileWatcher) {
      fileWatcher.stop()
    }
    
    logger.info('[StorageMode] Switched to IndexedDB mode')
  }

  // Set directory handle (for filesystem mode)
  const setDirectoryHandle = (handle: FileSystemDirectoryHandle | null) => {
    config.value.directoryHandle = handle
    logger.info('[StorageMode] Directory handle updated')
  }

  // Get directory handle
  const getDirectoryHandle = () => {
    return config.value.directoryHandle
  }

  // Initialize file watcher with backend
  const initializeFileWatcher = (backend: any, callbacks?: {
    onFileChanged?: (notaId: string, content: any) => void
    onFileAdded?: (notaId: string, content: any) => void
    onFileDeleted?: (notaId: string) => void
  }) => {
    if (!fileWatcher) {
      fileWatcher = getFileWatcher({
        pollInterval: 2000,
        onFileChanged: callbacks?.onFileChanged,
        onFileAdded: callbacks?.onFileAdded,
        onFileDeleted: callbacks?.onFileDeleted,
        onError: (error) => {
          logger.error('[StorageMode] File watcher error:', error)
        }
      })
    }
    
    fileWatcher.setBackend(backend)
    
    // Start watching if in filesystem mode and auto-watch is enabled
    if (config.value.mode === 'filesystem' && config.value.autoWatch) {
      fileWatcher.start().catch(error => {
        logger.error('[StorageMode] Failed to start file watcher:', error)
      })
    }
    
    return fileWatcher
  }

  // Stop file watcher
  const stopFileWatcher = () => {
    if (fileWatcher) {
      fileWatcher.stop()
    }
  }

  // Get storage mode description
  const getModeDescription = computed(() => {
    switch (config.value.mode) {
      case 'filesystem':
        return 'Files are stored directly in a selected folder as .nota files. Changes to files in the folder are reflected in real-time.'
      case 'indexeddb':
        return 'Files are stored in the browser\'s IndexedDB. Data is stored locally in the browser.'
      default:
        return 'Unknown storage mode'
    }
  })

  return {
    // State
    storageMode,
    autoWatch,
    
    // Computed
    isFilesystemSupported,
    isFilesystemMode,
    isIndexedDBMode,
    isWatchingFiles,
    getModeDescription,
    
    // Actions
    switchToFilesystem,
    switchToIndexedDB,
    setDirectoryHandle,
    getDirectoryHandle,
    initializeFileWatcher,
    stopFileWatcher
  }
}
