import { ref, computed } from 'vue'
import { logger } from '@/services/logger'

interface ExecutionConfig {
  blockId: string
  codeExecutionStore: any
  aiActionsStore: any
  aiCodeAssistant: any
  isReadyToExecute: any
  isPublished: boolean
  startStreaming: (id: string) => void
  stopStreaming: () => void
  getFormattedOutput: () => any
  emit: any
}

export function useCodeBlockExecution(config: ExecutionConfig) {
  const executionInProgress = ref(false)
  const executionSuccess = ref(false)
  const executionStartTime = ref<number | null>(null)
  const executionTime = ref<number>(0)
  const executionProgress = ref<number>(0)
  const errorMessage = ref<string | null>(null)
  const executionId = ref<string | null>(null)

  const cell = computed(() => config.codeExecutionStore.getCellById(config.blockId))

  const triggerAutoErrorAnalysis = async (customError?: string) => {
    try {
      const error = customError || cell.value?.output || errorMessage.value
      if (!error) return
      
      logger.info('🤖 Triggering automatic AI error analysis...')
      
      // Enhanced execution context for better AI analysis
      const executionContext = {
        error: error,
        executionTime: executionTime.value,
        hasOutput: !!cell.value?.output,
        cellOutput: cell.value?.output
      }
      
      // Auto-run fix-error action if enabled  
      if (config.aiActionsStore.state.errorTriggerConfig.showQuickFix) {
        await config.aiCodeAssistant.analyzeError(error, executionContext)
      }
      
      // Show AI assistant if not already visible
      if (!config.aiCodeAssistant.isVisible.value) {
        config.aiCodeAssistant.toggleVisibility()
      }
      
    } catch (analysisError) {
      logger.error('Auto error analysis failed:', analysisError)
    }
  }

  const executeCodeBlock = async () => {
    if (!config.isReadyToExecute.value) return

    executionInProgress.value = true
    executionStartTime.value = Date.now()
    executionTime.value = 0
    errorMessage.value = null

    try {
      // Generate execution ID for streaming
      executionId.value = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`
      
      // Start output streaming
      config.startStreaming(executionId.value)
      
      // Execute the code using the store
      await config.codeExecutionStore.executeCell(config.blockId)
      
      // Get result from cell
      if (cell.value?.output) {
        config.emit('update:output', cell.value.output)
      }
      
      // Get streaming output if available
      const streamingOutput = config.getFormattedOutput()
      if (streamingOutput.error) {
        errorMessage.value = streamingOutput.error
      }
      
      executionSuccess.value = !cell.value?.hasError
      
      // Auto-trigger AI error analysis if enabled and execution failed
      if (cell.value?.hasError && config.aiActionsStore.state.errorTriggerConfig.autoTrigger) {
        await triggerAutoErrorAnalysis()
      }
      
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Execution failed'
      logger.error('Code execution failed:', error)
      
      // Auto-trigger AI error analysis for caught exceptions
      if (config.aiActionsStore.state.errorTriggerConfig.autoTrigger) {
        await triggerAutoErrorAnalysis(error instanceof Error ? error.message : 'Execution failed')
      }
    } finally {
      executionInProgress.value = false
      config.stopStreaming()
      
      // Calculate final execution time
      if (executionStartTime.value > 0) {
        executionTime.value = Date.now() - executionStartTime.value
      }
    }
  }

  const handleErrorDismissed = () => {
    errorMessage.value = null
  }

  const currentExecutionTime = computed(() => {
    if (executionInProgress.value) {
      return executionTime.value
    }
    return 0
  })

  const runningStatus = computed(() => {
    if (executionInProgress.value) return 'running'
    if (cell?.value?.hasError) return 'error'
    if (executionSuccess.value) return 'success'
    return 'idle'
  })

  return {
    // State
    executionInProgress,
    executionSuccess,
    executionStartTime,
    executionTime,
    executionProgress,
    errorMessage,
    executionId,
    
    // Computed
    cell,
    currentExecutionTime,
    runningStatus,
    
    // Methods
    executeCodeBlock,
    triggerAutoErrorAnalysis,
    handleErrorDismissed
  }
}
