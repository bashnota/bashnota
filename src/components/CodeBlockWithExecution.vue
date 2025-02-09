<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import type { KernelConfig } from '@/types/jupyter'
import { Copy, Check, Play } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  code: string
  language: string
  notaId: string
  kernelPreference?: KernelConfig | null
}>()

const emit = defineEmits(['update:code', 'kernel-select'])

const store = useNotaStore()
const route = useRoute()
const selectedServer = ref('none')
const selectedKernel = ref('none')
const codeValue = ref(props.code)
const isCodeCopied = ref(false)

// Use the codeValue ref for code execution
const { output, isExecuting, hasError, execute, copyOutput, isCopied } = useCodeExecution(codeValue)

// Get the parent nota ID if we're on a page
const parentNotaId = computed(() => {
  if (route.name === 'page') {
    const page = store.getCurrentPage(props.notaId)
    return page?.parentId
  }
  return props.notaId
})

// Get the nota's configuration
const notaConfig = computed(() => {
  const nota = store.getCurrentNota(parentNotaId.value)
  if (!nota?.config) {
    return {
      jupyterServers: [],
      kernels: {},
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

// Load initial configuration
const loadConfig = async () => {
  await store.loadNotas()
  await store.loadPages() // Also load pages to get parent relationships
}

// Initialize
onMounted(async () => {
  await loadConfig()
  if (props.kernelPreference) {
    selectedServer.value = props.kernelPreference.serverId || 'none'
    // Kernel will be selected in the server watch handler if available
  }
})

// Watch for server changes and reset kernel
watch(selectedServer, (newServer) => {
  selectedKernel.value = 'none'
  if (newServer && newServer !== 'none' && props.kernelPreference?.kernelName) {
    // Try to select the same kernel on the new server if available
    const kernel = availableKernels.value.find((k) => k.name === props.kernelPreference?.kernelName)
    if (kernel) {
      selectedKernel.value = kernel.name
      emit('kernel-select', kernel.name, newServer)
    }
  }
})

// Watch for route changes to reload configuration
watch(
  () => route.params.id,
  async () => {
    await loadConfig()
  },
)

// Watch for external code changes
watch(
  () => props.code,
  (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
    }
  },
)

// Update kernel selection handler
const handleKernelSelect = (kernel: string) => {
  if (kernel === 'none') return
  selectedKernel.value = kernel
  if (selectedServer.value && selectedServer.value !== 'none') {
    emit('kernel-select', kernel, selectedServer.value)
  }
}

// Use selected kernel for execution
const executeCode = async () => {
  if (selectedKernel.value === 'none') {
    output.value = 'Please select a kernel first'
    return
  }

  if (selectedServer.value === 'none') {
    output.value = 'Please select a server first'
    return
  }

  if (!currentServer.value) {
    output.value = 'Invalid server selection'
    return
  }

  isExecuting.value = true
  try {
    await execute(currentServer.value, selectedKernel.value)
  } catch (error) {
    console.error('Execution error:', error)
    output.value = error instanceof Error ? error.message : 'Execution failed'
  } finally {
    isExecuting.value = false
  }
}

const updateCode = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  codeValue.value = textarea.value
  emit('update:code', textarea.value)
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
        <Select :model-value="selectedServer" @update:model-value="selectedServer = $event">
          <SelectTrigger>
            <SelectValue :placeholder="selectedServer === 'none' ? 'Select Server' : undefined" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" class="text-muted-foreground">Select Server</SelectItem>
            <SelectItem v-for="server in availableServers" :key="server.ip" :value="server.ip">
              {{ server.displayName }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Kernel Selection -->
        <Select
          :model-value="selectedKernel"
          @update:model-value="selectedKernel = $event"
          :disabled="!selectedServer || selectedServer === 'none'"
        >
          <SelectTrigger>
            <SelectValue :placeholder="selectedKernel === 'none' ? 'Select Kernel' : undefined" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" class="text-muted-foreground">Select Kernel</SelectItem>
            <SelectItem v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name">
              {{ kernel.display_name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Action Buttons -->
      <Button
        variant="default"
        size="sm"
        :disabled="isExecuting || selectedKernel === 'none'"
        @click="executeCode"
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

      <Textarea
        v-model="codeValue"
        class="font-mono resize-y min-h-[120px] p-4 rounded-none border-0 bg-background/50"
        :class="{ 'opacity-50 cursor-wait': isExecuting }"
        @input="updateCode"
        spellcheck="false"
      />
    </div>

    <!-- Output Section -->
    <div v-if="output" class="border-t">
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
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': hasError }"
      >
        {{ output }}
      </div>
    </div>
  </div>
</template>
