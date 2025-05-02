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
import { computed, ref, onMounted, watch, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  disabled?: boolean
  maxHeight?: string
  language?: string
  fullScreen?: boolean
  autofocus?: boolean
  runningStatus?: 'idle' | 'running' | 'error' | 'success'
  isPublished?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isDark = ref(false)
const editorElement = ref<HTMLElement | null>(null)

// Determine colorization extension for known languages
const languageExtension = computed(() => {
  if (!props.language) return null
  
  const lang = props.language.toLowerCase()
  switch (lang) {
    case 'python':
    case 'py':
      return python()
    case 'javascript':
    case 'js':
    case 'typescript':
    case 'ts':
      return javascript()
    case 'html':
    case 'xml':
    case 'svg':
      return html()
    case 'css':
    case 'scss':
    case 'less':
      return css()
    case 'json':
      return json()
    case 'markdown':
    case 'md':
      return markdown()
    default:
      return null
  }
})

// Computed property for v-model
const code = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Determine if we should use dark mode theme
const checkDarkMode = () => {
  if (typeof window !== 'undefined') {
    // Check for dark mode preference
    isDark.value = window.matchMedia?.('(prefers-color-scheme: dark)').matches || 
                  document.documentElement.classList.contains('dark')
  }
}

// Set up editor extensions
const extensions = computed(() => {
  const exts = [
    lineNumbers(),
    EditorView.lineWrapping,
    isDark.value ? basicDark : basicLight,
  ]

  // Add language extension if available
  if (languageExtension.value) {
    exts.push(languageExtension.value)
  }

  // Add readonly extension if needed
  if (props.readonly || props.disabled) {
    exts.push(EditorView.editable.of(false))
  }

  return exts
})

// Watch for dark mode changes
const darkModeMediaQuery = ref<MediaQueryList | null>(null)

onMounted(() => {
  checkDarkMode()
  
  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    darkModeMediaQuery.value = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeMediaQuery.value.addEventListener('change', checkDarkMode)
  }

  // Also listen for class changes on documentElement for theme toggles
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'class') {
        checkDarkMode()
      }
    })
  })
  
  observer.observe(document.documentElement, { attributes: true })

  // Set initial focus if autofocus is true and not readonly/disabled
  if (props.autofocus && !props.readonly && !props.disabled && editorElement.value) {
    const cmEditor = editorElement.value.querySelector('.cm-editor')
    if (cmEditor) {
      (cmEditor as HTMLElement).focus()
    }
  }
})

// Clean up event listeners
onUnmounted(() => {
  if (darkModeMediaQuery.value) {
    darkModeMediaQuery.value.removeEventListener('change', checkDarkMode)
  }
})

// Watch for running status changes to update UI
watch(() => props.runningStatus, (newStatus) => {
  if (!editorElement.value) return
  
  const editor = editorElement.value.querySelector('.cm-editor')
  if (!editor) return
  
  // Add/remove status classes
  editor.classList.remove('running', 'error', 'success')
  
  if (newStatus === 'running') {
    editor.classList.add('running')
  } else if (newStatus === 'error') {
    editor.classList.add('error')
  } else if (newStatus === 'success') {
    editor.classList.add('success')
  }
}, { immediate: true })

// Apply visual effects to disabled state
const containerClasses = computed(() => {
  return {
    'h-full': props.fullScreen,
    'disabled': props.disabled,
    'readonly': props.readonly,
    'published': props.isPublished,
  }
})
</script>

<template>
  <div 
    ref="editorElement"
    class="codemirror-container relative" 
    :class="containerClasses"
    :style="{ maxHeight: maxHeight }"
  >
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :disabled="disabled"
      :indent-with-tab="true"
      placeholder="Enter code here..."
      :style="{ height: fullScreen ? '100%' : 'auto' }"
      :class="{
        'cm-readonly': readonly,
        'cm-disabled': disabled,
        'cm-published': isPublished,
      }"
    />
    
    <!-- Disabled overlay for better user feedback -->
    <div 
      v-if="disabled" 
      class="absolute inset-0 bg-muted/20 backdrop-blur-[1px] pointer-events-none flex items-center justify-center z-10">
      <div class="text-sm text-muted-foreground bg-background/90 px-3 py-1.5 rounded-md shadow">
        Code execution in progress...
      </div>
    </div>
    
    <!-- Readonly indicator when in published mode -->
    <div 
      v-if="readonly && isPublished" 
      class="absolute top-2 right-2 text-xs bg-muted/60 text-muted-foreground px-2 py-1 rounded-md">
      Read-only
    </div>
  </div>
</template>

<style>
.codemirror-container {
  font-size: 0.9rem;
  border-radius: 0.375rem;
  overflow: hidden;
  position: relative;
}

.cm-editor {
  height: 100%;
  border-radius: inherit;
}

/* Style for readonly editor */
.cm-readonly .cm-content {
  caret-color: transparent;
}

.cm-readonly.cm-focused {
  outline: none !important;
}

/* Style for disabled editor */
.cm-disabled {
  opacity: 0.75;
}

.codemirror-container.disabled {
  cursor: not-allowed;
}

.cm-scroller {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  padding: 0.5rem 0;
}

.cm-gutters {
  border-right-color: var(--border);
  background-color: var(--muted);
  color: var(--muted-foreground);
  /* Ensure gutters take full height */
  height: 100% !important;
}

/* Transitions for the status changes */
.cm-editor {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* Running state with subtle animation */
.cm-editor.running {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary-light);
  animation: pulse-border 2s infinite alternate;
}

/* Error state */
.cm-editor.error {
  border-color: var(--destructive);
  box-shadow: 0 0 0 1px var(--destructive-light);
}

/* Success state with fade out transition */
.cm-editor.success {
  border-color: var(--success);
  box-shadow: 0 0 0 1px var(--success-light);
  animation: success-fade 2s forwards;
}

/* Published mode styles */
.codemirror-container.published .cm-editor {
  background-color: var(--card);
  border: 1px solid var(--border);
}

/* Animations */
@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 0 var(--primary-alpha);
  }
  100% {
    box-shadow: 0 0 0 4px var(--primary-alpha);
  }
}

@keyframes success-fade {
  0%, 50% {
    border-color: var(--success);
    box-shadow: 0 0 0 1px var(--success-light);
  }
  100% {
    border-color: var(--border);
    box-shadow: none;
  }
}
</style>
