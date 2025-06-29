<script setup lang="ts">
import { CollapsibleRoot, type CollapsibleRootEmits, type CollapsibleRootProps } from 'radix-vue'

const props = defineProps<CollapsibleRootProps>()
const emits = defineEmits<CollapsibleRootEmits>()
</script>

<template>
  <CollapsibleRoot v-bind="props" @update:open="(value) => emits('update:open', value)">
    <slot />
  </CollapsibleRoot>
</template> 








