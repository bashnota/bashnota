<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
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
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import CustomSelect from '@/components/CustomSelect.vue'

// Types
interface Props {
  code: string
  language: string
  result: string | null
  id: string
  serverID: string | null
  kernelName: string | null
  sessionId: string | null
  notaId: string
  kernelPreference?: KernelConfig | null
}

interface KeyboardShortcut {
  keys: string
  action: string
  handler: () => void
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

// Utils
const showConsoleMessage = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
  const logPrefix = `[${type.toUpperCase()}] ${title}: `
  if (type === 'error') {
    console.error(logPrefix, message)
  } else if (type === 'warning') {
    console.warn(logPrefix, message)
  } else {
    console.log(logPrefix, message)
  }
}

// Stores
const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()

// Component state
// Server configuration
const selectedServer = ref(props.serverID || 'none')
const isServerOpen = ref(false)

// Kernel configuration
const selectedKernel = ref(props.kernelName || 'none')
const isKernelOpen = ref(false)

// Session management
const selectedSession = ref(props.sessionId || '')
const isSessionOpen = ref(false)
const isSettingUp = ref(false)

// UI state
const isCodeVisible = ref(true)
const isOutputVisible = ref(true)
const isFullScreen = ref(false)
const codeBlockRef = ref<HTMLElement | null>(null)

// Code state
const codeValue = ref(props.code)
const lastSavedCode = ref(props.code)
const isCodeCopied = ref(false)
const isOutputCopied = ref(false)

// Code execution
const { cell, execute, copyOutput, isCopied } = useCodeExecution(props.id)
const executionInProgress = ref(false)
const originalCodeBeforeExecution = ref('')

// Computed properties
const hasUnsavedChanges = computed(() => codeValue.value !== lastSavedCode.value)

const keyboardShortcuts = computed<KeyboardShortcut[]>(() => [
  { keys: 'Ctrl+Shift+Alt+Enter', action: 'Run code', handler: handleExecution },
  { keys: 'Ctrl+S', action: 'Save changes', handler: saveChanges },
  { keys: 'Ctrl+M', action: 'Toggle fullscreen', handler: () => (isFullScreen.value = !isFullScreen.value) },
])

const availableSessions = computed(() => codeExecutionStore.getAllSessions)

const rootNotaId = computed(() => {
  const currentNota = store.getCurrentNota(props.notaId)
  if (!currentNota?.parentId) return props.notaId
  return store.getRootNotaId(currentNota.parentId)
})

const notaConfig = computed(() => {
  const nota = store.getCurrentNota(rootNotaId.value)
  if (!nota?.config) {
    return {
      jupyterServers: [],
      kernels: {} as Record<string, KernelSpec[]>,
      notebooks: [],
    }
  }
  return nota.config
})

const availableServers = computed(() => {
  return notaConfig.value.jupyterServers.map((server) => ({
    ...server,
    displayName: `${server.ip}:${server.port}`,
  }))
})

const availableKernels = computed(() => {
  if (!selectedServer.value || selectedServer.value === 'none') return []
  return notaConfig.value.kernels[selectedServer.value] || []
})

const isReadyToExecute = computed(() => 
  selectedKernel.value && 
  selectedKernel.value !== 'none' && 
  selectedServer.value && 
  selectedServer.value !== 'none' && 
  !cell.value?.isExecuting
)

// Methods
const createNewSession = async () => {
  try {
    isSettingUp.value = true
    const sessionName = `Session ${availableSessions.value.length + 1}`

    // Create new session
    const sessionId = codeExecutionStore.createSession(sessionName)

    // Select the new session
    selectedSession.value = sessionId
    codeExecutionStore.addCellToSession(props.id, sessionId)
    emit('update:session-id', sessionId)

    // Save sessions to config
    await codeExecutionStore.saveSessions(props.notaId)
    showConsoleMessage('New session created', `Created session: ${sessionName}`, 'success')
  } catch (error) {
    console.error('Failed to create session:', error)
    showConsoleMessage('Error creating session', 'Failed to create new session. Please try again.', 'error')
  } finally {
    isSettingUp.value = false
  }
}

const handleSessionChange = async () => {
  if (selectedSession.value) {
    try {
      isSettingUp.value = true
      codeExecutionStore.addCellToSession(props.id, selectedSession.value)
      emit('update:session-id', selectedSession.value)
      await codeExecutionStore.saveSessions(props.notaId)
    } catch (error) {
      console.error('Failed to change session:', error)
      showConsoleMessage('Error changing session', 'Failed to update session. Please try again.', 'error')
    } finally {
      isSettingUp.value = false
    }
  }
}

