import { ref, computed, watch } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

export function useStreamingMode() {
  const aiSettings = useAISettingsStore()
  
  // State for streaming mode - default to true for better user experience
  const isStreamingEnabled = ref(true)
  const currentStreamingText = ref('')
  const isStreaming = ref(false)
  const streamingProvider = ref('')
  
  // Computed property to check if streaming should be used for the current provider
  const shouldUseStreaming = computed(() => {
    // For now, only enable streaming for WebLLM provider
    return isStreamingEnabled.value && 
           aiSettings.settings.preferredProviderId === 'webllm'
  })
  
  // Watch for provider changes to update streaming provider
  watch(() => aiSettings.settings.preferredProviderId, (providerId) => {
    if (isStreaming.value) {
      streamingProvider.value = providerId
    }
  })
  
  // Reset streaming state
  const resetStreamingState = () => {
    currentStreamingText.value = ''
    isStreaming.value = false
    streamingProvider.value = ''
  }
  
  // Start streaming session
  const startStreaming = (provider: string) => {
    resetStreamingState()
    isStreaming.value = true
    streamingProvider.value = provider
  }
  
  // Handle streaming chunk
  const handleStreamingChunk = (chunk: string) => {
    if (isStreaming.value) {
      currentStreamingText.value += chunk
    }
  }
  
  // Complete streaming
  const completeStreaming = () => {
    isStreaming.value = false
  }
  
  // Toggle streaming mode
  const toggleStreamingMode = () => {
    isStreamingEnabled.value = !isStreamingEnabled.value
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