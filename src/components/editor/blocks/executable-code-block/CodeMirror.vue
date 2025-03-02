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
import { EditorView, lineNumbers } from '@codemirror/view'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  disabled?: boolean
  maxHeight?: string
  language?: string
  fullScreen?: boolean
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

// Basic setup for CodeMirror with line numbers
const extensions = computed(() => [
  EditorView.lineWrapping,
  lineNumbers(),
  getLanguageExtension.value,
  isDark.value ? basicDark : basicLight,
  props.readonly ? EditorView.editable.of(false) : [],
  EditorView.theme({
    "&": {
      height: props.fullScreen ? "100%" : "auto",
      maxHeight: props.fullScreen ? "none" : (props.maxHeight || "300px")
    },
    ".cm-gutters": {
      position: "sticky",
      left: 0,
      backgroundColor: "var(--muted, #f1f5f9)",
      borderRight: "1px solid var(--border, #e2e8f0)",
      minHeight: "100%",
      boxSizing: "border-box",
      zIndex: 1
    },
    ".cm-lineNumbers": {
      minWidth: "3em",
      color: "var(--muted-foreground, #64748b)",
      fontSize: "0.85em",
      fontFamily: "monospace"
    },
    ".cm-content": {
      minHeight: "100%"
    }
  })
])
</script>

<template>
  <div class="rounded-md border border-input bg-background code-mirror-container" :class="{ 'h-full': fullScreen }">
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :disabled="disabled"
      placeholder="Enter Python code here..."
      :style="{ 
        maxHeight: props.fullScreen ? 'none' : (props.maxHeight || '300px'), 
        overflow: 'auto',
        height: props.fullScreen ? '100%' : 'auto'
      }"
      class="h-full"
    />
  </div>
</template>

<style>
/* Base styles for editor */
.code-mirror-container {
  display: flex;
  flex-direction: column;
}

.cm-editor {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.cm-scroller {
  overflow: auto !important;
  height: 100% !important;
  position: relative;
  flex: 1;
}

.cm-content {
  min-height: 100%;
  padding-bottom: 50px;
}

.cm-gutters {
  position: sticky !important;
  left: 0 !important;
  height: auto !important;
  min-height: 100% !important;
  z-index: 1 !important;
  background-color: var(--muted, #f1f5f9) !important;
  border-right: 1px solid var(--border, #e2e8f0) !important;
}

.cm-lineNumbers {
  color: var(--muted-foreground, #64748b) !important;
  font-size: 0.85em !important;
  font-family: monospace !important;
  min-width: 3em !important;
}

.dark .cm-gutters {
  background-color: var(--muted, #1e293b) !important;
  border-right-color: var(--border, #334155) !important;
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
