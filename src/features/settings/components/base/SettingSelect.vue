<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SettingItem from './SettingItem.vue'

interface Option {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  label: string
  description?: string
  help?: string
  modelValue: string
  options: Option[]
  placeholder?: string
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
}

withDefaults(defineProps<Props>(), {
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
    <Select 
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="val => {
        // Try to cast to number if the option value is a number
        const opt = options.find(o => o.value == val)
        if (opt && typeof opt.value === 'number') {
          $emit('update:modelValue', Number(val))
        } else {
          $emit('update:modelValue', typeof val === 'string' ? val : String(val ?? ''))
        }
      }"
    >
      <SelectTrigger class="w-[200px]">
        <SelectValue :placeholder="placeholder" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem 
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          <div>
            <div class="font-medium">{{ option.label }}</div>
            <div v-if="option.description" class="text-xs text-muted-foreground">
              {{ option.description }}
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </SettingItem>
</template>
