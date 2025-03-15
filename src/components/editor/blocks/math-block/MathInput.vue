<template>
  <div class="math-input w-full">
    <div class="relative">
      <textarea
        v-model="latexValue"
        class="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
        :placeholder="placeholder"
        :rows="rows"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onEscape"
        @blur="onBlur"
        ref="textareaRef"
      ></textarea>
    </div>
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
import { ref, onMounted, watch, defineProps, defineEmits, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

onMounted(async () => {
  // Wait for the DOM to update
  await nextTick()
  // Focus the textarea when mounted
  if (textareaRef.value) {
    textareaRef.value.focus()
  }
})
</script> 