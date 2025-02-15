<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
import { Copy, Check, Play, Loader2, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'

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

const { cell, execute, copyOutput, isCopied } = useCodeExecution(props.id)

// Get available sessions
const availableSessions = computed(() => {
  return codeExecutionStore.getAllSessions
})

// Rest of your computed properties
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
const createNewSession = () => {
  const sessionCount = availableSessions.value.length + 1
  const sessionId = codeExecutionStore.createSession(`Session ${sessionCount}`)
  selectedSession.value = sessionId
  codeExecutionStore.addCellToSession(props.id, sessionId)
  emit('update:session-id', sessionId)
}

const handleSessionChange = () => {
  if (selectedSession.value) {
    codeExecutionStore.addCellToSession(props.id, selectedSession.value)
    emit('update:session-id', selectedSession.value)
  }
}

// Initialize
onMounted(async () => {
  if (props.kernelPreference) {
    selectedServer.value = props.kernelPreference.serverId || 'none'
  }
})

watch(
  () => props.code,
  (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
    }
  },
)

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
</script>

<template>
  <div class="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
    <div
      class="flex items-center gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div class="flex-1 grid grid-cols-3 gap-3">
        <!-- Session Selection -->
        <div class="flex gap-2">
          <select
            v-model="selectedSession"
            @change="handleSessionChange"
            class="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" class="text-muted-foreground">Select Session</option>
            <option
              v-for="session in availableSessions"
              :key="session.id"
              :value="session.id"
              class="text-foreground"
            >
              {{ session.name }}
            </option>
          </select>
          <Button variant="outline" size="sm" @click="createNewSession" class="h-9 w-9 p-0">
            <Plus class="h-4 w-4" />
          </Button>
        </div>

        <!-- Server Selection -->
        <div class="relative">
          <select
            v-model="selectedServer"
            @change="() => emit('kernel-select', selectedKernel, selectedServer)"
            class="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="none" class="text-muted-foreground">Select Server</option>
            <option
              v-for="server in availableServers"
              :key="server.ip"
              :value="server.ip"
              class="text-foreground"
            >
              {{ server.displayName }}
            </option>
          </select>
        </div>

        <!-- Kernel Selection -->
        <div class="relative">
          <select
            v-model="selectedKernel"
            @change="() => emit('kernel-select', selectedKernel, selectedServer)"
            :disabled="!selectedServer || selectedServer === 'none'"
            class="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="none" class="text-muted-foreground">Select Kernel</option>
            <option
              v-for="kernel in availableKernels"
              :key="kernel.name"
              :value="kernel.name"
              class="text-foreground"
            >
              {{ kernel.spec.display_name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Action Buttons -->
      <Button
        variant="default"
        size="sm"
        :disabled="cell?.isExecuting || selectedKernel === 'none'"
        @click="handleExecution"
        class="min-w-[80px]"
      >
        <Loader2 class="w-5 h-5 animate-spin mr-2" v-if="cell?.isExecuting" />
        <Play class="w-4 h-4 mr-2" v-else />
        Run
      </Button>
    </div>

    <!-- Code Section -->
    <div class="relative group">
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
        class="font-mono text-sm whitespace-pre-wrap break-words p-4"
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': cell?.hasError }"
        v-html="cell?.output"
      ></div>
    </div>
  </div>
</template>
