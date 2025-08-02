<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { Button } from '@/ui/button'
import { X, Play, Loader2, Copy, Check, Eye, EyeOff, Code, FileText, Save, Maximize2 } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import OutputSection from './components/OutputSection.vue'
import StatusIndicator from './components/StatusIndicator.vue'
import { useFullscreenCode } from './composables/ui/useFullscreenCode'
import { useCodeBlockShortcuts } from './composables/ui/useCodeBlockShortcuts'
import { useCodeExecution } from './composables/core/useCodeExecution'

interface Props {
  code: string
  output: string | null
  outputType?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
  isOpen: boolean
  language: string
  isExecuting?: boolean
  isReadOnly?: boolean
  isPublished?: boolean
  blockId?: string
  notaId?: string
  hasUnsavedChanges?: boolean
  sessionInfo?: {
    sessionId?: string
    kernelName?: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:code': [code: string]
  'execute': []
  'format-code': []
  'show-templates': []
  'save-changes': []
  'toggle-code-visibility': []
}>()

const {
  resizing,
  isOutputFullscreen,
  isMac,
  handleKeyDown,
  startResize,
  handleResize,
  endResize,
  toggleOutputFullscreen,
  editorContainerStyle,
  outputContainerStyle
} = useFullscreenCode()

// Initialize keyboard shortcuts for fullscreen mode
const { shortcuts, getShortcutText } = useCodeBlockShortcuts({
  onExecute: () => {
    if (!props.isExecuting && !props.isReadOnly) {
      executeCode()
    }
  },
  onToggleFullscreen: () => {
    onClose() // Close fullscreen mode
  },
  isEnabled: () => {
    return !props.isReadOnly && props.isOpen
  }
})

// Enhanced keyboard handling for better UX
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // ESC to close
  if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    onClose()
    return
  }
  
  // Ctrl+Shift+Enter or Cmd+Shift+Enter to run
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault()
    if (!props.isExecuting && !props.isReadOnly) {
      executeCode()
    }
    return
  }
  
  // Pass to existing handler
  handleKeyDown(e, onClose, props.isExecuting || false)
}

// Simplified state management (timer functionality)
const isCodeCopied = ref(false)
const isCodeVisible = ref(true)
const executionStartTime = ref(0)
const executionTime = ref(0)
const executionTimeInterval = ref<number | null>(null)
const statusMessage = ref<string | null>(null)

