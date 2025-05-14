<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'

const props = defineProps<{
  status: 'idle' | 'running' | 'error' | 'success'
  executionTime?: number
  progress?: number
}>()

const statusConfig = computed(() => {
  switch (props.status) {
    case 'running':
      return {
        icon: Loader2,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        text: 'Running',
        animation: 'animate-spin'
      }
    case 'success':
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        text: 'Success',
        animation: ''
      }
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        text: 'Error',
        animation: ''
      }
    default:
      return {
        icon: Clock,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        text: 'Idle',
        animation: ''
      }
  }
})

const formattedTime = computed(() => {
  if (!props.executionTime) return ''
  if (props.executionTime < 1000) return `${props.executionTime}ms`
  return `${(props.executionTime / 1000).toFixed(1)}s`
})
</script>

<template>
  <div class="execution-status" :class="[statusConfig.bgColor, 'rounded-md p-2 flex items-center gap-2']">
    <component
      :is="statusConfig.icon"
      class="w-4 h-4"
      :class="[statusConfig.color, statusConfig.animation]"
    />
    <span :class="statusConfig.color" class="text-sm font-medium">
      {{ statusConfig.text }}
      <span v-if="formattedTime" class="ml-1 text-xs opacity-75">
        ({{ formattedTime }})
      </span>
    </span>
    <Progress
      v-if="status === 'running' && progress !== undefined"
      :value="progress"
      class="w-24 h-1"
    />
  </div>
</template>

<style scoped>
.execution-status {
  transition: all 0.2s ease-in-out;
}
</style> 