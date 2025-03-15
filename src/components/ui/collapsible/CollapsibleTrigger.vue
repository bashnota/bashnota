<script setup lang="ts">
import { CollapsibleTrigger } from 'radix-vue'
</script>

<template>
  <CollapsibleTrigger v-bind="$attrs">
    <slot />
  </CollapsibleTrigger>
</template> 