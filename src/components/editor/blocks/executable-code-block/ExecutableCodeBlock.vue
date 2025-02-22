<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps<{
  node: any
  updateAttributes: (attrs: any) => void
  editor: any
  getPos: () => number | undefined
}>()

const route = useRoute()
const store = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()

const notaId = computed(() => route.params.id as string)
const blockId = computed(() => props.node.attrs.id || '')
const isExecutable = computed(() => props.node.attrs.executable)
const language = computed(() => props.node.attrs.language)
const output = computed(() => props.node.attrs.output)
const kernelName = computed(() => props.node.attrs.kernelName)
const serverID = computed(() => props.node.attrs.serverID)
const sessionId = computed(() => props.node.attrs.sessionId)
const code = computed(() => props.node.textContent || '')

// Get saved kernel preference for this block
const kernelPreference = computed(() => {
  const nota = store.getCurrentNota(route.params.id as string)
  if (!nota?.config?.kernelPreferences) return null
  return nota.config.kernelPreferences[blockId.value] || null
})

// Initialize session if saved
onMounted(() => {
  if (sessionId.value) {
    const existingSession = codeExecutionStore.kernelSessions.get(sessionId.value)
    if (!existingSession) {
      // Recreate the session if it doesn't exist
      const sessionNumber = parseInt(sessionId.value.split('-').pop() || '1')
      const newSession = codeExecutionStore.createSession(`Session ${sessionNumber}`)
      if (blockId.value) {
        codeExecutionStore.addCellToSession(blockId.value, newSession)
      }
    }
  }
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

const onSessionSelect = (sessionId: string) => {
  props.updateAttributes({ sessionId })
}
</script>

<template>
  <node-view-wrapper class="my-6">
    <Card class="overflow-hidden" v-if="isExecutable">
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
          @update:code="updateCode"
          @kernel-select="onKernelSelect"
          @update:output="updateOutput"
          @update:session-id="onSessionSelect"
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
  </node-view-wrapper>
</template>
