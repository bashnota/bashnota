<script setup lang="ts">
import { Separator } from '@/components/ui/separator'

interface Props {
  title: string
  description?: string
  showSeparator?: boolean
}

withDefaults(defineProps<Props>(), {
  showSeparator: true
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-medium text-foreground">{{ title }}</h3>
      <p v-if="description" class="text-xs text-muted-foreground mt-1">
        {{ description }}
      </p>
    </div>
    
    <div class="space-y-4">
      <slot />
    </div>
    
    <Separator v-if="showSeparator" />
  </div>
</template>
