import { ref, watch, onUnmounted } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

export function useAIRequest() {
  const activeRequests = ref<AbortController[]>([])
  const timeout = ref<number | null>(null)
  const aiSettings = useAISettingsStore()
  
  // Set default timeout from settings or use 60 seconds
  const DEFAULT_TIMEOUT = 60000 // 60 seconds
  
  // Watch for settings changes to update timeout
  watch(() => (aiSettings.settings as any).requestTimeout || DEFAULT_TIMEOUT / 1000, (value) => {
    if (value && value > 0) {
      timeout.value = value * 1000 // Convert to milliseconds
    } else {
      timeout.value = DEFAULT_TIMEOUT
    }
  }, { immediate: true })
  
  // Clean up any pending requests when component is unmounted
  onUnmounted(() => {
    abortAllRequests()
  })
  
  /**
   * Create a request with timeout handling
   */
  const createRequestWithTimeout = <T>(
    promiseFunction: () => Promise<T>
  ): Promise<T> => {
    // Create an abort controller for this request
    const controller = new AbortController()
    activeRequests.value.push(controller)
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        controller.abort()
        reject(new Error('Request timed out'))
      }, timeout.value || DEFAULT_TIMEOUT)
      
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