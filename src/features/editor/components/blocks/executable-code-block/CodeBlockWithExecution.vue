<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { KernelConfig } from '@/features/jupyter/types/jupyter'

// Core composables for state management
import { useCodeBlockCore } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockCore'
import { useCodeBlockUI } from '@/features/editor/components/blocks/executable-code-block/composables/ui/useCodeBlockUI'
import { useCodeBlockExecutionSimplified } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockExecutionSimplified'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'

// Components
import CodeBlockToolbar from './components/CodeBlockToolbar.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import WarningBanners from './components/WarningBanners.vue'
import CodeEditor from './components/CodeEditor.vue'
import OutputSection from './components/OutputSection.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import ExecutionStatus from './ExecutionStatus.vue'
import ErrorDisplay from './ErrorDisplay.vue'
import TemplateSelector from './TemplateSelector.vue'

// UI utilities
import { toast } from '@/ui/toast/use-toast'

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

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:code': [code: string]
  'kernel-select': [kernelName: string, serverId: string]
  'update:output': [output: string]
  'update:session-id': [sessionId: string]
  'server-change': [serverId: string]
  'open-configuration': []
}>()

// Core state and functionality
const {
  codeBlockRef,
  codeValue,
  hasUnsavedChanges,
  isReadyToExecute,
  codeBlockClasses,
  updateCode,
  saveChanges,
  copyCode,
  copyOutput,
  handleCodeFormatted,
  handleTemplateSelected
} = useCodeBlockCore(props, emit)

// UI state management
const {
  isHovered,
  showToolbar,
  isCodeVisible,
  isFullScreen,
  isTemplateDialogOpen,
  isCodeCopied,
  toggleCodeVisibility,
  showTemplateDialog
} = useCodeBlockUI()

// Execution and session management
const {
  isExecuting,
  isSettingUp,
  runningStatus,
  executionTime,
  executionProgress,
  currentExecutionTime,
  errorMessage,
  cell,
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
} = useCodeBlockExecutionSimplified(props, emit, {
  codeValue,
  isReadyToExecute
}) 

// Component state
const isMounted = ref(false)

// Focus management and initialization
onMounted(() => {
  isMounted.value = true
  
  // Initialize Jupyter servers and component
  try {
    initializeComponent()
  } catch (error) {
    console.warn('Error initializing component:', error)
  }
  
  // Focus editor if not read-only
  nextTick(() => {
    try {
      if (codeBlockRef.value && !props.isReadOnly) {
        const editor = codeBlockRef.value.querySelector('.cm-editor')
        if (editor) {
          (editor as HTMLElement).focus()
        }
      }
    } catch (error) {
      console.warn('Error focusing editor:', error)
    }
  })
})

onBeforeUnmount(() => {
  isMounted.value = false
})

// Wrapped execution function with additional safety checks
const safeExecuteCode = async () => {
  if (!isMounted.value) {
    console.warn('Component not mounted, skipping execution')
    return
  }
  
  try {
    await executeCode()
  } catch (error) {
    console.error('Error executing code:', error)
  }
}

// Computed properties for output handling
const hasOutput = computed(() => {
  const currentCell = cell.value
  const output = currentCell?.output
  const hasValidOutput = output && output.toString().trim().length > 0
  return !!hasValidOutput
})

const outputContent = computed(() => {
  const currentCell = cell.value
  return currentCell?.output || ''
})

const hasError = computed(() => {
  const currentCell = cell.value
  return currentCell?.hasError || false
})// Mouse event handlers
const handleMouseEnter = () => {
  if (!isMounted.value) return
  try {
    isHovered.value = true
  } catch (error) {
    console.warn('Error in mouse enter handler:', error)
  }
}

const handleMouseLeave = () => {
  if (!isMounted.value) return
  try {
    isHovered.value = false
  } catch (error) {
    console.warn('Error in mouse leave handler:', error)
  }
}

// Configuration modal handler
const handleOpenConfiguration = () => {
  emit('open-configuration')
}

