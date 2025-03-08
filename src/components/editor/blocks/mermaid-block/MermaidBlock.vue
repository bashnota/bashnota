<template>
  <node-view-wrapper class="mermaid-block" :class="{ readonly: isReadOnly }">
    <div class="mermaid-controls" v-if="!isReadOnly">
      <button
        class="preview-toggle"
        @click="isEditing = !isEditing"
        :title="isEditing ? 'Show Preview' : 'Edit Diagram'"
      >
        {{ isEditing ? 'Preview' : 'Edit' }}
      </button>
    </div>

    <div v-if="isEditing && !isReadOnly" class="mermaid-editor">
      <textarea
        v-model="localContent"
        @blur="updateContent"
        class="mermaid-textarea"
        placeholder="Enter mermaid diagram code..."
      ></textarea>
    </div>

    <div v-else class="mermaid-container">
      <div v-if="nodeContent" ref="mermaidRef" class="mermaid">
        {{ nodeContent }}
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { onMounted, ref, watch, computed, nextTick } from 'vue'
import mermaid from 'mermaid'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  updateAttributes: {
    type: Function,
    required: true,
  },
  editor: {
    type: Object,
    required: true,
  },
})

const mermaidRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const localContent = ref(props.node.attrs.content)
const nodeContent = computed(() => props.node.attrs.content)
const isReadOnly = computed(() => !props.editor.isEditable)

const updateContent = () => {
  props.updateAttributes({ content: localContent.value })
}

const renderMermaid = async () => {
  if (!mermaidRef.value || !nodeContent.value) return

  try {
    // Clear the previous render
    mermaidRef.value.innerHTML = nodeContent.value

    mermaid.initialize({ startOnLoad: true })
    await mermaid.run({
      nodes: [mermaidRef.value],
    })
  } catch (error) {
    console.error('Error rendering mermaid diagram:', error)
  }
}

// Watch for edit mode changes
watch(isEditing, (newValue) => {
  if (!newValue) {
    // When switching to preview mode, wait for DOM update then render
    nextTick(() => renderMermaid())
  }
})

// Watch for read-only mode changes
watch(isReadOnly, (newValue) => {
  if (newValue && isEditing.value) {
    // Force preview mode when switching to read-only
    isEditing.value = false
  }
  nextTick(() => renderMermaid())
})

onMounted(() => {
  renderMermaid()
})

watch(
  () => props.node.attrs.content,
  () => {
    if (!isEditing.value) {
      renderMermaid()
    }
  },
)
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
