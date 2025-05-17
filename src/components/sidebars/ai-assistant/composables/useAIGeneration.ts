import { ref } from 'vue'
import { logger } from '@/services/logger'
import { aiService } from '@/services/ai'
import type { GenerationResult, GenerationOptions, StreamCallbacks } from '@/services/ai/types'
import { toast } from '@/components/ui/toast'
import { type ConversationMessage } from './useConversation'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { useAIErrorHandling } from './useAIErrorHandling'
import { useAIRequest } from './useAIRequest'
import { useAIProviders } from './useAIProviders'
import { useStreamingMode } from './useStreamingMode'

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
  const aiSettings = useAISettingsStore()
  const { errorMessage, handleGenerationError } = useAIErrorHandling()
  const { createRequestWithTimeout, abortRequest, abortAllRequests } = useAIRequest()
  
  // Get all needed functions from useAIProviders at the top level
  const { 
    selectBestAvailableProvider, 
    availableProviders,
    updateWebLLMState,
    currentWebLLMModel,
    loadWebLLMModel,
    webLLMModels,
    selectProvider,
    isWebLLMSupported
  } = useAIProviders()
  
  const { 
    shouldUseStreaming, 
    startStreaming, 
    handleStreamingChunk, 
    completeStreaming, 
    currentStreamingText
  } = useStreamingMode()

  /**
   * Ensure a valid provider is selected before generating
   */
  const ensureValidProvider = async (): Promise<string> => {
    const currentProviderId = aiSettings.settings.preferredProviderId
    logger.info(`Current provider ID: ${currentProviderId}, Available providers: ${availableProviders.value.join(', ')}`)
    
    // Special handling for WebLLM - if it's selected, check if a model is loaded
    if (currentProviderId === 'webllm') {
      // Use the already initialized providers - no need to call useAIProviders() here
      
      // Check if WebLLM is supported
      logger.info(`WebLLM supported: ${isWebLLMSupported.value}`)
      
      // Check the current state
      updateWebLLMState()
      logger.info(`WebLLM model loaded: ${currentWebLLMModel.value || 'none'}`)
      
      // If no model is loaded, try to load one
      if (!currentWebLLMModel.value) {
        logger.info('No WebLLM model loaded, attempting to load one')
        
        // Show loading state in the editor
        editor.commands.updateAttributes('aiGeneration', {
          loading: true,
          error: 'Loading WebLLM model...',
        })
        
        // Try to select the WebLLM provider, which will auto-load a model
        const success = await selectProvider('webllm')
        logger.info(`WebLLM provider selection ${success ? 'succeeded' : 'failed'}`)
        
        if (!success) {
          throw new Error('Failed to load WebLLM model. Please select a model in the settings.')
        }
        
        // Update state after loading
        updateWebLLMState()
        logger.info(`WebLLM model after loading: ${currentWebLLMModel.value || 'none'}`)
      }
      
      return 'webllm'
    }
    
    // For other providers, check if they're available
    // Check if current provider is in the available providers list
    if (availableProviders.value.includes(currentProviderId)) {
      return currentProviderId
    }
    
    // If not available, try to select the best available provider
    const newProvider = await selectBestAvailableProvider()
    
    // If we couldn't find a valid provider, show an error
    if (!availableProviders.value.includes(newProvider)) {
      throw new Error('No AI providers are available. Please check your settings.')
    }
    
    return newProvider
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

      // Ensure we have a valid provider before generating
      const providerId = await ensureValidProvider()
      const apiKey = aiSettings.getApiKey(providerId)
      
      const options: GenerationOptions = {
        prompt,
        maxTokens: aiSettings.settings.maxTokens,
        temperature: aiSettings.settings.temperature
      }
      
      // Add model ID for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiModel) {
        options.modelId = aiSettings.settings.geminiModel
      }
      
      // Add safety threshold for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiSafetyThreshold) {
        options.safetyThreshold = aiSettings.settings.geminiSafetyThreshold
      }
      
      // Create a new AI message ready for streaming content
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      
      // Add empty AI message to history
      newHistory.push(aiMessage)
      
      let generationResult: GenerationResult
      
      // Check if we should use streaming (for WebLLM)
      if (shouldUseStreaming.value && providerId === 'webllm') {
        // Start streaming session
        startStreaming(providerId)
        
        // Create streaming callbacks
        const streamCallbacks: StreamCallbacks = {
          onChunk: (text: string) => {
            // Update streaming text
            handleStreamingChunk(text)
            
            // Update the AI message in history
            aiMessage.content += text
            
            // Update the editor in real-time
            const fullResult = block.node.attrs.result 
              ? `${block.node.attrs.result}\n\n${aiMessage.content}`
              : aiMessage.content
              
            // Update block with current result
            editor.commands.updateAttributes('aiGeneration', {
              result: fullResult,
              loading: true,
              lastUpdated: new Date().toISOString(),
              conversation: newHistory.map(msg => ({ 
                ...msg, 
                timestamp: msg.timestamp?.toISOString() 
              }))
            })
          },
          onComplete: (result: GenerationResult) => {
            // Streaming complete
            completeStreaming()
            
            // Get the full result now that we're complete
            const fullResult = block.node.attrs.result 
              ? `${block.node.attrs.result}\n\n${result.text}`
              : result.text
              
            // Update block with complete result
            editor.commands.updateAttributes('aiGeneration', {
              result: fullResult,
              loading: false,
              lastUpdated: new Date().toISOString(),
              conversation: newHistory.map(msg => ({ 
                ...msg, 
                timestamp: msg.timestamp?.toISOString() 
              }))
            })
          },
          onError: (error: Error) => {
            throw error
          }
        }
        
        // Use streaming API with longer timeout
        await createRequestWithTimeout(
          () => aiService.generateTextStream(providerId, options, streamCallbacks, apiKey),
          providerId,
          true
        )
        
        // Return updated conversation history
        return newHistory
      } else {
        // Use non-streaming API with timeout
        generationResult = await createRequestWithTimeout<GenerationResult>(
          () => aiService.generateText(providerId, options, apiKey),
          providerId,
          false
        )
        
        // Update AI message content
        aiMessage.content = generationResult.text
        
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
      }
    } catch (error) {
      return handleGenerationError(error, editor, block, conversationHistory)
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

      // Ensure we have a valid provider before generating
      const providerId = await ensureValidProvider()
      const apiKey = aiSettings.getApiKey(providerId)
      
      const options: GenerationOptions = {
        prompt,
        maxTokens: aiSettings.settings.maxTokens,
        temperature: aiSettings.settings.temperature
      }
      
      // Add model ID for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiModel) {
        options.modelId = aiSettings.settings.geminiModel
      }
      
      // Add safety threshold for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiSafetyThreshold) {
        options.safetyThreshold = aiSettings.settings.geminiSafetyThreshold
      }
      
      // Call AI service with timeout
      const generationResult = await createRequestWithTimeout<GenerationResult>(() => 
        aiService.generateText(providerId, options, apiKey)
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
      return handleGenerationError(error, editor, block, conversationHistory)
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

      // Ensure we have a valid provider before generating
      const providerId = await ensureValidProvider()
      const apiKey = aiSettings.getApiKey(providerId)
      
      const options: GenerationOptions = {
        prompt: lastPrompt,
        maxTokens: aiSettings.settings.maxTokens,
        temperature: aiSettings.settings.temperature
      }
      
      // Add model ID for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiModel) {
        options.modelId = aiSettings.settings.geminiModel
      }
      
      // Add safety threshold for providers that support it
      if (providerId === 'gemini' && aiSettings.settings.geminiSafetyThreshold) {
        options.safetyThreshold = aiSettings.settings.geminiSafetyThreshold
      }
      
      // Call AI service with timeout
      const generationResult = await createRequestWithTimeout<GenerationResult>(() => 
        aiService.generateText(providerId, options, apiKey)
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
      return handleGenerationError(error, editor, block, conversationHistory)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Abort current generation request
   */
  const abortGeneration = (): void => {
    abortRequest()
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
    abortAllRequests,
    currentStreamingText
  }
}