// Handle shared session mode toggle
const handleToggleSharedSessionMode = async () => {
  try {
    const codeExecutionStore = useCodeExecutionStore()
    
    // If enabling shared session mode, ensure we have server and kernel configured
    if (!isSharedSessionMode.value) {
      // Check if we have a server and kernel selected
      if (!selectedServer.value || !selectedKernel.value) {
        // We need to configure server and kernel first
        toast({
          title: "Configuration Required",
          description: "Please select a Jupyter server and kernel first before enabling shared session mode.",
          variant: "destructive"
        })
        emit('open-configuration')
        return
      }
      
      // Enable shared session mode first
      await codeExecutionStore.toggleSharedSessionMode(props.notaId)
      
      // Then ensure a shared session is created with the selected server and kernel
      await codeExecutionStore.ensureSharedSession()
      
      toast({
        title: "Shared Session Enabled",
        description: "All code blocks now share the same session.",
        variant: "default"
      })
    } else {
      // Just disable shared session mode
      await codeExecutionStore.toggleSharedSessionMode(props.notaId)
      
      toast({
        title: "Shared Session Disabled",
        description: "Code blocks will use individual sessions.",
        variant: "default"
      })
    }
  } catch (error) {
    console.error('Failed to toggle shared session mode:', error)
    toast({
      title: "Failed to Toggle Shared Session",
      description: "Could not toggle shared session mode. Please try again.",
      variant: "destructive"
    })
  }
}
</script>

<template>
  <div
    ref="codeBlockRef"
    class="flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm transition-all duration-200 group hover:shadow-md relative"
    :class="codeBlockClasses"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Status indicator bar -->
    <StatusIndicator
      :is-executing="isExecuting || (cell?.isExecuting) || false"
      :has-error="hasError"
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
      :is-executing="isExecuting || false"
      :is-published="isPublished || false"
      :is-ready-to-execute="!!isReadyToExecute"
      :is-code-visible="isCodeVisible"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-code-copied="isCodeCopied"
      :is-shared-session-mode="isSharedSessionMode"
      :selected-session="selectedSession"
      :available-sessions="availableSessions"
      :running-kernels="runningKernels"
      :is-session-open="isSessionOpen"
      :is-setting-up="isSettingUp"
      :selected-server="selectedServer"
      :selected-kernel="selectedKernel"
      :available-servers="availableServers"
      :available-kernels="availableKernels"
      :is-server-open="isServerOpen"
      :is-kernel-open="isKernelOpen"
      @execute-code="safeExecuteCode"
      @toggle-toolbar="showToolbar = !showToolbar"
      @toggle-code-visibility="toggleCodeVisibility"
      @toggle-fullscreen="isFullScreen = true"
      @format-code="handleCodeFormatted"
      @show-templates="showTemplateDialog"
      @copy-code="copyCode"
      @save-changes="saveChanges"
      @open-configuration="handleOpenConfiguration"
      @update:is-session-open="isSessionOpen = $event"
      @session-change="handleSessionChange"
      @create-new-session="handleCreateNewSession"
      @clear-all-kernels="handleClearAllKernels"
      @refresh-sessions="handleRefreshSessions"
      @select-running-kernel="handleRunningKernelSelect"
      @update:is-server-open="isServerOpen = $event"
      @update:is-kernel-open="isKernelOpen = $event"
      @server-change="handleServerChange"
      @kernel-change="handleKernelChange"
    />

    <!-- Warning Banners -->
    <WarningBanners
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-shared-session-mode="isSharedSessionMode"
      :is-executing="isExecuting || false"
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
      :has-output="hasOutput"
      :has-error="hasError"
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-executing="isExecuting || false"
      :output="outputContent"
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
      @trigger-execution="safeExecuteCode"
    />

    <!-- Fullscreen Modal -->
    <FullScreenCodeBlock
      v-if="isFullScreen"
      v-model:code="codeValue"
      :output="outputContent || null"
      :outputType="hasError ? 'error' : undefined"
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
      @execute="safeExecuteCode"
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
      @retry="safeExecuteCode"
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
