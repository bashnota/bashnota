<script setup lang="ts">
import { SelectRoot } from 'radix-vue'

defineProps<{
  modelValue?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <SelectRoot 
    v-bind="$attrs" 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <slot />
  </SelectRoot>
</template>









