import { ref, computed, watch } from 'vue'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { logger } from '@/services/logger'

export function useStreamingMode() {
  const aiSettings = useAISettingsStore()
  
  // Create a prefixed logger for easier debugging
  const streamingLogger = logger.createPrefixedLogger('StreamingMode')
  
  // State for streaming mode - default to true for better user experience
  const isStreamingEnabled = ref(true)
  const currentStreamingText = ref('')
  const isStreaming = ref(false)
  const streamingProvider = ref('')
  
  // Computed property to check if streaming should be used for the current provider
  const shouldUseStreaming = computed(() => {
    // For now, only enable streaming for WebLLM provider
    const shouldStream = isStreamingEnabled.value && 
           aiSettings.settings.preferredProviderId === 'webllm'
    
    streamingLogger.debug('shouldUseStreaming computed:', { 
      shouldStream,
      isStreamingEnabled: isStreamingEnabled.value, 
      provider: aiSettings.settings.preferredProviderId 
    })
    
    return shouldStream
  })
  
  // Watch for provider changes to update streaming provider
  watch(() => aiSettings.settings.preferredProviderId, (providerId) => {
    streamingLogger.debug('Provider changed, updating streaming provider:', providerId)
    if (isStreaming.value) {
      streamingProvider.value = providerId
    }
  })
  
  // Reset streaming state
  const resetStreamingState = () => {
    streamingLogger.debug('Resetting streaming state')
    currentStreamingText.value = ''
    isStreaming.value = false
    streamingProvider.value = ''
  }
  
  // Start streaming session
  const startStreaming = (provider: string) => {
    streamingLogger.debug('Starting streaming session with provider:', provider)
    resetStreamingState()
    isStreaming.value = true
    streamingProvider.value = provider
  }
  
  // Handle streaming chunk
  const handleStreamingChunk = (chunk: string) => {
    if (isStreaming.value) {
      streamingLogger.debug('Received streaming chunk, length:', chunk.length)
      currentStreamingText.value += chunk
    } else {
      streamingLogger.warn('Received streaming chunk but isStreaming is false')
    }
  }
  
  // Complete streaming
  const completeStreaming = () => {
    streamingLogger.debug('Completing streaming session, final text length:', currentStreamingText.value.length)
    isStreaming.value = false
  }
  
  // Toggle streaming mode
  const toggleStreamingMode = () => {
    isStreamingEnabled.value = !isStreamingEnabled.value
    streamingLogger.info('Streaming mode toggled:', isStreamingEnabled.value ? 'enabled' : 'disabled')
  }
  
  return {
    isStreamingEnabled,
    shouldUseStreaming,
    currentStreamingText,
    isStreaming,
    streamingProvider,
    resetStreamingState,
    startStreaming,
    handleStreamingChunk,
    completeStreaming,
    toggleStreamingMode
  }
} 







