<script setup lang="ts">
import { cn } from '@/lib/utils'
import { tableVariants } from '.'

const props = defineProps<{
  class?: string
}>()
</script>

<template>
  <div class="relative w-full overflow-auto">
    <table :class="cn(tableVariants(), props.class)">
      <slot />
    </table>
  </div>
</template> 








