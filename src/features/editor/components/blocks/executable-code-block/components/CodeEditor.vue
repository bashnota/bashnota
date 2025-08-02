<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { ButtonGroup } from '@/ui/button-group'
import CodeMirror from '../CodeMirror.vue'

interface Props {
  code: string
  language: string
  isReadOnly: boolean
  isPublished: boolean
  runningStatus: 'idle' | 'running' | 'error' | 'success'
  isCodeVisible: boolean
  isCodeCopied: boolean
}

interface Emits {
  'update:code': [code: string]
  'format-code': []
  'show-templates': []
  'copy-code': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div v-show="isCodeVisible" class="relative">
    <!-- Floating action buttons overlay (only visible on hover) -->
    <div class="absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <ButtonGroup class="btn-group-tight">
        <Button
          variant="secondary"
          size="sm"
          @click="emit('copy-code')"
          class="h-6 w-6 p-0 shadow-sm"
          title="Copy code to clipboard"
        >
          <Copy v-if="!isCodeCopied" class="h-3 w-3" />
          <Check v-else class="h-3 w-3 text-success" />
        </Button>
      </ButtonGroup>
    </div>

    <!-- Code editor with minimal styling -->
    <div class="code-editor-wrapper">
      <CodeMirror
        :model-value="code"
        :language="language"
        :readonly="isReadOnly"
        :running-status="runningStatus"
        :is-published="isPublished"
        :auto-format="true"
        :show-template-button="false"
        :show-formatting-toolbar="false"
        @update:model-value="emit('update:code', $event)"
        @format-code="emit('format-code')"
        @show-templates="emit('show-templates')"
      />
    </div>
  </div>
</template>

<style scoped>
/* Button group spacing override for tighter groups */
.btn-group-tight > :deep(button) {
  border-radius: calc(var(--radius) / 2);
}

.btn-group-tight > :deep(button:not(:first-child)) {
  margin-left: -1px;
}

/* Improved code editor styling for markdown-like appearance */
.code-editor-wrapper {
  background: hsl(var(--muted) / 0.3);
  border-radius: var(--radius);
  padding: 1rem;
  font-family: 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  border: 1px solid hsl(var(--border));
  position: relative;
}

/* Ensure proper CodeMirror styling */
:deep(.cm-editor) {
  height: 100%;
  overflow: hidden;
  background: transparent;
  border: none;
}

:deep(.cm-scroller) {
  overflow: auto;
  padding: 0;
  font-family: inherit;
}

:deep(.cm-content) {
  padding: 0;
  min-height: 120px;
}

:deep(.cm-focused) {
  outline: none;
}
</style>
