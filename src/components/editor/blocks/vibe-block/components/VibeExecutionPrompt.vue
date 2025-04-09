<template>
  <div class="p-4 border rounded-md text-center mb-4">
    <AlertTriangle class="h-8 w-8 mx-auto mb-2 text-amber-500" />
    <h3 class="text-sm font-medium mb-1">No tasks detected</h3>
    <p class="text-xs text-muted-foreground mb-3">The agent might be stuck at the planning stage</p>
    <Button @click="emit('start-execution')" variant="default">
      <Play class="h-4 w-4 mr-2" />
      Start Execution Manually
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { AlertTriangle, Play } from 'lucide-vue-next'

// No props required for this simple component

// Define emits with typed event
const emit = defineEmits<{
  'start-execution': []
}>()
</script> 