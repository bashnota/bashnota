<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { Button } from '@/ui/button'
import { X, Play, Loader2, Copy, Check, Brain, Box, AlertTriangle, Sparkles } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import OutputRenderer from './OutputRenderer.vue'
import AICodeAssistant from './AICodeAssistant.vue'
import { Badge } from '@/ui/badge'
import { useFullscreenCode } from './composables/useFullscreenCode'
import { useCodeBlockShortcuts } from './composables/useCodeBlockShortcuts'

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

// New reactive state for improved UX
const isCodeCopied = ref(false)
const executionStartTime = ref(0)
const executionTime = ref(0)
const executionTimeInterval = ref<number | null>(null)
const statusMessage = ref<string | null>(null)

// Output/AI view toggle
const activeOutputView = ref<'output' | 'ai'>('output')

// Auto-switch to AI view when there's an error
watch(() => props.outputType, (outputType) => {
  if (outputType === 'error' && !props.isReadOnly && !props.isPublished) {
    activeOutputView.value = 'ai'
  }
}, { immediate: true })

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
  document.addEventListener('keydown', (e) => handleKeyDown(e, onClose, props.isExecuting || false))
  
  // Start execution timer if code is already executing
  if (props.isExecuting) {
    startExecutionTimer()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', endResize)
  document.removeEventListener('keydown', (e) => handleKeyDown(e, onClose, props.isExecuting || false))
  
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

// AI Assistant handlers
const handleAICodeUpdate = (newCode: string) => {
  emit('update:code', newCode)
}

const handleCustomActionExecuted = (actionId: string, result: string) => {
  console.log(`AI action ${actionId} executed with result:`, result)
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
    class="fixed inset-0 z-50 bg-background flex flex-col"
    role="dialog"
    aria-modal="true"
    aria-label="Code Editor"
    :class="{ 'published-mode': isPublished }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b bg-background/90 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          Code Editor
          <span class="text-xs ml-2 text-muted-foreground">{{ language }}</span>
        </h2>
        
        <!-- Execution status indicator -->
        <div v-if="isExecuting || statusMessage" 
             class="flex items-center gap-2 px-2 py-1 rounded-full text-xs"
             :class="isExecuting ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-600 dark:text-green-400'">
          <Loader2 v-if="isExecuting" class="w-3 h-3 animate-spin" />
          <span>{{ isExecuting ? `Executing (${executionTimeText})` : statusMessage }}</span>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Keyboard shortcut help text (hidden in readonly mode) -->
        <div v-if="!isReadOnly" class="hidden sm:flex text-xs text-muted-foreground mr-2">
          <kbd class="px-1.5 py-0.5 border rounded">{{ isMac() ? '⌘' : 'Ctrl' }}+Alt+Shift+Enter</kbd>
          <span class="ml-1">to run</span>
        </div>

        <!-- Copy button -->
        <Button
          variant="outline"
          size="sm"
          @click="copyCode"
          class="h-8"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          <Copy v-if="!isCodeCopied" class="w-4 h-4 mr-1" />
          <Check v-else class="w-4 h-4 mr-1" />
          <span>Copy</span>
        </Button>

        <!-- Run button (hidden when readonly) -->
        <Button
          v-if="!isReadOnly"
          variant="default"
          size="sm"
          :disabled="isExecuting"
          @click="executeCode"
          class="h-8 min-w-[70px]"
          aria-label="Run code"
        >
          <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="isExecuting" />
          <Play class="w-4 h-4 mr-2" v-else />
          {{ isExecuting ? 'Running' : 'Run' }}
        </Button>

        <!-- Close button -->
        <Button variant="ghost" size="icon" @click="onClose" aria-label="Close editor">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 overflow-hidden editor-container">
      <!-- Code Editor -->
      <div 
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
        
        <!-- Overlay for executing state -->
        <div v-if="isExecuting" class="absolute top-0 right-0 m-4 z-10">
          <div class="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs flex items-center gap-2 shadow-md">
            <Loader2 class="w-3 h-3 animate-spin" />
            <span>Executing...</span>
          </div>
        </div>
      </div>

      <!-- Resize handle -->
      <div
        v-if="!isOutputFullscreen"
        class="w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
        @mousedown="startResize"
        aria-hidden="true"
      ></div>

      <!-- Output -->
      <div 
        class="flex flex-col h-full transition-all" 
        :style="outputContainerStyle"
      >
        <!-- Output/AI Toggle Header -->
        <div v-if="output || (!isReadOnly && !isPublished)" class="flex items-center justify-between px-4 py-2 border-b bg-background/50">
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
                :disabled="!output"
              >
                <Box class="w-4 h-4" />
                Output
                <div v-if="outputType === 'error'" class="w-2 h-2 bg-destructive rounded-full"></div>
                <div v-else-if="output" class="w-2 h-2 bg-green-500 rounded-full"></div>
              </button>
              
              <button
                v-if="!isReadOnly && !isPublished && blockId"
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
                <div v-if="outputType === 'error'" class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              </button>
            </div>
            
            <!-- Status Indicator -->
            <div v-if="activeOutputView === 'output' && output" class="text-xs text-muted-foreground">
              {{ outputType === 'error' ? 'Error Output' : 'Execution Result' }}
            </div>
            <div v-else-if="activeOutputView === 'ai'" class="text-xs text-muted-foreground">
              AI-powered code analysis and suggestions
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex items-center gap-1">
            <!-- AI Quick Actions -->
            <div v-if="activeOutputView === 'ai' && !isReadOnly" class="flex items-center gap-1">
              <Button
                v-if="outputType === 'error'"
                variant="ghost"
                size="sm"
                @click="activeOutputView = 'ai'"
                class="h-8 px-2 text-destructive hover:bg-destructive/10"
              >
                <AlertTriangle class="w-4 h-4 mr-1" />
                Fix Error
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                @click="activeOutputView = 'ai'"
                class="h-8 px-2"
              >
                <Sparkles class="w-4 h-4 mr-1" />
                Analyze
              </Button>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden">
          <!-- Output Renderer -->
          <div v-if="activeOutputView === 'output'" class="h-full">
            <OutputRenderer 
              v-if="output"
              :content="output" 
              :type="outputType"
              :showControls="true"
              :isFullscreenable="true"
              :isCollapsible="false"
              :originalCode="code"
              :isLoading="isExecuting"
              :isPublished="isPublished"
              :notaId="props.notaId"
              :blockId="props.blockId"
              class="h-full flex-1"
              @toggle-fullscreen="toggleOutputFullscreen"
            />
            <div v-else-if="isExecuting" class="flex-1 flex flex-col items-center justify-center bg-muted/30 h-full">
              <Loader2 class="w-6 h-6 animate-spin text-primary mb-3" />
              <div class="text-sm text-muted-foreground">Executing code...</div>
              <div class="text-xs text-muted-foreground mt-1">{{ executionTimeText }}</div>
            </div>
            <div v-else class="flex-1 flex items-center justify-center text-sm text-muted-foreground h-full">
              <div class="text-center">
                <Box class="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p class="text-sm">No output yet</p>
                <p class="text-xs mt-1">Run the code to see results</p>
              </div>
            </div>
          </div>
          
          <!-- AI Assistant -->
          <div v-else-if="activeOutputView === 'ai' && blockId" class="h-full">
            <AICodeAssistant
              :code="code"
              :language="language"
              :error="outputType === 'error' ? output : null"
              :is-read-only="isReadOnly"
              :block-id="blockId"
              :is-executing="isExecuting"
              :execution-time="executionTime"
              :has-output="!!output"
              :session-info="sessionInfo"
              :embedded-mode="true"
              @code-updated="handleAICodeUpdate"
              @analysis-started="() => {}"
              @analysis-completed="() => {}"
              @action-executed="handleCustomActionExecuted"
              @trigger-execution="executeCode"
              @request-execution-context="() => {}"
            />
          </div>
        </div>
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

/* Add transition for smooth resizing */
.editor-container > div {
  transition: width 0.2s ease;
}

/* When actively resizing, disable transitions for better performance */
.editor-container:has(+ .resizing) > div {
  transition: none;
}

/* Published mode styles */
.published-mode {
  @apply bg-card;
}

.published-mode .editor-container {
  @apply border-t;
}

/* Disabled state styles */
:deep(.cm-editor.cm-disabled) {
  opacity: 0.7;
  background-color: var(--muted);
}

:deep(.cm-editor.cm-disabled .cm-content) {
  cursor: not-allowed;
}

/* Animation for loading state */
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
</style>









