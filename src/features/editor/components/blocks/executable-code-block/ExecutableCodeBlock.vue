<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Card, CardContent } from '@/components/ui/card'
import { useCodeExecution } from './composables/core/useCodeExecution'
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'
import OutputRenderer from './OutputRenderer.vue'
import KernelConfigurationModal from './components/KernelConfigurationModal.vue'
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

// Modal state
const isConfigurationModalOpen = ref(false)

const handleOpenConfiguration = () => {
  isConfigurationModalOpen.value = true
}
</script>

<template>
  <NodeViewWrapper class="my-6">
    <div v-if="isExecutable" class="border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CodeBlockWithExecution
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
        @open-configuration="handleOpenConfiguration"
      />
    </div>

    <Card v-else class="border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CardContent class="p-0">
        <OutputRenderer
          :content="code"
          type="text"
          :showControls="true"
          :maxHeight="'400px'"
          :isPublished="isPublishedView"
          :notaId="notaId"
          :blockId="blockId"
        />
      </CardContent>
    </Card>

  </NodeViewWrapper>

  <!-- Modal at this level, outside any problematic containers -->
  <KernelConfigurationModal
    v-if="isExecutable"
    :is-open="isConfigurationModalOpen"
    :is-shared-session-mode="false"
    :is-executing="false"
    :is-setting-up="false"
    :selected-server="''"
    :selected-kernel="''"
    :available-servers="[]"
    :available-kernels="[]"
    :selected-session="''"
    :available-sessions="[]"
    :running-kernels="[]"
    @update:is-open="isConfigurationModalOpen = $event"
  />
</template>

<style scoped>
.my-6 {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Enhanced styles for published mode */
.published-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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









