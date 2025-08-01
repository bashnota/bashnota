<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Card, CardContent } from '@/ui/card'
import { useCodeExecution } from './composables/useCodeExecution'
import CodeBlockWithExecutionModular from './CodeBlockWithExecutionModular.vue'
import OutputRenderer from './OutputRenderer.vue'
import type { CodeBlockProps } from './types'

const props = defineProps<CodeBlockProps>()

const {
  notaId,
  blockId,
  kernelPreference,
  initializeSession,
  executeCode,
  onKernelSelect,
  onSessionSelect
} = useCodeExecution(props)

const isExecutable = computed(() => props.node.attrs.executable)
const language = computed(() => props.node.attrs.language)
const output = computed(() => props.node.attrs.output || null)
const sessionId = computed(() => props.node.attrs.sessionId || null)
const code = computed(() => props.node.textContent || '')

// Track if this is being viewed in a published note
const isPublishedView = computed(() => props.editor.isEditable === false && props.editor.options.editable === false)

// Initialize session if saved
onMounted(initializeSession)

const updateCode = (newCode: string) => {
  const pos = props.getPos()
  if (typeof pos !== 'number') return

  const transaction = props.editor.state.tr
    .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
    .insertText(newCode, pos + 1)

  props.editor.view.dispatch(transaction)
}

const updateOutput = (newOutput: string) => {
  props.updateAttributes({ output: newOutput })
}
</script>

<template>
  <NodeViewWrapper class="my-6">
    <Card v-if="isExecutable" class="overflow-hidden border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CardContent class="p-0">
        <CodeBlockWithExecutionModular
          :id="blockId"
          :code="code"
          :language="language"
          :session-id="sessionId"
          :nota-id="notaId"
          :kernel-preference="kernelPreference"
          :is-read-only="editor.options.editable === false"
          :is-published="isPublishedView"
          @update:code="updateCode"
          @kernel-select="onKernelSelect"
          @update:output="updateOutput"
          @update:session-id="onSessionSelect"
        />
      </CardContent>
    </Card>

    <Card v-else class="overflow-hidden border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CardContent class="p-0">
        <OutputRenderer
          :content="code"
          type="text"
          :showControls="false"
          :maxHeight="'400px'"
          :isPublished="isPublishedView"
          :notaId="notaId"
          :blockId="blockId"
        />
      </CardContent>
    </Card>
  </NodeViewWrapper>
</template>

<style scoped>
.my-6 {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.overflow-hidden {
  overflow: hidden;
}

/* Enhanced styles for published mode */
.published-card {
  @apply bg-card border border-border shadow-md;
}

/* Add styles for scrollable code blocks */
:deep(pre) {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

:deep(pre::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(pre::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(pre::-webkit-scrollbar-thumb) {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

/* Ensure code blocks use proper theme colors */
:deep(.cm-editor) {
  color: var(--foreground);
  background-color: var(--background);
}

:deep(.cm-gutters) {
  background-color: var(--muted) !important;
  border-right-color: var(--border) !important;
}

:deep(.cm-lineNumbers) {
  color: var(--muted-foreground) !important;
}

/* Add smooth transitions to the code block */
:deep(.code-block-wrapper) {
  transition: all 0.3s ease;
}

/* Add a subtle highlight for executing blocks */
:deep(.executing-block) {
  box-shadow: 0 0 0 2px var(--primary-light);
}
</style>









