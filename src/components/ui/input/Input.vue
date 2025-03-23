<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { useVModel } from '@vueuse/core'
import { ref } from 'vue'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  className?: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const input = ref<HTMLInputElement | null>(null)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emits('update:modelValue', target.value)
}

// We're not using useVModel because we're manually handling the binding
// const modelValue = useVModel(props, 'modelValue', emits, {
//   passive: true,
//   defaultValue: props.defaultValue,
// })

// Expose the input element methods
defineExpose({
  focus: () => input.value?.focus(),
})
</script>

<template>
  <input
    ref="input"
    :value="props.modelValue ?? props.defaultValue"
    @input="onInput"
    :class="[
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    ]"
    v-bind="$attrs"
  />
</template>
