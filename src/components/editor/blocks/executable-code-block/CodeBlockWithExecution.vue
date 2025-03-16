<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecution } from '@/composables/useCodeExecution'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { JupyterService } from '@/services/jupyterService'
import type { KernelConfig, KernelSpec, JupyterServer } from '@/types/jupyter'
import { useCodeBlockToolbar } from './composables/useCodeBlockToolbar'
import { useCodeBlockShortcuts } from './composables/useCodeBlockShortcuts'
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
  Cpu,
  RotateCw,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CodeMirror from './CodeMirror.vue'
import Popover from '@/components/ui/popover/Popover.vue'
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue'
import PopoverContent from '@/components/ui/popover/PopoverContent.vue'
import FullScreenCodeBlock from './FullScreenCodeBlock.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import OutputRenderer from './OutputRenderer.vue'

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

// Initialize code block composables
const {
  // Toolbar state
  isServerOpen,
  isKernelOpen,
  isSessionOpen,
  isCodeVisible,
  selectedServer,
  selectedKernel,
  selectedSession,
  isSettingUp,
  
  // Methods
  handleServerSelect,
  handleKernelSelect,
  handleSessionSelect,
  toggleCodeVisibility,
} = useCodeBlockToolbar({
  isReadOnly: props.isReadOnly,
  onServerSelect: (serverId: string) => emit('kernel-select', selectedKernel.value, serverId),
  onKernelSelect: (kernelName: string) => emit('kernel-select', kernelName, selectedServer.value),
  onSessionSelect: (sessionId: string) => emit('update:session-id', sessionId),
})

// Code state
const codeValue = ref(props.code)
const hasUnsavedChanges = ref(false)
const isFullScreen = ref(false)
const executionInProgress = ref(false)
const isCodeCopied = ref(false)

// Computed
const isReadyToExecute = computed(() => {
  return !executionInProgress.value && selectedServer.value && selectedServer.value !== 'none' && selectedKernel.value
})

const availableServers = computed(() => store.getCurrentNota(props.notaId)?.config?.jupyterServers || [])
const availableSessions = ref<Array<{ id: string; name: string; kernel: { name: string; id: string } }>>([])
const availableKernels = ref<Array<KernelSpec>>([])
const runningKernels = ref<Array<{
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}>>([])

// Stores
const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()
const executionService = new CodeExecutionService()
const jupyterService = new JupyterService()

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

// Add this after component refs
const loadSavedPreferences = () => {
  const currentNota = store.getCurrentNota(props.notaId)
  const preferences = currentNota?.config?.kernelPreferences?.[props.id]
  
  if (preferences?.serverId) {
    handleServerSelect(preferences.serverId)
  }
}

// Add this after loadSavedPreferences
const selectSession = async (sessionId: string) => {
  const session = availableSessions.value.find(s => s.id === sessionId)
  if (!session) return

  // Update session in store
  const server = availableServers.value.find(s => {
    const sessionServer = `${s.ip}:${s.port}`
    return sessionServer === selectedServer.value
  })
  
  if (server) {
    // First update the session
    selectedSession.value = sessionId
    emit('update:session-id', sessionId)
    
    // Then update the kernel to match the session's kernel
    handleKernelSelect(session.kernel.name)
    
    // Update the store
    const existingSession = codeExecutionStore.kernelSessions.get(sessionId)
    if (!existingSession) {
      // Create a new session entry in the store with required fields
      codeExecutionStore.kernelSessions.set(sessionId, {
        id: sessionId,
        name: session.name,
        kernelId: session.kernel.id,
        kernelName: session.kernel.name,
        serverConfig: server,
        cells: [] // Initialize with empty cells array
      })
    }

    // Show success message
    showConsoleMessage('Success', `Selected session: ${session.name || sessionId}`, 'success')
  }
}

// Add this after selectSession function
const selectRunningKernel = async (kernelId: string) => {
  const kernel = runningKernels.value.find(k => k.id === kernelId)
  if (!kernel) return

  // Create a new session with this kernel
  isSettingUp.value = true
  try {
    const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
    if (!server) throw new Error('Server not found')

    const sessionId = codeExecutionStore.createSession(`Session with ${kernel.name}`)
    
    // Update session in store
    const session = codeExecutionStore.kernelSessions.get(sessionId)
    if (session) {
      session.kernelId = kernelId
      session.serverConfig = server
      session.kernelName = kernel.name
      codeExecutionStore.kernelSessions.set(sessionId, { 
        ...session,
        cells: [] // Initialize with empty cells array
      })
    }
    
    selectedSession.value = sessionId
    selectedKernel.value = kernel.name
    emit('update:session-id', sessionId)
    isSessionOpen.value = false
    
    showConsoleMessage('Success', `Connected to running kernel: ${kernel.name}`, 'success')
  } catch (error) {
    console.error('Failed to connect to kernel:', error)
    showConsoleMessage('Error', 'Failed to connect to kernel', 'error')
  } finally {
    isSettingUp.value = false
  }
}

