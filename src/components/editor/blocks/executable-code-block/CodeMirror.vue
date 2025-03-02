<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { basicLight } from 'cm6-theme-basic-light'
import { basicDark } from 'cm6-theme-basic-dark'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  disabled?: boolean
  maxHeight?: string
  language?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isDark = ref(false)

// Computed property for v-model
const code = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Get language extension based on language prop
const getLanguageExtension = computed(() => {
  switch (props.language?.toLowerCase()) {
    case 'python':
    case 'py':
      return python()
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return javascript()
    case 'html':
      return html()
    case 'css':
      return css()
    case 'json':
      return json()
    case 'markdown':
    case 'md':
      return markdown()
    default:
      return python() // Default to Python
  }
})

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value =
    savedTheme === 'dark' ||
    (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const observer = new MutationObserver(() => {
    const newTheme = localStorage.getItem('theme')
    isDark.value =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

const extensions = computed(() => [
  EditorView.lineWrapping,
  getLanguageExtension.value,
  isDark.value ? basicDark : basicLight,
  props.readonly ? EditorView.editable.of(false) : [],
])
</script>

<template>
  <div class="rounded-md border border-input bg-background">
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :disabled="disabled"
      placeholder="Enter Python code here..."
      :style="{ maxHeight: props.maxHeight || '300px', overflow: 'auto' }"
    />
  </div>
</template>

<style>
/* Base styles for editor */
.cm-scroller,
.cm-gutters {
  min-height: 150px !important;
  max-height: inherit !important;
  overflow: auto !important;
}

/* Custom scrollbar styles */
.cm-scroller::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.cm-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.cm-scroller::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

.cm-scroller {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

/* Autocomplete menu styles */
.cm-tooltip {
  @apply border border-border bg-popover text-popover-foreground shadow-md !important;
}

.cm-tooltip .cm-completionLabel {
  @apply text-sm;
}
</style>
