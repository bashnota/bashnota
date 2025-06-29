import { ref, computed } from 'vue'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'

export interface JupyterSession {
  id: string
  name: string
  path: string
  kernel: {
    id: string
    name: string
    lastActivity: string
  }
}

export interface RunningKernel {
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}

export interface UseJupyterSessionsOptions {
  showToasts?: boolean
}

/**
 * Composable for managing Jupyter sessions and running kernels
 */
export function useJupyterSessions(options: UseJupyterSessionsOptions = {}) {
  const { showToasts = true } = options

  // Service
  const jupyterService = new JupyterService()

  // State
  const isRefreshingSessions = ref(false)
  const isDeletingKernels = ref<Record<string, boolean>>({})
  const sessions = ref<Record<string, JupyterSession[]>>({})
  const runningKernels = ref<Record<string, RunningKernel[]>>({})

  // Utility functions
  const createServerKey = (server: JupyterServer): string => `${server.ip}:${server.port}`

  const showToast = (message: string) => {
    if (showToasts) {
      toast(message)
    }
  }

  const logError = (message: string, error: unknown) => {
    logger.error(message, error)
    if (showToasts) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast(`${message}: ${errorMessage}`)
    }
  }

  // Session operations
  const refreshSessions = async (server: JupyterServer): Promise<void> => {
    const serverKey = createServerKey(server)
    isRefreshingSessions.value = true

    try {
      const [sessionList, kernelList] = await Promise.all([
        jupyterService.getActiveSessions(server),
        jupyterService.getRunningKernels(server)
      ])

      sessions.value[serverKey] = sessionList || []
      runningKernels.value[serverKey] = kernelList || []

      if (showToasts) {
        const sessionCount = sessionList?.length || 0
        const kernelCount = kernelList?.length || 0
        showToast(`Found ${sessionCount} sessions and ${kernelCount} kernels on ${serverKey}`)
      }
    } catch (error) {
      logError(`Failed to refresh sessions for ${serverKey}`, error)
      sessions.value[serverKey] = []
      runningKernels.value[serverKey] = []
    } finally {
      isRefreshingSessions.value = false
    }
  }

  const deleteKernel = async (server: JupyterServer, kernelId: string): Promise<boolean> => {
    const serverKey = createServerKey(server)
    isDeletingKernels.value[kernelId] = true

    try {
      await jupyterService.deleteKernel(server, kernelId)
      
      // Remove from local state
      if (runningKernels.value[serverKey]) {
        runningKernels.value[serverKey] = runningKernels.value[serverKey].filter(
          kernel => kernel.id !== kernelId
        )
      }

      showToast('Kernel deleted successfully')
      return true
    } catch (error) {
      logError('Failed to delete kernel', error)
      return false
    } finally {
      delete isDeletingKernels.value[kernelId]
    }
  }

  const deleteAllKernels = async (server: JupyterServer): Promise<boolean> => {
    const serverKey = createServerKey(server)
    const kernels = runningKernels.value[serverKey] || []

    if (kernels.length === 0) {
      showToast('No kernels to delete')
      return true
    }

    try {
      // Mark all kernels as being deleted
      kernels.forEach(kernel => {
        isDeletingKernels.value[kernel.id] = true
      })

      // Delete all kernels
      await Promise.all(
        kernels.map(kernel => jupyterService.deleteKernel(server, kernel.id))
      )

      // Clear local state
      runningKernels.value[serverKey] = []
      
      // Clear deletion flags
      kernels.forEach(kernel => {
        delete isDeletingKernels.value[kernel.id]
      })

      showToast(`Deleted ${kernels.length} kernels successfully`)
      return true
    } catch (error) {
      logError('Failed to delete all kernels', error)
      
      // Clear deletion flags on error
      kernels.forEach(kernel => {
        delete isDeletingKernels.value[kernel.id]
      })
      
      return false
    }
  }

  const connectToSession = (sessionId: string): void => {
    showToast(`Connected to session ${sessionId}`)
    // Additional connection logic can be added here
  }

  const connectToKernel = (server: JupyterServer, kernelName: string): void => {
    const serverKey = createServerKey(server)
    showToast(`Connected to ${kernelName} kernel on ${serverKey}`)
    // Additional connection logic can be added here
  }

  // Getters
  const getSessionsForServer = (server: JupyterServer): JupyterSession[] => {
    const serverKey = createServerKey(server)
    return sessions.value[serverKey] || []
  }

  const getKernelsForServer = (server: JupyterServer): RunningKernel[] => {
    const serverKey = createServerKey(server)
    return runningKernels.value[serverKey] || []
  }

  const isKernelDeleting = (kernelId: string): boolean => {
    return isDeletingKernels.value[kernelId] || false
  }

  const getSessionCount = (server: JupyterServer): number => {
    return getSessionsForServer(server).length
  }

  const getKernelCount = (server: JupyterServer): number => {
    return getKernelsForServer(server).length
  }

  // Computed properties
  const hasAnySessions = computed(() => {
    return Object.values(sessions.value).some(serverSessions => serverSessions.length > 0)
  })

  const hasAnyKernels = computed(() => {
    return Object.values(runningKernels.value).some(serverKernels => serverKernels.length > 0)
  })

  const totalSessions = computed(() => {
    return Object.values(sessions.value).reduce((total, serverSessions) => total + serverSessions.length, 0)
  })

  const totalKernels = computed(() => {
    return Object.values(runningKernels.value).reduce((total, serverKernels) => total + serverKernels.length, 0)
  })

  return {
    // State
    isRefreshingSessions,
    isDeletingKernels: computed(() => isDeletingKernels.value),
    sessions: computed(() => sessions.value),
    runningKernels: computed(() => runningKernels.value),

    // Operations
    refreshSessions,
    deleteKernel,
    deleteAllKernels,
    connectToSession,
    connectToKernel,

    // Getters
    getSessionsForServer,
    getKernelsForServer,
    isKernelDeleting,
    getSessionCount,
    getKernelCount,

    // Computed
    hasAnySessions,
    hasAnyKernels,
    totalSessions,
    totalKernels
  }
} 







