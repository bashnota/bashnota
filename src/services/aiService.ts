import axios from 'axios'
import * as webllm from "@mlc-ai/web-llm";
import { logger } from '@/services/logger'
import { aiService as newAIService } from './ai';
import type {
  GenerationOptions as NewGenerationOptions,
  GenerationResult as NewGenerationResult,
  MultimodalGenerationOptions as NewMultimodalGenerationOptions,
  StreamCallbacks,
  WebLLMModelInfo as NewWebLLMModelInfo,
  GeminiModelInfo as NewGeminiModelInfo,
  GeminiSafetySettings as NewGeminiSafetySettings
} from './ai';

// Add the InitProgressReport interface to match WebLLM's API
interface InitProgressReport {
  text: string;
  progress: number;
}

export interface LLMProvider {
  id: string
  name: string
  apiEndpoint: string
  requiresApiKey: boolean
  maxTokens: number
  defaultPrompt: string
}

export interface GeminiSafetySettings {
  category: string
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE' | 'BLOCK_ONLY_HIGH'
}

export interface GeminiTuningOptions {
  topK?: number
  candidateCount?: number
  stopSequences?: string[]
  safetySettings?: GeminiSafetySettings[]
}

export interface GeminiGenerationOptions extends GenerationOptions {
  tuningOptions?: GeminiTuningOptions
}

export interface MultimodalGenerationOptions extends GenerationOptions {
  images?: string[] // Base64 encoded images or URLs
  tuningOptions?: GeminiTuningOptions
}

export interface WebLLMModelInfo {
  id: string
  name: string
  size: string
  description: string
  downloadSize: string
}

export interface GeminiModelInfo {
  id: string
  name: string
  description: string
  maxTokens: number
  supportsImages: boolean
}

// For backward compatibility
export const supportedProviders = newAIService.getProviderConfigs();

// Original types for backward compatibility
export interface GenerationOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  safetyThreshold?: string
  modelId?: string
}

export interface GenerationResult {
  text: string
  provider: string
  tokens: number
}

// This class is just a compatibility wrapper around the new modular AI service
class AIServiceLegacy {
  // Sync the preferred provider with the settings store
  syncPreferredProvider(): void {
    try {
      const savedSettings = localStorage.getItem('ai-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.preferredProviderId) {
          newAIService.setDefaultProviderId(settings.preferredProviderId);
        }
      }
    } catch (error) {
      console.error('Failed to sync preferred provider', error);
    }
  }

  // Pass through to the new service with backward compatibility
  async generateText(
    providerId: string, 
    apiKey: string, 
    options: GenerationOptions,
    modelId?: string,
    safetyThreshold?: string
  ): Promise<GenerationResult> {
    // Handle safety threshold conversion
    if (safetyThreshold) {
      options = {
        ...options,
        safetyThreshold
      };
    }
    
    // Handle model ID
    if (modelId) {
      options = {
        ...options,
        modelId
      };
    }
    
    const result = await newAIService.generateText(providerId, options as NewGenerationOptions, apiKey);
    return result as GenerationResult;
  }

  async generateTextStream(
    providerId: string,
    apiKey: string,
    options: GenerationOptions,
    onChunk: (text: string) => void,
    onComplete: (result: GenerationResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // Convert to the new callbacks interface
    const callbacks: StreamCallbacks = {
      onChunk,
      onComplete: (result: NewGenerationResult) => onComplete(result as GenerationResult),
      onError
    };
    
    return newAIService.generateTextStream(providerId, options as NewGenerationOptions, callbacks, apiKey);
  }

  async generateMultimodalText(
    providerId: string,
    apiKey: string, 
    options: MultimodalGenerationOptions,
    modelId?: string
  ): Promise<GenerationResult> {
    if (modelId) {
      options = {
        ...options,
        modelId
      };
    }
    
    const result = await newAIService.generateMultimodal(providerId, options as NewMultimodalGenerationOptions, undefined, apiKey);
    return result as GenerationResult;
  }

  async generateWithWebLLMStreaming(
    options: GenerationOptions,
    onChunk: (text: string) => void,
    onComplete: (result: GenerationResult) => void
  ): Promise<void> {
    const callbacks: StreamCallbacks = {
      onChunk,
      onComplete: (result: NewGenerationResult) => onComplete(result as GenerationResult)
    };
    
    return newAIService.generateTextStream('webllm', options as NewGenerationOptions, callbacks);
  }

  async setWebLLMModel(modelName: string): Promise<void> {
    return newAIService.initializeWebLLMModel(modelName);
  }

  async getAvailableWebLLMModels(): Promise<WebLLMModelInfo[]> {
    const models = await newAIService.getWebLLMModels();
    return models as unknown as WebLLMModelInfo[];
  }

  async isWebGPUSupported(): Promise<boolean> {
    return newAIService.isWebLLMSupported();
  }

  getModelLoadingState(): { 
    isLoading: boolean; 
    progress: number; 
    error: string | null;
    currentModel: string | null;
  } {
    return newAIService.getWebLLMModelLoadingState();
  }

  isModelLoaded(): boolean {
    const state = newAIService.getWebLLMModelLoadingState();
    return !!state.currentModel;
  }
  
  getCurrentModel(): string {
    const state = newAIService.getWebLLMModelLoadingState();
    return state.currentModel || '';
  }
  
  abortGeneration(): void {
    // No direct equivalent in the new system yet
  }

  getAvailableGeminiModels(): GeminiModelInfo[] {
    // Return default models since this is synchronous
    return [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model for most common tasks',
        maxTokens: 16384,
        supportsImages: true
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'High-quality model with strong reasoning capabilities',
        maxTokens: 32768,
        supportsImages: true
      }
    ];
  }

  setDefaultGeminiModel(modelId: string): void {
    newAIService.setDefaultModel('gemini', modelId);
  }

  getDefaultGeminiModel(): string {
    // Use a reasonable default since we don't have a direct equivalent
    return 'gemini-1.5-pro';
  }

  async fetchAvailableGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
    const models = await newAIService.getGeminiModels(apiKey);
    return models as unknown as GeminiModelInfo[];
  }

  async getGeminiUsageInfo(apiKey: string): Promise<{ 
    available: boolean;
    tokensUsed: number;
    tokensRemaining: number | null;
    tokensLimit: number | null;
    resetTime: Date | null;
  }> {
    // Not directly implemented in new service yet
    // Just check if the API key works
    try {
      await newAIService.isProviderAvailable('gemini');
      return {
        available: true,
        tokensUsed: 0,
        tokensRemaining: null,
        tokensLimit: null,
        resetTime: null
      };
    } catch (error) {
      return {
        available: false,
        tokensUsed: 0,
        tokensRemaining: null,
        tokensLimit: null,
        resetTime: null
      };
    }
  }

  async generateWithGeminiMultimodalStreaming(
    apiKey: string,
    options: MultimodalGenerationOptions,
    onChunk: (text: string) => void,
    onComplete: (result: GenerationResult) => void,
    onError?: (error: Error) => void,
    modelId?: string
  ): Promise<void> {
    if (modelId) {
      options = {
        ...options,
        modelId
      };
    }
    
    const callbacks: StreamCallbacks = {
      onChunk,
      onComplete: (result: NewGenerationResult) => onComplete(result as GenerationResult),
      onError
    };
    
    await newAIService.generateMultimodal('gemini', options as NewMultimodalGenerationOptions, callbacks, apiKey);
  }
}

// Export the singleton instance for backward compatibility
export const aiService = new AIServiceLegacy();