// Update onMounted to load preferences
onMounted(async () => {
  await nextTick()
  
  // Load saved preferences
  loadSavedPreferences()
  
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

const refreshSessionsAndKernels = async (server: JupyterServer) => {
  if (!server) return

  try {
    // Test server connection first
    const result = await jupyterService.testConnection(server)
    if (!result.success) {
      showConsoleMessage('Error', result.message || 'Server connection failed', 'error')
      availableSessions.value = []
      runningKernels.value = []
      return
    }
    
    // Get active sessions and running kernels
    const [sessions, kernels] = await Promise.all([
      jupyterService.getActiveSessions(server),
      jupyterService.getRunningKernels(server)
    ])
    
    // Update the lists
    availableSessions.value = sessions || []
    runningKernels.value = kernels || []
    
    // Show success message if we got data
    if ((sessions && sessions.length > 0) || (kernels && kernels.length > 0)) {
      showConsoleMessage('Success', 'Sessions and kernels refreshed', 'success')
    }
  } catch (error) {
    console.error('Failed to refresh sessions/kernels:', error)
    showConsoleMessage('Error', 'Failed to refresh sessions/kernels', 'error')
    availableSessions.value = []
    runningKernels.value = []
  }
}

const clearAllKernels = async (server: JupyterServer) => {
  if (!server) return

  try {
    // Delete all running kernels
    await Promise.all(runningKernels.value.map(kernel => jupyterService.deleteKernel(server, kernel.id)))
    
    // Refresh the lists
    await refreshSessionsAndKernels(server)
    
    showConsoleMessage('Success', 'All kernels cleared successfully', 'success')
  } catch (error) {
    console.error('Failed to clear kernels:', error)
    showConsoleMessage('Error', 'Failed to clear kernels', 'error')
  }
}

// Watch for server changes to fetch kernels and sessions
watch(selectedServer, async (newServer) => {
  if (!newServer || newServer === 'none') {
    availableKernels.value = []
    availableSessions.value = []
    runningKernels.value = []
    return
  }
  
  const server = availableServers.value.find(
    s => `${s.ip}:${s.port}` === newServer
  )
  if (server) {
    try {
      // Get kernelspecs from server
      const kernels = await jupyterService.getAvailableKernels(server)
      availableKernels.value = kernels
      
      // Get active sessions and running kernels
      await refreshSessionsAndKernels(server)

      // If there's a kernel preference for this block, select it
      if (props.kernelPreference?.kernelName && props.kernelPreference.serverId === newServer) {
        selectedKernel.value = props.kernelPreference.kernelName
      } else if (kernels.length > 0) {
        // Select first available kernel that matches the language
        const matchingKernel = kernels.find(k => k.spec.language === props.language)
        if (matchingKernel) {
          selectedKernel.value = matchingKernel.name
        }
      }

      // Save server and kernel preference
      store.updateNotaConfig(props.notaId, (config) => {
        if (!config.kernelPreferences) config.kernelPreferences = {}
        config.kernelPreferences[props.id] = {
          serverId: newServer,
          kernelName: selectedKernel.value,
          blockId: props.id,
          lastUsed: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to fetch kernels/sessions:', error)
      showConsoleMessage('Error', 'Failed to fetch kernels/sessions', 'error')
    }
  }
})

// Watch for kernel changes to save preference
watch(selectedKernel, async (newKernel) => {
  if (newKernel && selectedServer.value && selectedServer.value !== 'none') {
    store.updateNotaConfig(props.notaId, (config) => {
      if (!config.kernelPreferences) config.kernelPreferences = {}
      config.kernelPreferences[props.id] = {
        serverId: selectedServer.value,
        kernelName: newKernel,
        blockId: props.id,
        lastUsed: new Date().toISOString()
      }
    })
  }
})

// Template helpers
const handleServerChange = async (value: string) => {
  handleServerSelect(value)
  isServerOpen.value = false
  isKernelOpen.value = true // Automatically open kernel selector after server selection
  
  // Save server preference
  store.updateNotaConfig(props.notaId, (config) => {
    if (!config.kernelPreferences) config.kernelPreferences = {}
    if (!config.kernelPreferences[props.id]) {
      config.kernelPreferences[props.id] = {
        serverId: value,
        kernelName: selectedKernel.value,
        blockId: props.id,
        lastUsed: new Date().toISOString()
      }
    } else {
      config.kernelPreferences[props.id].serverId = value
      config.kernelPreferences[props.id].lastUsed = new Date().toISOString()
    }
  })
}

const handleKernelChange = (value: string) => {
  handleKernelSelect(value)
  isKernelOpen.value = false
}

const handleSessionChange = (value: string) => {
  selectSession(value)
  isSessionOpen.value = false
}

// Methods
const createNewSession = async () => {
  if (!selectedServer.value || selectedServer.value === 'none' || !selectedKernel.value) {
    showConsoleMessage('Error', 'Please select a server and kernel first', 'error')
    return
  }

  isSettingUp.value = true
  try {
    const sessionId = codeExecutionStore.createSession(`Session ${availableSessions.value.length + 1}`)
    const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
    if (!server) throw new Error('Server not found')
    
    // Create kernel using executionService
    const kernelId = await executionService.createKernel(server, selectedKernel.value)
    
    // Update session in store
    const session = codeExecutionStore.kernelSessions.get(sessionId)
    if (session) {
      session.kernelId = kernelId
      session.serverConfig = server
      session.kernelName = selectedKernel.value
      codeExecutionStore.kernelSessions.set(sessionId, { ...session })
    }
    
    selectedSession.value = sessionId
    emit('update:session-id', sessionId)
    isSessionOpen.value = false
    
    // Refresh sessions list
    const sessions = await jupyterService.getActiveSessions(server)
    availableSessions.value = sessions
  } catch (error) {
    console.error('Failed to create session:', error)
    showConsoleMessage('Error', 'Failed to create session', 'error')
  } finally {
    isSettingUp.value = false
  }
}

const executeCode = async () => {
  if (executionInProgress.value) return
  if (!selectedServer.value || selectedServer.value === 'none') {
    showConsoleMessage('Error', 'Please select a server first', 'error')
    return
  }
  if (!selectedKernel.value) {
    showConsoleMessage('Error', 'Please select a kernel first', 'error')
    return
  }

  executionInProgress.value = true
  try {
    // If no session is selected, create a new one
    if (!selectedSession.value) {
      await createNewSession()
      if (!selectedSession.value) {
        throw new Error('Failed to create session')
      }
    }

    // Execute the code
    await codeExecutionStore.executeCell(props.id)
    if (cell.value?.output) {
      emit('update:output', cell.value.output)
    }
  } catch (error) {
    console.error('Code execution failed:', error)
    showConsoleMessage('Error', 'Code execution failed', 'error')
  } finally {
    executionInProgress.value = false
  }
}

const updateCode = (newCode: string) => {
  codeValue.value = newCode
  emit('update:code', newCode)
}

const saveChanges = () => {
  hasUnsavedChanges.value = false
}

const copyCode = () => {
  // Implementation
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
                :title="selectedSession ? `Current Session: ${availableSessions.find(s => s.id === selectedSession)?.name || selectedSession}` : 'Select Session'"
                aria-label="Session management"
              >
                <Layers class="h-4 w-4" />
                <span class="text-xs ml-1 max-w-[100px] truncate" v-if="selectedSession">
                  {{ availableSessions.find(s => s.id === selectedSession)?.name || selectedSession }}
                </span>
                <span
                  v-if="selectedSession"
                  class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                  aria-hidden="true"
                ></span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              class="w-[300px] p-0"
              align="start"
              :side="'bottom'"
              description="Select or create a new session for code execution"
            >
              <div class="p-2 text-xs font-medium text-muted-foreground flex justify-between items-center">
                <span>Sessions and Running Kernels</span>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0"
                  @click="() => {
                    const server = availableServers.find(s => `${s.ip}:${s.port}` === selectedServer)
                    if (server) refreshSessionsAndKernels(server)
                  }"
                  :disabled="!selectedServer || selectedServer === 'none'"
                  title="Refresh sessions and kernels"
                >
                  <RotateCw class="h-3 w-3" />
                </Button>
              </div>
              <div class="p-1 border-t">
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 gap-2 h-8"
                    @click="createNewSession"
                    :disabled="isSettingUp || !selectedServer || !selectedKernel"
                  >
                    <Loader2 v-if="isSettingUp" class="h-3 w-3 animate-spin" />
                    <Plus v-else class="h-4 w-4" />
                    New Session
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 gap-2 h-8"
                    @click="() => {
                      const server = availableServers.find(s => `${s.ip}:${s.port}` === selectedServer)
                      if (server) clearAllKernels(server)
                    }"
                    :disabled="!selectedServer || selectedServer === 'none' || runningKernels.length === 0"
                    title="Clear all running kernels"
                  >
                    <Trash2 class="h-4 w-4" />
                    Clear All Kernels
                  </Button>
                </div>
              </div>
              <div class="max-h-[300px] overflow-y-auto">
                <!-- Active Sessions -->
                <div v-if="availableSessions.length > 0">
                  <div class="px-2 py-1 text-xs font-medium text-muted-foreground bg-accent/50">
                    Active Sessions
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="session in availableSessions"
                      :key="session.id"
                      class="p-2 hover:bg-accent cursor-pointer"
                      @click="handleSessionChange(session.id)"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="font-medium text-sm">
                            {{ session.name || session.id }}
                          </div>
                          <div class="text-xs text-muted-foreground">
                            Kernel: {{ session.kernel.name }}
                          </div>
                        </div>
                        <div v-if="selectedSession === session.id" class="text-primary">
                          <Check class="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Running Kernels -->
                <div v-if="runningKernels.length > 0">
                  <div class="px-2 py-1 text-xs font-medium text-muted-foreground bg-accent/50">
                    Running Kernels
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="kernel in runningKernels"
                      :key="kernel.id"
                      class="p-2 hover:bg-accent cursor-pointer"
                      @click="selectRunningKernel(kernel.id)"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <Cpu class="w-4 h-4" :class="{
                              'text-green-500': kernel.executionState === 'idle',
                              'text-yellow-500': kernel.executionState === 'busy',
                              'text-blue-500': kernel.executionState === 'starting'
                            }" />
                            <div class="font-medium text-sm">
                              {{ kernel.name }}
                            </div>
                          </div>
                          <div class="text-xs text-muted-foreground mt-1">
                            <span class="capitalize">{{ kernel.executionState || 'unknown' }}</span>
                            <span v-if="kernel.connections"> • {{ kernel.connections }} connection(s)</span>
                            <span> • Last activity {{ new Date(kernel.lastActivity).toLocaleString() }}</span>
                          </div>
                          <div class="text-xs text-muted-foreground">
                            ID: {{ kernel.id }}
                          </div>
                        </div>
                        <div v-if="selectedSession && codeExecutionStore.kernelSessions.get(selectedSession)?.kernelId === kernel.id" class="text-primary">
                          <Check class="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- No Sessions/Kernels Message -->
                <div 
                  v-if="availableSessions.length === 0 && runningKernels.length === 0" 
                  class="p-3 text-sm text-center text-muted-foreground"
                >
                  No active sessions or running kernels. Create a new session to start.
                </div>
              </div>
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

        <!-- Server & Kernel Selector - Hide when readonly -->
        <template v-if="!isReadOnly">
          <Popover v-model:open="isServerOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="gap-2 h-8 relative"
                :class="{
                  'bg-amber-500/20 hover:bg-amber-500/30':
                    !selectedServer || selectedServer === 'none' || !selectedKernel || selectedKernel === 'none',
                }"
                :title="
                  selectedServer && selectedServer !== 'none' && selectedKernel && selectedKernel !== 'none'
                    ? `${selectedServer} - ${selectedKernel}`
                    : 'Select Server & Kernel'
                "
                aria-label="Select server and kernel"
              >
                <Server class="h-4 w-4" />
                <Box v-if="selectedServer && selectedServer !== 'none'" class="h-4 w-4 ml-1" />
                <span
                  v-if="selectedServer && selectedServer !== 'none' && selectedKernel && selectedKernel !== 'none'"
                  class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                  aria-hidden="true"
                ></span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              class="w-[300px] p-0"
              align="start"
              :side="'bottom'"
              description="Select a Jupyter server and kernel for code execution"
            >
              <div class="p-2 text-xs font-medium text-muted-foreground">
                Select a server and kernel for code execution
              </div>
              <div class="border-t p-2">
                <div class="mb-2">
                  <div class="text-xs font-medium mb-1">Server</div>
                  <CustomSelect
                    :options="
                      availableServers.map((server) => ({
                        value: `${server.ip}:${server.port}`,
                        label: `${server.ip}:${server.port}`,
                      }))
                    "
                    :model-value="selectedServer"
                    placeholder="Search servers..."
                    :searchable="true"
                    @select="handleServerChange"
                  />
                </div>
                <div>
                  <div class="text-xs font-medium mb-1">Kernel</div>
                  <CustomSelect
                    :options="availableKernels.map((kernel) => ({
                      value: kernel.name,
                      label: kernel.spec.display_name || kernel.name
                    }))"
                    :model-value="selectedKernel"
                    placeholder="Search kernels..."
                    :searchable="true"
                    :disabled="!selectedServer || selectedServer === 'none'"
                    @select="handleKernelChange"
                  />
                </div>
              </div>
              <div
                v-if="availableServers.length === 0"
                class="p-3 text-sm text-center text-muted-foreground"
              >
                No servers available. Configure servers in the settings.
              </div>
              <div
                v-else-if="selectedServer && selectedServer !== 'none' && availableKernels.length === 0"
                class="p-3 text-sm text-center text-muted-foreground"
              >
                No kernels available on the selected server.
              </div>
            </PopoverContent>
          </Popover>
        </template>
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
        @copy="copyOutput"
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
