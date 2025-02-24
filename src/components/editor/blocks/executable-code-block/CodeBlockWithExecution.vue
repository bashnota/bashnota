<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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
  CircleDot,
  Server,
  Layers,
  Box,
  Eye,
  EyeOff,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Sliders,
} from 'lucide-vue-next'
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
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import { parseCodeControls } from '@/utils/codeParser'
import CodeControls from '@/components/editor/blocks/executable-code-block/CodeControls.vue'
import type { CodeFormControl } from '@/types/codeExecution'

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
const showControls = ref(true)

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

// Add to existing refs
const codeControls = computed(() => {
  const controls = parseCodeControls(codeValue.value)
  console.log('📊 Parsed Controls:', controls)
  return controls
})

const formatValue = (control: CodeFormControl) => {
  // Handle string values for select and text types
  if (control.type === 'select' || control.type === 'text') {
    return `"${control.value}"`
  }

  // Handle numeric values for number and slider types
  if (control.type === 'number' || control.type === 'slider') {
    if (control.options?.isFloat) {
      // For floats, ensure decimal point is present
      return parseFloat(control.value).toFixed(1)
    }
    // For integers, round the value
    return Math.round(control.value)
  }

  return control.value
}

const handleControlUpdate = (control: CodeFormControl) => {
  console.log('Control updated:', control)
  // Make sure the code is updated when controls change
  if (codeValue.value !== undefined) {
    updateCode(codeValue.value)
  }
}

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
watch(() => props.code, (newCode) => {
  console.log('📄 Props code changed:', {
    current: codeValue.value,
    new: newCode,
    different: newCode !== codeValue.value
  })
  if (newCode !== codeValue.value) {
    codeValue.value = newCode
  }
})

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
  console.log('📝 UpdateCode called:', {
    current: codeValue.value,
    new: newCode,
    different: newCode !== codeValue.value
  })

  if (newCode !== codeValue.value) {
    codeValue.value = newCode
    emit('update:code', newCode)
    console.log('✅ Code updated successfully')
  }
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

