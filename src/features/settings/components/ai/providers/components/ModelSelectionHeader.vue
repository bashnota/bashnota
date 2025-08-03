<template>
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-medium">Select a Model</h3>
      <p class="text-sm text-muted-foreground">
        {{ availableCount }} models available • {{ downloadedCount }} downloaded
      </p>
    </div>
    <Button
      @click="$emit('refresh')"
      :disabled="isLoading"
      variant="outline"
      size="sm"
    >
      <RefreshCwIcon :class="['h-4 w-4 mr-2', isLoading && 'animate-spin']" />
      Refresh
    </Button>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  availableCount: number
  downloadedCount: number
  isLoading: boolean
}

interface Emits {
  (e: 'refresh'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script> 