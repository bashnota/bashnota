<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import type { KernelConfig } from '@/features/jupyter/types/jupyter'

// Core composables for state management
import { useCodeBlockCore } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockCore'
import { useCodeBlockUI } from '@/features/editor/components/blocks/executable-code-block/composables/ui/useCodeBlockUI'
import { useCodeBlockExecutionSimplified } from '@/features/editor/components/blocks/executable-code-block/composables/useCodeBlockExecutionSimplified'
import { useRobustExecution } from '@/features/editor/composables/useRobustExecution'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useEnhancedOutputManagement } from '@/features/editor/composables/useEnhancedOutputManagement'

// Get code execution store instance
const codeExecutionStore = useCodeExecutionStore()

// Components
import CodeBlockToolbar from './components/CodeBlockToolbar.vue'
import SideToolbar from './components/SideToolbar.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import WarningBanners from './components/WarningBanners.vue'
import CodeEditor from './components/CodeEditor.vue'
import OutputDisplay from './components/OutputDisplay.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import ExecutionStatus from './ExecutionStatus.vue'
import ErrorDisplay from './ErrorDisplay.vue'
import TemplateSelector from './TemplateSelector.vue'

// UI utilities
import { toast } from 'vue-sonner'

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
  initialOutput?: string // CRITICAL: Add initial output prop
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
  executeCode,
  initializeComponent,
  handleErrorDismissed,
  handleAICodeUpdate,
  handleCustomActionExecuted
} = useCodeBlockExecutionSimplified(props, emit, {
  codeValue,
  isReadyToExecute
})

// Server/kernel selection - get from store or use robust execution
const selectedServer = computed(() => {
  const cell = codeExecutionStore.getCellById(props.id)
  return cell?.serverConfig ? `${cell.serverConfig.ip}:${cell.serverConfig.port}` : ''
})

const selectedKernel = computed(() => {
  const cell = codeExecutionStore.getCellById(props.id)
  return cell?.kernelName || ''
})

const selectedSession = computed(() => {
  const cell = codeExecutionStore.getCellById(props.id)
  return cell?.sessionId || ''
})

const availableServers = computed(() => [])
const availableKernels = computed(() => [])
const availableSessions = computed(() => [])
const runningKernels = computed(() => [])
const isServerOpen = ref(false)
const isKernelOpen = ref(false)
const isSessionOpen = ref(false)
const isSharedSessionMode = computed(() => false)

// Dummy handlers that won't be used since we have our own toolbar
const handleServerChange = () => {}
const handleKernelChange = () => {}
const handleSessionChange = () => {}
const handleCreateNewSession = () => {}
const handleClearAllKernels = () => {}
const handleRefreshSessions = () => {}
const handleRunningKernelSelect = () => {} 

// Component state
const isMounted = ref(false)

// Robust execution handling
const { executeCell: robustExecuteCell, getExecutionStatus } = useRobustExecution()

// Enhanced output persistence system
const outputPersistence = useEnhancedOutputManagement({
  cellId: props.id,
  autoSave: true,
  updateAttributes: (attrs) => {
    // CRITICAL: Emit to parent wrapper for nota saving
    console.log(`[CodeBlockWithExecution] Emitting output update for cell ${props.id}:`, attrs.output || '')
    emit('update:output', attrs.output || '')
  },
  onOutputUpdate: (output) => {
    // Additional handling when output updates
    console.log(`[CodeBlockWithExecution] Output updated for cell ${props.id}:`, { length: output.length })
  }
})

// Create a wrapper function for nota updates
const updateOutputToNota = (attrs: any) => {
  console.log(`[CodeBlockWithExecution] Direct nota update for cell ${props.id}:`, attrs.output || '')
  emit('update:output', attrs.output || '')
}

