<template>
  <div class="math-input w-full space-y-4">
    <div>
      <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        LaTeX Expression
      </label>
      <div class="relative mt-2">
        <!-- Syntax highlighting overlay -->
        <div 
          class="absolute inset-0 pointer-events-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed whitespace-pre-wrap"
          style="color: transparent; z-index: 1;"
          v-html="highlightedLatex"
        ></div>
        <!-- Actual textarea -->
        <Textarea
          v-model="latexValue"
          :placeholder="placeholder"
          class="relative resize-none font-mono min-h-20 bg-transparent"
          style="z-index: 2; color: rgb(0 0 0 / 0);"
          :rows="rows"
          @keydown.enter.prevent="onEnter"
          @keydown.esc="onEscape"
          @input="onInput"
          @scroll="syncScroll"
          ref="textareaRef"
        />
        <!-- Visible text overlay -->
        <div 
          class="absolute inset-0 pointer-events-none overflow-hidden rounded-md border-0 px-3 py-2 text-sm font-mono leading-relaxed whitespace-pre-wrap text-foreground"
          style="z-index: 3;"
          v-html="highlightedLatex"
          ref="highlightRef"
        ></div>
      </div>
      <p class="text-sm text-muted-foreground mt-2">
        Enter your LaTeX mathematical expression
      </p>
    </div>
    
    <!-- LaTeX Preview -->
    <div v-if="latexValue.trim()" class="border rounded-md p-4 bg-muted/50">
      <label class="text-sm font-medium leading-none mb-2 block">Preview:</label>
      <div 
        class="min-h-8 flex items-center justify-center bg-background rounded border p-3"
        v-html="renderedLatex"
      ></div>
    </div>
    
    <div class="flex justify-end gap-2">
      <Button 
        type="button"
        variant="outline" 
        size="sm"
        @click="onCancel"
      >
        Cancel
      </Button>
      <Button 
        type="button"
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
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from "@/components/ui/textarea"
// @ts-ignore
import katex from 'katex'
import 'katex/dist/katex.min.css'

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

// Computed property to render LaTeX
const renderedLatex = computed(() => {
  if (!latexValue.value.trim()) return ''
  
  try {
    return katex.renderToString(latexValue.value, {
      throwOnError: false,
      displayMode: true,
      output: 'html'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return `<span class="text-destructive text-sm">Invalid LaTeX: ${errorMessage}</span>`
  }
})

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








