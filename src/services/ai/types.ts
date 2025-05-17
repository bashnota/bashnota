// AI Service types and interfaces

// Base interface for all AI providers
export interface AIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  generateText(options: GenerationOptions): Promise<GenerationResult>;
  generateTextStream(
    options: GenerationOptions,
    callbacks: StreamCallbacks
  ): Promise<void>;
  supportsMultimodal(): boolean;
  generateMultimodal?(
    options: MultimodalGenerationOptions,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult>;
}

// Provider configuration
export interface ProviderConfig {
  id: string;
  name: string;
  apiEndpoint?: string;
  requiresApiKey: boolean;
  maxTokens: number;
  defaultPrompt: string;
}

// Options for text generation
export interface GenerationOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  modelId?: string;
  safetyThreshold?: string;
}

// Options for multimodal generation
export interface MultimodalGenerationOptions extends GenerationOptions {
  images?: string[]; // Base64 encoded images or URLs
  tuningOptions?: {
    topK?: number;
    candidateCount?: number;
    stopSequences?: string[];
    safetySettings?: GeminiSafetySettings[];
  };
}

// Result from text generation
export interface GenerationResult {
  text: string;
  provider: string;
  tokens: number;
}

// Callbacks for streaming responses
export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (result: GenerationResult) => void;
  onError?: (error: Error) => void;
}

// Safety settings for Gemini
export interface GeminiSafetySettings {
  category: string;
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_HIGH_AND_ABOVE' | 'BLOCK_ONLY_HIGH';
}

// Model information interfaces
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface WebLLMModelInfo extends ModelInfo {
  size: string;
  downloadSize: string;
}

export interface GeminiModelInfo extends ModelInfo {
  maxTokens: number;
  supportsImages: boolean;
}

// Provider factory
export interface AIProviderFactory {
  createProvider(providerId: string, config?: any): AIProvider;
} 