// Focus management and initialization
onMounted(() => {
  isMounted.value = true
  
  // CRITICAL: Initialize output from props if provided
  if (props.initialOutput) {
    console.log(`[CodeBlockWithExecution] Loading initial output for cell ${props.id}:`, props.initialOutput)
    try {
      // Update the store with initial output
      const cell = codeExecutionStore.getCellById(props.id)
      if (cell) {
        cell.output = props.initialOutput
        console.log(`[CodeBlockWithExecution] Initialized cell output from props`)
      } else {
        // Create cell if it doesn't exist
        codeExecutionStore.addCell({
          id: props.id,
          code: codeValue.value,
          kernelName: '',
          sessionId: props.sessionId || 'default',
          output: props.initialOutput
        })
        console.log(`[CodeBlockWithExecution] Created cell with initial output`)
      }
    } catch (error) {
      console.error('Error initializing output:', error)
    }
  }
  
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

// Enhanced execution function with robust configuration
const safeExecuteCode = async () => {
  if (!isMounted.value) {
    console.warn('Component not mounted, skipping execution')
    return
  }
  
  try {
    console.log(`[CodeBlockWithExecution] Executing code for cell ${props.id}...`)
    
    // Check if we have server/kernel configuration
    if (!selectedServer.value || !selectedKernel.value) {
      console.log(`[CodeBlockWithExecution] No server/kernel configured, using robust execution for cell ${props.id}`)
      
      // Use the robust execution system which handles server discovery automatically
      const success = await robustExecuteCell(props.id, codeValue.value)
      
      if (success) {
        console.log(`[CodeBlockWithExecution] Robust execution completed for cell ${props.id}`)
        
        // Get the result and emit
        nextTick(() => {
          const cell = codeExecutionStore.getCellById(props.id)
          if (cell) {
            console.log(`[CodeBlockWithExecution] Emitting robust execution result:`, cell.output)
            emit('update:output', cell.output || '')
          }
        })
      } else {
        console.error(`[CodeBlockWithExecution] Robust execution failed for cell ${props.id}`)
        emit('update:output', 'Error: Code execution failed. Please check your server configuration.')
      }
    } else {
      // Use the execution composable which will emit the output
      await executeCode()
      
      console.log(`[CodeBlockWithExecution] Standard execution completed for cell ${props.id}`)
      
      // Additional safety: ensure output is emitted after execution
      nextTick(() => {
        const cell = codeExecutionStore.getCellById(props.id)
        if (cell && cell.output) {
          console.log(`[CodeBlockWithExecution] Safety emit for cell ${props.id}:`, cell.output)
          emit('update:output', cell.output)
        }
      })
    }
    
  } catch (error) {
    console.error('Error executing code:', error)
    emit('update:output', `Error: ${error instanceof Error ? error.message : 'Unknown execution error'}`)
  }
}

// Output handling is now managed by the OutputDisplay component
// These computed properties are kept for backward compatibility with other components
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
})

// Mouse event handlers
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
  
  // Use nextTick to ensure component state is stable
  nextTick(() => {
    try {
      if (isMounted.value) {
        isHovered.value = false
      }
    } catch (error) {
      console.warn('Error in mouse leave handler:', error)
    }
  })
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

// Clear output handler
const handleClearOutput = async () => {
  try {
    console.log(`[CodeBlockWithExecution] Clearing output for cell ${props.id}`)
    
    // Clear the output in the store
    const cell = codeExecutionStore.getCellById(props.id)
    if (cell) {
      cell.output = ''
      cell.hasError = false
      cell.error = null
    }
    
    // CRITICAL: Emit to parent for nota saving
    console.log(`[CodeBlockWithExecution] Emitting clear output for cell ${props.id}`)
    emit('update:output', '')
    
    // Also use the enhanced output management
    const success = await outputPersistence.clearOutput()
    if (success) {
      console.log(`[CodeBlockWithExecution] Output cleared successfully for cell ${props.id}`)
    } else {
      console.error('Enhanced output management clear failed')
    }
  } catch (error) {
    console.error('Error clearing output:', error)
  }
}

// AI Assistant handler
// AI Assistant functionality removed for focused output experience
const handleShowAIAssistant = () => {
  // AI Assistant functionality has been removed
  console.log('AI Assistant feature has been removed for a more focused output experience')
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

    <!-- Side Toolbar -->
    <SideToolbar
      :is-visible="isHovered || showToolbar"
      :is-read-only="isReadOnly || false"
      :is-executing="isExecuting || false"
      :is-published="isPublished || false"
      :is-ready-to-execute="!!isReadyToExecute"
      :is-code-visible="isCodeVisible"
      :has-unsaved-changes="hasUnsavedChanges"
      :is-code-copied="isCodeCopied"
      :is-configuration-incomplete="!selectedServer || !selectedKernel"
      :selected-server="selectedServer"
      :selected-kernel="selectedKernel"
      :has-output="hasOutput"
      @execute-code="safeExecuteCode"
      @toggle-code-visibility="toggleCodeVisibility"
      @toggle-fullscreen="isFullScreen = true"
      @copy-code="copyCode"
      @save-changes="saveChanges"
      @open-configuration="handleOpenConfiguration"
      @show-ai-assistant="handleShowAIAssistant"
      @clear-output="handleClearOutput"
    />

    <!-- Warning Banners -->
    <WarningBanners
      :cell-id="props.id"
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-executing="isExecuting || false"
      :is-shared-session-mode="isSharedSessionMode"
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

    <!-- Output Display Section -->
    <OutputDisplay
      :cell-id="props.id"
      :is-read-only="isReadOnly || false"
      :is-published="isPublished || false"
      :is-executing="isExecuting || false"
      :update-attributes="updateOutputToNota"
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
