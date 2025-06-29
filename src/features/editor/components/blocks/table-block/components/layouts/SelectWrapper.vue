<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'

const props = defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="relative">
    <Select
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <SelectTrigger class="w-full">
        <slot name="trigger">
          <SelectValue :placeholder="placeholder" />
        </slot>
      </SelectTrigger>
      <SelectContent class="relative z-50">
        <SelectItem
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template> 








