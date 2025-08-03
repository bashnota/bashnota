<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
// ButtonGroup functionality will be replaced with flex grouping
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'


import { 
  Layers, 
  Link2, 
  Plus, 
  Trash2, 
  RotateCw, 
  Check, 
  Cpu, 
  Loader2 
} from 'lucide-vue-next'

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
  isSharedSessionMode: boolean
  isExecuting: boolean
  selectedSession?: string
  availableSessions: Session[]
  runningKernels: RunningKernel[]
  isSessionOpen: boolean
  isSettingUp: boolean
  selectedServer?: string
}

interface Emits {
  'update:isSessionOpen': [value: boolean]
  'session-change': [sessionId: string]
  'create-new-session': []
  'clear-all-kernels': []
  'refresh-sessions': []
  'select-running-kernel': [kernelId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const buttonTitle = computed(() => {
  if (props.isSharedSessionMode) {
    return 'Using shared session mode'
  }
  if (props.selectedSession) {
    const session = props.availableSessions.find(s => s.id === props.selectedSession)
    return `Current Session: ${session?.name || props.selectedSession}`
  }
  return 'Select Session'
})

const buttonText = computed(() => {
  if (props.selectedSession) {
    if (props.isSharedSessionMode) {
      return 'Shared'
    }
    const session = props.availableSessions.find(s => s.id === props.selectedSession)
    return session?.name || props.selectedSession
  }
  return 'Session'
})

const getKernelStatusClass = (state: string) => {
  switch (state) {
    case 'idle': return 'text-green-500'
    case 'busy': return 'text-yellow-500'
    case 'starting': return 'text-blue-500'
    default: return 'text-muted-foreground'
  }
}
</script>

<template>
  <Popover 
    :open="isSessionOpen" 
    @update:open="emit('update:isSessionOpen', $event)"
  >
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs px-2"
        :class="{ 
          'bg-warning/20 hover:bg-warning/30': !selectedSession,
          'bg-primary/20 hover:bg-primary/30': isSharedSessionMode && selectedSession,
          'opacity-70': isExecuting
        }"
        :title="buttonTitle"
        :disabled="isSharedSessionMode || isExecuting"
      >
        <Layers class="h-3 w-3 mr-1" v-if="!isSharedSessionMode" />
        <Link2 class="h-3 w-3 mr-1" v-else />
        <span class="max-w-[60px] truncate" v-if="selectedSession">
          {{ buttonText }}
        </span>
        <span v-else>Session</span>
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
          @click="emit('refresh-sessions')"
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
            @click="emit('create-new-session')"
            :disabled="isSettingUp || !selectedServer"
          >
            <Loader2 v-if="isSettingUp" class="h-3 w-3 animate-spin" />
            <Plus v-else class="h-4 w-4" />
            New Session
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="flex-1 gap-2 h-8"
            @click="emit('clear-all-kernels')"
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
              @click="emit('session-change', session.id)"
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
              @click="emit('select-running-kernel', kernel.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <Cpu 
                      class="w-4 h-4" 
                      :class="getKernelStatusClass(kernel.executionState)"
                    />
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
