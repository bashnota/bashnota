<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/ui/button'
import { Loader2 } from 'lucide-vue-next'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'

interface Props {
  action: CustomAIAction
  isExecuting?: boolean
  isDisabled?: boolean
  size?: 'sm' | 'lg' | 'default' | 'icon'
  variant?: 'default' | 'outline' | 'ghost'
}

interface Emits {
  'execute': [action: CustomAIAction]
}

const props = withDefaults(defineProps<Props>(), {
  isExecuting: false,
  isDisabled: false,
  size: 'sm',
  variant: 'outline'
})

const emit = defineEmits<Emits>()

const getIconComponent = (iconName: string) => {
  // Simplified icon mapping - you can expand this
  const iconMap: Record<string, any> = {
    Brain: () => import('lucide-vue-next').then(m => m.Brain),
    RefreshCw: () => import('lucide-vue-next').then(m => m.RefreshCw),
    Shield: () => import('lucide-vue-next').then(m => m.Shield),
    Zap: () => import('lucide-vue-next').then(m => m.Zap),
    TestTube: () => import('lucide-vue-next').then(m => m.TestTube),
    Code2: () => import('lucide-vue-next').then(m => m.Code2),
    FileText: () => import('lucide-vue-next').then(m => m.FileText),
    Edit: () => import('lucide-vue-next').then(m => m.Edit),
    Play: () => import('lucide-vue-next').then(m => m.Play),
    Wrench: () => import('lucide-vue-next').then(m => m.Wrench)
  }
  // Fallback to Brain icon
  return iconMap[iconName] || (() => import('lucide-vue-next').then(m => m.Brain))
}

const iconComponent = computed(() => getIconComponent(props.action.icon))

const handleClick = () => {
  if (!props.isDisabled && !props.isExecuting) {
    emit('execute', props.action)
  }
}
</script>

<template>
  <Button
    @click="handleClick"
    :disabled="isDisabled || isExecuting"
    :variant="variant"
    :size="size"
    class="ai-action-btn"
  >
    <Loader2 v-if="isExecuting" class="w-4 h-4 animate-spin" />
    <component v-else :is="iconComponent" class="w-4 h-4" />
    {{ action.name }}
  </Button>
</template>

<style scoped>
.ai-action-btn {
  @apply w-full justify-start gap-2 transition-all duration-200;
  
  &:hover:not(:disabled) {
    @apply scale-[1.02] shadow-sm;
  }
}
</style> 