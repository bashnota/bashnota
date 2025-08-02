<script setup lang="ts">
import { computed, defineEmits, defineProps } from 'vue'
import {
  Play,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Maximize2,
  Code,
  FileText,
  Copy,
  Check,
  Save,
  Settings
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { ButtonGroup } from '@/ui/button-group'
import KernelConfigurationModal from './KernelConfigurationModal.vue'
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
  isHovered: boolean
  showToolbar: boolean
  isReadOnly: boolean
  isExecuting: boolean
  isPublished: boolean
  isReadyToExecute: boolean
  isCodeVisible: boolean
  hasUnsavedChanges: boolean
  isCodeCopied: boolean
  isSharedSessionMode: boolean
  // Session management props
  selectedSession?: string
  availableSessions?: Session[]
  runningKernels?: RunningKernel[]
  isSessionOpen?: boolean
  isSettingUp?: boolean
  // Server/kernel management props
  selectedServer?: string
  selectedKernel?: string
  availableServers?: JupyterServer[]
  availableKernels?: KernelSpec[]
  isServerOpen?: boolean
  isKernelOpen?: boolean
}

interface Emits {
  'execute-code': []
  'toggle-toolbar': []
  'toggle-code-visibility': []
  'toggle-fullscreen': []
  'format-code': []
  'show-templates': []
  'copy-code': []
  'save-changes': []
  // Configuration modal events
  'open-configuration': []
  // Session management events
  'update:is-session-open': [value: boolean]
  'session-change': [sessionId: string]
  'create-new-session': []
  'clear-all-kernels': []
  'refresh-sessions': []
  'select-running-kernel': [kernelId: string]
  // Server/kernel management events
  'update:is-server-open': [value: boolean]
  'update:is-kernel-open': [value: boolean]
  'server-change': [serverId: string]
  'kernel-change': [kernelName: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Configuration status helpers
const isConfigurationIncomplete = computed(() => 
  !props.selectedServer || 
  props.selectedServer === 'none' || 
  !props.selectedKernel || 
  props.selectedKernel === 'none'
)

const configurationStatusText = computed(() => {
  if (props.isSharedSessionMode) {
    return 'Shared Mode'
  }
  if (!props.selectedServer || props.selectedServer === 'none') {
    return 'Configure'
  }
  if (!props.selectedKernel || props.selectedKernel === 'none') {
    return props.selectedServer.split(':')[0]
  }
  return `${props.selectedServer.split(':')[0]} • ${props.selectedKernel}`
})

const configurationTitle = computed(() => {
  if (props.isSharedSessionMode) {
    return 'Using shared server & kernel configuration'
  }
  if (isConfigurationIncomplete.value) {
    return 'Click to configure server, kernel, and session'
  }
  return `Server: ${props.selectedServer} | Kernel: ${props.selectedKernel} | Session: ${props.selectedSession || 'None'}`
})
</script>

<template>
  <div
    v-if="isHovered || showToolbar"
    class="flex flex-wrap items-center gap-2 p-2 border-b bg-background/95 backdrop-blur transition-all duration-200"
  >
    <!-- Left toolbar group -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Primary Action Group -->
      <ButtonGroup>
        <Button
          v-if="!isReadOnly"
          variant="default"
          size="sm"
          @click="emit('execute-code')"
          class="h-7 px-3 text-xs"
          :disabled="!isReadyToExecute"
          :title="isExecuting ? 'Executing...' : 'Run Code'"
        >
          <Loader2 class="w-3 h-3 animate-spin mr-1" v-if="isExecuting" />
          <Play class="w-3 h-3 mr-1" v-else />
          {{ isExecuting ? 'Running' : 'Run' }}
        </Button>

        <!-- Toolbar toggle button -->
        <Button
          variant="outline"
          size="sm"
          @click="emit('toggle-toolbar')"
          class="h-7 w-7 p-0"
          :class="{ 'bg-muted': showToolbar }"
          title="Pin toolbar"
        >
          <Sparkles class="h-3 w-3" />
        </Button>
      </ButtonGroup>

      <!-- Configuration Button -->
      <template v-if="!isReadOnly">
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs px-3 gap-1"
          :class="{
            'bg-warning/20 hover:bg-warning/30': isConfigurationIncomplete,
            'bg-primary/20 hover:bg-primary/30': isSharedSessionMode,
            'opacity-70': isExecuting
          }"
          :title="configurationTitle"
          :disabled="isExecuting"
          @click="emit('open-configuration')"
        >
          <Settings class="h-3 w-3" />
          <span class="max-w-[80px] truncate">
            {{ configurationStatusText }}
          </span>
        </Button>
      </template>
    </div>

    <div class="flex-1"></div>

    <!-- Right side utility buttons -->
    <div class="flex items-center gap-2">
      <!-- View Controls Group -->
      <ButtonGroup>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click="emit('toggle-code-visibility')"
          :title="isCodeVisible ? 'Hide Code' : 'Show Code'"
        >
          <Eye v-if="!isCodeVisible" class="h-3 w-3" />
          <EyeOff v-else class="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click="emit('toggle-fullscreen')"
          title="Full Screen Mode"
          :disabled="isExecuting && !isPublished"
        >
          <Maximize2 class="h-3 w-3" />
        </Button>
      </ButtonGroup>

      <!-- Code Tools Group -->
      <ButtonGroup v-if="!isReadOnly">
        <Button
          variant="ghost"
          size="sm"
          @click="emit('format-code')"
          class="h-7 px-2 text-xs"
          title="Format code"
          :disabled="isExecuting"
        >
          <Code class="h-3 w-3 mr-1" />
          Format
        </Button>

        <Button
          variant="ghost"
          size="sm"
          @click="emit('show-templates')"
          class="h-7 px-2 text-xs"
          title="Insert template"
          :disabled="isExecuting"
        >
          <FileText class="h-3 w-3 mr-1" />
          Templates
        </Button>
      </ButtonGroup>

      <!-- Action Controls Group -->
      <ButtonGroup>
        <Button
          variant="ghost"
          size="sm"
          @click="emit('copy-code')"
          class="h-7 w-7 p-0"
          title="Copy code"
        >
          <Copy v-if="!isCodeCopied" class="h-3 w-3" />
          <Check v-else class="h-3 w-3" />
        </Button>

        <Button
          v-if="!isReadOnly && hasUnsavedChanges && !isExecuting"
          variant="ghost"
          size="sm"
          @click="emit('save-changes')"
          class="h-7 w-7 p-0"
          title="Save changes"
        >
          <Save class="w-3 h-3" />
        </Button>
      </ButtonGroup>
    </div>
  </div>
</template>
