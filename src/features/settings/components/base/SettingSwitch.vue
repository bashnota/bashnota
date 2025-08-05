<script setup lang="ts">
import { Switch } from '@/components/ui/switch'
import SettingItem from './SettingItem.vue'

interface Props {
  label: string
  description?: string
  help?: string
  modelValue: boolean
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
}

defineProps<Props>()
defineEmits<{
  'update:modelValue': [value: boolean]
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
    <Switch 
      :checked="modelValue"
      :disabled="disabled"
      @update:checked="$emit('update:modelValue', $event)"
    />
  </SettingItem>
</template>
