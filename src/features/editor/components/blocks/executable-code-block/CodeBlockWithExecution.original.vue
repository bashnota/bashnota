<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useCodeExecution } from '@/features/editor/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { KernelConfig, KernelSpec, JupyterServer } from '@/features/jupyter/types/jupyter'
import { useCodeBlockToolbar } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockToolbar'
import { useCodeBlockShortcuts } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockShortcuts'
import { logger } from '@/services/logger'
import {
  Copy,
  Check,
  Play,
  Loader2,
  Plus,
  Server,
  Layers,
  Box,
  Eye,
  EyeOff,
  Maximize2,
  AlertTriangle,
  Save,
  Cpu,
  RotateCw,
  Trash2,
  Link2,
  Brain,
  Sparkles,
  Code,
  FileText,
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import CodeMirror from '@/features/editor/components/blocks/executable-code-block/CodeMirror.vue'
import Popover from '@/ui/popover/Popover.vue'
import PopoverTrigger from '@/ui/popover/PopoverTrigger.vue'
import PopoverContent from '@/ui/popover/PopoverContent.vue'
import FullScreenCodeBlock from '@/features/editor/components/blocks/executable-code-block/FullScreenCodeBlock.vue'
import CustomSelect from '@/ui/CustomSelect.vue'
import OutputRenderer from '@/features/editor/components/blocks/executable-code-block/OutputRenderer.vue'
import ExecutionStatus from '@/features/editor/components/blocks/executable-code-block/ExecutionStatus.vue'
import ErrorDisplay from '@/features/editor/components/blocks/executable-code-block/ErrorDisplay.vue'
import { useOutputStreaming } from '@/features/editor/components/blocks/executable-code-block/composables/useOutputStreaming'
import TemplateSelector from '@/features/editor/components/blocks/executable-code-block/TemplateSelector.vue'
import AICodeAssistant from '@/features/editor/components/blocks/executable-code-block/AICodeAssistant.vue'
import { useAICodeAssistant } from '@/features/editor/components/blocks/executable-code-block/composables/useAICodeAssistant'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import { ButtonGroup } from '@/ui/button-group'

// Types
interface Props {
  code: string
  language: string
  id: string
  sessionId: string | null
  notaId: string
  kernelPreference?: KernelConfig | null
  isReadOnly?: boolean
  isExecuting?: boolean
  isPublished?: boolean
}

// Define props
const props = defineProps<Props>()

// Define emits with proper types
const emit = defineEmits<{
  'update:code': [code: string]
  'kernel-select': [kernelName: string, serverId: string]
  'update:output': [output: string]
  'update:session-id': [sessionId: string]
}>()

// Component refs
const codeBlockRef = ref<HTMLElement | null>(null)
const outputRendererRef = ref<InstanceType<typeof OutputRenderer> | null>(null)

// Cell state from code execution store
const { cell, copyOutput } = useCodeExecution(props.id)

// Initialize code block composables
const {
  // Toolbar state
  isServerOpen,
  isKernelOpen,
  isSessionOpen,
  isCodeVisible,
  selectedServer,
  selectedKernel,
  selectedSession,
  isSettingUp,
  
  // Methods
  handleServerSelect,
  handleKernelSelect,
  toggleCodeVisibility,
} = useCodeBlockToolbar({
  isReadOnly: props.isReadOnly,
  onServerSelect: (serverId: string) => emit('kernel-select', selectedKernel.value, serverId),
  onKernelSelect: (kernelName: string) => emit('kernel-select', kernelName, selectedServer.value),
  onSessionSelect: (sessionId: string) => emit('update:session-id', sessionId),
})

// Code state
const codeValue = ref(props.code)
const hasUnsavedChanges = ref(false)
const isFullScreen = ref(false)
const executionInProgress = ref(false)
const executionSuccess = ref(false)

// Add after other refs
const executionStartTime = ref<number | null>(null)
const executionTime = ref<number>(0)
const executionProgress = ref<number>(0)
const errorMessage = ref<string | null>(null)
const isCodeCopied = ref(false)

// Add new state for enhanced features
const isTemplateDialogOpen = ref(false)
const executionId = ref<string | null>(null)

// Initialize AI Code Assistant
const aiCodeAssistant = useAICodeAssistant(props.id, {
  autoAnalyzeErrors: true,
  enableQuickActions: true,
  enableCustomActions: true
})

// Keep AI Actions Store for feature flags
const aiActionsStore = useAIActionsStore()

// Initialize output streaming
const {
  startStreaming,
  stopStreaming,
  getFormattedOutput
} = useOutputStreaming(props.id)

// Function refs for keyboard shortcuts (will be assigned later)
const executeCodeRef = ref<(() => Promise<void>) | null>(null)
const handleCodeFormattedRef = ref<(() => void) | null>(null)

// Initialize keyboard shortcuts
const { shortcuts, getShortcutText } = useCodeBlockShortcuts({
  onExecute: () => {
    if (executeCodeRef.value && isReadyToExecute.value && !props.isReadOnly) {
      executeCodeRef.value()
    }
  },
  onToggleFullscreen: () => {
    isFullScreen.value = !isFullScreen.value
  },
  onFormatCode: () => {
    if (handleCodeFormattedRef.value && !props.isReadOnly) {
      handleCodeFormattedRef.value()
    }
  },
  isEnabled: () => {
    return !props.isReadOnly && !isTemplateDialogOpen.value
  }
})

// Enhanced readyToExecute with more visual feedback
const isReadyToExecute = computed(() => {
  // If currently executing, we're not ready
  if (props.isExecuting || executionInProgress.value) {
    return false;
  }
  
  // Always allow execution in shared mode
  if (isSharedSessionMode.value) {
    return true;
  }
  
  // In manual mode, require server and kernel
  return selectedServer.value && 
         selectedServer.value !== 'none' && 
         selectedKernel.value;
})

// New computed property for execution state classes
const codeBlockClasses = computed(() => {
  return { 
    'ring-2 ring-primary': hasUnsavedChanges.value, 
    'ring-2 ring-primary/40': isSharedSessionMode.value && cell?.value?.sessionId === sharedSessionId.value,
    'executing-block': props.isExecuting || executionInProgress.value,
    'error-block': cell?.value?.hasError,
    'published-block': props.isPublished,
  };
})

const availableServers = computed<JupyterServer[]>(() => {
  // Only use global Jupyter servers from jupyterStore
  return jupyterStore.jupyterServers || [];
})
const availableSessions = ref<Array<{ id: string; name: string; kernel: { name: string; id: string } }>>([])
const availableKernels = ref<Array<KernelSpec>>([])
const runningKernels = ref<Array<{
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}>>([])

// Stores
const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()
const jupyterStore = useJupyterStore()
const executionService = new CodeExecutionService()
const jupyterService = new JupyterService()

// Shared session mode
const isSharedSessionMode = computed(() => codeExecutionStore.sharedSessionMode)
const sharedSessionId = computed(() => codeExecutionStore.sharedSessionId)

// Utils
const showConsoleMessage = (
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning',
) => {
  const logPrefix = `[${type.toUpperCase()}] ${title}: `
  if (type === 'error') {
    logger.error(logPrefix, message)
  } else if (type === 'warning') {
    logger.warn(logPrefix, message)
  } else {
    logger.log(logPrefix, message)
  }
}

// Add this after component refs
const loadSavedPreferences = async () => {
  // If in shared session mode, check if we should use the shared session
  if (isSharedSessionMode.value && sharedSessionId.value) {
    const session = codeExecutionStore.kernelSessions.get(sharedSessionId.value)
    if (session) {
      selectedSession.value = sharedSessionId.value
      emit('update:session-id', sharedSessionId.value)
      
      // Get the session's server configuration
      if (session.serverConfig) {
        const serverId = `${session.serverConfig.ip}:${session.serverConfig.port}`
        handleServerSelect(serverId)
      }
      
      // Get the session's kernel name
      if (session.kernelName) {
        handleKernelSelect(session.kernelName)
      }
      
      showConsoleMessage('Info', `Using shared session for code block`, 'success')
      return
    }
  }

  // Otherwise, use individual preferences
  const currentNota = store.getCurrentNota(props.notaId)
  const preferences = currentNota?.config?.kernelPreferences?.[props.id]
  
  if (preferences?.serverId) {
    handleServerSelect(preferences.serverId)
  } else if (availableServers.value.length > 0) {
    // Auto-select first available server if no preference exists
    const firstServer = availableServers.value[0]
    const serverId = `${firstServer.ip}:${firstServer.port}`
    handleServerSelect(serverId)
    
    // Get kernels for this server
    try {
      const kernels = await jupyterService.getAvailableKernels(firstServer)
      availableKernels.value = kernels
      
      // Auto-select a kernel that matches the code block language if available
      let matchingKernel = kernels.find(k => k.spec.language?.toLowerCase() === props.language.toLowerCase())
      
      // If no exact language match, try to find a kernel that includes the language name
      if (!matchingKernel) {
        matchingKernel = kernels.find(k => 
          k.name.toLowerCase().includes(props.language.toLowerCase()) || 
          k.spec.display_name.toLowerCase().includes(props.language.toLowerCase())
        )
      }
      
      // If still no match, select the first Python kernel or just the first kernel
      if (!matchingKernel) {
        matchingKernel = kernels.find(k => 
          k.spec.language?.toLowerCase() === 'python' || 
          k.name.toLowerCase().includes('python')
        ) || kernels[0]
      }
      
      if (matchingKernel) {
        handleKernelSelect(matchingKernel.name)
        
        // Save this auto-selection as a preference
        store.updateNotaConfig(props.notaId, (config) => {
          if (!config.kernelPreferences) config.kernelPreferences = {}
          config.kernelPreferences[props.id] = {
            serverId,
            kernelName: matchingKernel.name,
            blockId: props.id,
            lastUsed: new Date().toISOString()
          }
        })
        
        showConsoleMessage('Info', `Auto-selected server ${serverId} with kernel ${matchingKernel.spec.display_name}`, 'success')
      }
    } catch (error) {
      logger.error('Failed to auto-select kernel:', error)
    }
  }
}

// Add this after loadSavedPreferences
const selectSession = async (sessionId: string) => {
  const session = availableSessions.value.find(s => s.id === sessionId)
  if (!session) return

  // Update session in store
  const server = availableServers.value.find((s: { ip: string, port: string }) => {
    const sessionServer = `${s.ip}:${s.port}`
    return sessionServer === selectedServer.value
  })
  
  if (server) {
    // First update the session
    selectedSession.value = sessionId
    emit('update:session-id', sessionId)
    
    // Then update the kernel to match the session's kernel
    handleKernelSelect(session.kernel.name)
    
    // Update the store
    const existingSession = codeExecutionStore.kernelSessions.get(sessionId)
    if (!existingSession) {
      // Create a new session entry in the store with required fields
      codeExecutionStore.kernelSessions.set(sessionId, {
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
  }
}

// Add this after selectSession function
const selectRunningKernel = async (kernelId: string) => {
  const kernel = runningKernels.value.find(k => k.id === kernelId)
  if (!kernel) return

  // Create a new session with this kernel
  isSettingUp.value = true
  try {
    const server = availableServers.value.find((s: { ip: string, port: string }) => `${s.ip}:${s.port}` === selectedServer.value)
    if (!server) throw new Error('Server not found')

    const sessionId = codeExecutionStore.createSession(`Session with ${kernel.name}`)
    
    // Update session in store
    const session = codeExecutionStore.kernelSessions.get(sessionId)
    if (session) {
      session.kernelId = kernelId
      session.serverConfig = server
      session.kernelName = kernel.name
      codeExecutionStore.kernelSessions.set(sessionId, { 
        ...session,
        cells: [] // Initialize with empty cells array
      })
    }
    
    selectedSession.value = sessionId
    selectedKernel.value = kernel.name
    emit('update:session-id', sessionId)
    isSessionOpen.value = false
    
    showConsoleMessage('Success', `Connected to running kernel: ${kernel.name}`, 'success')
  } catch (error) {
    logger.error('Failed to connect to kernel:', error)
    showConsoleMessage('Error', 'Failed to connect to kernel', 'error')
  } finally {
    isSettingUp.value = false
  }
}

// Update onMounted to load preferences
onMounted(async () => {
  await nextTick()
  
  // Ensure jupyterStore is loaded and refreshed
  await refreshJupyterServers()
  
  // Load shared session if in shared mode or individual preferences otherwise
  await loadSavedPreferences()
  
  // Assign functions to refs for keyboard shortcuts
  executeCodeRef.value = executeCodeBlock
  handleCodeFormattedRef.value = handleCodeFormatted
  
  // Initialization debugging
  logger.debug(`[CodeBlock ${props.id}] Mounted`, {
    isPublished: props.isPublished,
    readonly: props.isReadOnly,
    hasSessionId: !!props.sessionId,
  })
  
  // Check if we need to initialize execution state from store
  syncExecutionStateWithStore()
  
  if (codeBlockRef.value && !props.isReadOnly) {
    const editor = codeBlockRef.value.querySelector('.cm-editor')
    if (editor) {
      ;(editor as HTMLElement).focus()
    }
  }
})

// Add refresh method for servers
const refreshJupyterServers = async () => {
  // Make sure the jupyterStore has loaded its servers from local storage
  jupyterStore.loadServers()
  
  // Force reactivity update in case servers were modified externally
  await nextTick()
}

// Watchers
watch(() => props.code, (newCode) => {
  if (newCode !== codeValue.value) {
    updateCode(newCode)
  }
})

watch(
  () => cell.value?.output,
  (newOutput) => {
    if (!newOutput) return
    emit('update:output', newOutput)
  },
)

watch(
  () => props.sessionId,
  (newSessionId) => {
    if (newSessionId && newSessionId !== selectedSession.value) {
      selectedSession.value = newSessionId
    }
  },
)

// Watch for shared session mode changes
watch(
  () => isSharedSessionMode.value,
  async (newValue) => {
    if (newValue && sharedSessionId.value) {
      // When switching to shared mode, apply the shared session
      const session = codeExecutionStore.kernelSessions.get(sharedSessionId.value)
      if (session) {
        selectedSession.value = sharedSessionId.value
        emit('update:session-id', sharedSessionId.value)
        
        // Set server and kernel from the shared session
        if (session.serverConfig) {
          const serverId = `${session.serverConfig.ip}:${session.serverConfig.port}`
          handleServerSelect(serverId)
        }
        
        if (session.kernelName) {
          handleKernelSelect(session.kernelName)
        }
      }
    }
  }
)

const refreshSessionsAndKernels = async (server: JupyterServer) => {
  if (!server) return

  try {
    // Test server connection first
    const result = await jupyterService.testConnection(server)
    if (!result.success) {
      showConsoleMessage('Error', result.message || 'Server connection failed', 'error')
      availableSessions.value = []
      runningKernels.value = []
      return
    }
    
    // Get active sessions and running kernels
    const [sessions, kernels] = await Promise.all([
      jupyterService.getActiveSessions(server),
      jupyterService.getRunningKernels(server)
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
    await Promise.all(runningKernels.value.map(kernel => jupyterService.deleteKernel(server, kernel.id)))
    
    // Refresh the lists
    await refreshSessionsAndKernels(server)
    
    showConsoleMessage('Success', 'All kernels cleared successfully', 'success')
  } catch (error) {
    logger.error('Failed to clear kernels:', error)
    showConsoleMessage('Error', 'Failed to clear kernels', 'error')
  }
}

// Watch for server changes to fetch kernels and sessions
watch(selectedServer, async (newServer) => {
  if (!newServer || newServer === 'none') {
    availableKernels.value = []
    availableSessions.value = []
    runningKernels.value = []
    return
  }
  
  const server = availableServers.value.find(
    (s: { ip: string, port: string }) => `${s.ip}:${s.port}` === newServer
  )
  if (server) {
    try {
      // Get kernelspecs from server
      const kernels = await jupyterService.getAvailableKernels(server)
      availableKernels.value = kernels
      
      // Get active sessions and running kernels
      await refreshSessionsAndKernels(server)

      // If there's a kernel preference for this block, select it
      if (props.kernelPreference?.kernelName && props.kernelPreference.serverId === newServer) {
        selectedKernel.value = props.kernelPreference.kernelName
      } else if (kernels.length > 0) {
        // Select first available kernel that matches the language
        const matchingKernel = kernels.find(k => k.spec.language === props.language)
        if (matchingKernel) {
          selectedKernel.value = matchingKernel.name
        }
      }

      // Save server and kernel preference (only when not in shared mode)
      if (!isSharedSessionMode.value) {
        store.updateNotaConfig(props.notaId, (config) => {
          if (!config.kernelPreferences) config.kernelPreferences = {}
          config.kernelPreferences[props.id] = {
            serverId: newServer,
            kernelName: selectedKernel.value,
            blockId: props.id,
            lastUsed: new Date().toISOString()
          }
        })
      }
    } catch (error) {
      logger.error('Failed to fetch kernels/sessions:', error)
      showConsoleMessage('Error', 'Failed to fetch kernels/sessions', 'error')
    }
  }
})

// Watch for kernel changes to save preference
watch(selectedKernel, async (newKernel) => {
  if (newKernel && selectedServer.value && selectedServer.value !== 'none' && !isSharedSessionMode.value) {
    store.updateNotaConfig(props.notaId, (config) => {
      if (!config.kernelPreferences) config.kernelPreferences = {}
      config.kernelPreferences[props.id] = {
        serverId: selectedServer.value,
        kernelName: newKernel,
        blockId: props.id,
        lastUsed: new Date().toISOString()
      }
    })
  }
})

// Watch for server open
watch(isServerOpen, async (isOpen) => {
  if (isOpen) {
    // Refresh servers list when dropdown is opened
    await refreshJupyterServers();
  }
});

// Template helpers
const handleServerChange = async (value: string) => {
  handleServerSelect(value)
  isServerOpen.value = false
  isKernelOpen.value = true // Automatically open kernel selector after server selection
  
  // Only store minimal server reference in kernel preferences if not in shared mode
  if (!isSharedSessionMode.value) {
    store.updateNotaConfig(props.notaId, (config) => {
      if (!config.kernelPreferences) config.kernelPreferences = {}
      if (!config.kernelPreferences[props.id]) {
        config.kernelPreferences[props.id] = {
          serverId: value, // Store just the server ID reference, not the server details
          kernelName: selectedKernel.value,
          blockId: props.id,
          lastUsed: new Date().toISOString()
        }
      } else {
        config.kernelPreferences[props.id].serverId = value
        config.kernelPreferences[props.id].lastUsed = new Date().toISOString()
      }
    })
  }
}

const handleKernelChange = (value: string) => {
  handleKernelSelect(value)
  isKernelOpen.value = false
}

const handleSessionChange = (value: string) => {
  selectSession(value)
  isSessionOpen.value = false
}

// Methods
const createNewSession = async () => {
  if (!selectedServer.value || selectedServer.value === 'none' || !selectedKernel.value) {
    showConsoleMessage('Error', 'Please select a server and kernel first', 'error')
    return
  }

  isSettingUp.value = true
  try {
    const sessionId = codeExecutionStore.createSession(`Session ${availableSessions.value.length + 1}`)
    const server = availableServers.value.find((s: { ip: string, port: string }) => `${s.ip}:${s.port}` === selectedServer.value)
    if (!server) throw new Error('Server not found')
    
    // Create kernel using executionService
    const kernelId = await executionService.createKernel(server, selectedKernel.value)
    
    // Update session in store
    const session = codeExecutionStore.kernelSessions.get(sessionId)
    if (session) {
      session.kernelId = kernelId
      session.serverConfig = server
      session.kernelName = selectedKernel.value
      codeExecutionStore.kernelSessions.set(sessionId, { ...session })
    }
    
    selectedSession.value = sessionId
    emit('update:session-id', sessionId)
    isSessionOpen.value = false
    
    // If this is in shared mode and we created a new session, set it as the shared session
    if (isSharedSessionMode.value) {
      codeExecutionStore.sharedSessionId = sessionId
    }
    
    // Refresh sessions list
    const sessions = await jupyterService.getActiveSessions(server)
    availableSessions.value = sessions
  } catch (error) {
    logger.error('Failed to create session:', error)
    showConsoleMessage('Error', 'Failed to create session', 'error')
  } finally {
    isSettingUp.value = false
  }
}

// Enhanced execution with streaming
const executeCodeBlock = async () => {
  if (!isReadyToExecute.value) return

  executionInProgress.value = true
  executionStartTime.value = Date.now()
  executionTime.value = 0
  errorMessage.value = null

  try {
    // Generate execution ID for streaming
    executionId.value = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    // Start output streaming
    startStreaming(executionId.value)
    
    // Execute the code using the store
    await codeExecutionStore.executeCell(props.id)
    
    // Get result from cell
    if (cell.value?.output) {
      emit('update:output', cell.value.output)
    }
    
    // Get streaming output if available
    const streamingOutput = getFormattedOutput()
    if (streamingOutput.error) {
      errorMessage.value = streamingOutput.error
    }
    
    executionSuccess.value = !cell.value?.hasError
    
    // 🔥 NEW: Auto-trigger AI error analysis if enabled and execution failed
    if (cell.value?.hasError && aiActionsStore.state.errorTriggerConfig.autoTrigger) {
      await triggerAutoErrorAnalysis()
    }
    
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Execution failed'
    logger.error('Code execution failed:', error)
    
    // 🔥 NEW: Auto-trigger AI error analysis for caught exceptions
    if (aiActionsStore.state.errorTriggerConfig.autoTrigger) {
      await triggerAutoErrorAnalysis(error instanceof Error ? error.message : 'Execution failed')
    }
  } finally {
    executionInProgress.value = false
    stopStreaming()
    
    // Calculate final execution time
    if (executionStartTime.value > 0) {
      executionTime.value = Date.now() - executionStartTime.value
    }
  }
}

// Create executeCode alias for template compatibility
const executeCode = executeCodeBlock

// Template handling
const handleTemplateSelected = (templateCode: string) => {
  // Replace current code with template
  emit('update:code', templateCode)
  isTemplateDialogOpen.value = false
}

const showTemplateDialog = () => {
  isTemplateDialogOpen.value = true
}

// AI Features methods
const toggleAIFeatures = () => {
  aiCodeAssistant.toggleVisibility()
}

const handleAICodeUpdate = (newCode: string) => {
  updateCode(newCode)
}

const handleCustomActionExecuted = (actionId: string, result: string) => {
  logger.debug(`Custom action ${actionId} executed with result length: ${result.length}`)
  
  // 🔥 NEW: Enhanced result handling for better feedback
  if (actionId === 'fix-error' && result) {
    // Show AI suggestion in a more prominent way
    logger.info('AI Error Fix Suggestion:', result)
  }
}

// 🔥 NEW: Auto error analysis trigger
const triggerAutoErrorAnalysis = async (customError?: string) => {
  try {
    const error = customError || cell.value?.output || errorMessage.value
    if (!error || !props.code.trim()) return
    
    logger.info('🤖 Triggering automatic AI error analysis...')
    
    // Enhanced execution context for better AI analysis
    const executionContext = {
      code: props.code,
      language: props.language,
      error: error,
      // 🔥 NEW: Rich execution context
      executionTime: executionTime.value,
      sessionId: selectedSession.value,
      kernelName: selectedKernel.value,
      hasOutput: !!cell.value?.output,
      cellOutput: cell.value?.output
    }
    
    // Auto-run fix-error action if enabled  
    if (aiActionsStore.state.errorTriggerConfig.showQuickFix) {
      await aiCodeAssistant.analyzeError(props.code, props.language, error, executionContext)
    }
    
    // Show AI assistant if not already visible
    if (!aiCodeAssistant.isVisible.value) {
      aiCodeAssistant.toggleVisibility()
    }
    
  } catch (analysisError) {
    logger.error('Auto error analysis failed:', analysisError)
  }
}

const handleErrorDismissed = () => {
  errorMessage.value = null
}

// Enhanced code formatting
const handleCodeFormatted = () => {
  // Code was formatted, could trigger auto-save or other actions
  logger.debug('Code formatted successfully')
}

const updateCode = (newCode: string) => {
  codeValue.value = newCode
  hasUnsavedChanges.value = true
  emit('update:code', newCode)
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(codeValue.value)
    isCodeCopied.value = true
    setTimeout(() => {
      isCodeCopied.value = false
    }, 2000)
  } catch (error) {
    logger.error('Failed to copy code:', error)
  }
}

const saveChanges = () => {
  hasUnsavedChanges.value = false
  emit('update:code', codeValue.value)
}

const syncExecutionStateWithStore = () => {
  if (cell.value) {
    const storeState = !!cell.value.isExecuting

    // In published mode, always ensure execution state is false regardless of store
    if (props.isPublished) {
      logger.debug(`[CodeBlock ${props.id}] Published mode detected, forcing execution state to false`)
      executionInProgress.value = false
      return
    }
    
    // If store state is different from local state, log it
    if (storeState !== executionInProgress.value) {
      logger.debug(`[CodeBlock ${props.id}] Store execution state (${storeState}) differs from local state (${executionInProgress.value})`)
      
      // Update local state to match store (only when not in published mode)
      executionInProgress.value = storeState
    }
  }
}

// Watch for changes to the cell in the store to update local execution state
watch(cell, () => {
  syncExecutionStateWithStore()
}, { deep: true })

// Add after other computed properties
const currentExecutionTime = computed(() => {
  if (props.isExecuting || executionInProgress.value) {
    return executionTime.value
  }
  return 0
})

const runningStatus = computed(() => {
  if (props.isExecuting || executionInProgress.value) return 'running'
  if (cell?.value?.hasError) return 'error'
  if (executionSuccess.value) return 'success'
  return 'idle'
})

// State for output/AI view toggle
const activeOutputView = ref<'output' | 'ai'>('output')

// State for showing/hiding toolbar buttons
const showToolbar = ref(false)
const isHovered = ref(false)

// Auto-switch to AI view when there's an error
watch(() => cell?.value?.hasError, (hasError) => {
  if (hasError && !props.isReadOnly && !props.isPublished) {
    activeOutputView.value = 'ai'
  }
}, { immediate: true })
</script>

<template>
  <div
    ref="codeBlockRef"
    class="flex flex-col bg-card text-card-foreground rounded-lg overflow-hidden border shadow-sm transition-all duration-200 group hover:shadow-md relative"
    :class="codeBlockClasses"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Status indicator bar (minimal - only when needed) -->
    <div
      v-if="(isExecuting || cell?.isExecuting || cell?.hasError) && !isPublished"
      class="flex items-center px-3 py-1.5 bg-muted/20 border-b"
    >
      <!-- Execution status indicator -->
      <div
        v-if="(isExecuting || cell?.isExecuting) && !isPublished"
        class="flex items-center text-xs gap-1 px-2 py-1 rounded-full status-running"
      >
        <Loader2 class="h-3 w-3 animate-spin" />
        <span>Running</span>
      </div>
      
      <!-- Error indicator -->
      <div
        v-else-if="cell?.hasError && !isPublished"
        class="flex items-center text-xs gap-1 px-2 py-1 rounded-full status-error"
      >
        <AlertTriangle class="h-3 w-3" />
        <span>Error</span>
      </div>
    </div>

    <!-- Subtle hover hint (when toolbar is hidden) -->
    <div
      v-if="!isHovered && !showToolbar && !isReadOnly"
      class="absolute top-2 right-2 opacity-30 hover:opacity-70 transition-opacity duration-200 pointer-events-none"
    >
      <div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
    </div>

    <!-- Main toolbar (shows on hover) -->
    <div
      v-if="isHovered || showToolbar"
      class="flex flex-wrap items-center gap-2 p-2 border-b bg-background/95 backdrop-blur transition-all duration-200"
    >
      <!-- Left toolbar group -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Primary Action Group -->
        <ButtonGroup>
          <Button
            v-if="!isReadOnly"
            variant="default"
            size="sm"
            @click="executeCode"
            class="h-7 px-3 text-xs"
            :disabled="!isReadyToExecute"
            :title="isExecuting || cell?.isExecuting ? 'Executing...' : 'Run Code'"
          >
            <Loader2 class="w-3 h-3 animate-spin mr-1" v-if="isExecuting || cell?.isExecuting" />
            <Play class="w-3 h-3 mr-1" v-else />
            {{ isExecuting || cell?.isExecuting ? 'Running' : 'Run' }}
          </Button>

          <!-- Toolbar toggle button -->
          <Button
            variant="outline"
            size="sm"
            @click="showToolbar = !showToolbar"
            class="h-7 w-7 p-0"
            :class="{ 'bg-muted': showToolbar }"
            title="Pin toolbar"
          >
            <Sparkles class="h-3 w-3" />
          </Button>
        </ButtonGroup>

        <!-- Session Management Group -->
        <template v-if="!isReadOnly">
          <ButtonGroup>
            <!-- Session Selector -->
            <Popover v-model:open="isSessionOpen">
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs px-2"
                  :class="{ 
                    'bg-warning/20 hover:bg-warning/30': !selectedSession,
                    'bg-primary/20 hover:bg-primary/30': isSharedSessionMode && selectedSession,
                    'opacity-70': isExecuting
                  }"
                  :title="isSharedSessionMode ? 'Using shared session mode' : selectedSession ? `Current Session: ${availableSessions.find(s => s.id === selectedSession)?.name || selectedSession}` : 'Select Session'"
                  :disabled="isSharedSessionMode || isExecuting"
                >
                  <Layers class="h-3 w-3 mr-1" v-if="!isSharedSessionMode" />
                  <Link2 class="h-3 w-3 mr-1" v-else />
                  <span class="max-w-[60px] truncate" v-if="selectedSession">
                    {{ isSharedSessionMode ? 'Shared' : availableSessions.find(s => s.id === selectedSession)?.name || selectedSession }}
                  </span>
                  <span v-else>Session</span>
                </Button>
              </PopoverTrigger>
                <!-- Keep existing PopoverContent -->
                <PopoverContent
                  class="w-[300px] p-0"
                  align="start"
                  :side="'bottom'"
                  description="Select or create a new session for code execution"
                >
                  <div class="p-2 text-xs font-medium text-muted-foreground flex justify-between items-center">
                    <span>Sessions and Running Kernels</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-0"
                      @click="() => {
                        const server = availableServers.find(s => `${s.ip}:${s.port}` === selectedServer)
                        if (server) refreshSessionsAndKernels(server)
                      }"
                      :disabled="!selectedServer || selectedServer === 'none'"
                      title="Refresh sessions and kernels"
                    >
                      <RotateCw class="h-3 w-3" />
                    </Button>
                  </div>
                  <div class="p-1 border-t">
                    <div class="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        class="flex-1 gap-2 h-8"
                        @click="createNewSession"
                        :disabled="isSettingUp || !selectedServer || !selectedKernel"
                      >
                        <Loader2 v-if="isSettingUp" class="h-3 w-3 animate-spin" />
                        <Plus v-else class="h-4 w-4" />
                        New Session
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        class="flex-1 gap-2 h-8"
                        @click="() => {
                          const server = availableServers.find(s => `${s.ip}:${s.port}` === selectedServer)
                          if (server) clearAllKernels(server)
                        }"
                        :disabled="!selectedServer || selectedServer === 'none' || runningKernels.length === 0"
                        title="Clear all running kernels"
                      >
                        <Trash2 class="h-4 w-4" />
                        Clear All Kernels
                      </Button>
                    </div>
                  </div>
                  <div class="max-h-[300px] overflow-y-auto">
                    <!-- Active Sessions -->
                    <div v-if="availableSessions.length > 0">
                      <div class="px-2 py-1 text-xs font-medium text-muted-foreground bg-accent/50">
                        Active Sessions
                      </div>
                      <div class="divide-y">
                        <div
                          v-for="session in availableSessions"
                          :key="session.id"
                          class="p-2 hover:bg-accent cursor-pointer"
                          @click="handleSessionChange(session.id)"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex-1">
                              <div class="font-medium text-sm">
                                {{ session.name || session.id }}
                              </div>
                              <div class="text-xs text-muted-foreground">
                                Kernel: {{ session.kernel.name }}
                              </div>
                            </div>
                            <div v-if="selectedSession === session.id" class="text-primary">
                              <Check class="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Running Kernels -->
                    <div v-if="runningKernels.length > 0">
                      <div class="px-2 py-1 text-xs font-medium text-muted-foreground bg-accent/50">
                        Running Kernels
                      </div>
                      <div class="divide-y">
                        <div
                          v-for="kernel in runningKernels"
                          :key="kernel.id"
                          class="p-2 hover:bg-accent cursor-pointer"
                          @click="selectRunningKernel(kernel.id)"
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <Cpu class="w-4 h-4" :class="{
                                  'text-green-500': kernel.executionState === 'idle',
                                  'text-yellow-500': kernel.executionState === 'busy',
                                  'text-blue-500': kernel.executionState === 'starting'
                                }" />
                                <div class="font-medium text-sm">
                                  {{ kernel.name }}
                                </div>
                              </div>
                              <div class="text-xs text-muted-foreground mt-1">
                                <span class="capitalize">{{ kernel.executionState || 'unknown' }}</span>
                                <span v-if="kernel.connections"> • {{ kernel.connections }} connection(s)</span>
                                <span> • Last activity {{ new Date(kernel.lastActivity).toLocaleString() }}</span>
                              </div>
                              <div class="text-xs text-muted-foreground">
                                ID: {{ kernel.id }}
                              </div>
                            </div>
                            <div v-if="selectedSession && codeExecutionStore.kernelSessions.get(selectedSession)?.kernelId === kernel.id" class="text-primary">
                              <Check class="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- No Sessions/Kernels Message -->
                    <div 
                      v-if="availableSessions.length === 0 && runningKernels.length === 0" 
                      class="p-3 text-sm text-center text-muted-foreground"
                    >
                      No active sessions or running kernels. Create a new session to start.
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <!-- Server & Kernel Selector -->
              <Popover v-model:open="isServerOpen">
                <PopoverTrigger as-child>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs px-2"
                    :class="{
                      'bg-warning/20 hover:bg-warning/30':
                        !selectedServer || selectedServer === 'none' || !selectedKernel || selectedKernel === 'none',
                      'bg-primary/20 hover:bg-primary/30': isSharedSessionMode,
                      'opacity-70': isExecuting
                    }"
                    :title="
                      isSharedSessionMode
                        ? 'Using shared server & kernel'
                        : selectedServer && selectedServer !== 'none' && selectedKernel && selectedKernel !== 'none'
                          ? `${selectedServer} - ${selectedKernel}`
                          : 'Select Server & Kernel'
                    "
                    :disabled="isSharedSessionMode || isExecuting"
                  >
                    <Server class="h-3 w-3 mr-1" />
                    <span class="max-w-[60px] truncate">
                      {{ selectedServer && selectedServer !== 'none' ? selectedServer.split(':')[0] : 'Server' }}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  class="w-[300px] p-0"
                  align="start"
                  :side="'bottom'"
                  description="Select a Jupyter server and kernel for code execution"
                >
                  <div class="p-2 text-xs font-medium text-muted-foreground">
                    Select a server and kernel for code execution
                  </div>
                  <div class="border-t p-2">
                    <div class="mb-2">
                      <div class="text-xs font-medium mb-1">Server</div>
                      <CustomSelect
                        :options="
                          availableServers.map(server => ({
                            value: `${server.ip}:${server.port}`,
                            label: `${server.ip}:${server.port}`,
                          }))
                        "
                        :model-value="selectedServer"
                        placeholder="Search servers..."
                        :searchable="true"
                        @select="handleServerChange"
                      />
                    </div>
                    <div>
                      <div class="text-xs font-medium mb-1">Kernel</div>
                      <CustomSelect
                        :options="availableKernels.map((kernel) => ({
                          value: kernel.name,
                          label: kernel.spec.display_name || kernel.name
                        }))"
                        :model-value="selectedKernel"
                        placeholder="Search kernels..."
                        :searchable="true"
                        :disabled="!selectedServer || selectedServer === 'none'"
                        @select="handleKernelChange"
                      />
                    </div>
                  </div>
                  <div
                    v-if="availableServers.length === 0"
                    class="p-3 text-sm text-center text-muted-foreground"
                  >
                    No servers available. Configure servers in the settings.
                  </div>
                  <div
                    v-else-if="selectedServer && selectedServer !== 'none' && availableKernels.length === 0"
                    class="p-3 text-sm text-center text-muted-foreground"
                  >
                    No kernels available on the selected server.
                  </div>
                </PopoverContent>
              </Popover>
            </ButtonGroup>
          </template>
        </div>

        <div class="flex-1"></div>

        <!-- Right side utility buttons -->
        <div class="flex items-center gap-2">
          <!-- View Controls Group -->
          <ButtonGroup>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              @click="toggleCodeVisibility"
              :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
            >
              <Eye v-if="!isCodeVisible" class="h-3 w-3" />
              <EyeOff v-else class="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0"
              @click="isFullScreen = true"
              title="Full Screen Mode"
              :disabled="isExecuting && !isPublished"
            >
              <Maximize2 class="h-3 w-3" />
            </Button>
          </ButtonGroup>

          <!-- Code Tools Group -->
          <ButtonGroup v-if="!isReadOnly">
            <Button
              variant="ghost"
              size="sm"
              @click="handleCodeFormatted"
              class="h-7 px-2 text-xs"
              title="Format code"
              :disabled="isExecuting"
            >
              <Code class="h-3 w-3 mr-1" />
              Format
            </Button>

            <Button
              variant="ghost"
              size="sm"
              @click="showTemplateDialog"
              class="h-7 px-2 text-xs"
              title="Insert template"
              :disabled="isExecuting"
            >
              <FileText class="h-3 w-3 mr-1" />
              Templates
            </Button>
          </ButtonGroup>

          <!-- Action Controls Group -->
          <ButtonGroup>
            <Button
              variant="ghost"
              size="sm"
              @click="copyCode"
              class="h-7 w-7 p-0"
              title="Copy code"
            >
              <Copy v-if="!isCodeCopied" class="h-3 w-3" />
              <Check v-else class="h-3 w-3" />
            </Button>

            <Button
              v-if="!isReadOnly && hasUnsavedChanges && !isExecuting"
              variant="ghost"
              size="sm"
              @click="saveChanges"
              class="h-7 w-7 p-0"
              title="Save changes"
            >
              <Save class="w-3 h-3" />
            </Button>
          </ButtonGroup>
        </div>
      </div>

    <!-- Warning Banner (hidden in readonly and public mode) -->
    <div
      v-if="
        !isReadOnly &&
        !isPublished &&
        !isSharedSessionMode && 
        !isExecuting &&
        (!selectedServer ||
          selectedServer === 'none' ||
          !selectedKernel ||
          selectedKernel === 'none')
      "
      class="border-b px-3 py-2 flex items-center text-xs status-warning"
    >
      <AlertTriangle class="h-3 w-3 mr-2" />
      <span v-if="!selectedServer || selectedServer === 'none'">
        Select a server to run this code block
      </span>
      <span v-else-if="!selectedKernel || selectedKernel === 'none'">
        Select a kernel to run this code block
      </span>
    </div>
    
    <!-- Shared Mode Info Banner - hidden in public mode -->
    <div
      v-else-if="!isReadOnly && !isPublished && isSharedSessionMode && !selectedSession && !isExecuting"
      class="border-b px-3 py-2 flex items-center text-xs status-running"
    >
      <Link2 class="h-3 w-3 mr-2" />
      <span>
        Using shared kernel mode. Press Run to automatically join the shared session.
      </span>
    </div>

    <!-- Code Editor with cleaner markdown-like appearance -->
    <div v-show="isCodeVisible" class="relative">
      <!-- Floating action buttons overlay (only visible on hover) -->
      <div class="absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <ButtonGroup class="btn-group-tight">
          <Button
            variant="secondary"
            size="sm"
            @click="copyCode"
            class="h-6 w-6 p-0 shadow-sm"
            title="Copy code to clipboard"
          >
            <Copy v-if="!isCodeCopied" class="h-3 w-3" />
            <Check v-else class="h-3 w-3 text-success" />
          </Button>
        </ButtonGroup>
      </div>

      <!-- Code editor with minimal styling -->
      <div class="code-editor-wrapper">
        <CodeMirror
          :model-value="codeValue"
          :language="props.language"
          :readonly="props.isReadOnly"
          :running-status="runningStatus"
          :is-published="props.isPublished"
          :auto-format="true"
          :show-template-button="false"
          :show-formatting-toolbar="false"
          @update:model-value="updateCode"
          @format-code="handleCodeFormatted"
          @show-templates="showTemplateDialog"
        />
      </div>
    </div>

    <!-- Enhanced Output/AI Section -->
    <div v-if="cell?.output || (!isReadOnly && !isPublished)" class="border-t bg-muted/20">
      <!-- Output/AI Toggle Header -->
      <div class="flex items-center justify-between px-4 py-2 border-b bg-background/50">
        <div class="flex items-center gap-2">
          <!-- Toggle Tabs -->
          <div class="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              @click="activeOutputView = 'output'"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                activeOutputView === 'output' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              ]"
              :disabled="!cell?.output"
            >
              <Box class="w-4 h-4" />
              Output
              <div v-if="cell?.hasError" class="w-2 h-2 bg-destructive rounded-full"></div>
              <div v-else-if="cell?.output" class="w-2 h-2 bg-green-500 rounded-full"></div>
            </button>
            
            <button
              v-if="!isReadOnly && !isPublished"
              @click="activeOutputView = 'ai'"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                activeOutputView === 'ai' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              <Brain class="w-4 h-4" />
              AI Assistant
              <div v-if="cell?.hasError" class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            </button>
          </div>
          
          <!-- Status Indicator -->
          <div v-if="activeOutputView === 'output' && cell?.output" class="text-xs text-muted-foreground">
            {{ cell?.hasError ? 'Error Output' : 'Execution Result' }}
          </div>
          <div v-else-if="activeOutputView === 'ai'" class="text-xs text-muted-foreground">
            AI-powered code analysis and suggestions
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-1">
          <Button
            v-if="activeOutputView === 'output' && cell?.output"
            variant="ghost"
            size="sm"
            @click="copyOutput"
            class="h-8 px-2"
          >
            <Copy class="w-4 h-4" />
          </Button>
          
          <!-- AI Quick Actions -->
          <div v-if="activeOutputView === 'ai' && !isReadOnly" class="flex items-center gap-1">
            <Button
              v-if="cell?.hasError"
              variant="ghost"
              size="sm"
              @click="() => {
                activeOutputView = 'ai'
                // Auto-switch to error view when clicking Fix Error
              }"
              class="h-8 px-2 text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle class="w-4 h-4 mr-1" />
              Fix Error
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              @click="() => {
                activeOutputView = 'ai'
                // Auto-switch to AI view for analysis
              }"
              class="h-8 px-2"
            >
              <Sparkles class="w-4 h-4 mr-1" />
              Analyze
            </Button>
          </div>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="min-h-[200px] max-h-[400px] overflow-hidden">
        <!-- Output Renderer -->
        <div v-if="activeOutputView === 'output'" class="h-full">
          <OutputRenderer
            v-if="cell?.output"
            ref="outputRendererRef"
            :content="cell.output"
            :type="cell?.hasError ? 'error' : undefined"
            :showControls="false"
            :isCollapsible="false"
            :maxHeight="'400px'"
            :isLoading="isExecuting && !isPublished"
            :originalCode="codeValue"
            :isPublished="isPublished"
            :notaId="props.notaId"
            :blockId="props.id"
            @copy="copyOutput"
          />
          <div v-else class="flex items-center justify-center h-48 text-muted-foreground">
            <div class="text-center">
              <Box class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p class="text-sm">No output yet</p>
              <p class="text-xs mt-1">Run the code to see results</p>
            </div>
          </div>
        </div>
        
        <!-- AI Assistant -->
        <div v-else-if="activeOutputView === 'ai'" class="h-full">
          <AICodeAssistant
            ref="aiAssistantRef"
            :code="codeValue"
            :language="props.language"
            :error="cell?.hasError ? cell?.output : null"
            :is-read-only="props.isReadOnly"
            :block-id="props.id"
            :is-executing="props.isExecuting || executionInProgress"
            :execution-time="executionTime"
            :has-output="!!cell?.output"
            :session-info="{
              sessionId: selectedSession,
              kernelName: selectedKernel
            }"
            :embedded-mode="true"
            @code-updated="handleAICodeUpdate"
            @analysis-started="() => {}"
            @analysis-completed="() => {}"
            @action-executed="handleCustomActionExecuted"
            @trigger-execution="executeCode"
            @request-execution-context="() => logger.debug('Execution context requested')"
          />
        </div>
      </div>
    </div>

    <!-- Fullscreen Modal -->
    <FullScreenCodeBlock
      v-if="isFullScreen"
      v-model:code="codeValue"
      :output="cell?.output || null"
      :outputType="cell?.hasError ? 'error' : undefined"
      :language="language"
      v-model:isOpen="isFullScreen"
      :is-executing="isExecuting && !isPublished"
      :is-read-only="isReadOnly"
      :is-published="isPublished"
      :block-id="props.id"
      :nota-id="props.notaId"
      :session-info="{
        sessionId: selectedSession,
        kernelName: selectedKernel
      }"
      @execute="executeCode"
    />

    <ExecutionStatus
      v-if="!isPublished"
      :status="runningStatus"
      :execution-time="currentExecutionTime"
      :progress="executionProgress"
    />

    <ErrorDisplay
      v-if="errorMessage && !isPublished"
      :error="errorMessage"
      :code="codeValue"
      @retry="executeCode"
    />

    <!-- Template Dialog -->
    <TemplateSelector
      :language="props.language"
      :is-open="isTemplateDialogOpen"
      @update:is-open="(value) => isTemplateDialogOpen = value"
      @template-selected="handleTemplateSelected"
    />
  </div>
