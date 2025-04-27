<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Card, CardContent } from '@/components/ui/card'
import { useCodeExecution } from './composables/useCodeExecution'
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'
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
const kernelName = computed(() => props.node.attrs.kernelName || null)
const serverID = computed(() => props.node.attrs.serverID || null)
const sessionId = computed(() => props.node.attrs.sessionId || null)
const code = computed(() => props.node.textContent || '')

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
    <Card class="overflow-hidden border-none shadow-md" v-if="isExecutable">
      <CardContent class="p-0">
        <CodeBlockWithExecution
          :id="blockId"
          :code="code"
          :language="language"
          :result="output"
          :serverID="serverID"
          :kernel-name="kernelName"
          :session-id="sessionId"
          :nota-id="notaId"
          :kernel-preference="kernelPreference"
          :is-read-only="editor.options.editable === false"
          @update:code="updateCode"
          @kernel-select="onKernelSelect"
          @update:output="updateOutput"
          @update:session-id="onSessionSelect"
          @execute="executeCode"
        />
      </CardContent>
    </Card>

    <Card v-else class="overflow-hidden border-none shadow-md">
      <CardContent class="p-0">
        <OutputRenderer
          :content="code"
          type="text"
          :showControls="false"
          :maxHeight="'400px'"
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
</style>
