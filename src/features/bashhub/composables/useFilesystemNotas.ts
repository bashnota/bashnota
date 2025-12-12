import { ref, computed } from 'vue'
import { useStorageMode } from '@/composables/useStorageMode'
import { FileSystemBackend } from '@/services/fileSystemBackend'
import { logger } from '@/services/logger'
import { saveDirectoryHandle } from '@/services/directoryHandleStorage'
import type { Nota } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'

// Type declaration for File System Access API
interface WindowWithFileSystemAPI extends Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite'
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  }): Promise<FileSystemDirectoryHandle>
}

/**
 * Composable for managing filesystem notas in the home view
 */
export function useFilesystemNotas() {
  const { isFilesystemMode, getDirectoryHandle } = useStorageMode()
  
  const filesystemNotas = ref<Nota[]>([])
  const isLoadingFilesystem = ref(false)
  const hasDirectoryAccess = ref(false)
  const directoryName = ref<string | null>(null)
  
  // Check if we have directory access
  const checkDirectoryAccess = async () => {
    if (!isFilesystemMode.value) {
      hasDirectoryAccess.value = false
      return
    }
    
    try {
      const handle = getDirectoryHandle()
      if (handle) {
        hasDirectoryAccess.value = true
        directoryName.value = handle.name
      } else {
        hasDirectoryAccess.value = false
      }
    } catch (error) {
      logger.error('[useFilesystemNotas] Failed to check directory access:', error)
      hasDirectoryAccess.value = false
    }
  }
  
  // Load notas from filesystem
  const loadFilesystemNotas = async () => {
    if (!isFilesystemMode.value) {
      filesystemNotas.value = []
      return
    }
    
    isLoadingFilesystem.value = true
    try {
      const backend = new FileSystemBackend()
      
      // Check if we have a persisted handle
      if (await FileSystemBackend.hasPersistedHandle()) {
        await backend.initialize()
        const notas = await backend.listNotas()
        filesystemNotas.value = notas
        
        // Update directory name
        const handle = backend.getDirectoryHandle()
        if (handle) {
          directoryName.value = handle.name
          hasDirectoryAccess.value = true
        }
        
        logger.info(`[useFilesystemNotas] Loaded ${notas.length} notas from filesystem`)
      } else {
        filesystemNotas.value = []
        hasDirectoryAccess.value = false
      }
    } catch (error) {
      logger.error('[useFilesystemNotas] Failed to load filesystem notas:', error)
      filesystemNotas.value = []
      hasDirectoryAccess.value = false
    } finally {
      isLoadingFilesystem.value = false
    }
  }
  
  // Select a directory for filesystem mode
  const selectDirectory = async (): Promise<boolean> => {
    if (!isFilesystemMode.value) {
      toast.error('Filesystem mode is not enabled', {
        description: 'Please enable filesystem mode in Settings > Advanced > Storage Mode'
      })
      return false
    }
    
    try {
      // Check if showDirectoryPicker is available
      if (!('showDirectoryPicker' in window)) {
        toast.error('File System Access API not supported', {
          description: 'Your browser does not support this feature'
        })
        return false
      }
      
      // Prompt user to select a directory
      const directoryHandle = await (window as WindowWithFileSystemAPI).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })
      
      logger.info('[useFilesystemNotas] Directory selected:', directoryHandle.name)
      
      // Persist the directory handle for future use
      await saveDirectoryHandle(directoryHandle)
      
      // Update state
      directoryName.value = directoryHandle.name
      hasDirectoryAccess.value = true
      
      // Load notas from the selected directory
      await loadFilesystemNotas()
      
      toast.success('Directory selected', {
        description: `Selected directory: ${directoryHandle.name}`
      })
      
      return true
    } catch (error: any) {
      logger.error('[useFilesystemNotas] Failed to select directory:', error)
      
      // Handle user cancellation gracefully
      if (error.name === 'AbortError') {
        toast.info('Directory selection cancelled')
      } else {
        toast.error('Failed to select directory', {
          description: 'Could not access the file system. Please check your browser permissions.'
        })
      }
      
      return false
    }
  }
  
  // Get notas that exist only in filesystem (not in database)
  const getFilesystemOnlyNotas = (dbNotas: Nota[]): Nota[] => {
    const dbNotaIds = new Set(dbNotas.map(n => n.id))
    return filesystemNotas.value.filter(n => !dbNotaIds.has(n.id))
  }
  
  // Get notas that exist in both filesystem and database
  const getSharedNotas = (dbNotas: Nota[]): Nota[] => {
    const dbNotaIds = new Set(dbNotas.map(n => n.id))
    return filesystemNotas.value.filter(n => dbNotaIds.has(n.id))
  }
  
  return {
    // State
    filesystemNotas,
    isLoadingFilesystem,
    hasDirectoryAccess,
    directoryName,
    
    // Computed
    isFilesystemMode,
    
    // Methods
    checkDirectoryAccess,
    loadFilesystemNotas,
    selectDirectory,
    getFilesystemOnlyNotas,
    getSharedNotas
  }
}