</template>

<style scoped>
.cmd-group {
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.cmd-item {
  position: relative;
  display: flex;
  cursor: pointer;
  user-select: none;
  align-items: center;
  border-radius: calc(var(--radius) - 2px);
  padding: 0.375rem 0.5rem 0.375rem 0.5rem;
  font-size: 0.875rem;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.cmd-item:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.cmd-item[data-disabled] {
  pointer-events: none;
  opacity: 0.5;
}

.cmd-empty {
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

div[v-html] {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.5) transparent;
  word-break: break-word;
}

div[v-html]::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

div[v-html]::-webkit-scrollbar-track {
  background: transparent;
}

div[v-html]::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.5);
  border-radius: calc(var(--radius) / 2);
}

@media (max-width: 640px) {
  .flex-wrap {
    flex-wrap: wrap;
  }
}

/* Improved code editor styling for markdown-like appearance */
.code-editor-wrapper {
  background: hsl(var(--muted) / 0.3);
  border-radius: var(--radius);
  padding: 1rem;
  font-family: 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  border: 1px solid hsl(var(--border));
  position: relative;
}

/* Remove the heavy box styling from the container */
.group {
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  box-shadow: 0 1px 3px 0 hsl(var(--ring) / 0.1), 0 1px 2px -1px hsl(var(--ring) / 0.1);
  transition: all 0.2s ease;
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
}

