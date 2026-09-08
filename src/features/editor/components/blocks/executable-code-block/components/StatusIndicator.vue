<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, AlertTriangle, Clock3, Square } from 'lucide-vue-next'
import type { ExecutionState } from '@/features/editor/types/codeExecution'

interface Props {
  isExecuting: boolean
  hasError: boolean
  isPublished: boolean
  executionState?: ExecutionState
  elapsedMs?: number
}

const props = defineProps<Props>()

const state = computed<ExecutionState>(() => props.executionState ?? (props.isExecuting ? 'running' : props.hasError ? 'failed' : 'idle'))
const label = computed(() => ({
  idle: '',
  queued: 'Queued',
  running: 'Running',
  interrupting: 'Interrupting',
  timed_out: 'Timed out',
  cancelled: 'Cancelled',
  failed: 'Failed',
  succeeded: 'Completed',
})[state.value])
</script>

<template>
  <div
    v-if="state !== 'idle' && state !== 'succeeded' && !isPublished"
    class="flex items-center px-3 py-1.5 bg-muted/20 border-b"
    role="status"
    aria-live="polite"
  >
    <div
      class="flex items-center text-xs gap-1 px-2 py-1 rounded-full"
      :class="state === 'failed' || state === 'timed_out' ? 'status-error' : 'status-running'"
    >
      <Clock3 v-if="state === 'queued'" class="h-3 w-3" />
      <Square v-else-if="state === 'cancelled'" class="h-3 w-3 fill-current" />
      <AlertTriangle v-else-if="state === 'failed' || state === 'timed_out'" class="h-3 w-3" />
      <Loader2 v-else class="h-3 w-3 animate-spin" />
      <span>{{ label }}</span>
      <span v-if="elapsedMs !== undefined" class="tabular-nums opacity-75">
        · {{ (elapsedMs / 1000).toFixed(1) }}s
      </span>
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
