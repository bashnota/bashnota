<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeBlockWithExecution from '../CodeBlockWithExecution.vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import type { KernelConfig } from '@/types/jupyter'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  updateAttributes: {
    type: Function,
    required: true
  },
  editor: {
    type: Object,
    required: true
  },
  getPos: {
    type: Function,
    required: true
  }
})

const route = useRoute()
const store = useNotaStore()
const blockId = computed(() => props.node.attrs.id || '')
const isExecuteable = computed(() => props.node.attrs.executeable)
const language = computed(() => props.node.attrs.language)
const code = computed(() => props.node.textContent || '')

// Get saved kernel preference for this block
const kernelPreference = computed(() => {
  const nota = store.getCurrentNota(route.params.id as string)
  if (!nota?.config?.kernelPreferences) return null
  return nota.config.kernelPreferences[blockId.value] || null
})

const updateCode = (newCode: string) => {
  const pos = props.getPos()
  if (typeof pos !== 'number') return

  const transaction = props.editor.state.tr
    .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
    .insertText(newCode, pos + 1)

  props.editor.view.dispatch(transaction)
}

const onKernelSelect = async (kernelName: string, serverId: string) => {
  if (!blockId.value) return

  const kernelConfig: KernelConfig = {
    blockId: blockId.value,
    kernelName,
    serverId,
    lastUsed: new Date().toISOString()
  }

  await store.updateNotaConfig(route.params.id as string, (config) => {
    if (!config.kernelPreferences) config.kernelPreferences = {}
    config.kernelPreferences[blockId.value] = kernelConfig
  })
}

onMounted(() => {
  console.log('ExecutableCodeBlock mounted:', {
    isExecuteable: isExecuteable.value,
    language: language.value,
    notaId: route.params.id,
    routeName: route.name
  })

  // Generate unique ID for the block if it doesn't have one
  if (!blockId.value) {
    const newId = `block-${Math.random().toString(36).substr(2, 9)}`
    props.updateAttributes({ id: newId })
  }
})
</script>

<template>
  <NodeViewWrapper class="code-block-wrapper">
    <CodeBlockWithExecution 
      v-if="isExecuteable"
      :code="code" 
      :language="language"
      :nota-id="route.params.id as string"
      :kernel-preference="kernelPreference"
      @update:code="updateCode"
      @kernel-select="onKernelSelect"
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