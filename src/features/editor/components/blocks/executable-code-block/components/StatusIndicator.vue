<script setup lang="ts">
import { Loader2, AlertTriangle } from 'lucide-vue-next'

interface Props {
  isExecuting: boolean
  hasError: boolean
  isPublished: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    v-if="(isExecuting || hasError) && !isPublished"
    class="flex items-center px-3 py-1.5 bg-muted/20 border-b"
  >
    <!-- Execution status indicator -->
    <div
      v-if="isExecuting && !isPublished"
      class="flex items-center text-xs gap-1 px-2 py-1 rounded-full status-running"
    >
      <Loader2 class="h-3 w-3 animate-spin" />
      <span>Running</span>
    </div>
    
    <!-- Error indicator -->
    <div
      v-else-if="hasError && !isPublished"
      class="flex items-center text-xs gap-1 px-2 py-1 rounded-full status-error"
    >
      <AlertTriangle class="h-3 w-3" />
      <span>Error</span>
    </div>
  </div>
</template>

<style scoped>
.status-running {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.status-error {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}
</style>
