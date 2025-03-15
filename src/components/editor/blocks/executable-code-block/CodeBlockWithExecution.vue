<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
import { useCodeBlock } from './composables/useCodeBlock'
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
import OutputRenderer from './OutputRenderer.vue'
import AiCodeFixer from './AiCodeFixer.vue'

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
  isReadOnly?: boolean
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

// Initialize code block composable
const {
  // State
  codeValue,
  hasUnsavedChanges,
  isFullScreen,
  executionInProgress,
  isCodeCopied,
  
  // Toolbar state
  isServerOpen,
  isKernelOpen,
  isSessionOpen,
  isCodeVisible,
  selectedServer,
  selectedKernel,
  selectedSession,
  isSettingUp,
  
  // Computed
  isReadyToExecute,
  availableSessions,
  notaConfig,
  availableServers,
  availableKernels,
  
  // Methods
  createNewSession,
  executeCode,
  updateCode,
  saveChanges,
  copyCode,
  handleServerSelect,
  handleKernelSelect,
  handleSessionSelect,
  toggleCodeVisibility,
  
  // AI Fixer
  isOpen: isAiFixerOpen,
  handleFixRequest,
  applyFix,
  close: closeAiFixer,
} = useCodeBlock({
  code: props.code,
  id: props.id,
  notaId: props.notaId,
  serverID: props.serverID,
  kernelName: props.kernelName,
  sessionId: props.sessionId,
  kernelPreference: props.kernelPreference,
  isReadOnly: props.isReadOnly,
  onUpdate: (code: string) => emit('update:code', code),
  onKernelSelect: (kernelName: string, serverId: string) => emit('kernel-select', kernelName, serverId),
  onUpdateOutput: (output: string) => emit('update:output', output),
  onUpdateSessionId: (sessionId: string) => emit('update:session-id', sessionId),
})

// Stores
const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()

// Computed properties
const rootNotaId = computed(() => {
  const currentNota = store.getCurrentNota(props.notaId)
  if (!currentNota?.parentId) return props.notaId
  return store.getRootNotaId(currentNota.parentId)
})

// Utils
const showConsoleMessage = (
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning',
) => {
  const logPrefix = `[${type.toUpperCase()}] ${title}: `
  if (type === 'error') {
    console.error(logPrefix, message)
  } else if (type === 'warning') {
    console.warn(logPrefix, message)
  } else {
    console.log(logPrefix, message)
  }
}

// Lifecycle hooks
onMounted(async () => {
  await nextTick()
  if (codeBlockRef.value && !props.isReadOnly) {
    const editor = codeBlockRef.value.querySelector('.cm-editor')
    if (editor) {
      ;(editor as HTMLElement).focus()
    }
  }
})

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

// Template helpers
const handleServerChange = (value: string) => {
  handleServerSelect(value)
  isServerOpen.value = false
}

const handleKernelChange = (value: string) => {
  handleKernelSelect(value)
  isKernelOpen.value = false
}

