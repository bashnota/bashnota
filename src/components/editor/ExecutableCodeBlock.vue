<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeBlockWithExecution from '../CodeBlockWithExecution.vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'

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
  getPos: {
    type: Function,
    required: true,
  },
})

const route = useRoute()
const store = useNotaStore()
const isExecuteable = computed(() => props.node.attrs.executeable)
const language = computed(() => props.node.attrs.language)
const code = computed(() => props.node.textContent || '')

const updateCode = (newCode: string) => {
  // Get the position of the current node
  const pos = props.getPos()
  if (typeof pos !== 'number') return

  // Create a transaction to update the node's content
  const transaction = props.editor.state.tr
    .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
    .insertText(newCode, pos + 1)

  props.editor.view.dispatch(transaction)
}

onMounted(() => {
  console.log('ExecutableCodeBlock mounted:', {
    isExecuteable: isExecuteable.value,
    language: language.value,
    notaId: route.params.id,
    routeName: route.name,
  })
})
</script>

<template>
  <NodeViewWrapper class="code-block-wrapper">
    <CodeBlockWithExecution
      v-if="isExecuteable"
      :code="code"
      :language="language"
      :nota-id="route.params.id as string"
      @update:code="updateCode"
    />
    <pre v-else class="code-block">
      <code :class="language">{{ code }}</code>
    </pre>
  </NodeViewWrapper>
</template>

<style scoped>
.code-block-wrapper {
  margin: 1em 0;
}

.code-block {
  background: var(--color-background-soft);
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
