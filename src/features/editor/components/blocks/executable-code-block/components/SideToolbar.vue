<script setup lang="ts">
import { computed } from 'vue'
import {
  Play,
  Loader2,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Copy,
  Save,
  Sparkles
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
}

interface Emits {
  'execute-code': []
  'toggle-code-visibility': []
  'toggle-fullscreen': []
  'copy-code': []
  'save-changes': []
  'open-configuration': []
  'show-ai-assistant': []
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
    v-if="isVisible"
    class="absolute right-2 top-2 flex flex-col gap-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-1 z-10 transition-all duration-200"
  >
    <!-- Execute Button -->
    <Tooltip v-if="!isReadOnly">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          @click="emit('execute-code')"
          class="h-8 w-8 p-0"
          :disabled="!isReadyToExecute"
          :class="{
            'bg-primary text-primary-foreground': !isExecuting && isReadyToExecute,
            'opacity-50': !isReadyToExecute
          }"
        >
          <Loader2 v-if="isExecuting" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        {{ isExecuting ? 'Executing...' : 'Run Code' }}
      </TooltipContent>
    </Tooltip>

    <!-- Configuration Button -->
    <Tooltip v-if="!isReadOnly">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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

    <Tooltip v-if="!isReadOnly && hasUnsavedChanges && !isExecuting">
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
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