.group:hover {
  box-shadow: 0 4px 6px -1px hsl(var(--ring) / 0.1), 0 2px 4px -2px hsl(var(--ring) / 0.1);
}

/* Enhance styles for different states */
.executing-block {
  border-color: hsl(var(--primary) / 0.3);
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.1);
}

.error-block {
  border-color: hsl(var(--destructive) / 0.3);
  box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.1);
}

.published-block {
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px 0 hsl(var(--ring) / 0.1), 0 1px 2px -1px hsl(var(--ring) / 0.1);
}

/* Smooth transitions */
.flex-col {
  transition: all 0.3s ease;
}

/* Ensure proper CodeMirror styling */
:deep(.cm-editor) {
  height: 100%;
  overflow: hidden;
  background: transparent;
  border: none;
}

:deep(.cm-scroller) {
  overflow: auto;
  padding: 0;
  font-family: inherit;
}

:deep(.cm-content) {
  padding: 0;
  min-height: 120px;
}

:deep(.cm-focused) {
  outline: none;
}

/* Language indicator styling */
.language-indicator {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Status indicators using CSS variables */
.status-running {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.status-error {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.status-success {
  background-color: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-warning {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

/* Button group spacing override for tighter groups */
.btn-group-tight > :deep(button) {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.btn-group-tight > :deep(button:not(:first-child)) {
  margin-left: -1px;
}
</style>








