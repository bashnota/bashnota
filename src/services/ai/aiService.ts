import { DefaultProviderFactory } from './providerFactory';
import type { 
  AIProvider, 
  GenerationOptions, 
  GenerationResult, 
  ModelInfo,
  MultimodalGenerationOptions,
  ProviderConfig,
  StreamCallbacks,
  WebLLMModelInfo,
  GeminiModelInfo
} from './types';
import { WebLLMProvider } from './providers/webLLMProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { logger } from '@/services/logger';

/**
 * Main AI service that manages providers and generation requests
 */
export class AIService {
  private providerFactory: DefaultProviderFactory;
  private defaultProviderId: string = 'gemini';
  
  constructor() {
    this.providerFactory = new DefaultProviderFactory();
    
    // Initialize from localStorage if available
    try {
      const savedSettings = localStorage.getItem('ai-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.preferredProviderId) {
          this.defaultProviderId = settings.preferredProviderId;
        }
      }
    } catch (error) {
      logger.error('Error loading provider from settings:', error);
    }
  }
  
  /**
   * Get a list of all available provider configurations
   */
  getProviderConfigs(): ProviderConfig[] {
    return DefaultProviderFactory.getAvailableProviders();
  }
  
  /**
   * Set the default provider ID to use for generation
   */
  setDefaultProviderId(providerId: string): void {
    if (!DefaultProviderFactory.getAvailableProviders().some(p => p.id === providerId)) {
      throw new Error(`Provider ${providerId} not supported`);
    }
    
    this.defaultProviderId = providerId;
  }
  
  /**
   * Get the current default provider ID
   */
  getDefaultProviderId(): string {
    return this.defaultProviderId;
  }
  
  /**
   * Check if a provider is currently available
   */
  async isProviderAvailable(providerId: string): Promise<boolean> {
    try {
      return await this.providerFactory.checkProviderAvailability(providerId);
    } catch (error) {
      logger.error(`Error checking if provider ${providerId} is available:`, error);
      return false;
    }
  }
  
  /**
   * Generate text using the specified provider
   */
  async generateText(
    providerId: string,
    options: GenerationOptions,
    apiKey?: string
  ): Promise<GenerationResult> {
    // Use provided ID or default
    const targetProviderId = providerId || this.defaultProviderId;
    
    try {
      // Get or create the provider
      const provider = this.getProvider(targetProviderId, apiKey);
      
      // Generate text
      return await provider.generateText(options);
    } catch (error) {
      logger.error(`Error generating text with provider ${targetProviderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate text with streaming using the specified provider
   */
  async generateTextStream(
    providerId: string,
    options: GenerationOptions,
    callbacks: StreamCallbacks,
    apiKey?: string
  ): Promise<void> {
    // Use provided ID or default
    const targetProviderId = providerId || this.defaultProviderId;
    
    try {
      // Get or create the provider
      const provider = this.getProvider(targetProviderId, apiKey);
      
      // Generate text with streaming
      await provider.generateTextStream(options, callbacks);
    } catch (error) {
      logger.error(`Error generating text stream with provider ${targetProviderId}:`, error);
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }
  
  /**
   * Generate multimodal content (text with images) if supported by the provider
   */
  async generateMultimodal(
    providerId: string,
    options: MultimodalGenerationOptions,
    callbacks?: StreamCallbacks,
    apiKey?: string
  ): Promise<GenerationResult> {
    // Use provided ID or default
    const targetProviderId = providerId || this.defaultProviderId;
    
    try {
      // Get or create the provider
      const provider = this.getProvider(targetProviderId, apiKey);
      
      // Check if provider supports multimodal
      if (!provider.supportsMultimodal()) {
        throw new Error(`Provider ${targetProviderId} does not support multimodal generation`);
      }
      
      if (!provider.generateMultimodal) {
        throw new Error(`Provider ${targetProviderId} has supportsMultimodal=true but no generateMultimodal method`);
      }
      
      // Generate with multimodal
      return await provider.generateMultimodal(options, callbacks);
    } catch (error) {
      logger.error(`Error generating multimodal content with provider ${targetProviderId}:`, error);
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }
  
  /**
   * Check if a provider supports multimodal inputs
   */
  providerSupportsMultimodal(providerId: string): boolean {
    try {
      // Only create the provider if it exists in our factory
      if (this.providerFactory.hasProvider(providerId)) {
        const provider = this.providerFactory.getProvider(providerId);
        return provider ? provider.supportsMultimodal() : false;
      }
      
      // For providers we haven't created yet, use hardcoded knowledge
      return providerId === 'gemini'; // Currently only Gemini supports multimodal
    } catch (error) {
      logger.error(`Error checking if provider ${providerId} supports multimodal:`, error);
      return false;
    }
  }
  
  /**
   * Get available models for WebLLM
   */
  async getWebLLMModels(): Promise<WebLLMModelInfo[]> {
    try {
      const provider = this.getProvider('webllm') as WebLLMProvider;
      return provider.getAvailableModels();
    } catch (error) {
      logger.error('Error getting WebLLM models:', error);
      throw error;
    }
  }
  
  /**
   * Initialize a WebLLM model
   */
  async initializeWebLLMModel(modelName: string): Promise<void> {
    try {
      const provider = this.getProvider('webllm') as WebLLMProvider;
      await provider.initializeModel(modelName);
    } catch (error) {
      logger.error(`Error initializing WebLLM model ${modelName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the current WebLLM model loading state
   */
  getWebLLMModelLoadingState(): { 
    isLoading: boolean; 
    progress: number; 
    error: string | null;
    currentModel: string | null;
  } {
    try {
      if (this.providerFactory.hasProvider('webllm')) {
        const provider = this.providerFactory.getProvider('webllm') as WebLLMProvider;
        return provider.getModelLoadingState();
      }
      
      return {
        isLoading: false,
        progress: 0,
        error: null,
        currentModel: null
      };
    } catch (error) {
      logger.error('Error getting WebLLM model loading state:', error);
      return {
        isLoading: false,
        progress: 0,
        error: String(error),
        currentModel: null
      };
    }
  }
  
  /**
   * Check if WebLLM is supported in the current browser
   */
  async isWebLLMSupported(): Promise<boolean> {
    try {
      return 'gpu' in navigator;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get available models for Gemini
   */
  async getGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
    try {
      // Create or get the Gemini provider
      const provider = this.getProvider('gemini', apiKey) as GeminiProvider;
      return await provider.getModels();
    } catch (error) {
      logger.error('Error getting Gemini models:', error);
      throw error;
    }
  }
  
  /**
   * Set the default model for a provider
   */
  setDefaultModel(providerId: string, modelId: string, apiKey?: string): void {
    try {
      switch (providerId) {
        case 'gemini': {
          const provider = this.getProvider('gemini', apiKey) as GeminiProvider;
          provider.setDefaultModel(modelId);
          break;
        }
        case 'ollama': {
          const provider = this.getProvider('ollama') as any;
          provider.setDefaultModel(modelId);
          break;
        }
        case 'webllm': {
          // For WebLLM, we don't set a default model - it needs to be explicitly initialized
          break;
        }
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }
    } catch (error) {
      logger.error(`Error setting default model for provider ${providerId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a provider instance (creating it if needed)
   */
  private getProvider(providerId: string, apiKey?: string): AIProvider {
    const config: Record<string, any> = {};
    
    // Add provider-specific config
    if (providerId === 'gemini' && apiKey) {
      config.apiKey = apiKey;
    }
    
    return this.providerFactory.createProvider(providerId, config);
  }
}

// Export a singleton instance
export const aiService = new AIService(); 