<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
// ButtonGroup functionality will be replaced with flex grouping
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { 
  Settings, 
  Server, 
  Cpu, 
  Layers, 
  Link2, 
  Plus, 
  Trash2, 
  RotateCw, 
  Check, 
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-vue-next'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'

interface Session {
  id: string
  name: string
  kernel: { name: string; id: string }
}

interface RunningKernel {
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}

interface Props {
  isOpen: boolean
  isSharedSessionMode: boolean
  isExecuting: boolean
  isSettingUp: boolean
  // Server/Kernel props
  selectedServer?: string
  selectedKernel?: string
  availableServers: JupyterServer[]
  availableKernels: KernelSpec[]
  // Session props
  selectedSession?: string
  availableSessions: Session[]
  runningKernels: RunningKernel[]
}

interface Emits {
  'update:is-open': [value: boolean]
  // Server/kernel management events
  'server-change': [serverId: string]
  'kernel-change': [kernelName: string]
  // Session management events
  'session-change': [sessionId: string]
  'create-new-session': []
  'clear-all-kernels': []
  'refresh-sessions': []
  'select-running-kernel': [kernelId: string]
  // Shared session mode event
  'toggle-shared-session-mode': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state for modal
const localServer = ref(props.selectedServer || '')
const localKernel = ref(props.selectedKernel || '')
const localSession = ref(props.selectedSession || '')

// Validation
const isServerSelected = computed(() => 
  localServer.value && localServer.value !== 'none'
)

const isKernelSelected = computed(() => 
  localKernel.value && localKernel.value !== 'none'
)

const isSessionSelected = computed(() => 
  localSession.value && localSession.value !== 'none'
)

const isConfigurationValid = computed(() => 
  isServerSelected.value && isKernelSelected.value
)

const canApplyConfiguration = computed(() => 
  isConfigurationValid.value && !props.isExecuting
)

// Configuration status
const configurationStatus = computed(() => {
  if (!isServerSelected.value) return 'Select a server to start'
  if (!isKernelSelected.value) return 'Select a kernel to continue'
  if (!isSessionSelected.value) return 'Create or select a session'
  return 'Configuration ready'
})

const getSharedSessionTooltip = computed(() => {
  if (props.isSharedSessionMode) {
    return 'Click to disable shared session mode'
  }
  if (!isServerSelected.value || !isKernelSelected.value) {
    return 'Select a server and kernel first to enable shared session mode'
  }
  return 'Click to enable shared session mode for all code blocks'
})

const getKernelStatusClass = (state: string) => {
  switch (state) {
    case 'idle': return 'text-green-500'
    case 'busy': return 'text-yellow-500'
    case 'starting': return 'text-blue-500'
    default: return 'text-muted-foreground'
  }
}

// Watch for prop changes
watch(() => props.selectedServer, (newValue) => {
  localServer.value = newValue || ''
})

watch(() => props.selectedKernel, (newValue) => {
  localKernel.value = newValue || ''
})

watch(() => props.selectedSession, (newValue) => {
  localSession.value = newValue || ''
})

// Handlers
const handleServerChange = (serverId: string) => {
  localServer.value = serverId
  // Reset kernel and session when server changes
  localKernel.value = ''
  localSession.value = ''
  emit('server-change', serverId)
}

const handleKernelChange = (kernelName: string) => {
  localKernel.value = kernelName
  // Reset session when kernel changes
  localSession.value = ''
  emit('kernel-change', kernelName)
}

const handleSessionChange = (sessionId: string) => {
  localSession.value = sessionId
  emit('session-change', sessionId)
}

const handleCreateNewSession = () => {
  emit('create-new-session')
}

const handleClearAllKernels = () => {
  emit('clear-all-kernels')
}

const handleRefreshSessions = () => {
  emit('refresh-sessions')
}

const handleSelectRunningKernel = (kernelId: string) => {
  emit('select-running-kernel', kernelId)
}

const handleApply = () => {
  if (canApplyConfiguration.value) {
    emit('update:is-open', false)
  }
}

const handleCancel = () => {
  emit('update:is-open', false)
}

const handleToggleSharedSessionMode = () => {
  emit('toggle-shared-session-mode')
}

const formatLastActivity = (lastActivity: string) => {
  try {
    return new Date(lastActivity).toLocaleString()
  } catch {
    return lastActivity
  }
}
</script>

<template>
  <Dialog :open="props.isOpen" @update:open="(value) => emit('update:is-open', value)" :modal="false">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Settings class="h-5 w-5" />
          Kernel Configuration
        </DialogTitle>
        <DialogDescription>
          Configure your Jupyter server, kernel, and session settings for code execution.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Shared Session Mode Toggle -->
        <div class="border rounded-lg p-4 bg-card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Link2 class="h-5 w-5 text-primary" />
              <div>
                <h3 class="text-sm font-medium">Shared Session Mode</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  When enabled, all code blocks in this document share the same Jupyter session
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              @click="handleToggleSharedSessionMode"
              :disabled="!isSharedSessionMode && (!isServerSelected || !isKernelSelected)"
              :class="{
                'bg-primary text-primary-foreground border-primary': isSharedSessionMode,
                'hover:bg-primary/10': !isSharedSessionMode && isServerSelected && isKernelSelected
              }"
              class="min-w-[80px]"
              :title="getSharedSessionTooltip"
            >
              {{ isSharedSessionMode ? 'Enabled' : 'Disabled' }}
            </Button>
          </div>
          
          <!-- Warning when server/kernel not selected -->
          <div v-if="!isSharedSessionMode && (!isServerSelected || !isKernelSelected)" class="mt-3 p-3 rounded bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <div class="flex items-start gap-2 text-sm">
              <AlertCircle class="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-yellow-800 dark:text-yellow-200 font-medium">Configuration Required</p>
                <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Please select a Jupyter server and kernel below before enabling shared session mode.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Success state when shared session is active -->
          <div v-if="isSharedSessionMode" class="mt-3 p-3 rounded bg-primary/5 border border-primary/20">
            <div class="flex items-start gap-2 text-sm">
              <Check class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p class="text-primary font-medium">Shared session is active</p>
                <p class="text-xs text-primary/80 mt-1">
                  Variables and imports will persist across all code blocks. Server and kernel are managed globally.
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- Configuration Status -->
        <div class="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
          <AlertCircle class="h-4 w-4" />
          <span class="text-sm">{{ configurationStatus }}</span>
        </div>

        <!-- Server Selection -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Server class="h-4 w-4" />
            <h3 class="text-sm font-medium">Jupyter Server</h3>
            <span class="text-xs text-muted-foreground">
              ({{ props.availableServers.length }} available)
            </span>
            <span v-if="isSharedSessionMode" class="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
              Globally managed
            </span>
          </div>
          
          <div v-if="availableServers.length > 0" class="space-y-2">
            <div class="max-h-32 overflow-y-auto space-y-1">
              <div
                v-for="server in availableServers"
                :key="`${server.ip}:${server.port}`"
                class="flex items-center justify-between p-3 rounded border text-sm cursor-pointer transition-colors"
                :class="{
                  'bg-primary/10 border-primary/30': localServer === `${server.ip}:${server.port}`,
                  'hover:bg-muted/50': localServer !== `${server.ip}:${server.port}` && !isSharedSessionMode,
                  'opacity-50 cursor-not-allowed': isSharedSessionMode
                }"
                @click="!isSharedSessionMode && handleServerChange(`${server.ip}:${server.port}`)"
              >
                <div class="flex items-center gap-2">
                  <Check v-if="localServer === `${server.ip}:${server.port}`" class="h-4 w-4 text-primary" />
                  <Server v-else class="h-4 w-4" />
                  <span class="font-medium">{{ server.ip }}:{{ server.port }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div
            v-if="availableServers.length === 0"
            class="p-3 text-sm text-center text-muted-foreground border rounded-lg"
          >
            No servers available. Configure servers in the settings.
          </div>
        </div>

        <!-- Kernel Selection -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <Cpu class="h-4 w-4" />
            <h3 class="text-sm font-medium">Kernel</h3>
            <span class="text-xs text-muted-foreground">
              ({{ props.availableKernels.length }} available)
            </span>
            <span v-if="isSharedSessionMode" class="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
              Globally managed
            </span>
          </div>
          
          <div v-if="availableKernels.length > 0" class="space-y-2">
            <div class="max-h-32 overflow-y-auto space-y-1">
              <div
                v-for="kernel in availableKernels"
                :key="kernel.name"
                class="flex items-center justify-between p-3 rounded border text-sm cursor-pointer transition-colors"
                :class="{
                  'bg-primary/10 border-primary/30': localKernel === kernel.name,
                  'hover:bg-muted/50': localKernel !== kernel.name && !isSharedSessionMode && isServerSelected,
                  'opacity-50 cursor-not-allowed': isSharedSessionMode || !isServerSelected
                }"
                @click="!isSharedSessionMode && isServerSelected && handleKernelChange(kernel.name)"
              >
                <div class="flex items-center gap-2">
                  <Check v-if="localKernel === kernel.name" class="h-4 w-4 text-primary" />
                  <Cpu v-else class="h-4 w-4" />
                  <div>
                    <span class="font-medium">{{ kernel.spec.display_name || kernel.name }}</span>
                    <div class="text-xs text-muted-foreground">{{ kernel.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div
            v-if="isServerSelected && availableKernels.length === 0"
            class="p-3 text-sm text-center text-muted-foreground border rounded-lg"
          >
            No kernels available on the selected server.
          </div>
        </div>

        <!-- Session Management -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Layers class="h-4 w-4" />
              <h3 class="text-sm font-medium">Session</h3>
              <span class="text-xs text-muted-foreground">
                ({{ props.availableSessions.length }} available)
              </span>
            </div>
            
            <div class="flex items-center border rounded-md">
              <Button
                variant="outline"
                size="sm"
                @click="handleRefreshSessions"
                :disabled="isExecuting || isSettingUp"
                class="h-6 px-2 text-xs rounded-r-none border-r-0"
              >
                <RotateCw class="h-3 w-3 mr-1" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                @click="handleCreateNewSession"
                :disabled="!isKernelSelected || isExecuting || isSettingUp"
                class="h-6 px-2 text-xs rounded-l-none"
              >
                <Plus class="h-3 w-3 mr-1" />
                New Session
              </Button>
            </div>
          </div>

          <!-- Session Selection -->
          <div v-if="availableSessions.length > 0" class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground">Available Sessions</div>
            <div class="max-h-32 overflow-y-auto space-y-1">
              <div
                v-for="session in availableSessions"
                :key="session.id"
                class="flex items-center justify-between p-3 rounded border text-sm cursor-pointer transition-colors"
                :class="{
                  'bg-primary/10 border-primary/30': localSession === session.id,
                  'hover:bg-muted/50': localSession !== session.id && isKernelSelected,
                  'opacity-50 cursor-not-allowed': !isKernelSelected
                }"
                @click="isKernelSelected && handleSessionChange(session.id)"
              >
                <div class="flex items-center gap-2">
                  <Check v-if="localSession === session.id" class="h-4 w-4 text-primary" />
                  <Layers v-else class="h-4 w-4" />
                  <div>
                    <span class="font-medium">{{ session.name }}</span>
                    <div class="text-xs text-muted-foreground">{{ session.kernel.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Running Kernels -->
          <div v-if="runningKernels.length > 0" class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs font-medium text-muted-foreground">Running Kernels</div>
              <Button
                variant="destructive"
                size="sm"
                @click="handleClearAllKernels"
                :disabled="isExecuting || isSettingUp"
                class="h-6 px-2 text-xs"
              >
                <Trash2 class="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            
            <div class="max-h-32 overflow-y-auto space-y-1">
              <div
                v-for="kernel in runningKernels"
                :key="kernel.id"
                class="flex items-center justify-between p-2 rounded border text-xs hover:bg-muted/50"
              >
                <div class="flex items-center gap-2">
                  <Cpu class="h-3 w-3" />
                  <span class="font-medium">{{ kernel.name }}</span>
                  <span 
                    class="text-xs"
                    :class="getKernelStatusClass(kernel.executionState)"
                  >
                    {{ kernel.executionState }}
                  </span>
                  <span class="text-muted-foreground">
                    {{ kernel.connections }} connections
                  </span>
                </div>
                
                <div class="flex items-center gap-1">
                  <span class="text-muted-foreground">
                    {{ formatLastActivity(kernel.lastActivity) }}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-5 w-5 p-0"
                    @click="handleSelectRunningKernel(kernel.id)"
                  >
                    <Link2 class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Shared Session Mode Notice -->
          <div
            v-if="isSharedSessionMode"
            class="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          >
            <div class="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Link2 class="h-4 w-4" />
              <span class="font-medium">Shared Session Mode Active</span>
            </div>
            <p class="text-xs text-blue-600 dark:text-blue-300 mt-1">
              This code block is using a shared session. Server and kernel selection is managed globally.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          @click="handleCancel"
        >
          Cancel
        </Button>
        <Button 
          @click="handleApply"
          :disabled="!canApplyConfiguration"
          class="gap-2"
        >
          <Check class="h-4 w-4" />
          Apply Configuration
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* Simple styles for the dialog */
</style>
