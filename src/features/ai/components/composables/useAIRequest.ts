import { ref, watch, onUnmounted, computed } from 'vue'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'

export function useAIRequest() {
  const activeRequests = ref<AbortController[]>([])
  const timeout = ref<number | null>(null)
  const aiSettings = useAISettingsStore()
  
  // Set default timeout from settings or use 60 seconds
  const DEFAULT_TIMEOUT = 60000 // 60 seconds
  const STREAMING_TIMEOUT = 120000 // 120 seconds for streaming - WebLLM needs more time
  
  // Watch for settings changes to update timeout
  watch(() => (aiSettings.settings as any).requestTimeout || DEFAULT_TIMEOUT / 1000, (value) => {
    if (value && value > 0) {
      timeout.value = value * 1000 // Convert to milliseconds
    } else {
      timeout.value = DEFAULT_TIMEOUT
    }
  }, { immediate: true })
  
  // Compute the timeout value to use based on provider and streaming
  const getTimeoutForRequest = (providerId?: string, isStreaming?: boolean): number => {
    // WebLLM or streaming requests get extended timeout
    if (providerId === 'webllm' || isStreaming) {
      return STREAMING_TIMEOUT
    }
    
    // Otherwise use the normal timeout
    return timeout.value || DEFAULT_TIMEOUT
  }
  
  // Clean up any pending requests when component is unmounted
  onUnmounted(() => {
    abortAllRequests()
  })
  
  /**
   * Create a request with timeout handling
   */
  const createRequestWithTimeout = <T>(
    promiseFunction: () => Promise<T>,
    providerId?: string,
    isStreaming?: boolean
  ): Promise<T> => {
    // Create an abort controller for this request
    const controller = new AbortController()
    activeRequests.value.push(controller)
    
    // Skip timeout for WebLLM provider
    if (providerId === 'webllm') {
      // Create the main request promise without timeout for WebLLM
      const requestPromise = promiseFunction()
        .finally(() => {
          // Remove this controller from active requests when done
          activeRequests.value = activeRequests.value.filter(c => c !== controller)
        })
      
      return requestPromise
    }
    
    // Get the appropriate timeout value
    const timeoutValue = getTimeoutForRequest(providerId, isStreaming)
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('Request timed out'))
      }, timeoutValue)
      
      // Store the timeout ID on the controller for cleanup
      controller.signal.addEventListener('abort', () => clearTimeout(timeoutId))
    })
    
    // Create the main request promise
    const requestPromise = promiseFunction()
      .finally(() => {
        // Remove this controller from active requests when done
        activeRequests.value = activeRequests.value.filter(c => c !== controller)
      })
    
    // Race the request against the timeout
    return Promise.race([requestPromise, timeoutPromise])
  }
  
  /**
   * Abort all pending requests
   */
  const abortAllRequests = (): void => {
    activeRequests.value.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    })
    activeRequests.value = []
  }
  
  /**
   * Abort current generation request
   */
  const abortRequest = (): void => {
    abortAllRequests()
  }
  
  return {
    createRequestWithTimeout,
    abortRequest,
    abortAllRequests
  }
} 







