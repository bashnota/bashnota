<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { X, Play, Loader2 } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import OutputRenderer from './OutputRenderer.vue'
import { useFullscreenCode } from './composables/useFullscreenCode'

interface Props {
  code: string
  output: string | null
  outputType?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
  isOpen: boolean
  language: string
  isExecuting?: boolean
  isReadOnly?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:code': [code: string]
  'execute': []
}>()

const {
  resizing,
  isOutputFullscreen,
  isMac,
  handleKeyDown,
  startResize,
  handleResize,
  endResize,
  toggleOutputFullscreen,
  editorContainerStyle,
  outputContainerStyle
} = useFullscreenCode()

// Setup event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', endResize)
  document.addEventListener('keydown', (e) => handleKeyDown(e, onClose, props.isExecuting || false))
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', endResize)
  document.removeEventListener('keydown', (e) => handleKeyDown(e, onClose, props.isExecuting || false))
})

const onClose = () => {
  emit('update:isOpen', false)
}

const onCodeUpdate = (newCode: string) => {
  emit('update:code', newCode)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-background flex flex-col"
    role="dialog"
    aria-modal="true"
    aria-label="Code Editor"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b">
      <h2 class="text-lg font-semibold">
        Code Editor
        <span class="text-xs ml-2 text-muted-foreground">{{ language }}</span>
      </h2>
      <div class="flex items-center gap-2">
        <!-- Keyboard shortcut help text (hidden in readonly mode) -->
        <div v-if="!isReadOnly" class="text-xs text-muted-foreground mr-2">
          <kbd class="px-1.5 py-0.5 border rounded">{{ isMac() ? '⌘' : 'Ctrl' }}+Shift+Alt+Enter</kbd>
          to run
        </div>

        <!-- Run button (hidden in readonly mode) -->
        <Button
          v-if="!isReadOnly"
          variant="default"
          size="sm"
          :disabled="isExecuting"
          @click="$emit('execute')"
          class="h-8"
          aria-label="Run code"
        >
          <Loader2 class="w-4 h-4 animate-spin mr-2" v-if="isExecuting" />
          <Play class="w-4 h-4 mr-2" v-else />
          Run
        </Button>

        <!-- Close button -->
        <Button variant="ghost" size="icon" @click="onClose" aria-label="Close editor">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex flex-1 overflow-hidden editor-container">
      <!-- Code Editor -->
      <div 
        class="h-full overflow-hidden transition-all" 
        :style="editorContainerStyle"
      >
        <CodeMirror
          :modelValue="code"
          :language="language"
          @update:modelValue="onCodeUpdate"
          :fullScreen="true"
          :readonly="isReadOnly"
          aria-label="Code editor"
        />
      </div>

      <!-- Resize handle -->
      <div
        v-if="!isOutputFullscreen"
        class="w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors"
        @mousedown="startResize"
        aria-hidden="true"
      ></div>

      <!-- Output -->
      <div 
        class="flex flex-col h-full transition-all" 
        :style="outputContainerStyle"
      >
        <OutputRenderer 
          v-if="output"
          :content="output" 
          :type="outputType"
          :showControls="true"
          :isFullscreenable="true"
          :isCollapsible="true"
          :originalCode="code"
          class="h-full flex-1"
          @toggle-fullscreen="toggleOutputFullscreen"
        />
        <div v-else class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No output to display
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the CodeMirror component takes full height */
:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  height: 100% !important;
}

:deep(.cm-gutters) {
  height: auto !important;
  min-height: 100% !important;
}

/* Add transition for smooth resizing */
.editor-container > div {
  transition: width 0.2s ease;
}

/* When actively resizing, disable transitions for better performance */
.editor-container:has(+ .resizing) > div {
  transition: none;
}
</style>