// Compute readable execution time
const executionTimeText = computed(() => {
  if (!props.isExecuting || executionTime.value === 0) return null
  
  if (executionTime.value < 1000) {
    return `${executionTime.value}ms`
  } else if (executionTime.value < 60000) {
    return `${(executionTime.value / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(executionTime.value / 60000)
    const seconds = Math.floor((executionTime.value % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
})

// Setup event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', endResize)
  document.addEventListener('keydown', handleGlobalKeyDown)
  
  // Start execution timer if code is already executing
  if (props.isExecuting) {
    startExecutionTimer()
  }
  
  // Focus management - ensure CodeMirror gets focus
  setTimeout(() => {
    const codeMirrorElement = document.querySelector('.cm-editor .cm-content')
    if (codeMirrorElement && codeMirrorElement instanceof HTMLElement) {
      codeMirrorElement.focus()
    }
  }, 100)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', endResize)
  document.removeEventListener('keydown', handleGlobalKeyDown)
  
  // Clean up timer
  if (executionTimeInterval.value) {
    clearInterval(executionTimeInterval.value)
  }
})

// Watch for execution state changes
watch(() => props.isExecuting, (isExecuting) => {
  if (isExecuting) {
    startExecutionTimer()
    statusMessage.value = 'Running code...'
  } else {
    stopExecutionTimer()
    if (executionTime.value > 0) {
      statusMessage.value = `Completed in ${executionTimeText.value}`
      // Clear the status message after 5 seconds
      setTimeout(() => {
        statusMessage.value = null
      }, 5000)
    }
  }
}, { immediate: true })

// Copy code to clipboard
const copyCode = () => {
  if (navigator.clipboard && props.code) {
    navigator.clipboard.writeText(props.code)
      .then(() => {
        isCodeCopied.value = true
        setTimeout(() => {
          isCodeCopied.value = false
        }, 2000)
      })
      .catch(err => {
        console.error('Failed to copy code:', err)
      })
  }
}

const onClose = () => {
  emit('update:isOpen', false)
}

const onCodeUpdate = (newCode: string) => {
  emit('update:code', newCode)
}

const executeCode = () => {
  emit('execute')
}

// Handle events from OutputSection
const handleCodeUpdated = (newCode: string) => {
  emit('update:code', newCode)
}

const handleCustomActionExecuted = (actionId: string, result: string) => {
  console.log(`AI action ${actionId} executed with result:`, result)
}

const handleTriggerExecution = () => {
  executeCode()
}

const handleCopyOutput = () => {
  // This will be handled by the OutputSection component
}

// Timer functions for execution feedback
function startExecutionTimer() {
  executionStartTime.value = Date.now()
  executionTime.value = 0
  
  // Clear any existing interval
  if (executionTimeInterval.value) {
    clearInterval(executionTimeInterval.value)
  }
  
  // Update execution time every 100ms
  executionTimeInterval.value = setInterval(() => {
    executionTime.value = Date.now() - executionStartTime.value
  }, 100) as unknown as number
}

function stopExecutionTimer() {
  if (executionTimeInterval.value) {
    clearInterval(executionTimeInterval.value)
    executionTimeInterval.value = null
  }
  
  // Final time calculation
  if (executionStartTime.value > 0) {
    executionTime.value = Date.now() - executionStartTime.value
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
    aria-label="Code Editor"
    :class="{ 'published-mode': isPublished }"
  >
    <!-- Compact Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b bg-background/95 backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <!-- Execution status - compact version -->
        <div v-if="isExecuting" 
             class="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
          <Loader2 class="w-3 h-3 animate-spin" />
          <span>{{ executionTimeText || 'Running...' }}</span>
        </div>
        
        <div v-else-if="statusMessage && !isPublished" 
             class="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs">
          <span>{{ statusMessage }}</span>
        </div>
        
        <!-- Error indicator -->
        <div v-if="outputType === 'error' && !isPublished" 
             class="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 text-destructive rounded text-xs">
          <span>Error</span>
        </div>
      </div>
      
      <div class="flex items-center gap-1">
        <!-- Keyboard shortcut tooltip (hover to show) -->
        <div v-if="!isReadOnly" 
             class="hidden lg:flex text-xs text-muted-foreground/70 mr-2"
             title="Keyboard shortcut to run code">
          <kbd class="px-1 py-0.5 bg-muted/30 border rounded text-xs">{{ isMac() ? '⌘⇧↵' : 'Ctrl+Shift+Enter' }}</kbd>
        </div>

        <!-- Code Tools Group -->
        <div v-if="!isReadOnly" class="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            @click="emit('format-code')"
            class="h-7 px-2"
            title="Format code"
            :disabled="isExecuting"
          >
            <Code class="w-3.5 h-3.5 mr-1" />
            <span class="text-xs">Format</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            @click="emit('show-templates')"
            class="h-7 px-2"
            title="Insert template"
            :disabled="isExecuting"
          >
            <FileText class="w-3.5 h-3.5 mr-1" />
            <span class="text-xs">Templates</span>
          </Button>
        </div>

        <!-- View Controls -->
        <div class="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            @click="emit('toggle-code-visibility')"
            class="h-7 px-2"
            :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
          >
            <Eye v-if="!isCodeVisible" class="w-3.5 h-3.5" />
            <EyeOff v-else class="w-3.5 h-3.5" />
          </Button>
        </div>

        <!-- Action buttons -->
        <Button
          variant="ghost"
          size="sm"
          @click="copyCode"
          class="h-7 px-2"
          title="Copy code"
          aria-label="Copy code"
        >
          <Copy v-if="!isCodeCopied" class="w-3.5 h-3.5" />
          <Check v-else class="w-3.5 h-3.5 text-green-500" />
        </Button>

        <Button
          v-if="!isReadOnly && hasUnsavedChanges && !isExecuting"
          variant="ghost"
          size="sm"
          @click="emit('save-changes')"
          class="h-7 px-2"
          title="Save changes"
        >
          <Save class="w-3.5 h-3.5" />
        </Button>

        <Button
          v-if="!isReadOnly"
          variant="default"
          size="sm"
          :disabled="isExecuting"
          @click="executeCode"
          class="h-7 px-3"
          aria-label="Run code"
        >
          <Loader2 class="w-3.5 h-3.5 animate-spin mr-1" v-if="isExecuting" />
          <Play class="w-3.5 h-3.5 mr-1" v-else />
          <span class="text-xs">Run</span>
        </Button>

        <Button variant="ghost" size="sm" @click="onClose" class="h-7 px-2" aria-label="Close editor">
          <X class="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 overflow-hidden editor-container">
      <!-- Code Editor -->
      <div 
        v-show="isCodeVisible"
        class="h-full overflow-hidden transition-all" 
        :style="editorContainerStyle"
      >
        <CodeMirror
          :modelValue="code"
          @update:modelValue="onCodeUpdate"
          :language="language"
          :disabled="isExecuting"
          :readonly="isReadOnly"
          :fullScreen="true"
          :runningStatus="isExecuting ? 'running' : 'idle'"
          :isPublished="isPublished"
          :autofocus="true"
          :indent-with-tab="true"
          :preserve-indent="true"
          :tab-size="4"
        />
        
        <!-- Subtle overlay for executing state -->
        <div v-if="isExecuting" class="absolute top-2 right-2 z-10">
          <div class="px-2 py-1 bg-primary/90 text-primary-foreground rounded text-xs flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
            <Loader2 class="w-3 h-3 animate-spin" />
            <span>{{ executionTimeText || 'Running' }}</span>
          </div>
        </div>
      </div>

      <!-- Enhanced resize handle -->
      <div
        v-if="!isOutputFullscreen && isCodeVisible"
        class="group w-1 cursor-col-resize hover:w-1.5 active:w-2 transition-all duration-200 bg-border/50 hover:bg-border active:bg-primary/50 flex items-center justify-center relative"
        @mousedown="startResize"
        aria-hidden="true"
      >
        <!-- Subtle grip indicator -->
        <div class="absolute inset-y-0 w-px bg-background/20 group-hover:bg-background/40 transition-colors"></div>
      </div>

      <!-- Output Section -->
      <div 
        class="flex flex-col h-full transition-all" 
        :style="outputContainerStyle"
      >
        <OutputSection
          :hasOutput="!!output"
          :hasError="outputType === 'error'"
          :isReadOnly="isReadOnly || false"
          :isPublished="isPublished || false"
          :isExecuting="isExecuting || false"
          :output="output || undefined"
          :code="code"
          :language="language"
          :blockId="blockId || ''"
          :notaId="notaId || ''"
          :executionTime="executionTime"
          :selectedSession="sessionInfo?.sessionId"
          :selectedKernel="sessionInfo?.kernelName"
          @copy-output="handleCopyOutput"
          @code-updated="handleCodeUpdated"
          @custom-action-executed="handleCustomActionExecuted"
          @trigger-execution="handleTriggerExecution"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the CodeMirror component takes full height */
:deep(.cm-editor) {
  height: 100%;
  position: relative; /* For positioning the loading indicator */
}

:deep(.cm-scroller) {
  height: 100% !important;
}

:deep(.cm-gutters) {
  height: auto !important;
  min-height: 100% !important;
}

/* Enhanced transitions for smooth resizing */
.editor-container > div {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* When actively resizing, disable transitions for better performance */
.editor-container:has(+ .resizing) > div {
  transition: none;
}

/* Published mode styles */
.published-mode {
  background-color: hsl(var(--card));
  backdrop-filter: none;
}

.published-mode .editor-container {
  border-top: 1px solid hsl(var(--border));
}

/* Disabled state styles */
:deep(.cm-editor.cm-disabled) {
  opacity: 0.7;
  background-color: var(--muted);
}

:deep(.cm-editor.cm-disabled .cm-content) {
  cursor: not-allowed;
}

/* Enhanced animations */
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Smooth entrance animation */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-in {
  animation: fade-in 0.2s ease-out;
}

/* Focus states for better accessibility */
:deep(.cm-editor.cm-focused) {
  outline: 2px solid hsl(var(--ring));
  outline-offset: -2px;
}

/* Compact scrollbars for better space utilization */
:deep(.cm-scroller::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.cm-scroller::-webkit-scrollbar-track) {
  background: hsl(var(--muted));
}

:deep(.cm-scroller::-webkit-scrollbar-thumb) {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

:deep(.cm-scroller::-webkit-scrollbar-thumb:hover) {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* Resize handle hover effects */
.group:hover .absolute {
  background-color: hsl(var(--primary) / 0.2);
}
</style>









