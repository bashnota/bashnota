import { ref, computed, onUnmounted } from 'vue'
import { logger } from '@/services/logger'

export interface StreamingOutput {
  type: 'stdout' | 'stderr' | 'result' | 'error' | 'progress'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface StreamingOptions {
  bufferSize?: number
  flushInterval?: number
  maxRetries?: number
}

export function useOutputStreaming(cellId: string, options: StreamingOptions = {}) {
  const {
    bufferSize = 1000,
    flushInterval = 100,
    maxRetries = 3
  } = options

  const isStreaming = ref(false)
  const streamBuffer = ref<StreamingOutput[]>([])
  const fullOutput = ref<StreamingOutput[]>([])
  const connectionError = ref<string | null>(null)
  const retryCount = ref(0)

  let eventSource: EventSource | null = null
  let flushTimer: number | null = null
  let reconnectTimer: number | null = null

  // Computed properties
  const hasOutput = computed(() => fullOutput.value.length > 0)
  const latestOutput = computed(() => fullOutput.value[fullOutput.value.length - 1])
  const outputText = computed(() => {
    return fullOutput.value
      .filter(item => item.type === 'stdout' || item.type === 'result')
      .map(item => item.content)
      .join('')
  })
  const errorText = computed(() => {
    return fullOutput.value
      .filter(item => item.type === 'stderr' || item.type === 'error')
      .map(item => item.content)
      .join('')
  })

  const startStreaming = (executionId: string) => {
    if (isStreaming.value) {
      stopStreaming()
    }

    isStreaming.value = true
    connectionError.value = null
    retryCount.value = 0
    fullOutput.value = []
    streamBuffer.value = []

    connectToStream(executionId)
    startFlushTimer()
  }

  const connectToStream = (executionId: string) => {
    try {
      // In a real implementation, this would connect to your backend streaming endpoint
      const streamUrl = `/api/execute/${cellId}/stream/${executionId}`
      eventSource = new EventSource(streamUrl)

      eventSource.onopen = () => {
        logger.debug(`[OutputStreaming] Connected to stream for cell ${cellId}`)
        connectionError.value = null
        retryCount.value = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamingOutput
          addToBuffer(data)
        } catch (error) {
          logger.error('[OutputStreaming] Failed to parse stream data:', error)
        }
      }

      eventSource.onerror = (error) => {
        logger.error('[OutputStreaming] Stream error:', error)
        handleConnectionError()
      }

      // Handle specific event types
      eventSource.addEventListener('stdout', (event: MessageEvent) => {
        addToBuffer({
          type: 'stdout',
          content: event.data,
          timestamp: Date.now()
        })
      })

      eventSource.addEventListener('stderr', (event: MessageEvent) => {
        addToBuffer({
          type: 'stderr',
          content: event.data,
          timestamp: Date.now()
        })
      })

      eventSource.addEventListener('result', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          addToBuffer({
            type: 'result',
            content: data.content,
            timestamp: Date.now(),
            metadata: data.metadata
          })
        } catch (error) {
          addToBuffer({
            type: 'result',
            content: event.data,
            timestamp: Date.now()
          })
        }
      })

      eventSource.addEventListener('error', (event: MessageEvent) => {
        addToBuffer({
          type: 'error',
          content: event.data,
          timestamp: Date.now()
        })
      })

      eventSource.addEventListener('progress', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          addToBuffer({
            type: 'progress',
            content: data.message || '',
            timestamp: Date.now(),
            metadata: { progress: data.progress, total: data.total }
          })
        } catch (error) {
          logger.error('[OutputStreaming] Failed to parse progress data:', error)
        }
      })

      eventSource.addEventListener('complete', () => {
        logger.debug(`[OutputStreaming] Execution completed for cell ${cellId}`)
        stopStreaming()
      })

    } catch (error) {
      logger.error('[OutputStreaming] Failed to connect to stream:', error)
      connectionError.value = 'Failed to connect to output stream'
      isStreaming.value = false
    }
  }

  const addToBuffer = (output: StreamingOutput) => {
    streamBuffer.value.push(output)
    
    // Flush buffer if it's getting too large
    if (streamBuffer.value.length >= bufferSize) {
      flushBuffer()
    }
  }

  const flushBuffer = () => {
    if (streamBuffer.value.length > 0) {
      fullOutput.value.push(...streamBuffer.value)
      streamBuffer.value = []
      
      // Emit update event for reactive components
      logger.debug(`[OutputStreaming] Flushed ${streamBuffer.value.length} items to output`)
    }
  }

  const startFlushTimer = () => {
    if (flushTimer) {
      clearInterval(flushTimer)
    }
    
    flushTimer = setInterval(() => {
      flushBuffer()
    }, flushInterval) as unknown as number
  }

  const stopFlushTimer = () => {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  const handleConnectionError = () => {
    if (retryCount.value < maxRetries) {
      retryCount.value++
      connectionError.value = `Connection lost. Retrying... (${retryCount.value}/${maxRetries})`
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount.value - 1), 10000)
      
      reconnectTimer = setTimeout(() => {
        if (isStreaming.value && eventSource) {
          logger.debug(`[OutputStreaming] Attempting reconnection ${retryCount.value}`)
          eventSource.close()
          // Note: In a real implementation, you'd need to get the execution ID again
          // connectToStream(executionId)
        }
      }, delay) as unknown as number
    } else {
      connectionError.value = 'Connection failed after multiple retries'
      stopStreaming()
    }
  }

  const stopStreaming = () => {
    isStreaming.value = false
    
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    
    stopFlushTimer()
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    
    // Flush any remaining buffer
    flushBuffer()
    
    logger.debug(`[OutputStreaming] Stopped streaming for cell ${cellId}`)
  }

  const clearOutput = () => {
    fullOutput.value = []
    streamBuffer.value = []
  }

  const getOutputByType = (type: StreamingOutput['type']) => {
    return fullOutput.value.filter(item => item.type === type)
  }

  const getFormattedOutput = () => {
    const result = {
      stdout: '',
      stderr: '',
      result: null as any,
      error: null as string | null,
      progress: null as { message: string; progress: number; total: number } | null
    }

    fullOutput.value.forEach(item => {
      switch (item.type) {
        case 'stdout':
          result.stdout += item.content
          break
        case 'stderr':
          result.stderr += item.content
          break
        case 'result':
          result.result = item.content
          break
        case 'error':
          result.error = item.content
          break
        case 'progress':
          if (item.metadata) {
            result.progress = {
              message: item.content,
              progress: item.metadata.progress || 0,
              total: item.metadata.total || 100
            }
          }
          break
      }
    })

    return result
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopStreaming()
  })

  return {
    // State
    isStreaming: computed(() => isStreaming.value),
    hasOutput,
    latestOutput,
    outputText,
    errorText,
    connectionError: computed(() => connectionError.value),
    retryCount: computed(() => retryCount.value),
    
    // Data
    fullOutput: computed(() => fullOutput.value),
    
    // Methods
    startStreaming,
    stopStreaming,
    clearOutput,
    getOutputByType,
    getFormattedOutput,
    flushBuffer
  }
} 