const handleSessionChange = (value: string) => {
  handleSessionSelect(value)
  isSessionOpen.value = false
}
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
        <!-- Session Selector - Hide when readonly -->
        <template v-if="!isReadOnly">
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
                <Button
                  size="sm"
                  variant="outline"
                  class="w-full gap-2 h-8"
                  @click="createNewSession"
                  :disabled="isSettingUp"
                >
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
                @select="handleSessionChange"
              />
            </PopoverContent>
          </Popover>
        </template>

        <!-- Code Visibility Toggle -->
        <Button
          variant="outline"
          size="sm"
          class="gap-2 h-8"
          @click="toggleCodeVisibility"
          :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
          aria-label="Toggle code visibility"
        >
          <Eye v-if="!isCodeVisible" class="h-4 w-4" />
          <EyeOff v-else class="h-4 w-4" />
        </Button>

        <!-- Server Selector - Hide when readonly -->
        <template v-if="!isReadOnly">
          <Popover v-model:open="isServerOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="gap-2 h-8 relative"
                :class="{
                  'bg-amber-500/20 hover:bg-amber-500/30':
                    !selectedServer || selectedServer === 'none',
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
                @select="handleServerChange"
              />
              <div
                v-if="availableServers.length === 0"
                class="p-3 text-sm text-center text-muted-foreground"
              >
                No servers available. Configure servers in the settings.
              </div>
            </PopoverContent>
          </Popover>
        </template>

        <!-- Kernel Selector - Keep button but hide popover content when readonly -->
        <Popover v-model:open="isKernelOpen">
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="gap-2 h-8 relative min-w-[32px]"
              :class="{
                'bg-amber-500/20 hover:bg-amber-500/30':
                  !selectedKernel || selectedKernel === 'none',
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
            v-if="!isReadOnly"
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
              @select="handleKernelChange"
            />
            <div
              v-if="availableKernels.length === 0"
              class="p-3 text-sm text-center text-muted-foreground"
            >
              No kernels available. Select a server first.
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div class="flex-1"></div>

      <!-- Right toolbar group -->
      <div class="flex items-center gap-2">
        <!-- Keyboard shortcuts (hidden in readonly) -->
        <div
          v-if="!isReadOnly"
          class="hidden md:flex items-center text-xs text-muted-foreground mr-1 gap-2"
        >
          <div class="flex items-center">
            <kbd class="px-1.5 py-0.5 border rounded text-[10px]">Ctrl+Shift+Alt+Enter</kbd>
            <span class="ml-1">run</span>
          </div>
          <div class="flex items-center">
            <kbd class="px-1.5 py-0.5 border rounded text-[10px]">Ctrl+S</kbd>
            <span class="ml-1">save</span>
          </div>
        </div>

        <!-- Save Changes Button (hidden in readonly) -->
        <Button
          v-if="!isReadOnly && hasUnsavedChanges"
          variant="outline"
          size="sm"
          @click="saveChanges"
          class="h-8"
          title="Save changes"
          aria-label="Save changes"
        >
          <Save class="w-4 h-4" />
        </Button>

        <!-- Copy button (always available) -->
        <Button
          variant="outline"
          size="sm"
          @click="copyCode"
          class="h-8"
          title="Copy code"
          aria-label="Copy code"
        >
          <Copy v-if="!isCodeCopied" class="w-4 h-4" />
          <Check v-else class="w-4 h-4" />
        </Button>

        <!-- Run Code Button (hidden in readonly) -->
        <Button
          v-if="!isReadOnly"
          variant="default"
          size="sm"
          :disabled="!isReadyToExecute"
          @click="executeCode"
          class="h-8"
          :title="cell?.isExecuting ? 'Executing...' : 'Run Code'"
          aria-label="Run code"
        >
          <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="cell?.isExecuting" />
          <Play class="w-4 h-4 mr-2" v-else />
          Run
        </Button>

        <!-- Fullscreen Button (always available, even in readonly) -->
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0"
          @click="isFullScreen = true"
          title="Full Screen Mode"
          aria-label="Full screen mode"
        >
          <Maximize2 class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Warning Banner (hidden in readonly) -->
    <div
      v-if="
        !isReadOnly &&
        (!selectedServer ||
          selectedServer === 'none' ||
          !selectedKernel ||
          selectedKernel === 'none')
      "
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
        :disabled="cell?.isExecuting || isReadOnly"
        :readonly="isReadOnly"
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
      <OutputRenderer
        ref="outputRendererRef"
        :content="cell.output"
        :type="cell?.hasError ? 'error' : undefined"
        :showControls="true"
        :isCollapsible="true"
        :maxHeight="'300px'"
        :originalCode="codeValue"
        @copy="copyOutput"
        @fix-with-ai="handleFixRequest"
      />
    </div>

    <!-- Fullscreen Modal -->
    <FullScreenCodeBlock
      v-if="isFullScreen"
      v-model:code="codeValue"
      :output="cell?.output || null"
      :outputType="cell?.hasError ? 'error' : undefined"
      :language="language"
      v-model:isOpen="isFullScreen"
      :is-executing="cell?.isExecuting"
      :is-read-only="isReadOnly"
      @execute="executeCode"
    />
    
    <!-- AI Code Fixer -->
    <AiCodeFixer
      v-if="isAiFixerOpen"
      :original-code="codeValue"
      :error-output="cell?.output || ''"
      :is-open="isAiFixerOpen"
      :language="language"
      @close="closeAiFixer"
      @apply-fix="applyFix"
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
</style>
