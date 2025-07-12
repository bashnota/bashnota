import { ref } from 'vue'
import { logger } from '@/services/logger'
import { aiService } from '@/features/ai/services'
import type { GenerationResult, GenerationOptions, StreamCallbacks } from '@/features/ai/services'
import { toast } from '@/ui/toast'
import { type ConversationMessage } from './useConversation'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { useAIErrorHandling } from './useAIErrorHandling'
import { useAIRequest } from './useAIRequest'
import { useAIProviders } from './useAIProviders'
import { useStreamingMode } from './useStreamingMode'
import { useConversationManager } from './useConversationManager'

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

export function useAIGeneration(editor: import('vue').Ref<any>, notaId: string) {
  const isLoading = ref(false)
  const aiSettings = useAISettingsStore()
  const { errorMessage, handleGenerationError } = useAIErrorHandling()
  const { createRequestWithTimeout, abortRequest, abortAllRequests } = useAIRequest()
  
  // Initialize conversation manager
  const conversationManager = useConversationManager(editor, notaId)
  
  // Get all needed functions from useAIProviders at the top level
  const { 
    selectBestAvailableProvider, 
    availableProviders,
    updateWebLLMState,
    currentWebLLMModel,
    loadWebLLMModel,
    webLLMModels,
    selectProvider,
    isWebLLMSupported,
    checkAllProviders,
    verifyWebLLMReady
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
    console.log(`[useAIGeneration] ensureValidProvider - Current provider ID: ${currentProviderId}, Available providers: ${availableProviders.value.join(', ')}`)
    
    // Special handling for WebLLM - if it's selected, check if a model is loaded and ready
    if (currentProviderId === 'webllm') {
      console.log(`[useAIGeneration] WebLLM requested, verifying readiness...`)
      
      // Use the comprehensive verification method
      const isReady = await verifyWebLLMReady()
      
      if (isReady) {
        console.log(`[useAIGeneration] WebLLM is ready with model: ${currentWebLLMModel.value}`)
        return 'webllm'
      }
      
      console.log('[useAIGeneration] WebLLM not ready, attempting to initialize...')
      
      // Show loading state in the editor
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: true,
          error: 'Loading WebLLM model...',
        })
      }
      
      // Try to select the WebLLM provider, which will auto-load a model
      const success = await selectProvider('webllm')
      console.log(`[useAIGeneration] WebLLM provider selection ${success ? 'succeeded' : 'failed'}`)
      
      if (!success) {
        throw new Error('Failed to load WebLLM model. Please select a model in the settings.')
      }
      
      // Verify again after loading
      const isNowReady = await verifyWebLLMReady()
      if (!isNowReady) {
        throw new Error('WebLLM model loading failed. Please try again or select a different model.')
      }
      
      console.log(`[useAIGeneration] WebLLM model successfully loaded: ${currentWebLLMModel.value}`)
      return 'webllm'
    }
    
    // For other providers, check if they're available
    console.log(`[useAIGeneration] Using non-WebLLM provider: ${currentProviderId}`)
    
    // First check if the explicitly selected provider is available
    if (availableProviders.value.includes(currentProviderId)) {
      console.log(`[useAIGeneration] Selected provider ${currentProviderId} is available, using it`)
      return currentProviderId
    }
    
    // If the selected provider is not available, log a warning
    console.log(`[useAIGeneration] Warning: Selected provider ${currentProviderId} is not in available providers list`)
    console.log(`[useAIGeneration] Available providers: ${availableProviders.value.join(', ')}`)
    
    // Check if we need to update provider availability
    if (availableProviders.value.length === 0) {
      console.log('[useAIGeneration] No available providers found, checking all providers')
      await checkAllProviders(false)
      console.log(`[useAIGeneration] After checkAllProviders, available providers: ${availableProviders.value.join(', ')}`)
      
      // Check again if the selected provider is now available
      if (availableProviders.value.includes(currentProviderId)) {
        console.log(`[useAIGeneration] Selected provider ${currentProviderId} is now available after check, using it`)
        return currentProviderId
      }
    }
    
    // If we still don't have the selected provider available, try to find an alternative
    console.log('[useAIGeneration] Selected provider not available, trying to find best alternative')
    const newProvider = await selectBestAvailableProvider()
    console.log(`[useAIGeneration] Best available provider: ${newProvider}`)
    
    // If we couldn't find a valid provider, throw an error
    if (!availableProviders.value.includes(newProvider)) {
      console.error('[useAIGeneration] No AI providers are available')
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
    formatTimestamp: (date?: Date) => string,
    forcedProvider?: string // Optional parameter to force a specific provider
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block || !prompt.trim()) {
      return
    }

    try {
      isLoading.value = true
      
      // Get or create block ID
      const blockId = conversationManager.getOrCreateBlockId(block)
      
      // Update block to show loading state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: true,
          error: ''
        })
      }

      // Create user message
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date()
      }

      // Add user message to database and get updated history
      await conversationManager.addMessage(blockId, userMessage)
      const newHistory = [...conversationManager.conversationHistory.value]

      // Ensure we have a valid provider before generating
      let providerId = forcedProvider
      if (!providerId) {
        console.log('[useAIGeneration] generateText - No forced provider, ensuring valid provider')
        providerId = await ensureValidProvider()
      } else {
        console.log(`[useAIGeneration] generateText - Using forced provider: ${providerId}`)
      }
      
      const apiKey = aiSettings.getApiKey(providerId)
      console.log(`[useAIGeneration] generateText - Final provider selected: ${providerId}`)
      
      // Final verification for WebLLM before generation
      if (providerId === 'webllm') {
        const isReady = await verifyWebLLMReady()
        if (!isReady) {
          throw new Error('WebLLM is not ready for text generation. Please try loading a model again.')
        }
      }
      
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
            if (editor.value) {
              editor.value.commands.updateAttributes('aiGeneration', {
                result: fullResult,
                loading: true,
                lastUpdated: new Date().toISOString()
              })
            }
          },
          onComplete: async (result: GenerationResult) => {
            // Streaming complete
            completeStreaming()
            
            // Set final AI message content
            aiMessage.content = result.text
            
            // Add AI message to database
            await conversationManager.addMessage(blockId, aiMessage)
            
            // Get the full result now that we're complete
            const fullResult = block.node.attrs.result 
              ? `${block.node.attrs.result}\n\n${result.text}`
              : result.text
              
            // Update block with complete result
            if (editor.value) {
              editor.value.commands.updateAttributes('aiGeneration', {
                result: fullResult,
                loading: false,
                lastUpdated: new Date().toISOString()
              })
            }
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
        return conversationManager.conversationHistory.value
      } else {
        // Use non-streaming API with timeout
        generationResult = await createRequestWithTimeout<GenerationResult>(
          () => aiService.generateText(providerId, options, apiKey),
          providerId,
          false
        )
        
                // Update AI message content
        aiMessage.content = generationResult.text
        
        // Add AI message to database
        await conversationManager.addMessage(blockId, aiMessage)
        
        // Get the full result (original + new text)
        const fullResult = block.node.attrs.result 
          ? `${block.node.attrs.result}\n\n${generationResult.text}`
          : generationResult.text

        // Update block with result
        if (editor.value) {
          editor.value.commands.updateAttributes('aiGeneration', {
            result: fullResult,
            loading: false,
            lastUpdated: new Date().toISOString()
          })
        }
        
        return conversationManager.conversationHistory.value
      }
    } catch (error: any) {
      // Update block with error state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: false,
          error: error.message
        })
      }
      return handleGenerationError(error, editor.value, block, conversationHistory)
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
    formatTimestamp: (date?: Date) => string,
    forcedProvider?: string // Optional parameter to force a specific provider
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block || !prompt.trim()) {
      return
    }

    try {
      isLoading.value = true
      
      // Get or create block ID
      const blockId = conversationManager.getOrCreateBlockId(block)
      
      // Update block to show loading state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: true,
          error: ''
        })
      }

      // Create user message
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date()
      }

      // Add user message to database
      await conversationManager.addMessage(blockId, userMessage)

      // Ensure we have a valid provider before generating
      let providerId = forcedProvider
      if (!providerId) {
        console.log('[useAIGeneration] continueConversation - No forced provider, ensuring valid provider')
        providerId = await ensureValidProvider()
      } else {
        console.log(`[useAIGeneration] continueConversation - Using forced provider: ${providerId}`)
      }
      
      const apiKey = aiSettings.getApiKey(providerId)
      console.log(`[useAIGeneration] continueConversation - Final provider selected: ${providerId}`)
      
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

      // Create AI response message
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generationResult.text,
        timestamp: new Date()
      }

      // Add AI message to database
      await conversationManager.addMessage(blockId, aiMessage)

      // Get the full result (original + new text)
      const fullResult = block.node.attrs.result 
        ? `${block.node.attrs.result}\n\n${generationResult.text}`
        : generationResult.text

      // Update block with result
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          result: fullResult,
          loading: false,
          lastUpdated: new Date().toISOString()
        })
      }

      return conversationManager.conversationHistory.value
    } catch (error: any) {
      // Update block with error state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: false,
          error: error.message
        })
      }
      return handleGenerationError(error, editor.value, block, conversationHistory)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Regenerate text using the last prompt
   */
  const regenerateText = async (
    block: any,
    conversationHistory: ConversationMessage[],
    forcedProvider?: string // Optional parameter to force a specific provider
  ): Promise<ConversationMessage[] | undefined> => {
    if (!block) {
      return
    }

    try {
      isLoading.value = true
      
      // Get or create block ID
      const blockId = conversationManager.getOrCreateBlockId(block)
      
      // Update block to show loading state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: true,
          error: ''
        })
      }

      // Get current conversation history
      const currentHistory = conversationManager.conversationHistory.value
      
      // Filter history to exclude the last assistant message
      const filteredHistory = [...currentHistory]
      if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'assistant') {
        filteredHistory.pop()
      }

      // Get the last user prompt
      const lastPrompt = filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user'
        ? filteredHistory[filteredHistory.length - 1].content
        : block.node.attrs.prompt || ''

      // Ensure we have a valid provider before generating
      let providerId = forcedProvider
      if (!providerId) {
        console.log('[useAIGeneration] regenerateText - No forced provider, ensuring valid provider')
        providerId = await ensureValidProvider()
      } else {
        console.log(`[useAIGeneration] regenerateText - Using forced provider: ${providerId}`)
      }
      
      const apiKey = aiSettings.getApiKey(providerId)
      console.log(`[useAIGeneration] regenerateText - Final provider selected: ${providerId}`)
      
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

      // Create AI response message
      const aiMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generationResult.text,
        timestamp: new Date()
      }

      // Update conversation history in database (remove last assistant message and add new one)
      await conversationManager.updateConversationHistory(blockId, [...filteredHistory, aiMessage])

      // Update block with result
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          result: generationResult.text,
          loading: false,
          lastUpdated: new Date().toISOString()
        })
      }

      return conversationManager.conversationHistory.value
    } catch (error: any) {
      // Update block with error state
      if (editor.value) {
        editor.value.commands.updateAttributes('aiGeneration', {
          loading: false,
          error: error.message
        })
      }
      return handleGenerationError(error, editor.value, block, conversationHistory)
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
      if (editor.value) {
        editor.value.chain().focus().deleteNode(block.type).run()
        return true
      }
      return false
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
    currentStreamingText,
    
    // Add data about the current provider
    getCurrentProvider: () => aiSettings.settings.preferredProviderId,
    getAvailableProviders: () => availableProviders.value,
    
    // Expose conversation manager
    conversationManager
  }
}







