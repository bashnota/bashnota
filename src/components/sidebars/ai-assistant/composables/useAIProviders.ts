import { ref, computed, onMounted } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { aiService } from '@/services/ai'
import type { 
  GeminiModelInfo, 
  WebLLMModelInfo, 
  ProviderConfig,
  GenerationOptions
} from '@/services/ai'
import { logger } from '@/services/logger'
import { toast } from '@/components/ui/toast'

/**
 * Composable for AI provider functionality
 */
export function useAIProviders() {
  const aiSettings = useAISettingsStore()
  
  // Provider information
  const providers = computed<ProviderConfig[]>(() => aiService.getProviderConfigs())
  const currentProviderId = ref(aiSettings.settings.preferredProviderId)
  
  // Provider states
  const geminiModels = ref<GeminiModelInfo[]>([])
  const webLLMModels = ref<WebLLMModelInfo[]>([])
  const isLoadingGeminiModels = ref(false)
  const isLoadingWebLLMModels = ref(false)
  
  // WebLLM specific state
  const webLLMModelLoadingState = computed(() => aiService.getWebLLMModelLoadingState())
  const isWebLLMSupported = ref(false)
  const webLLMProgress = ref(0)
  const webLLMError = ref<string | null>(null)
  const currentWebLLMModel = ref<string | null>(null)
  const isCheckingProviders = ref(false)
  
  // Get available providers that can be used right now
  const availableProviders = ref<string[]>([])
  
  /**
   * Check if WebLLM is supported in the current browser
   */
  const checkWebLLMSupport = async () => {
    try {
      isWebLLMSupported.value = await aiService.isWebLLMSupported()
    } catch (error) {
      logger.error('Error checking WebLLM support:', error)
      isWebLLMSupported.value = false
    }
  }
  
  /**
   * Fetch Gemini models
   */
  const fetchGeminiModels = async () => {
    try {
      const apiKey = aiSettings.getApiKey('gemini')
      if (!apiKey) {
        geminiModels.value = []
        return
      }
      
      isLoadingGeminiModels.value = true
      const models = await aiService.getGeminiModels(apiKey)
      geminiModels.value = models
      return models
    } catch (error) {
      logger.error('Error fetching Gemini models:', error)
      geminiModels.value = []
      return []
    } finally {
      isLoadingGeminiModels.value = false
    }
  }
  
  /**
   * Fetch WebLLM models
   */
  const fetchWebLLMModels = async () => {
    try {
      isLoadingWebLLMModels.value = true
      const models = await aiService.getWebLLMModels()
      webLLMModels.value = models
      return models
    } catch (error) {
      logger.error('Error fetching WebLLM models:', error)
      webLLMModels.value = []
      return []
    } finally {
      isLoadingWebLLMModels.value = false
    }
  }
  
  /**
   * Load a WebLLM model
   */
  const loadWebLLMModel = async (modelId: string): Promise<boolean> => {
    if (!modelId) {
      logger.warn('No WebLLM model ID provided')
      return false
    }
    
    try {
      isLoadingWebLLMModels.value = true
      webLLMError.value = null
      
      // Set up polling for progress updates
      const pollInterval = setInterval(() => {
        const state = aiService.getWebLLMModelLoadingState()
        webLLMProgress.value = state.progress
        
        if (state.error) {
          webLLMError.value = state.error
          logger.warn('WebLLM loading error:', state.error)
        }
      }, 200)
      
      logger.info(`Loading WebLLM model: ${modelId}`)
      
      // Set a reasonable timeout for model loading (3 minutes)
      const timeoutMs = 180000
      
      // Initialize the model with the timeout
      await aiService.initializeWebLLMModel(modelId, timeoutMs)
      
      // Update state after successful loading
      updateWebLLMState()
      currentWebLLMModel.value = modelId
      
      // Save to settings
      aiSettings.updateSettings({
        webllmModel: modelId
      })
      
      // Add to available providers if not already there
      if (!availableProviders.value.includes('webllm')) {
        availableProviders.value.push('webllm')
      }
      
      logger.info(`WebLLM model ${modelId} loaded successfully`)
      
      // Clear polling interval
      clearInterval(pollInterval)
      return true
    } catch (error) {
      // Update state on error
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model'
      webLLMError.value = errorMessage
      logger.error(`Error loading WebLLM model ${modelId}:`, error)
      
      // Show user-friendly error toast
      toast({
        title: 'Model Loading Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      
      return false
    } finally {
      isLoadingWebLLMModels.value = false
      
      // Refresh available providers
      await checkAllProviders()
    }
  }
  
  /**
   * Set the default model for a provider
   */
  const setDefaultModel = (providerId: string, modelId: string) => {
    try {
      // Get API key if needed for this provider
      const apiKey = providerId === 'gemini' ? aiSettings.getApiKey('gemini') : undefined
      
      // Set the default model
      aiService.setDefaultModel(providerId, modelId, apiKey)
      
      // Save to settings store
      if (providerId === 'gemini') {
        aiSettings.updateSettings({ geminiModel: modelId })
      }
      
      return true
    } catch (error) {
      logger.error(`Error setting default model for ${providerId}:`, error)
      return false
    }
  }
  
  /**
   * Get default generation options based on current settings
   */
  const getDefaultGenerationOptions = (): GenerationOptions => {
    return {
      prompt: '',
      maxTokens: aiSettings.settings.maxTokens,
      temperature: aiSettings.settings.temperature,
      topP: 0.95,
      safetyThreshold: aiSettings.settings.geminiSafetyThreshold
    }
  }
  
  /**
   * Check if a provider is available/connected
   */
  const checkProviderAvailability = async (providerId: string): Promise<boolean> => {
    try {
      // For WebLLM, check if it's supported by the browser
      // We consider WebLLM available if the browser supports it, even if no model is loaded yet
      if (providerId === 'webllm') {
        await checkWebLLMSupport(); // Make sure we have up-to-date support info
        return isWebLLMSupported.value; 
      }
      
      // For Gemini, make sure there's an API key
      if (providerId === 'gemini') {
        const apiKey = aiSettings.getApiKey('gemini')
        if (!apiKey) return false
      }
      
      return await aiService.isProviderAvailable(providerId)
    } catch (error) {
      logger.error(`Error checking availability for provider ${providerId}:`, error)
      return false
    }
  }
  
  /**
   * Check if a provider supports multimodal inputs (images + text)
   */
  const supportsMultimodal = (providerId: string): boolean => {
    return aiService.providerSupportsMultimodal(providerId)
  }
  
  // Get the current WebLLM model loading state
  const updateWebLLMState = () => {
    try {
      const state = aiService.getWebLLMModelLoadingState()
      isLoadingWebLLMModels.value = state.isLoading
      webLLMProgress.value = state.progress
      webLLMError.value = state.error
      currentWebLLMModel.value = state.currentModel
    } catch (error) {
      logger.error('Error getting WebLLM state:', error)
    }
  }
  
  // Check all providers and update availability state
  const checkAllProviders = async () => {
    if (isCheckingProviders.value) return
    
    try {
      isCheckingProviders.value = true
      availableProviders.value = []
      
      for (const provider of providers.value) {
        const isAvailable = await checkProviderAvailability(provider.id)
        if (isAvailable) {
          availableProviders.value.push(provider.id)
        }
      }
      
      // Update WebLLM state as part of checking providers
      updateWebLLMState()
    } catch (error) {
      logger.error('Error checking providers:', error)
    } finally {
      isCheckingProviders.value = false
    }
  }
  
  // Auto-select the best available provider
  const selectBestAvailableProvider = async () => {
    await checkAllProviders()
    
    const currentProvider = aiSettings.settings.preferredProviderId
    const currentProviderAvailable = availableProviders.value.includes(currentProvider)
    
    // If current provider is already available, keep using it
    if (currentProviderAvailable) {
      return currentProvider
    }
    
    // Otherwise select the first available provider, with preference order:
    // 1. WebLLM (if supported and a model is loaded)
    // 2. Ollama (if available)
    // 3. Gemini (if API key is set)
    
    if (availableProviders.value.includes('webllm') && currentWebLLMModel.value) {
      aiSettings.setPreferredProvider('webllm')
      return 'webllm'
    }
    
    if (availableProviders.value.includes('ollama')) {
      aiSettings.setPreferredProvider('ollama')
      return 'ollama'
    }
    
    if (availableProviders.value.includes('gemini')) {
      aiSettings.setPreferredProvider('gemini')
      return 'gemini'
    }
    
    // No available providers, keep the current selection
    return currentProvider
  }
  
  // Handle provider selection with auto-loading for WebLLM
  const selectProvider = async (providerId: string): Promise<boolean> => {
    // If selecting WebLLM, make sure a model is loaded
    if (providerId === 'webllm') {
      try {
        // Check browser support
        await checkWebLLMSupport()
        if (!isWebLLMSupported.value) {
          logger.warn('WebLLM not supported in this browser');
          toast({
            title: 'Browser Not Supported',
            description: 'Your browser does not support WebGPU required for WebLLM',
            variant: 'destructive'
          });
          return false;
        }
        
        // Check if a model is already loaded
        updateWebLLMState();
        
        if (!currentWebLLMModel.value) {
          // Make sure we have models to choose from
          if (webLLMModels.value.length === 0) {
            logger.info('No WebLLM models available, fetching models...');
            await fetchWebLLMModels();
            
            if (webLLMModels.value.length === 0) {
              toast({
                title: 'No WebLLM Models',
                description: 'Unable to fetch WebLLM models.',
                variant: 'destructive'
              });
              return false;
            }
          }
          
          // No model loaded, try to load the default or first available model
          let modelToLoad = aiSettings.settings.webllmModel;
          
          // If no model is specified in settings, or the specified model isn't in the list,
          // try to find a smaller model to load first (for faster experience)
          if (!modelToLoad || !webLLMModels.value.find(m => m.id === modelToLoad)) {
            logger.info('No model specified in settings, looking for a small model to load');
            
            // Preference for smaller models that load faster
            const smallModel = webLLMModels.value.find(m => 
              m.size.includes('0.5B') || 
              m.size.includes('1B') || 
              m.size.includes('2B') ||
              m.size.includes('3B')
            );
            
            if (smallModel) {
              modelToLoad = smallModel.id;
              logger.info(`Selected small model to load: ${smallModel.name} (${smallModel.id})`);
            } else {
              // If no small model found, use the first model in the list
              modelToLoad = webLLMModels.value[0].id;
              logger.info(`No small model found, using first available model: ${modelToLoad}`);
            }
          }
          
          logger.info(`Attempting to load WebLLM model: ${modelToLoad}`);
          
          // Load the selected model
          const loadSuccess = await loadWebLLMModel(modelToLoad);
          
          if (!loadSuccess) {
            logger.warn(`Failed to load WebLLM model ${modelToLoad}, trying alternative smaller model`);
            
            // If loading failed, try one more time with the smallest model available
            const tinierModel = webLLMModels.value.find(m => 
              m.size.includes('0.5B') || 
              m.size.includes('1B')
            );
            
            if (tinierModel && tinierModel.id !== modelToLoad) {
              logger.info(`Trying smaller model instead: ${tinierModel.name}`);
              const retrySuccess = await loadWebLLMModel(tinierModel.id);
              
              if (!retrySuccess) {
                logger.error('Failed to load WebLLM model after retry');
                return false;
              }
            } else {
              // No alternative model to try
              logger.error('No alternative WebLLM model available');
              return false;
            }
          }
        }
        
        // Successfully loaded or already had model loaded
        aiSettings.setPreferredProvider('webllm');
        return true;
      } catch (error) {
        logger.error('Error selecting WebLLM provider:', error);
        return false;
      }
    }
    
    // For other providers
    try {
      // Verify the provider is available
      const isAvailable = await checkProviderAvailability(providerId);
      
      if (isAvailable) {
        // Update settings with the new provider
        aiSettings.setPreferredProvider(providerId);
        currentProviderId.value = providerId;
        return true;
      } else {
        // Log the reason why provider is not available
        if (providerId === 'gemini' && !aiSettings.getApiKey('gemini')) {
          logger.warn('Gemini provider not available: No API key');
          toast({
            title: 'API Key Required',
            description: 'Please set your Gemini API key in settings.',
            variant: 'destructive'
          });
        } else if (providerId === 'ollama') {
          logger.warn('Ollama provider not available: Server not connected');
          toast({
            title: 'Ollama Not Available',
            description: 'Unable to connect to Ollama server. Is it running?',
            variant: 'destructive'
          });
        }
        
        return false;
      }
    } catch (error) {
      logger.error(`Error selecting ${providerId} provider:`, error);
      return false;
    }
  }
  
  // Initialize
  onMounted(async () => {
    // Check WebLLM support
    await checkWebLLMSupport()
    
    // Fetch models
    if (isWebLLMSupported.value) {
      await fetchWebLLMModels()
      updateWebLLMState()
    }
    
    await fetchGeminiModels()
    
    // Check provider availability
    await checkAllProviders()
    
    // Auto-select best available provider on start
    if (aiSettings.settings.autoSelectProvider !== false) {
      await selectBestAvailableProvider()
    }
  })
  
  return {
    // Properties
    providers,
    currentProviderId,
    geminiModels,
    webLLMModels,
    isLoadingGeminiModels,
    isLoadingWebLLMModels,
    webLLMModelLoadingState,
    isWebLLMSupported,
    webLLMProgress,
    webLLMError,
    currentWebLLMModel,
    availableProviders,
    
    // Methods
    checkWebLLMSupport,
    fetchGeminiModels,
    fetchWebLLMModels,
    loadWebLLMModel,
    setDefaultModel,
    getDefaultGenerationOptions,
    checkProviderAvailability,
    supportsMultimodal,
    updateWebLLMState,
    checkAllProviders,
    selectBestAvailableProvider,
    selectProvider
  }
} 