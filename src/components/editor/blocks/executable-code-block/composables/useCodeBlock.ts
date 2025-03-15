import { ref, computed, watch } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
import type { JupyterServer } from '@/types/jupyter'
import { useCodeBlockToolbar } from './useCodeBlockToolbar'
import { useCodeBlockShortcuts } from './useCodeBlockShortcuts'
import { useAiCodeFixer } from './useAiCodeFixer'

interface NotaConfig {
  jupyterServers: { ip: string; port: string; token: string }[]
  kernels: Record<string, KernelSpec[]>
  kernelPreferences: Record<string, KernelConfig>
  savedSessions: { id: string; name: string; cells: string[] }[]
}

interface CodeBlockOptions {
  code: string
  id: string
  notaId: string
  serverID: string | null
  kernelName: string | null
  sessionId: string | null
  kernelPreference?: KernelConfig | null
  isReadOnly?: boolean
  onUpdate: (code: string) => void
  onKernelSelect: (kernelName: string, serverId: string) => void
  onUpdateOutput: (output: string) => void
  onUpdateSessionId: (sessionId: string) => void
}

export function useCodeBlock(options: CodeBlockOptions) {
  // Stores
  const store = useNotaStore()
  const codeExecutionStore = useCodeExecutionStore()

  // State
  const codeValue = ref(options.code)
  const lastSavedCode = ref(options.code)
  const isCodeVisible = ref(true)
  const isOutputVisible = ref(true)
  const isFullScreen = ref(false)
  const isCodeCopied = ref(false)
  const executionInProgress = ref(false)
  const originalCodeBeforeExecution = ref('')

  // Server configuration
  const selectedServer = ref<string | null>(options.serverID)
  const isServerOpen = ref(false)

  // Kernel configuration
  const selectedKernel = ref<string | null>(options.kernelName)
  const isKernelOpen = ref(false)

  // Session management
  const selectedSession = ref<string | null>(options.sessionId)
  const isSessionOpen = ref(false)
  const isSettingUp = ref(false)

  // Computed
  const hasUnsavedChanges = computed(() => codeValue.value !== lastSavedCode.value)
  const availableSessions = computed(() => codeExecutionStore.getAllSessions)

  const rootNotaId = computed(() => {
    const currentNota = store.getCurrentNota(options.notaId)
    if (!currentNota?.parentId) return options.notaId
    return store.getRootNotaId(currentNota.parentId)
  })

  const notaConfig = computed<NotaConfig>(() => {
    const nota = store.getCurrentNota(rootNotaId.value)
    if (!nota?.config) {
      return {
        jupyterServers: [],
        kernels: {},
        kernelPreferences: {},
        savedSessions: []
      }
    }
    return nota.config as NotaConfig
  })

  const availableServers = computed(() => 
    notaConfig.value.jupyterServers.map(server => ({
      ...server,
      displayName: `${server.ip}:${server.port}`
    }))
  )

  const availableKernels = computed(() => {
    if (!selectedServer.value || selectedServer.value === 'none') return []
    return notaConfig.value.kernels[selectedServer.value] || []
  })

  const isReadyToExecute = computed(() => {
    const cell = codeExecutionStore.getCellById(options.id)
    return (
      selectedKernel.value &&
      selectedKernel.value !== 'none' &&
      selectedServer.value &&
      selectedServer.value !== 'none' &&
      !cell?.isExecuting
    )
  })

  // Initialize toolbar
  const toolbar = useCodeBlockToolbar({
    isReadOnly: options.isReadOnly,
    onServerSelect: (serverId) => {
      handleServerSelect(serverId)
    },
    onKernelSelect: (kernelName) => {
      handleKernelSelect(kernelName)
    },
    onSessionSelect: (sessionId) => {
      handleSessionSelect(sessionId)
    },
  })

  // Initialize shortcuts
  const { shortcuts } = useCodeBlockShortcuts({
    onExecute: () => executeCode(),
    onSave: () => saveChanges(),
    onToggleFullscreen: () => isFullScreen.value = !isFullScreen.value,
  })

  // Initialize AI code fixer
  const aiFixer = useAiCodeFixer({
    onApplyFix: (fixedCode) => {
      updateCode(fixedCode)
      executeCode()
    },
    onClose: () => {
      // Reset any necessary state
    },
  })

  // Methods
  const handleServerSelect = (serverId: string) => {
    selectedServer.value = serverId
    options.onKernelSelect(selectedKernel.value || '', serverId)
  }

  const handleKernelSelect = (kernelName: string) => {
    selectedKernel.value = kernelName
    options.onKernelSelect(kernelName, selectedServer.value || '')
  }

  const handleSessionSelect = (sessionId: string) => {
    selectedSession.value = sessionId
    options.onUpdateSessionId(sessionId)
  }

  const toggleCodeVisibility = () => {
    isCodeVisible.value = !isCodeVisible.value
  }

  const toggleOutputVisibility = () => {
    isOutputVisible.value = !isOutputVisible.value
  }

  const createNewSession = async () => {
    try {
      isSettingUp.value = true
      const sessionName = `Session ${availableSessions.value.length + 1}`
      const sessionId = codeExecutionStore.createSession(sessionName)
      selectedSession.value = sessionId
      codeExecutionStore.addCellToSession(options.id, sessionId)
      options.onUpdateSessionId(sessionId)
      await codeExecutionStore.saveSessions(options.notaId)
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      isSettingUp.value = false
    }
  }

  const executeCode = async () => {
    if (!isReadyToExecute.value) return

    try {
      originalCodeBeforeExecution.value = codeValue.value
      executionInProgress.value = true
      await codeExecutionStore.executeCell(options.id)
      const cell = codeExecutionStore.getCellById(options.id)
      if (cell?.output) {
        options.onUpdateOutput(cell.output)
      }
      lastSavedCode.value = codeValue.value
    } catch (error) {
      console.error('Error executing code:', error)
      if (codeValue.value !== originalCodeBeforeExecution.value) {
        codeValue.value = originalCodeBeforeExecution.value
      }
    } finally {
      executionInProgress.value = false
    }
  }

  const updateCode = (newCode: string) => {
    codeValue.value = newCode
    options.onUpdate(newCode)
  }

  const saveChanges = () => {
    options.onUpdate(codeValue.value)
    lastSavedCode.value = codeValue.value
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeValue.value)
      isCodeCopied.value = true
      setTimeout(() => {
        isCodeCopied.value = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Watchers
  watch(() => options.code, (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
      lastSavedCode.value = newCode
    }
  })

  watch(() => options.sessionId, (newSessionId) => {
    if (newSessionId && newSessionId !== selectedSession.value) {
      selectedSession.value = newSessionId
    }
  })

  return {
    // State
    codeValue,
    lastSavedCode,
    isFullScreen,
    isCodeCopied,
    executionInProgress,

    // Computed
    hasUnsavedChanges,
    availableSessions,
    rootNotaId,
    notaConfig,
    availableServers,
    availableKernels,
    isReadyToExecute,

    // Toolbar state and methods
    ...toolbar,

    // Shortcuts
    shortcuts,

    // AI Fixer
    ...aiFixer,

    // Methods
    createNewSession,
    executeCode,
    updateCode,
    saveChanges,
    copyCode,
  }
} 