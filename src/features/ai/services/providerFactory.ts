import type { AIProvider, AIProviderFactory, ProviderConfig } from './types';
import { GeminiProvider } from './providers/geminiProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { WebLLMProvider } from './providers/webLLMProvider';
import { logger } from '@/services/logger';

export class DefaultProviderFactory implements AIProviderFactory {
  private providers: Record<string, AIProvider> = {};
  
  constructor() {
    // Initialize empty providers map
  }
  
  createProvider(providerId: string, config?: any): AIProvider {
    // If provider already exists, return it
    if (this.providers[providerId]) {
      logger.debug(`Returning existing provider instance for ${providerId}`);
      return this.providers[providerId];
    }
    
    logger.info(`Creating new provider instance for ${providerId}`);
    
    // Create new provider based on ID
    let provider: AIProvider;
    
    switch (providerId) {
      case 'gemini':
        if (!config?.apiKey) {
          throw new Error('API key is required for Gemini provider');
        }
        provider = new GeminiProvider(config.apiKey);
        break;
        
      case 'ollama':
        provider = new OllamaProvider(config?.apiEndpoint);
        break;
        
      case 'webllm':
        provider = new WebLLMProvider();
        break;
        
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
    
    // Store provider for reuse
    this.providers[providerId] = provider;
    logger.info(`Provider ${providerId} created and stored successfully`);
    
    return provider;
  }
  
  hasProvider(providerId: string): boolean {
    return !!this.providers[providerId];
  }
  
  getProviders(): AIProvider[] {
    return Object.values(this.providers);
  }
  
  getProvider(providerId: string): AIProvider | undefined {
    return this.providers[providerId];
  }
  
  removeProvider(providerId: string): void {
    delete this.providers[providerId];
  }
  
  // Get information about available providers
  static getAvailableProviders(): ProviderConfig[] {
    return [
      {
        id: 'gemini',
        name: 'Google Gemini',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        requiresApiKey: true,
        maxTokens: 32768,
        defaultPrompt: 'You are Gemini, a helpful AI assistant from Google.'
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        apiEndpoint: 'http://localhost:11434/api',
        requiresApiKey: false,
        maxTokens: 4096,
        defaultPrompt: 'You are a helpful AI assistant.'
      },
      {
        id: 'webllm',
        name: 'WebLLM (Browser)',
        requiresApiKey: false,
        maxTokens: 4096,
        defaultPrompt: 'You are a helpful AI assistant running locally in the browser.'
      }
    ];
  }
  
  // Check if a provider is available (can be connected to)
  async checkProviderAvailability(providerId: string): Promise<boolean> {
    try {
      const provider = this.providers[providerId] || this.createProvider(providerId);
      return await provider.isAvailable();
    } catch (error) {
      logger.error(`Error checking availability for provider ${providerId}:`, error);
      return false;
    }
  }
} 








