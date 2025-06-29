<script setup lang="ts">
import { SelectValue, type SelectValueProps } from 'radix-vue'

interface Props extends SelectValueProps {
  placeholder?: string
}

defineProps<Props>()
</script>

<template>
  <SelectValue 
    :placeholder="placeholder"
    v-bind="$attrs"
  >
    <slot />
  </SelectValue>
</template>









