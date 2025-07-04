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
import { indentUnit } from '@codemirror/language'
import { computed, ref, onMounted, watch, onUnmounted } from 'vue'
import { useCodeFormatting } from './composables/useCodeFormatting'
import { Button } from '@/ui/button'

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
  indentWithTab?: boolean
  preserveIndent?: boolean
  tabSize?: number
  autoFormat?: boolean
  showTemplateButton?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'format-code': []
  'show-templates': []
}>()

const isDark = ref(false)
const editorElement = ref<HTMLElement | null>(null)
const editorView = ref<EditorView | null>(null)

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

// Add formatting composable
const {
  isFormatting,
  formatError,
  formatDocument,
  formatSelection,
  getFormattingExtensions
} = useCodeFormatting({
  language: props.language || 'text',
  tabSize: props.tabSize || 4,
  insertSpaces: true,
  autoFormat: props.autoFormat || false
})

// Set up editor extensions
const extensions = computed(() => {
  const exts = [
    lineNumbers(),
    EditorView.lineWrapping,
    isDark.value ? basicDark : basicLight,
    indentUnit.of(' '.repeat(props.tabSize || 4)),
    // Add formatting extensions
    ...getFormattingExtensions(),
    // Add scrollbar configuration
    EditorView.theme({
      '&': {
        height: '100%',
        overflow: 'auto'
      },
      '.cm-scroller': {
        overflow: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)'
      },
      '.cm-scroller::-webkit-scrollbar': {
        width: '8px',
        height: '8px'
      },
      '.cm-scroller::-webkit-scrollbar-track': {
        background: 'var(--scrollbar-track)',
        borderRadius: '4px'
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        background: 'var(--scrollbar-thumb)',
        borderRadius: '4px',
        border: '2px solid var(--scrollbar-track)'
      },
      '.cm-scroller::-webkit-scrollbar-thumb:hover': {
        background: 'var(--scrollbar-thumb-hover)'
      },
      // Add formatting status styles
      '&.formatting': {
        opacity: '0.7',
        pointerEvents: 'none'
      },
      // Enhanced running status styles
      '&.running': {
        borderLeft: '3px solid var(--primary)',
        backgroundColor: 'var(--primary/5)'
      },
      '&.error': {
        borderLeft: '3px solid var(--destructive)',
        backgroundColor: 'var(--destructive/5)'
      },
      '&.success': {
        borderLeft: '3px solid var(--success)',
        backgroundColor: 'var(--success/5)'
      }
    })
  ]

  // Add language extension if available
  if (languageExtension.value) {
    exts.push(languageExtension.value)
  }

  // Add readonly/disabled extensions
  if (props.readonly || props.disabled) {
    exts.push(EditorView.editable.of(false))
    // Add a custom extension to preserve indentation
    exts.push(EditorView.theme({
      '&.cm-disabled, &.cm-readonly': {
        opacity: props.isPublished ? '1' : '0.7',
        backgroundColor: props.isPublished ? 'var(--card)' : 'var(--muted)',
        cursor: 'not-allowed'
      },
      '&.cm-disabled .cm-content, &.cm-readonly .cm-content': {
        cursor: 'not-allowed',
        userSelect: 'none'
      },
      '&.cm-disabled .cm-line, &.cm-readonly .cm-line': {
        whiteSpace: 'pre'
      },
      '&.cm-disabled .cm-gutter, &.cm-readonly .cm-gutter': {
        opacity: '1'
      }
    }))
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

// Add formatting methods
const handleFormatDocument = async () => {
  if (editorView.value) {
    await formatDocument(editorView.value)
    emit('format-code')
  }
}

const handleFormatSelection = async () => {
  if (editorView.value) {
    await formatSelection(editorView.value)
    emit('format-code')
  }
}

const handleShowTemplates = () => {
  emit('show-templates')
}

const onEditorReady = (payload: any) => {
  editorView.value = payload.view
}
</script>

<template>
  <div 
    ref="editorElement"
    class="codemirror-container relative" 
    :class="containerClasses"
    :style="{ maxHeight: maxHeight }"
  >
    <!-- Formatting Toolbar -->
    <div v-if="!readonly && !disabled && !isPublished" class="flex items-center gap-2 p-2 border-b bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        @click="handleFormatDocument"
        :disabled="isFormatting"
        class="h-7 px-2 text-xs"
        title="Format code (Ctrl+Shift+F)"
      >
        <span v-if="isFormatting">Formatting...</span>
        <span v-else>Format</span>
      </Button>
      
      <Button
        v-if="showTemplateButton"
        variant="ghost"
        size="sm"
        @click="handleShowTemplates"
        class="h-7 px-2 text-xs"
        title="Insert template"
      >
        Templates
      </Button>
      
      <div v-if="formatError" class="text-xs text-destructive ml-2">
        {{ formatError }}
      </div>
    </div>

    <Codemirror
      v-model="code"
      :extensions="extensions"
      :disabled="disabled"
      :indent-with-tab="indentWithTab !== false"
      :tab-size="tabSize || 4"
      placeholder="Enter code here..."
      :style="{ height: fullScreen ? '100%' : 'auto' }"
      :class="{
        'cm-readonly': readonly,
        'cm-disabled': disabled,
        'cm-published': isPublished,
        'formatting': isFormatting
      }"
      @ready="onEditorReady"
    />
    
    <!-- Disabled overlay - Don't show when in published mode -->
    <div 
      v-if="disabled && !isPublished" 
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
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cm-editor {
  height: 100%;
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.cm-scroller {
  flex: 1;
  overflow: auto;
}

/* Style for readonly editor */
.cm-readonly .cm-content {
  caret-color: transparent;
  white-space: pre !important;
}

/* Custom scrollbar variables */
:root {
  --scrollbar-track: rgba(0, 0, 0, 0.1);
  --scrollbar-thumb: rgba(0, 0, 0, 0.2);
  --scrollbar-thumb-hover: rgba(0, 0, 0, 0.3);
}

.dark {
  --scrollbar-track: rgba(255, 255, 255, 0.1);
  --scrollbar-thumb: rgba(255, 255, 255, 0.2);
  --scrollbar-thumb-hover: rgba(255, 255, 255, 0.3);
}

/* Style for disabled editor */
.cm-disabled {
  opacity: 0.75;
}

.cm-disabled .cm-content {
  cursor: not-allowed;
  user-select: none;
  white-space: pre !important;
}

.cm-disabled .cm-line,
.cm-readonly .cm-line {
  white-space: pre !important;
}

/* Published mode specific styles */
.cm-published.cm-readonly .cm-content,
.cm-published.cm-disabled .cm-content {
  white-space: pre !important;
  opacity: 1;
}

.cm-published.cm-readonly .cm-line,
.cm-published.cm-disabled .cm-line {
  white-space: pre !important;
}

.codemirror-container.disabled {
  cursor: not-allowed;
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









