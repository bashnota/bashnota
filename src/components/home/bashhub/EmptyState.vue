<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  className: ''
})
</script>

<template>
  <div :class="cn('text-center py-8', className)">
    <component 
      :is="icon" 
      class="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
    />
    <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
    <p class="text-muted-foreground">{{ description }}</p>
  </div>
</template>