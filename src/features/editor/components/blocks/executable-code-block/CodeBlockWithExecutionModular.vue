<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useCodeBlockState } from './composables/useCodeBlockState'
import { useSessionManagement } from './composables/useSessionManagement'
import { useCodeBlockExecution } from './composables/useCodeBlockExecution'
import { usePreferencesManagement } from './composables/usePreferencesManagement'
import { logger } from '@/services/logger'
import type { KernelConfig } from '@/features/jupyter/types/jupyter'

// Components
import CodeBlockToolbar from './components/CodeBlockToolbar.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import WarningBanners from './components/WarningBanners.vue'
import CodeEditor from './components/CodeEditor.vue'
import OutputSection from './components/OutputSection.vue'
import SessionSelector from './components/SessionSelector.vue'
import ServerKernelSelector from './components/ServerKernelSelector.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import ExecutionStatus from './ExecutionStatus.vue'
import ErrorDisplay from './ErrorDisplay.vue'
import TemplateSelector from './TemplateSelector.vue'

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

// Initialize core state management
const {
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
  
  // Enhanced features
  isTemplateDialogOpen,
  
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
  
  // Data
  availableServers,
  
  // Computed
  isSharedSessionMode,
  sharedSessionId,
  isReadyToExecute,
  codeBlockClasses,
  
  // Methods
  handleServerSelect,
  handleKernelSelect,
  toggleCodeVisibility
} = useCodeBlockState(props, emit)

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

// Initialize session management
const {
  availableSessions,
  availableKernels,
  runningKernels,
  refreshSessionsAndKernels,
  clearAllKernels,
  selectSession,
  selectRunningKernel,
  createNewSession,
  setupServerWatcher
} = useSessionManagement({
  availableServers: availableServers.value,
  selectedServer: selectedServer.value,
  selectedKernel: selectedKernel.value,
  codeExecutionStore,
  jupyterService,
  executionService,
  language: props.language,
  blockId: props.id,
  isSharedSessionMode: isSharedSessionMode.value,
  showConsoleMessage
})

// Initialize code execution
const {
  executionInProgress,
  executionSuccess,
  executionStartTime,
  executionTime,
  executionProgress,
  errorMessage,
  currentExecutionTime,
  runningStatus,
  executeCodeBlock,
  triggerAutoErrorAnalysis,
  handleErrorDismissed
} = useCodeBlockExecution({
  blockId: props.id,
  codeExecutionStore,
  aiActionsStore,
  aiCodeAssistant,
  isReadyToExecute,
  isPublished: props.isPublished || false,
  startStreaming,
  stopStreaming,
  getFormattedOutput,
  emit
})

// Initialize preferences management
const {
  loadSavedPreferences,
  handleServerChange: _handleServerChange,
  handleKernelChange: _handleKernelChange,
  refreshJupyterServers
} = usePreferencesManagement({
  blockId: props.id,
  notaId: props.notaId,
  language: props.language,
  availableServers: availableServers.value,
  isSharedSessionMode: isSharedSessionMode.value,
  sharedSessionId: sharedSessionId.value,
  store,
  codeExecutionStore,
  jupyterService,
  handleServerSelect,
  handleKernelSelect,
  showConsoleMessage,
  emit
})

// Setup watchers and lifecycle
setupServerWatcher(selectedServer, handleServerSelect, handleKernelSelect)

// Watch for server open to refresh servers
watch(isServerOpen, async (isOpen) => {
  if (isOpen) {
    await refreshJupyterServers()
  }
})

// Watchers for props
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

// Auto-switch to AI view when there's an error
watch(() => cell?.value?.hasError, (hasError) => {
  if (hasError && !props.isReadOnly && !props.isPublished) {
    activeOutputView.value = 'ai'
  }
}, { immediate: true })

