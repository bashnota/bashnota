<template>
  <div class="w-full">
    <textarea
      v-model="modelValue"
      @blur="$emit('update:modelValue', modelValue)"
      class="w-full min-h-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
      placeholder="Enter mermaid diagram code..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelValue = ref(props.modelValue)
</script> 