const handleExecution = async () => {
  if (!isReadyToExecute.value) {
    if (!selectedServer.value || selectedServer.value === 'none') {
      showConsoleMessage('Server not selected', 'Please select a server before executing code.', 'warning')
      return
    }
    
    if (!selectedKernel.value || selectedKernel.value === 'none') {
      showConsoleMessage('Kernel not selected', 'Please select a kernel before executing code.', 'warning')
      return
    }
    
    return
  }
  
  try {
    // Save the original code to restore after execution if needed
    originalCodeBeforeExecution.value = codeValue.value
    executionInProgress.value = true
    
    await execute()
    emit('update:output', cell.value?.output || '')
    // Save after successful execution
    lastSavedCode.value = codeValue.value
  } catch (error) {
    console.error('Error executing code:', error)
    showConsoleMessage('Execution error', 'An error occurred during code execution.', 'error')
    
    // Restore original code if it was changed during execution
    if (codeValue.value !== originalCodeBeforeExecution.value) {
      codeValue.value = originalCodeBeforeExecution.value
    }
  } finally {
    executionInProgress.value = false
  }
}

const updateCode = (newCode: string) => {
  codeValue.value = newCode
  emit('update:code', newCode)
}

const saveChanges = () => {
  emit('update:code', codeValue.value)
  lastSavedCode.value = codeValue.value
  showConsoleMessage('Changes saved', 'Your code changes have been saved.', 'success')
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(codeValue.value)
    isCodeCopied.value = true
    setTimeout(() => {
      isCodeCopied.value = false
    }, 2000)
    showConsoleMessage('Code copied', 'Code has been copied to clipboard.', 'success')
  } catch (err) {
    console.error('Failed to copy code:', err)
    showConsoleMessage('Failed to copy', 'Could not copy code to clipboard.', 'error')
  }
}

const handleFullScreen = () => {
  isFullScreen.value = true
}

// Event handlers
const handleKeyDown = (e: KeyboardEvent) => {
  // Run code: Ctrl+Shift+Alt+Enter
  if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'Enter') {
    e.preventDefault()
    handleExecution()
    return
  }
  
  // Save changes: Ctrl+S
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    saveChanges()
    return
  }
  
  // Toggle fullscreen: Ctrl+M
  if (e.ctrlKey && e.key === 'm') {
    e.preventDefault()
    isFullScreen.value = !isFullScreen.value
    return
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    if (props.kernelPreference) {
      selectedServer.value = props.kernelPreference.serverId || 'none'
    }

    if (props.sessionId) {
      selectedSession.value = props.sessionId
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    lastSavedCode.value = props.code
  } catch (error) {
    console.error('Error initializing code block:', error)
  }
  
  await nextTick()
  if (codeBlockRef.value) {
    const editor = codeBlockRef.value.querySelector('.cm-editor')
    if (editor) {
      (editor as HTMLElement).focus()
    }
  }
})

