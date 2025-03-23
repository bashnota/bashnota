import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import type { CodeBlockNode } from '../types'
import { logger } from '@/services/logger'

export function useCodeExecution(props: {
  node: CodeBlockNode
  updateAttributes: (attrs: Partial<CodeBlockNode['attrs']>) => void
}) {
  const route = useRoute()
  const store = useNotaStore()
  const codeExecutionStore = useCodeExecutionStore()

  const isExecuting = ref(false)
  const notaId = computed(() => route.params.id as string)
  const blockId = computed(() => props.node.attrs.id)
  const sessionId = computed(() => props.node.attrs.sessionId)

  // Get saved kernel preference for this block
  const kernelPreference = computed(() => {
    const nota = store.getCurrentNota(notaId.value)
    if (!nota?.config?.kernelPreferences) return null
    return nota.config.kernelPreferences[blockId.value] || null
  })

  const initializeSession = () => {
    if (sessionId.value) {
      const existingSession = codeExecutionStore.kernelSessions.get(sessionId.value)
      if (!existingSession) {
        const sessionNumber = parseInt(sessionId.value.split('-').pop() || '1')
        const newSession = codeExecutionStore.createSession(`Session ${sessionNumber}`)
        if (blockId.value) {
          codeExecutionStore.addCellToSession(blockId.value, newSession)
        }
      }
    }
  }

  const executeCode = async () => {
    if (isExecuting.value || !blockId.value) return
    isExecuting.value = true
    try {
      await codeExecutionStore.executeCell(blockId.value)
      const cell = codeExecutionStore.getCellById(blockId.value)
      if (cell) {
        props.updateAttributes({ output: cell.output })
      }
    } catch (error) {
      logger.error('Code execution failed:', error)
      props.updateAttributes({ 
        output: error instanceof Error ? error.message : 'Code execution failed' 
      })
    } finally {
      isExecuting.value = false
    }
  }

  const onKernelSelect = (kernelName: string, serverID: string) => {
    props.updateAttributes({ kernelName, serverID })
  }

  const onSessionSelect = (newSessionId: string) => {
    props.updateAttributes({ sessionId: newSessionId })
  }

  return {
    isExecuting,
    notaId,
    blockId,
    sessionId,
    kernelPreference,
    initializeSession,
    executeCode,
    onKernelSelect,
    onSessionSelect
  }
} 