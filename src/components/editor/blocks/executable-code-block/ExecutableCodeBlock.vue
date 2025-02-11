<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Card, CardContent } from '@/components/ui/card'

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
const blockId = computed(() => props.node.attrs.id || '')
const isExecutable = computed(() => props.node.attrs.executable)
const language = computed(() => props.node.attrs.language)
const output = computed(() => props.node.attrs.output)
const kernelName = computed(() => props.node.attrs.kernelName)
const serverID = computed(() => props.node.attrs.serverID)
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

const onKernelSelect = async (kernelName: string, serverID: string) => {
  props.updateAttributes({ kernelName, serverID })
}

const updateOutput = (newOutput: string) => {
  props.updateAttributes({ output: newOutput })
}

onMounted(() => {
  // Generate unique ID for the block if it doesn't have one
  if (!blockId.value) {
    const newId = `block-${Math.random().toString(36).substr(2, 9)}`
    props.updateAttributes({ id: newId })
  }
})
</script>

<template>
  <NodeViewWrapper class="my-6">
    <Card class="overflow-hidden" v-if="isExecutable">
      <CardContent class="p-0">
        <CodeBlockWithExecution
          :code="code"
          :language="language"
          :result="output"
          :serverID="serverID"
          :kernel-name="kernelName"
          :nota-id="route.params.id as string"
          :kernel-preference="kernelPreference"
          @update:code="updateCode"
          @kernel-select="onKernelSelect"
          @update:output="updateOutput"
        />
      </CardContent>
    </Card>

    <Card v-else class="overflow-hidden">
      <CardContent class="p-0">
        <pre class="bg-muted p-4 overflow-x-auto font-mono text-sm leading-relaxed">
          <code :class="language">{{ code }}</code>
        </pre>
      </CardContent>
    </Card>
  </NodeViewWrapper>
</template>
