<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
import { Copy, Check, Play } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'

const props = defineProps<{
  code: string
  language: string
  notaId: string
  kernelPreference?: KernelConfig | null
}>()

const emit = defineEmits(['update:code', 'kernel-select'])

const store = useNotaStore()
const selectedServer = ref('none')
const selectedKernel = ref('none')
const codeValue = ref(props.code)
const isCodeCopied = ref(false)

// Use the codeValue ref for code execution
const { output, isExecuting, hasError, execute, copyOutput, isCopied } = useCodeExecution(codeValue)

// Get the root nota ID to access config
const rootNotaId = computed(() => {
  const currentNota = store.getCurrentNota(props.notaId)
  if (!currentNota?.parentId) return props.notaId
  return store.getRootNotaId(currentNota.parentId)
})

// Use root nota's configuration
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

// Get available servers
const availableServers = computed(() => {
  return notaConfig.value.jupyterServers.map((server) => ({
    ...server,
    displayName: `${server.ip}:${server.port}`,
  }))
})

// Get available kernels for selected server
const availableKernels = computed(() => {
  if (!selectedServer.value || selectedServer.value === 'none') return []
  return notaConfig.value.kernels[selectedServer.value] || []
})

// Get the current server object
const currentServer = computed(() => {
  return availableServers.value.find((s) => s.ip === selectedServer.value)
})

// Initialize
onMounted(async () => {
  if (props.kernelPreference) {
    selectedServer.value = props.kernelPreference.serverId || 'none'
  }
})

// Watch for server changes and reset kernel
watch(selectedServer, (newServer) => {
  selectedKernel.value = 'none'
  if (newServer && newServer !== 'none' && props.kernelPreference?.kernelName) {
    const kernel = availableKernels.value.find((k) => k.name === props.kernelPreference?.kernelName)
    if (kernel) {
      selectedKernel.value = kernel.name
      emit('kernel-select', kernel.name, newServer)
    }
  }
})

// Watch for external code changes
watch(
  () => props.code,
  (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
    }
  },
)

const handleExecution = async () => {
  if (!currentServer.value) {
    output.value = 'Invalid server selection'
    hasError.value = true
    return
  }

  isExecuting.value = true
  try {
    await execute(currentServer.value, selectedKernel.value)
  } catch (error) {
    console.error('Execution error:', error)
    output.value = error instanceof Error ? error.message : 'Execution failed'
    hasError.value = true
  } finally {
    isExecuting.value = false
  }
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
    <!-- Header with Server/Kernel Selection -->
    <div
      class="flex items-center gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div class="flex-1 grid grid-cols-2 gap-3">
        <!-- Server Selection -->
        <div class="relative">
          <select
            v-model="selectedServer"
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
        :disabled="isExecuting || selectedKernel === 'none'"
        @click="handleExecution"
        class="min-w-[80px]"
      >
        <Play v-if="!isExecuting" class="w-4 h-4 mr-2" />
        <span>{{ isExecuting ? 'Running...' : 'Run' }}</span>
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
        :disabled="isExecuting"
        @update:modelValue="updateCode"
      />
    </div>

    <!-- Output Section -->
    <div v-if="output" class="border-t">
      <div class="flex items-center justify-between p-2 border-b">
        <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >Output</span
        >
        <Button variant="ghost" size="sm" @click="copyOutput" class="h-6 w-6 p-0">
          <Copy v-if="!isCopied" class="h-3 w-3" />
          <Check v-else class="h-3 w-3" />
        </Button>
      </div>
      <div
        class="font-mono text-sm whitespace-pre-wrap break-words p-4"
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': hasError }"
      >
        {{ output }}
      </div>
    </div>
  </div>
</template>
