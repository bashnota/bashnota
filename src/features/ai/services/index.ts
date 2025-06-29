// Export the main AI service singleton
export { aiService } from './aiService';

// Export types
export type {
  AIProvider,
  GenerationOptions,
  GenerationResult,
  MultimodalGenerationOptions,
  StreamCallbacks,
  ProviderConfig,
  ModelInfo,
  WebLLMModelInfo,
  GeminiModelInfo,
  GeminiSafetySettings
} from './types';

// Export provider implementations (if needed directly)
export { GeminiProvider } from './providers/geminiProvider';
export { WebLLMProvider } from './providers/webLLMProvider';
export { OllamaProvider } from './providers/ollamaProvider';

// Export utility functions
export { imageToBase64, handleApiError } from './utils'; 








