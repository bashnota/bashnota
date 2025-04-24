import { ref, onUnmounted, watch } from 'vue'
import { logger } from '@/services/logger'
import { aiService, type GenerationResult } from '@/services/aiService'
import { toast } from '@/components/ui/toast'
import { type ConversationMessage } from './useConversation'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

// Define error types for better error handling
type AIGenerationErrorType = 
  | 'API_KEY'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'CONTENT_POLICY'
  | 'TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

interface AIGenerationError {
  type: AIGenerationErrorType;
  message: string;
  originalError?: Error;
}

export function useAIGeneration(editor: any) {
  const isLoading = ref(false)
  const errorMessage = ref('')
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
   * Classify error based on error message for consistent handling
   */
  const classifyError = (error: unknown): AIGenerationError => {
    // Default error
    const defaultError: AIGenerationError = {
      type: 'UNKNOWN',
      message: 'Failed to generate text. Please try again.',
      originalError: error instanceof Error ? error : undefined
    }
    
    if (!(error instanceof Error)) return defaultError
    
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('api key')) {
      return {
        type: 'API_KEY',
        message: 'Missing or invalid API key. Please check your settings.',
        originalError: error
      }
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        originalError: error
      }
    } else if (errorMessage.includes('timeout') || 
              errorMessage.includes('network') || 
              errorMessage.includes('connection')) {
      return {
        type: 'NETWORK',
        message: 'Network error or timeout. Please check your connection.',
        originalError: error
      }
    } else if (errorMessage.includes('content policy') || 
              errorMessage.includes('moderation') || 
              errorMessage.includes('safety') ||
              errorMessage.includes('harmful')) {
      return {
        type: 'CONTENT_POLICY',
        message: 'Content policy violation. Please modify your prompt and try again.',
        originalError: error
      }
    } else if (errorMessage.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please try again or use a shorter prompt.',
        originalError: error
      }
    } else if (errorMessage.includes('model') && 
              (errorMessage.includes('unavailable') || errorMessage.includes('not found'))) {
      return {
        type: 'MODEL_UNAVAILABLE',
        message: 'The selected AI model is currently unavailable. Please try another model.',
        originalError: error
      }
    } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
      return {
        type: 'SERVER_ERROR',
        message: 'Server error. Please try again later.',
        originalError: error
      }
    }
    
    return defaultError
  }
  
  /**
   * Handle errors consistently across all generation functions
   */
  const handleGenerationError = (
    error: unknown, 
    block: any,
    conversationHistory: ConversationMessage[]
  ): ConversationMessage[] => {
    const classifiedError = classifyError(error)
    logger.error(`AI Generation Error (${classifiedError.type}):`, classifiedError.originalError || error)
    
    // Set local error state
    errorMessage.value = classifiedError.message
    
    // Update block with error
    if (editor && block) {
      try {
        editor.commands.updateAttributes('aiGeneration', {
          error: classifiedError.message,
          loading: false
        })
      } catch (editorError) {
        logger.error('Failed to update editor with error:', editorError)
      }
    }
    
    // Show toast notification
    toast({
      title: 'Error',
      description: classifiedError.message,
      variant: 'destructive'
    })
    
    return conversationHistory
  }
  
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
   * Generate text using the AI service based on prompt
   */
  const generateText = async (
    block: any, 
    prompt: string, 
    conversationHistory: ConversationMessage[],
    formatTimestamp: (date?: Date) => string
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block || !prompt.trim()) {
      return
    }

    try {
      isLoading.value = true
      errorMessage.value = ''
      
      // Update block to show loading state
      editor.commands.updateAttributes('aiGeneration', {
        loading: true,
        error: '',
      })

      // Add user message to history
      const newHistory = [...conversationHistory]
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date()
      }
      newHistory.push(userMessage)

      // Call AI service with timeout
      const providerId = aiSettings.settings.preferredProviderId
      const apiKey = aiSettings.getApiKey(providerId)
      const modelId = providerId === 'gemini' ? aiSettings.settings.geminiModel : undefined
      const safetyThreshold = providerId === 'gemini' ? aiSettings.settings.geminiSafetyThreshold : undefined
      
      const generationResult = await createRequestWithTimeout<GenerationResult>(() => 
        aiService.generateText(
          providerId,
          apiKey,
          {
            prompt,
            maxTokens: aiSettings.settings.maxTokens,
            temperature: aiSettings.settings.temperature
          },
          modelId,
          safetyThreshold
        )
      )

      // Add AI response to history
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generationResult.text,
        timestamp: new Date()
      }
      newHistory.push(aiMessage)

      // Update block with result
      editor.commands.updateAttributes('aiGeneration', {
        prompt,
        result: generationResult.text,
        loading: false,
        lastUpdated: new Date().toISOString(),
        conversation: newHistory.map(msg => ({ 
          ...msg, 
          timestamp: msg.timestamp?.toISOString() 
        }))
      })

      return newHistory
    } catch (error) {
      return handleGenerationError(error, block, conversationHistory)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Continue the conversation with a follow-up prompt
   */
  const continueConversation = async (
    block: any, 
    prompt: string, 
    conversationHistory: ConversationMessage[],
    formatTimestamp: (date?: Date) => string
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block || !prompt.trim()) {
      return
    }

    try {
      isLoading.value = true
      errorMessage.value = ''
      
      // Update block to show loading state
      editor.commands.updateAttributes('aiGeneration', {
        loading: true,
        error: ''
      })

      // Add user message to history
      const newHistory = [...conversationHistory]
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date()
      }
      newHistory.push(userMessage)

      // Call AI service with timeout
      const providerId = aiSettings.settings.preferredProviderId
      const apiKey = aiSettings.getApiKey(providerId)
      const modelId = providerId === 'gemini' ? aiSettings.settings.geminiModel : undefined
      const safetyThreshold = providerId === 'gemini' ? aiSettings.settings.geminiSafetyThreshold : undefined
      
      const generationResult = await createRequestWithTimeout<GenerationResult>(() => 
        aiService.generateText(
          providerId,
          apiKey,
          {
            prompt,
            maxTokens: aiSettings.settings.maxTokens,
            temperature: aiSettings.settings.temperature
          },
          modelId,
          safetyThreshold
        )
      )

      // Add AI response to history
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generationResult.text,
        timestamp: new Date()
      }
      newHistory.push(aiMessage)

      // Get the full result (original + new text)
      const fullResult = block.node.attrs.result 
        ? `${block.node.attrs.result}\n\n${generationResult.text}`
        : generationResult.text

      // Update block with result
      editor.commands.updateAttributes('aiGeneration', {
        result: fullResult,
        loading: false,
        lastUpdated: new Date().toISOString(),
        conversation: newHistory.map(msg => ({ 
          ...msg, 
          timestamp: msg.timestamp?.toISOString() 
        }))
      })

      return newHistory
    } catch (error) {
      return handleGenerationError(error, block, conversationHistory)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Regenerate text using the last prompt
   */
  const regenerateText = async (
    block: any,
    conversationHistory: ConversationMessage[]
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block) {
      return
    }

    try {
      isLoading.value = true
      errorMessage.value = ''
      
      // Update block to show loading state
      editor.commands.updateAttributes('aiGeneration', {
        loading: true,
        error: ''
      })

      // Filter history to exclude the last assistant message
      const filteredHistory = [...conversationHistory]
      if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'assistant') {
        filteredHistory.pop()
      }

      // Get the last user prompt
      const lastPrompt = filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user'
        ? filteredHistory[filteredHistory.length - 1].content
        : block.node.attrs.prompt || ''

      // Call AI service with timeout
      const providerId = aiSettings.settings.preferredProviderId
      const apiKey = aiSettings.getApiKey(providerId)
      const modelId = providerId === 'gemini' ? aiSettings.settings.geminiModel : undefined
      const safetyThreshold = providerId === 'gemini' ? aiSettings.settings.geminiSafetyThreshold : undefined
      
      const generationResult = await createRequestWithTimeout<GenerationResult>(() => 
        aiService.generateText(
          providerId,
          apiKey,
          {
            prompt: lastPrompt,
            maxTokens: aiSettings.settings.maxTokens,
            temperature: aiSettings.settings.temperature
          },
          modelId,
          safetyThreshold
        )
      )

      // Add AI response to history
      const newHistory = [...filteredHistory]
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generationResult.text,
        timestamp: new Date()
      }
      newHistory.push(aiMessage)

      // Update block with result
      editor.commands.updateAttributes('aiGeneration', {
        result: generationResult.text,
        loading: false,
        lastUpdated: new Date().toISOString(),
        conversation: newHistory.map(msg => ({ 
          ...msg, 
          timestamp: msg.timestamp?.toISOString() 
        }))
      })

      return newHistory
    } catch (error) {
      return handleGenerationError(error, block, conversationHistory)
    } finally {
      isLoading.value = false
    }
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
  const abortGeneration = (): void => {
    abortAllRequests()
    isLoading.value = false
  }

  /**
   * Remove AI block from document
   */
  const removeBlock = (block: any): boolean => {
    try {
      if (!block) {
        return false
      }
      
      // Remove the block from the document
      editor.chain().focus().deleteNode(block.type).run()
      return true
    } catch (error) {
      logger.error('Error removing block:', error)
      
      toast({
        title: 'Error',
        description: 'Failed to remove the AI block.',
        variant: 'destructive'
      })
      
      return false
    }
  }

  return {
    isLoading,
    errorMessage,
    generateText,
    continueConversation,
    regenerateText,
    removeBlock,
    abortGeneration,
    abortAllRequests
  }
}