// Component methods
const updateCode = (newCode: string) => {
  codeValue.value = newCode
  hasUnsavedChanges.value = true
  emit('update:code', newCode)
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(codeValue.value)
    const isCodeCopied = ref(false)
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

const handleCodeFormatted = () => {
  logger.debug('Code formatted successfully')
}

// Session management handlers
const handleSessionChange = async (sessionId: string) => {
  const result = await selectSession(sessionId)
  if (result) {
    selectedSession.value = result.sessionId
    handleKernelSelect(result.kernelName)
    emit('update:session-id', result.sessionId)
  }
  isSessionOpen.value = false
}

const handleServerChange = async (serverId: string) => {
  await _handleServerChange(serverId, selectedKernel)
  isServerOpen.value = false
  isKernelOpen.value = true
}

const handleKernelChange = (kernelName: string) => {
  _handleKernelChange(kernelName, selectedServer)
  isKernelOpen.value = false
}

const handleRunningKernelSelect = async (kernelId: string) => {
  const result = await selectRunningKernel(kernelId)
  if (result) {
    selectedSession.value = result.sessionId
    selectedKernel.value = result.kernelName
    emit('update:session-id', result.sessionId)
  }
  isSessionOpen.value = false
}

const handleCreateNewSession = async () => {
  const sessionId = await createNewSession()
  if (sessionId) {
    selectedSession.value = sessionId
    emit('update:session-id', sessionId)
  }
  isSessionOpen.value = false
}

const handleClearAllKernels = async () => {
  const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
  if (server) {
    await clearAllKernels(server)
  }
}

const handleRefreshSessions = async () => {
  const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
  if (server) {
    await refreshSessionsAndKernels(server)
  }
}

// Template handling
const handleTemplateSelected = (templateCode: string) => {
  emit('update:code', templateCode)
  isTemplateDialogOpen.value = false
}

const showTemplateDialog = () => {
  isTemplateDialogOpen.value = true
}

// AI Features methods
const handleAICodeUpdate = (newCode: string) => {
  updateCode(newCode)
}

const handleCustomActionExecuted = (actionId: string, result: string) => {
  logger.debug(`Custom action ${actionId} executed with result length: ${result.length}`)
  
  if (actionId === 'fix-error' && result) {
    logger.info('AI Error Fix Suggestion:', result)
  }
}

// Computed properties for state
const isCodeCopied = ref(false)

// Execute code alias for template compatibility
const executeCode = executeCodeBlock

// Assign functions to refs for keyboard shortcuts and mount
onMounted(async () => {
  await nextTick()
  
  // Ensure jupyterStore is loaded and refreshed
  await refreshJupyterServers()
  
  // Load shared session if in shared mode or individual preferences otherwise
  await loadSavedPreferences(availableKernels)
  
  // Assign functions to refs for keyboard shortcuts
  executeCodeRef.value = executeCodeBlock
  handleCodeFormattedRef.value = handleCodeFormatted
  
  // Initialization debugging
  logger.debug(`[CodeBlock ${props.id}] Mounted`, {
    isPublished: props.isPublished,
    readonly: props.isReadOnly,
    hasSessionId: !!props.sessionId,
  })
  
  if (codeBlockRef.value && !props.isReadOnly) {
    const editor = codeBlockRef.value.querySelector('.cm-editor')
    if (editor) {
      (editor as HTMLElement).focus()
    }
  }
})
</script>

<template>
  <div
    ref="codeBlockRef"
    class="flex flex-col bg-card text-card-foreground rounded-lg overflow-hidden border shadow-sm transition-all duration-200 group hover:shadow-md relative"
    :class="codeBlockClasses"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Status indicator bar -->
    <StatusIndicator
      :is-executing="isExecuting || cell?.isExecuting || false"
      :has-error="cell?.hasError || false"
      :is-published="isPublished || false"
    />

    <!-- Subtle hover hint -->
    <div
      v-if="!isHovered && !showToolbar && !isReadOnly"
      class="absolute top-2 right-2 opacity-30 hover:opacity-70 transition-opacity duration-200 pointer-events-none"
    >
      <div class="w-1 h-1 bg-muted-foreground rounded-full"></div>
    </div>

    <!-- Main toolbar -->
    <CodeBlockToolbar
      :is-hovered="isHovered"
      :show-toolbar="showToolbar"
      :is-read-only="isReadOnly || false"
      :is-executing="isExecuting || executionInProgress || false"
      :is-published="isPublished || false"
      :is-ready-to-execute="!!isReadyToExecute"
      :is-code-visible="isCodeVisible"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-code-copied="isCodeCopied"
      :is-shared-session-mode="isSharedSessionMode"
      @execute-code="executeCode"
      @toggle-toolbar="showToolbar = !showToolbar"
      @toggle-code-visibility="toggleCodeVisibility"
      @toggle-fullscreen="isFullScreen = true"
      @format-code="handleCodeFormatted"
      @show-templates="showTemplateDialog"
      @copy-code="copyCode"
      @save-changes="saveChanges"
    >
      <template #session-selector>
        <SessionSelector
          :is-shared-session-mode="isSharedSessionMode"
          :is-executing="isExecuting || executionInProgress || false"
          :selected-session="selectedSession"
          :available-sessions="availableSessions"
          :running-kernels="runningKernels"
          :is-session-open="isSessionOpen"
          :is-setting-up="isSettingUp"
          :selected-server="selectedServer"
          @update:is-session-open="isSessionOpen = $event"
          @session-change="handleSessionChange"
          @create-new-session="handleCreateNewSession"
          @clear-all-kernels="handleClearAllKernels"
          @refresh-sessions="handleRefreshSessions"
          @select-running-kernel="handleRunningKernelSelect"
        />
      </template>

      <template #server-kernel-selector>
        <ServerKernelSelector
          :is-shared-session-mode="isSharedSessionMode"
          :is-executing="isExecuting || executionInProgress || false"
          :selected-server="selectedServer"
          :selected-kernel="selectedKernel"
          :available-servers="availableServers"
          :available-kernels="availableKernels"
          :is-server-open="isServerOpen"
          :is-kernel-open="isKernelOpen"
          @update:is-server-open="isServerOpen = $event"
          @update:is-kernel-open="isKernelOpen = $event"
          @server-change="handleServerChange"
          @kernel-change="handleKernelChange"
        />
      </template>
    </CodeBlockToolbar>

    <!-- Warning Banners -->
    <WarningBanners
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-shared-session-mode="isSharedSessionMode"
      :is-executing="isExecuting || executionInProgress || false"
      :selected-server="selectedServer"
      :selected-kernel="selectedKernel"
      :selected-session="selectedSession"
    />

    <!-- Code Editor -->
    <CodeEditor
      :code="codeValue"
      :language="props.language"
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :running-status="runningStatus"
      :is-code-visible="isCodeVisible"
      :is-code-copied="isCodeCopied"
      @update:code="updateCode"
      @format-code="handleCodeFormatted"
      @show-templates="showTemplateDialog"
      @copy-code="copyCode"
    />

    <!-- Output/AI Section -->
    <OutputSection
      :has-output="!!cell?.output"
      :has-error="cell?.hasError || false"
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-executing="isExecuting || executionInProgress || false"
      :output="cell?.output"
      :code="codeValue"
      :language="props.language"
      :block-id="props.id"
      :nota-id="props.notaId"
      :execution-time="executionTime"
      :selected-session="selectedSession"
      :selected-kernel="selectedKernel"
      @copy-output="copyOutput"
      @code-updated="handleAICodeUpdate"
      @custom-action-executed="handleCustomActionExecuted"
      @trigger-execution="executeCode"
    />

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

    <!-- Status Components -->
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
      @dismiss="handleErrorDismissed"
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
/* Container styles */
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

/* State-specific styles */
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
</style>
