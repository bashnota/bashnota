import { ref, watch, nextTick } from 'vue'
import { logger } from '@/services/logger'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'
import type { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { CodeExecutionService } from '@/services/codeExecutionService'

interface SessionManagementConfig {
  availableServers: JupyterServer[]
  selectedServer: string
  selectedKernel: string
  codeExecutionStore: any
  jupyterService: JupyterService
  executionService: CodeExecutionService
  language: string
  blockId: string
  isSharedSessionMode: boolean
  showConsoleMessage: (title: string, message: string, type: 'success' | 'error' | 'warning') => void
}

export function useSessionManagement(config: SessionManagementConfig) {
  const availableSessions = ref<Array<{ 
    id: string; 
    name: string; 
    kernel: { name: string; id: string } 
  }>>([])
  
  const availableKernels = ref<Array<KernelSpec>>([])
  
  const runningKernels = ref<Array<{
    id: string
    name: string
    lastActivity: string
    executionState: string
    connections: number
  }>>([])

  const isSettingUp = ref(false)

  // Utility functions
  const showConsoleMessage = config.showConsoleMessage

  const refreshSessionsAndKernels = async (server: JupyterServer) => {
    if (!server) return

    try {
      // Test server connection first
      const result = await config.jupyterService.testConnection(server)
      if (!result.success) {
        showConsoleMessage('Error', result.message || 'Server connection failed', 'error')
        availableSessions.value = []
        runningKernels.value = []
        return
      }
      
      // Get active sessions and running kernels
      const [sessions, kernels] = await Promise.all([
        config.jupyterService.getActiveSessions(server),
        config.jupyterService.getRunningKernels(server)
      ])
      
      // Update the lists
      availableSessions.value = sessions || []
      runningKernels.value = kernels || []
      
      // Show success message if we got data
      if ((sessions && sessions.length > 0) || (kernels && kernels.length > 0)) {
        showConsoleMessage('Success', 'Sessions and kernels refreshed', 'success')
      }
    } catch (error) {
      logger.error('Failed to refresh sessions/kernels:', error)
      showConsoleMessage('Error', 'Failed to refresh sessions/kernels', 'error')
      availableSessions.value = []
      runningKernels.value = []
    }
  }

  const clearAllKernels = async (server: JupyterServer) => {
    if (!server) return

    try {
      // Delete all running kernels
      await Promise.all(runningKernels.value.map(kernel => 
        config.jupyterService.deleteKernel(server, kernel.id)
      ))
      
      // Refresh the lists
      await refreshSessionsAndKernels(server)
      
      showConsoleMessage('Success', 'All kernels cleared successfully', 'success')
    } catch (error) {
      logger.error('Failed to clear kernels:', error)
      showConsoleMessage('Error', 'Failed to clear kernels', 'error')
    }
  }

  const selectSession = async (sessionId: string) => {
    const session = availableSessions.value.find(s => s.id === sessionId)
    if (!session) return

    // Update session in store
    const server = config.availableServers.find((s: { ip: string, port: string }) => {
      const sessionServer = `${s.ip}:${s.port}`
      return sessionServer === config.selectedServer
    })
    
    if (server) {
      const existingSession = config.codeExecutionStore.kernelSessions.get(sessionId)
      if (!existingSession) {
        // Create a new session entry in the store with required fields
        config.codeExecutionStore.kernelSessions.set(sessionId, {
          id: sessionId,
          name: session.name,
          kernelId: session.kernel.id,
          kernelName: session.kernel.name,
          serverConfig: server,
          cells: [] // Initialize with empty cells array
        })
      }

      // Show success message
      showConsoleMessage('Success', `Selected session: ${session.name || sessionId}`, 'success')
      
      return {
        sessionId,
        kernelName: session.kernel.name
      }
    }
  }

  const selectRunningKernel = async (kernelId: string) => {
    const kernel = runningKernels.value.find(k => k.id === kernelId)
    if (!kernel) return

    // Create a new session with this kernel
    isSettingUp.value = true
    try {
      const server = config.availableServers.find((s: { ip: string, port: string }) => 
        `${s.ip}:${s.port}` === config.selectedServer
      )
      if (!server) throw new Error('Server not found')

      const sessionId = config.codeExecutionStore.createSession(`Session with ${kernel.name}`)
      
      // Update session in store
      const session = config.codeExecutionStore.kernelSessions.get(sessionId)
      if (session) {
        session.kernelId = kernelId
        session.serverConfig = server
        session.kernelName = kernel.name
        config.codeExecutionStore.kernelSessions.set(sessionId, { 
          ...session,
          cells: [] // Initialize with empty cells array
        })
      }
      
      showConsoleMessage('Success', `Connected to running kernel: ${kernel.name}`, 'success')
      
      return {
        sessionId,
        kernelName: kernel.name
      }
    } catch (error) {
      logger.error('Failed to connect to kernel:', error)
      showConsoleMessage('Error', 'Failed to connect to kernel', 'error')
    } finally {
      isSettingUp.value = false
    }
  }

  const createNewSession = async () => {
    if (!config.selectedServer || config.selectedServer === 'none' || !config.selectedKernel) {
      showConsoleMessage('Error', 'Please select a server and kernel first', 'error')
      return
    }

    isSettingUp.value = true
    try {
      const sessionId = config.codeExecutionStore.createSession(`Session ${availableSessions.value.length + 1}`)
      const server = config.availableServers.find((s: { ip: string, port: string }) => 
        `${s.ip}:${s.port}` === config.selectedServer
      )
      if (!server) throw new Error('Server not found')
      
      // Create kernel using executionService
      const kernelId = await config.executionService.createKernel(server, config.selectedKernel)
      
      // Update session in store
      const session = config.codeExecutionStore.kernelSessions.get(sessionId)
      if (session) {
        session.kernelId = kernelId
        session.serverConfig = server
        session.kernelName = config.selectedKernel
        config.codeExecutionStore.kernelSessions.set(sessionId, { ...session })
      }
      
      // If this is in shared mode and we created a new session, set it as the shared session
      if (config.isSharedSessionMode) {
        config.codeExecutionStore.sharedSessionId = sessionId
      }
      
      // Refresh sessions list
      const sessions = await config.jupyterService.getActiveSessions(server)
      availableSessions.value = sessions
      
      return sessionId
    } catch (error) {
      logger.error('Failed to create session:', error)
      showConsoleMessage('Error', 'Failed to create session', 'error')
    } finally {
      isSettingUp.value = false
    }
  }

  // Watch for server changes to fetch kernels and sessions
  const setupServerWatcher = (selectedServerRef: any, handleServerSelect: any, handleKernelSelect: any) => {
    watch(selectedServerRef, async (newServer) => {
      if (!newServer || newServer === 'none') {
        availableKernels.value = []
        availableSessions.value = []
        runningKernels.value = []
        return
      }
      
      const server = config.availableServers.find(
        (s: { ip: string, port: string }) => `${s.ip}:${s.port}` === newServer
      )
      if (server) {
        try {
          // Get kernelspecs from server
          const kernels = await config.jupyterService.getAvailableKernels(server)
          availableKernels.value = kernels
          
          // Get active sessions and running kernels
          await refreshSessionsAndKernels(server)

          // Auto-select appropriate kernel
          if (kernels.length > 0) {
            const matchingKernel = kernels.find(k => k.spec.language === config.language)
            if (matchingKernel) {
              handleKernelSelect(matchingKernel.name)
            }
          }
        } catch (error) {
          logger.error('Failed to fetch kernels/sessions:', error)
          showConsoleMessage('Error', 'Failed to fetch kernels/sessions', 'error')
        }
      }
    })
  }

  return {
    // State
    availableSessions,
    availableKernels,
    runningKernels,
    isSettingUp,
    
    // Methods
    refreshSessionsAndKernels,
    clearAllKernels,
    selectSession,
    selectRunningKernel,
    createNewSession,
    setupServerWatcher
  }
}
