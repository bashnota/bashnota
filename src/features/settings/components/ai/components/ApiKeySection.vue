<template>
  <div class="space-y-2">
    <Label :for="`api-key-${providerId}`">
      {{ label || `${providerName} API Key` }}
    </Label>
    <div class="flex space-x-2">
      <Input
        :id="`api-key-${providerId}`"
        v-model="localValue"
        type="password"
        :placeholder="placeholder || `Enter ${providerName} API key`"
        class="flex-1"
        @blur="handleBlur"
        @paste="handlePaste"
        :disabled="disabled"
      />
      <Button 
        v-if="localValue && showClearButton"
        variant="destructive" 
        size="icon"
        @click="clearKey"
        :disabled="disabled"
      >
        <Trash2Icon class="h-4 w-4" />
      </Button>
    </div>
    <div class="text-xs text-gray-500 space-y-1">
      <p v-if="instructions">{{ instructions }}</p>
      <div v-if="showStatus" class="flex items-center gap-2">
        <Badge :variant="isValid ? 'default' : 'destructive'">
          {{ isValid ? 'Valid Key' : 'Invalid Key' }}
        </Badge>
        <span v-if="lastValidated" class="text-xs">
          Last validated: {{ formatTime(lastValidated) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2Icon } from 'lucide-vue-next'

export interface ApiKeySectionProps {
  modelValue: string
  providerId: string
  providerName: string
  label?: string
  placeholder?: string
  instructions?: string
  disabled?: boolean
  showClearButton?: boolean
  showStatus?: boolean
  isValid?: boolean
  lastValidated?: Date
}

export interface ApiKeySectionEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'clear'): void
  (e: 'paste', event: ClipboardEvent): void
}

const props = withDefaults(defineProps<ApiKeySectionProps>(), {
  showClearButton: true,
  showStatus: false,
  isValid: false
})

const emit = defineEmits<ApiKeySectionEmits>()

const localValue = ref(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

// Computed
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Methods
const handleBlur = () => {
  emit('update:modelValue', localValue.value)
  emit('change', localValue.value)
}

const handlePaste = (event: ClipboardEvent) => {
  const clipboardText = event.clipboardData?.getData('text') || ''
  if (clipboardText.trim()) {
    localValue.value = clipboardText.trim()
    emit('update:modelValue', localValue.value)
    emit('change', localValue.value)
    emit('paste', event)
  }
}

const clearKey = () => {
  localValue.value = ''
  emit('update:modelValue', '')
  emit('change', '')
  emit('clear')
}
</script> 








