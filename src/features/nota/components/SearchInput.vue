<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-vue-next'

interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  disabled: false,
  size: 'md'
})

const emit = defineEmits<Emits>()

const sizeClasses = {
  sm: 'h-8 pl-8 pr-8 text-sm',
  md: 'h-10 pl-10 pr-10',
  lg: 'h-12 pl-12 pr-12 text-lg'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4', 
  lg: 'h-5 w-5'
}

const iconPositions = {
  sm: 'left-2',
  md: 'left-3',
  lg: 'left-4'
}

const clearButtonSizes = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7'
}

const clearIconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3 w-3',
  lg: 'h-4 w-4'
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="relative">
    <Search :class="[
      'absolute top-1/2 -translate-y-1/2 text-muted-foreground',
      iconSizes[size],
      iconPositions[size]
    ]" />
    <Input
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="sizeClasses[size]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <Button
      v-if="modelValue"
      variant="ghost"
      size="icon"
      :class="[
        'absolute right-1 top-1/2 -translate-y-1/2',
        clearButtonSizes[size]
      ]"
      @click="handleClear"
    >
      <X :class="clearIconSizes[size]" />
    </Button>
  </div>
</template>
