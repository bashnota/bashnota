import { ref, computed, onMounted } from 'vue'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'

export interface ServerForm {
  name: string
  ip: string
  port: string
  token: string
  url: string
}

export interface ServerTestResult {
  success: boolean
  message: string
}

export interface UseJupyterServersOptions {
  autoLoadKernels?: boolean
  showToasts?: boolean
}

/**
 * Composable for managing Jupyter servers and their operations
 */
export function useJupyterServers(options: UseJupyterServersOptions = {}) {
  const {
    autoLoadKernels = true,
    showToasts = true
  } = options

  // Store and service
  const jupyterStore = useJupyterStore()
  const jupyterService = new JupyterService()

  // State
  const isRefreshing = ref<string | null>(null)
  const isTestingConnection = ref(false)
  const isParsing = ref(false)
  const cachedKernels = ref<Record<string, KernelSpec[]>>({})
  const testResults = ref<Record<string, ServerTestResult>>({})

  // Server form state
  const serverForm = ref<ServerForm>({
    name: '',
    ip: '',
    port: '',
    token: '',
    url: ''
  })

  // Computed properties
  const servers = computed(() => jupyterStore.jupyterServers)
  const hasServers = computed(() => servers.value.length > 0)
  const isAnyRefreshing = computed(() => isRefreshing.value !== null)

  // Utility functions
  const createServerKey = (server: JupyterServer): string => `${server.ip}:${server.port}`

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
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

  // Server operations
  const refreshKernels = async (server: JupyterServer): Promise<KernelSpec[]> => {
    const serverKey = createServerKey(server)
    isRefreshing.value = serverKey

    try {
      const kernels = await jupyterService.getAvailableKernels(server)
      cachedKernels.value[serverKey] = kernels
      
      if (showToasts) {
        showToast(`Found ${kernels.length} kernels on ${serverKey}`)
      }
      
      return kernels
    } catch (error) {
      logError(`Failed to get kernels for ${serverKey}`, error)
      return []
    } finally {
      isRefreshing.value = null
    }
  }

  const refreshAllServers = async (): Promise<void> => {
    if (!hasServers.value) return

    let successCount = 0
    let failCount = 0

    for (const server of servers.value) {
      const serverKey = createServerKey(server)
      isRefreshing.value = serverKey

      try {
        const kernels = await jupyterService.getAvailableKernels(server)
        cachedKernels.value[serverKey] = kernels
        successCount++
      } catch (error) {
        logger.error(`Failed to get kernels for ${serverKey}:`, error)
        failCount++
      }
    }

    isRefreshing.value = null

    if (showToasts) {
      if (successCount > 0) {
        const message = `Refreshed ${successCount} server${successCount !== 1 ? 's' : ''}`
        const failMessage = failCount > 0 ? `, ${failCount} failed` : ''
        showToast(message + failMessage)
      } else if (failCount > 0) {
        showToast(`Failed to refresh ${failCount} server${failCount !== 1 ? 's' : ''}`)
      }
    }
  }

  const testConnection = async (server: JupyterServer): Promise<ServerTestResult> => {
    const serverKey = createServerKey(server)
    isTestingConnection.value = true

    try {
      const result = await jupyterService.testConnection(server)
      testResults.value[serverKey] = result
      return result
    } catch (error) {
      const result = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      }
      testResults.value[serverKey] = result
      return result
    } finally {
      isTestingConnection.value = false
    }
  }

  const addServer = async (): Promise<boolean> => {
    isTestingConnection.value = true

    try {
      // Validate form
      if (!serverForm.value.ip.trim() || !serverForm.value.port.trim()) {
        showToast('IP and port are required')
        return false
      }

      // Create server object
      const newServer: JupyterServer = {
        name: serverForm.value.name.trim(),
        ip: serverForm.value.ip.trim(),
        port: serverForm.value.port.trim(),
        token: serverForm.value.token.trim(),
      }

      // Test connection first
      const testResult = await testConnection(newServer)
      if (!testResult.success) {
        showToast('Could not connect to Jupyter server')
        return false
      }

      // Add the server
      await jupyterStore.addServer(newServer)

      // Get initial kernels if auto-loading is enabled
      if (autoLoadKernels) {
        const kernels = await jupyterService.getAvailableKernels(newServer)
        const serverKey = createServerKey(newServer)
        cachedKernels.value[serverKey] = kernels
        
        if (showToasts) {
          showToast(`Added server ${serverKey} with ${kernels.length} kernels`)
        }
      } else {
        showToast(`Added server ${createServerKey(newServer)}`)
      }

      // Reset form
      resetForm()
      return true
    } catch (error) {
      logError('Failed to add server', error)
      return false
    } finally {
      isTestingConnection.value = false
    }
  }

  const removeServer = async (server: JupyterServer): Promise<boolean> => {
    try {
      await jupyterStore.removeServer(server)
      const serverKey = createServerKey(server)
      delete cachedKernels.value[serverKey]
      delete testResults.value[serverKey]
      
      showToast(`Removed server ${serverKey}`)
      return true
    } catch (error) {
      logError('Failed to remove server', error)
      return false
    }
  }

  const parseJupyterUrl = (): boolean => {
    isParsing.value = true

    try {
      if (!serverForm.value.url.trim()) {
        showToast('Please enter a Jupyter URL')
        return false
      }

      const parsed = jupyterService.parseJupyterUrl(serverForm.value.url)
      if (parsed) {
        serverForm.value.ip = parsed.ip
        serverForm.value.port = parsed.port
        serverForm.value.token = parsed.token
        showToast('URL parsed successfully')
        return true
      } else {
        showToast('Could not parse Jupyter URL')
        return false
      }
    } catch (error) {
      logError('Failed to parse URL', error)
      return false
    } finally {
      isParsing.value = false
    }
  }

  const resetForm = () => {
    serverForm.value = {
      name: '',
      ip: '',
      port: '',
      token: '',
      url: ''
    }
  }

  const getKernelsForServer = (server: JupyterServer): KernelSpec[] => {
    const serverKey = createServerKey(server)
    return cachedKernels.value[serverKey] || []
  }

  const getTestResultForServer = (server: JupyterServer): ServerTestResult | undefined => {
    const serverKey = createServerKey(server)
    return testResults.value[serverKey]
  }

  const isServerRefreshing = (server: JupyterServer): boolean => {
    const serverKey = createServerKey(server)
    return isRefreshing.value === serverKey
  }

  // Initialize kernels for existing servers
  const initializeKernels = async () => {
    if (!autoLoadKernels || !hasServers.value) return

    for (const server of servers.value) {
      try {
        const serverKey = createServerKey(server)
        const kernels = await jupyterService.getAvailableKernels(server)
        cachedKernels.value[serverKey] = kernels
      } catch (error) {
        logger.error(`Failed to get kernels for ${createServerKey(server)}:`, error)
      }
    }
  }

  // Initialize on mount
  onMounted(() => {
    initializeKernels()
  })

  return {
    // State
    servers,
    hasServers,
    isRefreshing,
    isAnyRefreshing,
    isTestingConnection,
    isParsing,
    serverForm,
    cachedKernels: computed(() => cachedKernels.value),
    testResults: computed(() => testResults.value),

    // Operations
    refreshKernels,
    refreshAllServers,
    testConnection,
    addServer,
    removeServer,
    parseJupyterUrl,
    resetForm,

    // Utilities
    getKernelsForServer,
    getTestResultForServer,
    isServerRefreshing,
    createServerKey,
    initializeKernels
  }
} 







