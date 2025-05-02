import { ref, computed, watch } from 'vue'
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

  // DEBUG: Add a watcher to track execution state changes
  watch(isExecuting, (newValue) => {
    logger.debug(`[CodeBlock ${blockId.value}] Execution state changed to: ${newValue}`, {
      routeParams: route.params,
      isPublishedView: route.name === 'publicNota' || route.path.includes('/p/'),
      sessionId: sessionId.value,
      blockAttrs: props.node.attrs
    })
  })

  // DEBUG: Watch for changes to the cell in the store
  const cellInStore = computed(() => codeExecutionStore.getCellById(blockId.value))
  watch(cellInStore, (newCell) => {
    if (newCell) {
      logger.debug(`[CodeBlock ${blockId.value}] Cell updated in store:`, {
        isExecuting: newCell.isExecuting,
        isPublished: newCell.isPublished,
        hasOutput: !!newCell.output
      })
    }
  }, { deep: true })

  // Get saved kernel preference for this block
  const kernelPreference = computed(() => {
    const nota = store.getCurrentNota(notaId.value)
    if (!nota?.config?.kernelPreferences) return null
    return nota.config.kernelPreferences[blockId.value] || null
  })

  const initializeSession = () => {
    logger.debug(`[CodeBlock ${blockId.value}] Initializing session`, {
      sessionId: sessionId.value,
      routeName: route.name
    })
    
    if (sessionId.value) {
      const existingSession = codeExecutionStore.kernelSessions.get(sessionId.value)
      if (!existingSession) {
        const sessionNumber = parseInt(sessionId.value.split('-').pop() || '1')
        const newSession = codeExecutionStore.createSession(`Session ${sessionNumber}`)
        if (blockId.value) {
          logger.debug(`[CodeBlock ${blockId.value}] Creating new session: ${newSession}`)
          codeExecutionStore.addCellToSession(blockId.value, newSession)
        }
      }
    }
  }

  const executeCode = async () => {
    logger.debug(`[CodeBlock ${blockId.value}] Execute code called`, {
      currentExecutionState: isExecuting.value,
      route: route.path,
      isPublishedView: route.name === 'publicNota' || route.path.includes('/p/')
    })
    
    if (isExecuting.value || !blockId.value) return
    isExecuting.value = true
    try {
      await codeExecutionStore.executeCell(blockId.value)
      const cell = codeExecutionStore.getCellById(blockId.value)
      if (cell) {
        logger.debug(`[CodeBlock ${blockId.value}] Code execution complete`, {
          hasOutput: !!cell.output,
          outputLength: cell.output?.length || 0
        })
        props.updateAttributes({ output: cell.output })
      }
    } catch (error) {
      logger.error(`[CodeBlock ${blockId.value}] Code execution failed:`, error)
      props.updateAttributes({ 
        output: error instanceof Error ? error.message : 'Code execution failed' 
      })
    } finally {
      isExecuting.value = false
      logger.debug(`[CodeBlock ${blockId.value}] Execution state reset to false`)
    }
  }

  const onKernelSelect = (kernelName: string, serverID: string) => {
    logger.debug(`[CodeBlock ${blockId.value}] Kernel selected: ${kernelName}, server: ${serverID}`)
    props.updateAttributes({ kernelName, serverID })
  }

  const onSessionSelect = (newSessionId: string) => {
    logger.debug(`[CodeBlock ${blockId.value}] Session selected: ${newSessionId}`)
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