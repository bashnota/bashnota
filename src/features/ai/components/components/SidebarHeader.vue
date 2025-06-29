<script setup lang="ts">
import { CardHeader, CardTitle } from '@/ui/card'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Sparkles as SparklesIcon, XIcon, LoaderIcon, Maximize2, Minimize2 } from 'lucide-vue-next'

const props = defineProps<{
  providerName: string
  isLoading: boolean
  isFullscreen: boolean
}>()

const emit = defineEmits(['close', 'toggleFullscreen'])

// Handle close button click, exit fullscreen first if needed
const handleClose = () => {
  if (props.isFullscreen) {
    emit('toggleFullscreen')
  }
  emit('close')
}
</script>

<template>
  <CardHeader class="border-b px-4 py-3 flex-shrink-0 bg-muted/30">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <SparklesIcon class="h-4 w-4 text-primary" />
        <CardTitle class="text-sm font-medium">{{ providerName || 'AI' }} Assistant</CardTitle>
        <Badge 
          v-if="isLoading" 
          variant="outline" 
          class="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-xs flex items-center gap-1"
        >
          <LoaderIcon class="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      </div>
      <div class="flex items-center gap-1">
        <!-- Fullscreen toggle button -->
        <Button 
          variant="ghost" 
          size="icon" 
          class="h-7 w-7 hover:bg-muted/70 transition-colors" 
          @click="$emit('toggleFullscreen')"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
        >
          <Maximize2 v-if="!isFullscreen" class="h-4 w-4" />
          <Minimize2 v-else class="h-4 w-4" />
        </Button>
        <!-- Close button -->
        <Button 
          variant="ghost" 
          size="icon" 
          class="h-7 w-7 hover:text-destructive transition-colors" 
          @click="handleClose"
        >
          <XIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardHeader>
</template>








