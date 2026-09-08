<script setup lang="ts">
import { computed } from 'vue'
import {
  Play,
  Square,
  X,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Copy,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  isVisible: boolean
  isReadOnly: boolean
  isExecuting: boolean
  isPublished: boolean
  isReadyToExecute: boolean
  isCodeVisible: boolean
  hasUnsavedChanges: boolean
  isCodeCopied: boolean
  isConfigurationIncomplete: boolean
  selectedServer?: string
  selectedKernel?: string
  hasOutput?: boolean
}

interface Emits {
  'execute-code': []
  'interrupt-execution': []
  'cancel-execution': []
  'toggle-code-visibility': []
  'toggle-fullscreen': []
  'copy-code': []
  'save-changes': []
  'open-configuration': []
  'show-ai-assistant': []
  'clear-output': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const configurationStatus = computed(() => {
  if (props.isConfigurationIncomplete) {
    return 'Configuration needed'
  }
  return `${props.selectedServer} • ${props.selectedKernel}`
})
</script>

<template>
  <div
    class="absolute right-2 top-2 flex flex-col gap-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-1 z-10 transition-all duration-200"
    :class="{
      'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto': !isVisible,
    }"
  >
    <!-- Execute Button -->
    <Tooltip v-if="!isReadOnly">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          :aria-label="isExecuting ? 'Interrupt execution' : 'Run code'"
          @click="isExecuting ? emit('interrupt-execution') : emit('execute-code')"
          class="h-8 w-8 p-0"
          :disabled="!isExecuting && !isReadyToExecute"
          :class="{
            'bg-primary text-primary-foreground': !isExecuting && isReadyToExecute,
            'text-destructive hover:text-destructive': isExecuting,
            'opacity-50': !isExecuting && !isReadyToExecute
          }"
        >
          <Square v-if="isExecuting" class="w-4 h-4 fill-current" />
          <Play v-else class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {{ isExecuting ? 'Interrupt execution' : 'Run Code' }}
      </TooltipContent>
    </Tooltip>

    <Tooltip v-if="!isReadOnly && isExecuting">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Cancel execution"
          class="h-8 w-8 p-0 text-muted-foreground"
          @click="emit('cancel-execution')"
        >
          <X class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Cancel locally without waiting for the kernel</TooltipContent>
    </Tooltip>

    <!-- Configuration Button -->
    <Tooltip v-if="!isReadOnly">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Configure Jupyter execution"
          class="h-8 w-8 p-0"
          :class="{
            'bg-warning/20 text-warning-foreground': isConfigurationIncomplete,
            'opacity-70': isExecuting
          }"
          :disabled="isExecuting"
          @click="emit('open-configuration')"
        >
          <Settings class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" class="max-w-xs">
        {{ configurationStatus }}
      </TooltipContent>
    </Tooltip>



    <!-- AI Assistant Button -->
    <Tooltip v-if="!isReadOnly && !isPublished">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open AI assistant"
          class="h-8 w-8 p-0"
          @click="emit('show-ai-assistant')"
        >
          <Sparkles class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        AI Assistant
      </TooltipContent>
    </Tooltip>

    <div class="h-px bg-border my-1" />

    <!-- View Controls -->
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          :aria-label="isCodeVisible ? 'Hide code' : 'Show code'"
          class="h-8 w-8 p-0"
          @click="emit('toggle-code-visibility')"
        >
          <Eye v-if="!isCodeVisible" class="w-4 h-4" />
          <EyeOff v-else class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {{ isCodeVisible ? 'Hide Code' : 'Show Code' }}
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open code block in full screen"
          class="h-8 w-8 p-0"
          @click="emit('toggle-fullscreen')"
          :disabled="isExecuting && !isPublished"
        >
          <Maximize2 class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        Full Screen
      </TooltipContent>
    </Tooltip>

    <div class="h-px bg-border my-1" />

    <!-- Action Controls -->
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Copy code"
          @click="emit('copy-code')"
          class="h-8 w-8 p-0"
        >
          <Copy class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        Copy Code
      </TooltipContent>
    </Tooltip>

    <!-- Clear Output Button -->
    <Tooltip v-if="hasOutput && !isReadOnly && !isPublished">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear output"
          @click="emit('clear-output')"
          class="h-8 w-8 p-0 text-destructive hover:text-destructive"
          :disabled="isExecuting"
        >
          <Trash2 class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        Clear Output
      </TooltipContent>
    </Tooltip>

    <Tooltip v-if="!isReadOnly && hasUnsavedChanges && !isExecuting">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Save code changes"
          @click="emit('save-changes')"
          class="h-8 w-8 p-0"
        >
          <Save class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        Save Changes
      </TooltipContent>
    </Tooltip>
  </div>
</template>

<style scoped>
/* Ensure tooltip positioning works correctly */
.absolute {
  z-index: 50;
}
</style>
