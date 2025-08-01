import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useCodeExecution } from '@/features/editor/composables/useCodeExecution'
import { useCodeBlockToolbar } from './useCodeBlockToolbar'
import { useCodeBlockShortcuts } from './useCodeBlockShortcuts'
import { useOutputStreaming } from './useOutputStreaming'
import { useAICodeAssistant } from './useAICodeAssistant'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import { logger } from '@/services/logger'
import type { KernelConfig, KernelSpec, JupyterServer } from '@/features/jupyter/types/jupyter'

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

export function useCodeBlockState(props: Props, emit: any) {
  // Component refs
  const codeBlockRef = ref<HTMLElement | null>(null)
  const outputRendererRef = ref<InstanceType<any> | null>(null)

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

  // Execution state
  const executionStartTime = ref<number | null>(null)
  const executionTime = ref<number>(0)
  const executionProgress = ref<number>(0)
  const errorMessage = ref<string | null>(null)
  const isCodeCopied = ref(false)

  // Enhanced features state
  const isTemplateDialogOpen = ref(false)
  const executionId = ref<string | null>(null)

  // UI state
  const activeOutputView = ref<'output' | 'ai'>('output')
  const showToolbar = ref(false)
  const isHovered = ref(false)

  // Initialize AI Code Assistant
  const aiCodeAssistant = useAICodeAssistant(props.id, {
    autoAnalyzeErrors: true,
    enableQuickActions: true,
    enableCustomActions: true
  })

  // Initialize stores
  const aiActionsStore = useAIActionsStore()
  const store = useNotaStore()
  const codeExecutionStore = useCodeExecutionStore()
  const jupyterStore = useJupyterStore()
  const executionService = new CodeExecutionService()
  const jupyterService = new JupyterService()

  // Initialize output streaming
  const {
    startStreaming,
    stopStreaming,
    getFormattedOutput
  } = useOutputStreaming(props.id)

  // Function refs for keyboard shortcuts
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

  // Data state
  const availableServers = computed<JupyterServer[]>(() => {
    return jupyterStore.jupyterServers || []
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

  // Computed properties
  const isSharedSessionMode = computed(() => codeExecutionStore.sharedSessionMode)
  const sharedSessionId = computed(() => codeExecutionStore.sharedSessionId)

  const isReadyToExecute = computed(() => {
    if (props.isExecuting || executionInProgress.value) {
      return false
    }
    
    if (isSharedSessionMode.value) {
      return true
    }
    
    return selectedServer.value && 
           selectedServer.value !== 'none' && 
           selectedKernel.value
  })

  const codeBlockClasses = computed(() => {
    return { 
      'ring-2 ring-primary': hasUnsavedChanges.value, 
      'ring-2 ring-primary/40': isSharedSessionMode.value && cell?.value?.sessionId === sharedSessionId.value,
      'executing-block': props.isExecuting || executionInProgress.value,
      'error-block': cell?.value?.hasError,
      'published-block': props.isPublished,
    }
  })

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

  return {
    // Refs
    codeBlockRef,
    outputRendererRef,
    
    // Cell state
    cell,
    copyOutput,
    
    // Toolbar state
    isServerOpen,
    isKernelOpen,
    isSessionOpen,
    isCodeVisible,
    selectedServer,
    selectedKernel,
    selectedSession,
    isSettingUp,
    
    // Code state
    codeValue,
    hasUnsavedChanges,
    isFullScreen,
    executionInProgress,
    executionSuccess,
    
    // Execution state
    executionStartTime,
    executionTime,
    executionProgress,
    errorMessage,
    isCodeCopied,
    
    // Enhanced features
    isTemplateDialogOpen,
    executionId,
    
    // UI state
    activeOutputView,
    showToolbar,
    isHovered,
    
    // AI features
    aiCodeAssistant,
    aiActionsStore,
    
    // Stores and services
    store,
    codeExecutionStore,
    jupyterStore,
    executionService,
    jupyterService,
    
    // Streaming
    startStreaming,
    stopStreaming,
    getFormattedOutput,
    
    // Shortcuts
    executeCodeRef,
    handleCodeFormattedRef,
    shortcuts,
    getShortcutText,
    
    // Data
    availableServers,
    availableSessions,
    availableKernels,
    runningKernels,
    
    // Computed
    isSharedSessionMode,
    sharedSessionId,
    isReadyToExecute,
    codeBlockClasses,
    currentExecutionTime,
    runningStatus,
    
    // Methods
    handleServerSelect,
    handleKernelSelect,
    toggleCodeVisibility
  }
}
