<script setup lang="ts">
import { SelectTrigger, SelectIcon, type SelectTriggerProps } from 'radix-vue'

interface Props extends SelectTriggerProps {
  className?: string
}

defineProps<Props>()
</script>

<template>
  <SelectTrigger
    class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
    :class="className"
    v-bind="$attrs"
  >
    <slot />
    <SelectIcon class="h-4 w-4 opacity-50" />
  </SelectTrigger>
</template>
