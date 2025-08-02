import { ref, computed } from 'vue'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { logger } from '@/services/logger'

export function useCodeBlockExecutionSimplified(props: any, emit: any, dependencies: any) {
  // Initialize stores
  const jupyterStore = useJupyterStore()
  const codeExecutionStore = useCodeExecutionStore()
  
  // Execution state
  const isExecuting = ref(false)
  const isSettingUp = ref(false)
  const runningStatus = ref<'idle' | 'running' | 'error' | 'success'>('idle')
  const executionTime = ref(0)
  const executionProgress = ref(0)
  const currentExecutionTime = ref(0)
  const errorMessage = ref<string | null>(null)
  
  // Session management state
  const selectedServer = ref('')
  const selectedKernel = ref('')
  const selectedSession = ref('')
  
  // Connect to Jupyter store for servers and kernels
  const availableServers = computed(() => {
    // Ensure servers are loaded from localStorage
    if (!jupyterStore.jupyterServers.length) {
      jupyterStore.loadServers()
    }
    return jupyterStore.jupyterServers || []
  })
  
  const availableKernels = computed(() => {
    if (!selectedServer.value) return []
    const serverKey = selectedServer.value
    return jupyterStore.kernels[serverKey] || []
  })
  
  // Cell state from execution store
  const cell = computed(() => {
    const cellData = codeExecutionStore.getCellById(props.id)
    return cellData
  })
  
  const availableSessions = ref<Array<{ id: string; name: string; kernel: { name: string; id: string } }>>([])
  const runningKernels = ref<Array<any>>([])
  const isServerOpen = ref(false)
  const isKernelOpen = ref(false)
  const isSessionOpen = ref(false)
  const isSharedSessionMode = ref(false)
  
  // Execution methods
  const executeCode = async () => {
    try {
      if (!dependencies.isReadyToExecute.value) {
        logger.warn('Code block not ready to execute')
        return
      }
      
      if (!selectedServer.value || !selectedKernel.value) {
        errorMessage.value = 'Please select a server and kernel before executing code'
        return
      }
      
      isExecuting.value = true
      runningStatus.value = 'running'
      errorMessage.value = null
      
      const startTime = Date.now()
      
      // Use actual code execution service
      if (props.id) {
        // Ensure cell exists in store
        if (!codeExecutionStore.getCellById(props.id)) {
          codeExecutionStore.addCell({
            id: props.id,
            code: dependencies.codeValue.value,
            kernelName: selectedKernel.value,
            sessionId: selectedSession.value || 'default',
            output: '',
            isPublished: props.isPublished || false
          })
        }
        
        // Execute the cell
        await codeExecutionStore.executeCell(props.id)
        
        // Get the execution result
        const executedCell = codeExecutionStore.getCellById(props.id)
        logger.log('Cell after execution:', executedCell)
        
        if (executedCell) {
          if (executedCell.hasError) {
            runningStatus.value = 'error'
            errorMessage.value = executedCell.output
            logger.log('Execution error:', executedCell.output)
          } else {
            runningStatus.value = 'success'
            emit('update:output', executedCell.output)
            logger.log('Execution success, output:', executedCell.output)
          }
        } else {
          logger.warn('No cell found after execution')
        }
      }
      
      executionTime.value = Date.now() - startTime
      logger.log(`Code executed successfully in ${executionTime.value}ms`)
    } catch (error) {
      runningStatus.value = 'error'
      errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Code execution failed:', error)
    } finally {
      // Use nextTick to ensure DOM updates are complete before setting state
      await new Promise(resolve => setTimeout(resolve, 0))
      isExecuting.value = false
    }
  }
  
  // Session management methods
  const handleServerChange = async (serverId: string) => {
    selectedServer.value = serverId
    isServerOpen.value = false
    // Clear kernel selection when server changes
    selectedKernel.value = ''
    // Load kernels for the new server
    if (serverId && serverId !== 'none') {
      const server = availableServers.value.find(s => `${s.ip}:${s.port}` === serverId)
      if (server) {
        jupyterStore.getAvailableKernels(server).then(() => {
          logger.log('Kernels loaded for server:', serverId)
        })
      }
    }
    emit('server-change', serverId)
    logger.log('Server changed to:', serverId)
  }
  
  const handleKernelChange = (kernelName: string) => {
    selectedKernel.value = kernelName
    isKernelOpen.value = false
    emit('kernel-select', kernelName, selectedServer.value)
    logger.log('Kernel changed to:', kernelName)
  }
  
  const handleSessionChange = async (sessionId: string) => {
    selectedSession.value = sessionId
    isSessionOpen.value = false
    emit('update:session-id', sessionId)
    logger.log('Session changed to:', sessionId)
  }
  
  const handleCreateNewSession = async () => {
    try {
      if (!selectedServer.value) {
        logger.warn('No server selected for session creation')
        return
      }
      
      // Create new session using code execution store
      const newSessionId = codeExecutionStore.createSession(`Session ${Date.now()}`)
      
      // Add current cell to the new session
      if (props.id) {
        codeExecutionStore.addCellToSession(props.id, newSessionId)
      }
      
      selectedSession.value = newSessionId
      isSessionOpen.value = false
      emit('update:session-id', newSessionId)
      logger.log('Created new session:', newSessionId)
    } catch (error) {
      logger.error('Failed to create new session:', error)
      errorMessage.value = 'Failed to create new session'
    }
  }
  
  const handleClearAllKernels = async () => {
    try {
      if (!selectedServer.value) {
        logger.warn('No server selected for kernel clearing')
        return
      }
      
      const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
      if (server) {
        // Clear kernels from the store
        const serverKey = `${server.ip}:${server.port}`
        if (jupyterStore.kernels[serverKey]) {
          delete jupyterStore.kernels[serverKey]
        }
        
        // Clear selected kernel
        selectedKernel.value = ''
        
        logger.log('Cleared all kernels for server:', selectedServer.value)
      }
    } catch (error) {
      logger.error('Failed to clear kernels:', error)
      errorMessage.value = 'Failed to clear kernels'
    }
  }
  
  const handleRefreshSessions = async () => {
    try {
      // Load saved sessions from nota config
      if (props.notaId) {
        codeExecutionStore.loadSavedSessions(props.notaId)
        
        // Update available sessions list
        const sessions = codeExecutionStore.getAllSessions
        availableSessions.value = sessions.map((session: any) => ({
          id: session.id,
          name: session.name,
          kernel: {
            name: session.kernelId,
            id: session.kernelId
          }
        }))
        
        logger.log('Refreshed sessions')
      }
    } catch (error) {
      logger.error('Failed to refresh sessions:', error)
      errorMessage.value = 'Failed to refresh sessions'
    }
  }
  
  const handleRunningKernelSelect = async (kernelId: string) => {
    try {
      // Find the running kernel info and select it
      const runningKernel = runningKernels.value.find((k: any) => k.id === kernelId)
      if (runningKernel) {
        selectedKernel.value = runningKernel.name
        logger.log('Selected running kernel:', kernelId, runningKernel.name)
        
        // Emit kernel selection event
        emit('kernel-select', runningKernel.name, selectedServer.value)
      } else {
        logger.warn('Running kernel not found:', kernelId)
      }
    } catch (error) {
      logger.error('Failed to select running kernel:', error)
      errorMessage.value = 'Failed to select running kernel'
    }
  }
  
  const handleErrorDismissed = () => {
    errorMessage.value = null
  }
  
  // AI integration methods
  const handleAICodeUpdate = (newCode: string) => {
    dependencies.updateCode?.(newCode)
  }
  
  const handleCustomActionExecuted = (actionId: string, result: string) => {
    logger.log('AI action executed:', actionId, result)
  }
  
  // Initialize servers on component mount
  const initializeComponent = () => {
    // Load servers from localStorage
    jupyterStore.loadServers()
    logger.log('Initialized component and loaded servers from localStorage')
  }

  return {
    // Execution state
    isExecuting,
    isSettingUp,
    runningStatus,
    executionTime,
    executionProgress,
    currentExecutionTime,
    errorMessage,
    
    // Cell state
    cell,
    
    // Session state
    selectedServer,
    selectedKernel,
    selectedSession,
    availableServers,
    availableKernels,
    availableSessions,
    runningKernels,
    isServerOpen,
    isKernelOpen,
    isSessionOpen,
    isSharedSessionMode,
    
    // Methods
    executeCode,
    initializeComponent,
    handleServerChange,
    handleKernelChange,
    handleSessionChange,
    handleCreateNewSession,
    handleClearAllKernels,
    handleRefreshSessions,
    handleRunningKernelSelect,
    handleErrorDismissed,
    handleAICodeUpdate,
    handleCustomActionExecuted
  }
}
