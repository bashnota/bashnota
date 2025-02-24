<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import CustomSelect from '@/components/CustomSelect.vue'

const props = defineProps<{
  code: string
  language: string
  result: string | null
  id: string
  serverID: string | null
  kernelName: string | null
  sessionId: string | null
  notaId: string
  kernelPreference?: KernelConfig | null
}>()

const emit = defineEmits(['update:code', 'kernel-select', 'update:output', 'update:session-id'])

const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()
const selectedServer = ref(props.serverID || 'none')
const selectedKernel = ref(props.kernelName || 'none')
const selectedSession = ref(props.sessionId || '')
const codeValue = ref(props.code)
const output = ref(props.result)
const isCodeCopied = ref(false)
const isCodeVisible = ref(true)
const isFullScreen = ref(false)

const { cell, execute, copyOutput, isCopied } = useCodeExecution(props.id)

// Selection states
const isServerOpen = ref(false)
const isKernelOpen = ref(false)
const isSessionOpen = ref(false)

// Get available sessions from store
const availableSessions = computed(() => {
  return codeExecutionStore.getAllSessions
})

// Get root nota for config
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

// Session management methods
const createNewSession = async () => {
  const sessionName = `Session ${availableSessions.value.length + 1}`

  // Create new session
  const sessionId = codeExecutionStore.createSession(sessionName)

  // Select the new session
  selectedSession.value = sessionId
  codeExecutionStore.addCellToSession(props.id, sessionId)
  emit('update:session-id', sessionId)

  // Save sessions to config
  await codeExecutionStore.saveSessions(props.notaId)
}

const handleSessionChange = async () => {
  if (selectedSession.value) {
    codeExecutionStore.addCellToSession(props.id, selectedSession.value)
    emit('update:session-id', selectedSession.value)
    await codeExecutionStore.saveSessions(props.notaId)
  }
}

// Initialize component
onMounted(async () => {
  // Load any kernel preferences
  if (props.kernelPreference) {
    selectedServer.value = props.kernelPreference.serverId || 'none'
  }

  // If this cell has a session, make sure it's selected
  if (props.sessionId) {
    selectedSession.value = props.sessionId
  }
})

// Watch for code changes
watch(
  () => props.code,
  (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
    }
  },
)

// Watch for output changes
watch(
  () => cell.value?.output,
  (newOutput) => {
    if (!newOutput) return
    if (newOutput !== output.value) {
      output.value = newOutput
      emit('update:output', newOutput)
    }
  },
)

// Watch for session changes from parent
watch(
  () => props.sessionId,
  (newSessionId) => {
    if (newSessionId && newSessionId !== selectedSession.value) {
      selectedSession.value = newSessionId
    }
  },
)

const handleExecution = async () => {
  await execute()
  emit('update:output', cell.value?.output || '')
}

const updateCode = (newCode: string) => {
  codeValue.value = newCode
  emit('update:code', newCode)
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

const handleFullScreen = () => {
  isFullScreen.value = true
}
</script>

<template>
  <div class="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
    <div
      class="flex items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <!-- Session Selector -->
      <Popover v-model:open="isSessionOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="gap-2 h-8 relative"
            :class="{ 'bg-red-500/20 hover:bg-red-500/30': !selectedSession }"
            :title="selectedSession ? 'Current Session' : 'Select Session'"
          >
            <Layers class="h-4 w-4" />
            <span
              v-if="selectedSession"
              class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
            ></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <div class="p-1 border-t">
            <Button size="sm" variant="outline" class="w-full gap-2" @click="createNewSession">
              <Plus class="h-4 w-4" />
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
              (value) => {
                selectedSession = value
                handleSessionChange()
                isSessionOpen = false
              }
            "
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="sm"
        class="gap-2 h-8"
        @click="isCodeVisible = !isCodeVisible"
        :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
      >
        <Eye v-if="isCodeVisible" class="h-4 w-4" />
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
              'bg-red-500/20 hover:bg-red-500/30': !selectedServer || selectedServer === 'none',
            }"
            :title="
              selectedServer && selectedServer !== 'none'
                ? `Server: ${selectedServer}`
                : 'Select Server'
            "
          >
            <Server class="h-4 w-4" />
            <span
              v-if="selectedServer && selectedServer !== 'none'"
              class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
            ></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
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
              (value) => {
                selectedServer = value
                emit('kernel-select', selectedKernel, selectedServer)
                isServerOpen = false
              }
            "
          />
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
              'bg-red-500/20 hover:bg-red-500/30': !selectedKernel || selectedKernel === 'none',
              'pl-2 pr-3': selectedKernel && selectedKernel !== 'none',
            }"
            :disabled="!selectedServer || selectedServer === 'none'"
            :title="
              selectedKernel && selectedKernel !== 'none'
                ? `Kernel: ${selectedKernel}`
                : 'Select Kernel'
            "
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
            ></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
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
              (value) => {
                selectedKernel = value
                emit('kernel-select', selectedKernel, selectedServer)
                isKernelOpen = false
              }
            "
          />
        </PopoverContent>
      </Popover>

      <div class="flex-1"></div>

      <!-- Run Button -->
      <Button
        variant="default"
        size="sm"
        :disabled="cell?.isExecuting || selectedKernel === 'none'"
        @click="handleExecution"
        class="h-8"
        :title="cell?.isExecuting ? 'Executing...' : 'Run Code'"
      >
        <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="cell?.isExecuting" />
        <Play class="w-4 h-4 mr-2" v-else />
        Run
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="h-8 w-8 p-0"
        @click="handleFullScreen"
        title="Full Screen Mode"
      >
        <Maximize2 class="h-4 w-4" />
      </Button>
    </div>

    <!-- Code Section -->
    <div v-show="isCodeVisible" class="relative group">
      <div class="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="sm" @click="copyCode" class="h-8 w-8 p-0">
          <Copy v-if="!isCodeCopied" class="h-4 w-4" />
          <Check v-else class="h-4 w-4" />
        </Button>
      </div>

      <CodeMirror
        v-model="codeValue"
        :language="language"
        :disabled="cell?.isExecuting"
        @update:modelValue="updateCode"
      />
    </div>

    <!-- Output Section -->
    <div v-if="cell?.output" class="border-t">
      <div class="flex items-center justify-between p-2 border-b">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Output
        </span>
        <Button variant="ghost" size="sm" @click="copyOutput" class="h-6 w-6 p-0">
          <Copy v-if="!isCopied" class="h-3 w-3" />
          <Check v-else class="h-3 w-3" />
        </Button>
      </div>
      <div
        class="text-sm whitespace-pre-wrap break-words p-4"
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': cell?.hasError }"
        v-html="cell?.output"
      ></div>
    </div>

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
</style>
