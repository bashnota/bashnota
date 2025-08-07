<script setup lang="ts">
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import SettingItem from './SettingItem.vue'

interface Props {
  label: string
  description?: string
  help?: string
  modelValue: number[]
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
  showValue?: boolean
}

withDefaults(defineProps<Props>(), {
  step: 1,
  layout: 'horizontal',
  showValue: true
})

defineEmits<{
  'update:modelValue': [value: number[]]
}>()
</script>

<template>
  <SettingItem 
    :label="label"
    :description="description"
    :help="help"
    :disabled="disabled"
    :layout="layout"
  >
    <div class="flex items-center gap-3 min-w-[200px]">
      <Slider 
        :model-value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="flex-1"
        @update:model-value="(value) => value && $emit('update:modelValue', value)"
      />
      
      <Badge v-if="showValue" variant="outline" class="min-w-[60px] justify-center">
        {{ modelValue[0] }}{{ unit }}
      </Badge>
    </div>
  </SettingItem>
</template>