// Watchers
watch(
  () => props.code,
  (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
      lastSavedCode.value = newCode
    }
  },
)

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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div 
    ref="codeBlockRef"
    class="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm transition-all duration-200"
    :class="{ 'ring-2 ring-primary': hasUnsavedChanges }"
  >
    <!-- Toolbar -->
    <div
      class="flex flex-wrap items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <!-- Left toolbar group -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Session Selector -->
        <Popover v-model:open="isSessionOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="gap-2 h-8 relative"
              :class="{ 'bg-amber-500/20 hover:bg-amber-500/30': !selectedSession }"
              :title="selectedSession ? 'Current Session' : 'Select Session'"
              aria-label="Session management"
            >
              <Layers class="h-4 w-4" />
              <span
                v-if="selectedSession"
                class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                aria-hidden="true"
              ></span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            class="w-[230px] p-0" 
            align="start"
            :side="'bottom'"
            description="Select or create a new session for code execution"
          >
            <div class="p-2 text-xs font-medium text-muted-foreground">
              Sessions group code execution contexts
            </div>
            <div class="p-1 border-t">
              <Button size="sm" variant="outline" class="w-full gap-2 h-8" @click="createNewSession" :disabled="isSettingUp">
                <Loader2 v-if="isSettingUp" class="h-3 w-3 animate-spin" />
                <Plus v-else class="h-4 w-4" />
                New Session
              </Button>
            </div>
            <CustomSelect
              :options="
                availableSessions.map((session) => ({ value: session.id, label: session.name }))
              "
              :model-value="selectedSession"
              placeholder="Search sessions..."
              :searchable="true"
              @select="
                (value: string) => {
                  selectedSession = value
                  handleSessionChange()
                  isSessionOpen = false
                }
              "
            />
          </PopoverContent>
        </Popover>

        <!-- Code Visibility Toggle -->
        <Button
          variant="outline"
          size="sm"
          class="gap-2 h-8"
          @click="isCodeVisible = !isCodeVisible"
          :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
          aria-label="Toggle code visibility"
        >
          <Eye v-if="!isCodeVisible" class="h-4 w-4" />
          <EyeOff v-else class="h-4 w-4" />
        </Button>

        <!-- Server Selector -->
        <Popover v-model:open="isServerOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="gap-2 h-8 relative"
              :class="{
                'bg-amber-500/20 hover:bg-amber-500/30': !selectedServer || selectedServer === 'none',
              }"
              :title="
                selectedServer && selectedServer !== 'none'
                  ? `Server: ${selectedServer}`
                  : 'Select Server'
              "
              aria-label="Select server"
            >
              <Server class="h-4 w-4" />
              <span
                v-if="selectedServer && selectedServer !== 'none'"
                class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                aria-hidden="true"
              ></span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            class="w-[230px] p-0" 
            align="start"
            :side="'bottom'"
            description="Select a Jupyter server for code execution"
          >
            <div class="p-2 text-xs font-medium text-muted-foreground">
              Select a Jupyter server for code execution
            </div>
            <CustomSelect
              :options="
                availableServers.map((server) => ({
                  value: server.displayName,
                  label: server.displayName,
                }))
              "
              :model-value="selectedServer"
              placeholder="Search servers..."
              :searchable="true"
              @select="
                (value: string) => {
                  selectedServer = value
                  emit('kernel-select', selectedKernel, selectedServer)
                  isServerOpen = false
                }
              "
            />
            <div v-if="availableServers.length === 0" class="p-3 text-sm text-center text-muted-foreground">
              No servers available. Configure servers in the settings.
            </div>
          </PopoverContent>
        </Popover>

        <!-- Kernel Selector -->
        <Popover v-model:open="isKernelOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="gap-2 h-8 relative min-w-[32px]"
              :class="{
                'bg-amber-500/20 hover:bg-amber-500/30': !selectedKernel || selectedKernel === 'none',
                'pl-2 pr-3': selectedKernel && selectedKernel !== 'none',
              }"
              :disabled="!selectedServer || selectedServer === 'none'"
              :title="
                selectedKernel && selectedKernel !== 'none'
                  ? `Kernel: ${selectedKernel}`
                  : 'Select Kernel'
              "
              aria-label="Select kernel"
            >
              <Box class="h-4 w-4" />
              <span
                v-if="selectedKernel && selectedKernel !== 'none'"
                class="ml-1 text-xs font-medium truncate max-w-[60px]"
              >
                {{ selectedKernel }}
              </span>
              <span
                v-if="selectedKernel && selectedKernel !== 'none'"
                class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                aria-hidden="true"
              ></span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            class="w-[230px] p-0" 
            align="start"
            :side="'bottom'"
            :description="`Select a kernel for ${language} code execution`"
          >
            <div class="p-2 text-xs font-medium text-muted-foreground">
              Select a kernel for this language ({{ language }})
            </div>
            <CustomSelect
              :options="
                availableKernels.map((kernel) => ({
                  value: kernel.name,
                  label: kernel.spec.display_name,
                }))
              "
              :model-value="selectedKernel"
              placeholder="Search kernels..."
              :searchable="true"
              @select="
                (value: string) => {
                  selectedKernel = value
                  emit('kernel-select', selectedKernel, selectedServer)
                  isKernelOpen = false
                }
              "
            />
            <div v-if="availableKernels.length === 0" class="p-3 text-sm text-center text-muted-foreground">
              No kernels available. Select a server first.
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div class="flex-1"></div>

      <!-- Right toolbar group -->
      <div class="flex items-center gap-2">
        <div class="hidden md:flex items-center text-xs text-muted-foreground mr-1 gap-2">
          <div class="flex items-center">
            <kbd class="px-1.5 py-0.5 border rounded text-[10px]">Ctrl+Shift+Alt+Enter</kbd>
            <span class="ml-1">run</span>
          </div>
          <div class="flex items-center">
            <kbd class="px-1.5 py-0.5 border rounded text-[10px]">Ctrl+S</kbd>
            <span class="ml-1">save</span>
          </div>
        </div>

        <!-- Save Changes Button -->
        <Button
          v-if="hasUnsavedChanges"
          variant="outline"
          size="sm"
          @click="saveChanges"
          class="h-8"
          title="Save changes"
          aria-label="Save changes"
        >
          <Save class="w-4 h-4" />
        </Button>

        <!-- Run Code Button -->
        <Button
          variant="default"
          size="sm"
          :disabled="!isReadyToExecute"
          @click="handleExecution"
          class="h-8"
          :title="cell?.isExecuting ? 'Executing...' : 'Run Code'"
          aria-label="Run code"
        >
          <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="cell?.isExecuting" />
          <Play class="w-4 h-4 mr-2" v-else />
          Run
        </Button>

        <!-- Fullscreen Button -->
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0"
          @click="handleFullScreen"
          title="Full Screen Mode"
          aria-label="Full screen mode"
        >
          <Maximize2 class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Warning Banner -->
    <div 
      v-if="!selectedServer || selectedServer === 'none' || !selectedKernel || selectedKernel === 'none'"
      class="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 border-b p-2 flex items-center text-xs text-amber-600 dark:text-amber-400"
    >
      <AlertTriangle class="h-3 w-3 mr-2" />
      <span v-if="!selectedServer || selectedServer === 'none'">
        Select a server to run this code block
      </span>
      <span v-else-if="!selectedKernel || selectedKernel === 'none'">
        Select a kernel to run this code block  
      </span>
    </div>

    <!-- Code Editor -->
    <div v-show="isCodeVisible" class="relative group">
      <div class="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <Button 
          variant="ghost" 
          size="sm" 
          @click="copyCode" 
          class="h-8 w-8 p-0" 
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          <Copy v-if="!isCodeCopied" class="h-4 w-4" />
          <Check v-else class="h-4 w-4" />
        </Button>
      </div>

      <CodeMirror
        v-model="codeValue"
        :language="language"
        :disabled="cell?.isExecuting"
        @update:modelValue="updateCode"
        maxHeight="300px"
        aria-label="Code editor"
        :indent-with-tab="true"
        :preserve-indent="true"
        :tab-size="4"
        :line-numbers="true"
        :auto-format="false"
      />
    </div>

    <!-- Output Section -->
    <div v-if="cell?.output" class="border-t">
      <div class="flex items-center justify-between p-2 border-b">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Output
          <span v-if="cell?.hasError" class="ml-2 text-destructive">(Error)</span>
        </span>
        <div class="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="isOutputVisible = !isOutputVisible" 
            class="h-6 w-6 p-0" 
            :title="isOutputVisible ? 'Hide Output' : 'Show Output'"
            aria-label="Toggle output visibility"
          >
            <Eye v-if="!isOutputVisible" class="h-3 w-3" />
            <EyeOff v-else class="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="copyOutput" 
            class="h-6 w-6 p-0"
            title="Copy output to clipboard"
            aria-label="Copy output"
          >
            <Copy v-if="!isCopied" class="h-3 w-3" />
            <Check v-else class="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div
        v-show="isOutputVisible"
        class="text-sm whitespace-pre-wrap break-words p-4 max-h-[300px] overflow-auto"
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': cell?.hasError }"
        v-html="cell?.output"
        role="region"
        aria-label="Code execution output"
        aria-live="polite"
      ></div>
    </div>

    <!-- Fullscreen Modal -->
    <FullScreenCodeBlock
      v-if="isFullScreen"
      :code="codeValue"
      :output="cell?.output"
      :language="language"
      :is-open="isFullScreen"
      :is-executing="cell?.isExecuting"
      @update:is-open="isFullScreen = $event"
      :on-close="() => (isFullScreen = false)"
      :on-update="updateCode"
      :on-execute="handleExecution"
    />
  </div>
</template>

<style scoped>
.cmd-group {
  @apply py-1.5 px-2 text-xs font-semibold text-muted-foreground;
}

.cmd-item {
  @apply relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50;
}

.cmd-empty {
  @apply py-6 text-center text-sm text-muted-foreground;
}

div[v-html] {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
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
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

@media (max-width: 640px) {
  .flex-wrap {
    flex-wrap: wrap;
  }
}

:deep(button:focus-visible),
:deep(div[tabindex]:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

.ring-primary {
  box-shadow: 0 0 0 2px var(--primary-300, rgba(59, 130, 246, 0.3));
}

:deep(.radix-popover-content:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Ensure the CodeMirror instance preserves indentation, especially for Python */
:deep(.cm-editor) {
  height: 100%;
  tab-size: 4 !important;
}

:deep(.cm-line) {
  white-space: pre !important;
}

/* Preserve Python indentation */
:deep(.cm-content[data-language="python"]) {
  tab-size: 4 !important;
}
</style>