// Add a watch for control updates
watch(codeControls, (newControls) => {
  console.log('👀 Watch triggered - New Controls:', newControls)
  const lines = codeValue.value.split('\n')
  let hasChanges = false

  const updatedLines = lines.map(line => {
    const control = newControls.find(c => {
      const varRegex = new RegExp(`^\\s*${c.name}\\s*=\\s*([^#]*?)(?:\\s*#.*)?$`)
      return varRegex.test(line)
    })

    if (control) {
      hasChanges = true
      let valueStr = ''

      switch (control.type) {
        case 'text':
        case 'datetime':
        case 'color':
        case 'select':
          valueStr = `"${control.value}"`
          break
        case 'checkbox':
          valueStr = control.value ? 'True' : 'False'
          break
        default:
          valueStr = String(control.value)
      }

      const commentMatch = line.match(/(#.*)$/)
      const comment = commentMatch ? ` ${commentMatch[1]}` : ''

      const newLine = `${control.name}=${valueStr}${comment}`
      console.log('📝 Updating line:', {
        original: line,
        new: newLine,
        control: control,
        matched: true
      })
      return newLine
    }
    return line
  })

  if (hasChanges) {
    console.log('✨ Changes detected, updating code')
    const newCode = updatedLines.join('\n')
    updateCode(newCode)
  } else {
    console.log('⚠️ No changes detected in watch', {
      controls: newControls,
      lines: lines
    })
  }
}, { deep: true })

// Add immediate watch for code value changes
watch(codeValue, (newCode) => {
  console.log('Code value changed:', newCode)
  emit('update:code', newCode)
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
    <div
      class="flex items-center gap-2 p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <!-- Session Selector -->
      <Popover v-model:open="isSessionOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="gap-2 h-8 relative"
            :class="{ 'bg-red-500/20 hover:bg-red-500/30': !selectedSession }"
            :title="selectedSession ? 'Current Session' : 'Select Session'">
            <Layers class="h-4 w-4" />
            <span v-if="selectedSession" class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
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
                <CommandItem v-for="session in availableSessions" :key="session.id" :value="session.id" @select="
                  (value) => {
                    if (typeof value.detail.value === 'string') {
                      selectedSession = value.detail.value
                      handleSessionChange()
                    }
                    isSessionOpen = false
                  }
                ">
                  <CircleDot class="h-4 w-4 mr-2 text-5xl"
                    :class="selectedSession === session.id ? 'opacity-100' : 'opacity-0'" />
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
          <Button variant="outline" size="sm" class="gap-2 h-8 relative"
            :class="{ 'bg-red-500/20 hover:bg-red-500/30': !selectedServer || selectedServer === 'none' }"
            :title="selectedServer && selectedServer !== 'none' ? `Server: ${selectedServer}` : 'Select Server'">
            <Server class="h-4 w-4" />
            <span v-if="selectedServer && selectedServer !== 'none'"
              class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search servers..." />
            <CommandList>
              <CommandEmpty>No servers found.</CommandEmpty>
              <CommandGroup>
                <CommandItem v-for="server in availableServers" :key="server.displayName" :value="server.displayName"
                  @select="
                    (value) => {
                      if (typeof value.detail.value === 'string') {
                        selectedServer = value.detail.value
                        emit('kernel-select', selectedKernel, selectedServer)
                      }
                      isServerOpen = false
                    }
                  ">
                  <CircleDot class="h-4 w-4 mr-2"
                    :class="selectedServer === server.displayName ? 'opacity-100' : 'opacity-0'" />
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
          <Button variant="outline" size="sm" class="gap-2 h-8 relative min-w-[32px]" :class="{
            'bg-red-500/20 hover:bg-red-500/30': !selectedKernel || selectedKernel === 'none',
            'pl-2 pr-3': selectedKernel && selectedKernel !== 'none'
          }" :disabled="!selectedServer || selectedServer === 'none'"
            :title="selectedKernel && selectedKernel !== 'none' ? `Kernel: ${selectedKernel}` : 'Select Kernel'">
            <Box class="h-4 w-4" />
            <span v-if="selectedKernel && selectedKernel !== 'none'"
              class="ml-1 text-xs font-medium truncate max-w-[60px]">
              {{ selectedKernel }}
            </span>
            <span v-if="selectedKernel && selectedKernel !== 'none'"
              class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search kernels..." />
            <CommandList>
              <CommandEmpty>No kernels found.</CommandEmpty>
              <CommandGroup>
                <CommandItem v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name" @select="
                  (value) => {
                    if (typeof value.detail.value === 'string') {
                      selectedKernel = value.detail.value
                      emit('kernel-select', selectedKernel, selectedServer)
                    }
                    isKernelOpen = false
                  }
                ">
                  <CircleDot class="h-4 w-4 mr-2"
                    :class="selectedKernel === kernel.name ? 'opacity-100' : 'opacity-0'" />
                  {{ kernel.spec.display_name }}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div class="flex-1"></div>

      <!-- Control visibility buttons -->
      <Button v-if="codeControls.length > 0" variant="outline" size="sm" class="h-8 w-8 p-0"
        @click="showControls = !showControls" :title="showControls ? 'Hide Controls' : 'Show Controls'">
        <Sliders class="h-4 w-4" :class="{ 'opacity-50': !showControls }" />
      </Button>

      <Button variant="outline" size="sm" class="h-8 w-8 p-0" @click="isCodeVisible = !isCodeVisible"
        :title="isCodeVisible ? 'Hide Code' : 'Show Code'">
        <Eye v-if="isCodeVisible" class="h-4 w-4" />
        <EyeOff v-else class="h-4 w-4" />
      </Button>

      <!-- Run Button -->
      <Button variant="default" size="sm" :disabled="cell?.isExecuting || selectedKernel === 'none'"
        @click="handleExecution" class="h-8" :title="cell?.isExecuting ? 'Executing...' : 'Run Code'">
        <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="cell?.isExecuting" />
        <Play class="w-4 h-4 mr-2" v-else />
        Run
      </Button>

      <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="handleFullScreen" title="Full Screen Mode">
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

      <CodeControls v-if="codeControls.length > 0" v-show="showControls" :controls="codeControls" :code="codeValue"
        @update:code="updateCode" @update:control="handleControlUpdate" />

      <CodeMirror v-model="codeValue" :language="language" :disabled="cell?.isExecuting"
        @update:modelValue="updateCode" />
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
      <div class="text-sm whitespace-pre-wrap break-words p-4"
        :class="{ 'bg-red-50 dark:bg-red-950 text-destructive dark:text-red-200': cell?.hasError }"
        v-html="cell?.output"></div>
    </div>

    <FullScreenCodeBlock v-if="isFullScreen" :code="codeValue" :output="cell?.output" :language="language"
      :is-open="isFullScreen" :is-executing="cell?.isExecuting" @update:is-open="isFullScreen = $event"
      :on-close="() => isFullScreen = false" :on-update="updateCode" :on-execute="handleExecution" />
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
