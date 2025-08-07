<script setup lang="ts">
import { Input } from '@/components/ui/input'
import SettingItem from './SettingItem.vue'


interface Props {
  label: string
  description?: string
  help?: string
  modelValue: string | number
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'url' | 'number' | 'color'
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  layout: 'horizontal'
})

defineEmits<{
  'update:modelValue': [value: string | number]
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
    <Input 
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-[200px]"
      @update:model-value="val => $emit('update:modelValue', type === 'number' ? (val === '' ? '' : Number(val)) : val)"
    />
  </SettingItem>
</template>
