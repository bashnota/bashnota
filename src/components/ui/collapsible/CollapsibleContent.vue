<script setup lang="ts">
import { CollapsibleContent } from 'radix-vue'
</script>

<template>
  <CollapsibleContent v-bind="$attrs">
    <slot />
  </CollapsibleContent>
</template> 