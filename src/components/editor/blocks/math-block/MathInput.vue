<template>
  <div class="math-input w-full">
    <Textarea
      v-model="latexValue"
      class="font-mono"
      :placeholder="placeholder"
      :rows="rows"
      @keydown.enter.prevent="onEnter"
      @keydown.esc="onEscape"
      @blur="onBlur"
      ref="textareaRef"
    />
    <div class="flex justify-end gap-2 mt-2">
      <Button 
        variant="outline" 
        size="sm"
        @click="onCancel"
      >
        Cancel
      </Button>
      <Button 
        variant="default" 
        size="sm"
        @click="onSave"
      >
        Save
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save', value: string): void
  (e: 'cancel'): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const latexValue = ref(props.modelValue)

const onSave = () => {
  emit('update:modelValue', latexValue.value)
  emit('save', latexValue.value)
}

const onCancel = () => {
  latexValue.value = props.modelValue
  emit('cancel')
}

const onEnter = () => {
  onSave()
}

const onEscape = () => {
  onCancel()
}

const onBlur = () => {
  // Don't trigger save on blur as we have explicit save/cancel buttons
}

watch(() => props.modelValue, (newValue) => {
  latexValue.value = newValue
})

onMounted(() => {
  // Focus the textarea when mounted
  textareaRef.value?.focus()
})
</script> 