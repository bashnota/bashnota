<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { KernelConfig, KernelSpec } from '@/types/jupyter'
import { Copy, Check, Play, Loader2, Plus, CircleDot, Server, Layers, Box } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import Command from '@/components/ui/command/Command.vue'
import CommandInput from '@/components/ui/command/CommandInput.vue'
import CommandEmpty from '@/components/ui/command/CommandEmpty.vue'
import CommandGroup from '@/components/ui/command/CommandGroup.vue'
import CommandItem from '@/components/ui/command/CommandItem.vue'
import CommandList from '@/components/ui/command/CommandList.vue'

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

// Selection states and labels
const isServerOpen = ref(false)
const isKernelOpen = ref(false)
const isSessionOpen = ref(false)

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
      class="flex items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <!-- Session Selector -->
      <Popover v-model:open="isSessionOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="gap-2 h-8">
            <Layers class="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search sessions..." />
            <div class="p-1 border-t">
              <Button size="sm" variant="outline" class="w-full gap-2" @click="createNewSession">
                <Plus class="h-4 w-4" />
                New Session
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>No sessions found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="session in availableSessions"
                  :key="session.id"
                  :value="session.id"
                  @select="
                    (value) => {
                      if (typeof value.detail.value === 'string') {
                        selectedSession = value.detail.value
                        handleSessionChange()
                      }
                      isSessionOpen = false
                    }
                  "
                >
                  <CircleDot
                    class="h-4 w-4 mr-2 text-5xl"
                    :class="selectedSession === session.id ? 'opacity-100' : 'opacity-0'"
                  />
                  {{ session.name }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <!-- Server Selector -->
      <Popover v-model:open="isServerOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="gap-2 h-8">
            <Server class="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search servers..." />
            <CommandList>
              <CommandEmpty>No servers found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="server in availableServers"
                  :key="server.displayName"
                  :value="server.displayName"
                  @select="
                    (value) => {
                      if (typeof value.detail.value === 'string') {
                        selectedServer = value.detail.value
                        emit('kernel-select', selectedKernel, selectedServer)
                      }
                      isServerOpen = false
                    }
                  "
                >
                  <CircleDot
                    class="h-4 w-4 mr-2"
                    :class="selectedServer === server.displayName ? 'opacity-100' : 'opacity-0'"
                  />
                  {{ server.displayName }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <!-- Kernel Selector -->
      <Popover v-model:open="isKernelOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="gap-2 h-8"
            :disabled="!selectedServer || selectedServer === 'none'"
          >
            <Box class="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search kernels..." />
            <CommandList>
              <CommandEmpty>No kernels found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="kernel in availableKernels"
                  :key="kernel.name"
                  :value="kernel.name"
                  @select="
                    (value) => {
                      if (typeof value.detail.value === 'string') {
                        selectedKernel = value.detail.value
                        emit('kernel-select', selectedKernel, selectedServer)
                      }
                      isKernelOpen = false
                    }
                  "
                >
                  <CircleDot
                    class="h-4 w-4 mr-2"
                    :class="selectedKernel === kernel.name ? 'opacity-100' : 'opacity-0'"
                  />
                  {{ kernel.spec.display_name }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
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
      >
        <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="cell?.isExecuting" />
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
