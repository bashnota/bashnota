<template>
  <node-view-wrapper class="relative w-full" :class="{ 'p-4 border rounded-lg': !isReadOnly }">
    <div v-if="!isReadOnly" class="flex justify-end mb-2">
      <Button
        variant="outline"
        size="sm"
        @click="isEditing = !isEditing"
        :title="isEditing ? 'Show Preview' : 'Edit Diagram'"
      >
        {{ isEditing ? 'Preview' : 'Edit' }}
      </Button>
    </div>

    <div v-if="isEditing && !isReadOnly">
      <MermaidEditor
        v-model="localContent"
        @update:modelValue="updateContent"
      />
    </div>

    <div v-else class="w-full overflow-x-auto">
      <div v-if="nodeContent" ref="mermaidRef" class="mermaid">
        {{ nodeContent }}
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import MermaidEditor from './MermaidEditor.vue'
import { useMermaid } from './useMermaid'
import type { MermaidBlockProps } from './types'

const props = defineProps<MermaidBlockProps>()

const isEditing = ref(false)
const localContent = ref(props.node.attrs.content)
const nodeContent = computed(() => props.node.attrs.content)
const isReadOnly = computed(() => !props.editor.isEditable)

const { mermaidRef, renderMermaid } = useMermaid(nodeContent)

const updateContent = () => {
  props.updateAttributes({ content: localContent.value })
}

// Watch for edit mode changes
watch(isEditing, (newValue) => {
  if (!newValue) {
    nextTick(() => renderMermaid())
  }
})

// Watch for read-only mode changes
watch(isReadOnly, (newValue) => {
  if (newValue && isEditing.value) {
    isEditing.value = false
  }
  nextTick(() => renderMermaid())
})

onMounted(() => {
  renderMermaid()
})
</script>

<style scoped>
.mermaid-block {
  @apply relative w-full border rounded-lg p-4;
}

.mermaid-block.readonly {
  @apply border-0 p-0;
}

.mermaid-controls {
  @apply flex justify-end mb-2;
}

.preview-toggle {
  @apply px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md;
}

.mermaid-editor {
  @apply w-full;
}

.mermaid-textarea {
  @apply w-full min-h-[200px] p-3 font-mono text-sm border rounded-md;
}

.mermaid-container {
  @apply w-full overflow-x-auto;
}
</style>
