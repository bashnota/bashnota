import * as webllm from '@mlc-ai/web-llm';
import { logger } from '@/services/logger';
import type {
  AIProvider,
  GenerationOptions,
  GenerationResult,
  StreamCallbacks,
  WebLLMModelInfo,
} from '../types';

export class WebLLMProvider implements AIProvider {
  id: string = 'webllm';
  name: string = 'WebLLM (Browser)';
  
  private engine: webllm.MLCEngine | null = null;
  private currentModel: string | null = null;
  private modelLoadingProgress: number = 0;
  private isModelLoading: boolean = false;
  private modelLoadingError: string | null = null;
  
  constructor() {
    // No constructor parameters needed
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // First check if WebGPU is supported
      if (!('gpu' in navigator)) {
        logger.info('WebLLM is not available: WebGPU not supported in browser');
        return Promise.resolve(false);
      }
      
      // Check if a model is loaded or loading
      const state = this.getModelLoadingState();
      
      // If a model is loaded or loading, then WebLLM is available
      if (state.currentModel || state.isLoading) {
        logger.info(`WebLLM is available - Model: ${state.currentModel || 'loading...'}`);
        return Promise.resolve(true);
      }
      
      // Even if no model is loaded yet, WebLLM is still considered available
      // as long as the browser supports WebGPU
      logger.info('WebLLM is available but no model loaded yet');
      return Promise.resolve(true);
    } catch (error) {
      logger.error('Error checking WebLLM availability:', error);
      return Promise.resolve(false);
    }
  }
  
  async generateText(options: GenerationOptions): Promise<GenerationResult> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized. Please select and load a model first.');
    }

    try {
      // Create a chat completion using the OpenAI-compatible API
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: options.prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1024,
        top_p: options.topP || 0.95,
        stream: false
      });

      // Extract the response text
      const generatedText = response.choices[0].message.content;
      
      return {
        text: generatedText || '',
        provider: 'webllm',
        tokens: response.usage?.completion_tokens || 0
      };
    } catch (error) {
      logger.error('WebLLM generation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'WebLLM generation failed');
    }
  }
  
  async generateTextStream(
    options: GenerationOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (!this.engine) {
      throw new Error('WebLLM engine not initialized. Please select and load a model first.');
    }

    try {
      let fullText = '';
      
      // Create a streaming chat completion
      const stream = await this.engine.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: options.prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1024,
        top_p: options.topP || 0.95,
        stream: true,
        stream_options: { include_usage: true }
      });

      // Process each chunk as it arrives
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          callbacks.onChunk(content);
        }
        
        // If this is the last chunk with usage information
        if (chunk.usage) {
          callbacks.onComplete({
            text: fullText,
            provider: 'webllm',
            tokens: chunk.usage.completion_tokens || 0
          });
          return;
        }
      }
      
      // If we didn't get usage information, still complete the stream
      callbacks.onComplete({
        text: fullText,
        provider: 'webllm',
        tokens: 0
      });
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      logger.error('WebLLM streaming generation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'WebLLM streaming generation failed');
    }
  }
  
  supportsMultimodal(): boolean {
    return false;
  }
  
  async initializeModel(modelId: string, timeoutMs: number = 180000): Promise<void> {
    if (this.isModelLoaded() && this.currentModel === modelId) {
      logger.info(`WebLLM model ${modelId} is already loaded`);
      return;
    }

    // Reset state
    this.isModelLoading = true;
    this.modelLoadingProgress = 0;
    this.modelLoadingError = null;
    this.currentModel = null;

    try {
      logger.info(`Initializing WebLLM model: ${modelId}`);
      
      // Set up timeout for model loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Model loading timed out after ${timeoutMs/1000} seconds. This may be due to slow network, insufficient memory, or GPU issues.`));
        }, timeoutMs);
        
        // Store timeoutId for cleanup
        return () => clearTimeout(timeoutId);
      });
      
      // Create model loading promise
      const modelLoadingPromise = webllm.CreateMLCEngine(
        modelId,
        { 
          initProgressCallback: (report: webllm.InitProgressReport) => {
            this.modelLoadingProgress = report.progress;
            logger.info(`WebLLM loading progress: ${Math.round(report.progress * 100)}% - ${report.text}`);
          },
        }
      );
      
      // Race the model loading against the timeout
      this.engine = await Promise.race([modelLoadingPromise, timeoutPromise]);

      // Update state on success
      this.isModelLoading = false;
      this.currentModel = modelId;
      this.modelLoadingError = null;
      
      logger.info(`WebLLM model ${modelId} loaded successfully`);
    } catch (error) {
      // Handle initialization error
      this.isModelLoading = false;
      
      // Determine error type and provide more informative messages
      let errorMessage: string;
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = error.message;
        } else if (error.message.includes('memory')) {
          errorMessage = `Insufficient memory to load model ${modelId}. Try a smaller model or close other applications.`;
        } else if (error.message.includes('wasm') || error.message.includes('WASM')) {
          errorMessage = `WebAssembly error loading model ${modelId}. Your browser may have compatibility issues.`;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = `Network error loading model ${modelId}. Check your internet connection and try again.`;
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = 'Unknown error loading model';
      }
      
      this.modelLoadingError = errorMessage;
      this.currentModel = null;
      
      logger.error(`Error initializing WebLLM model ${modelId}:`, error);
      throw new Error(errorMessage);
    }
  }
  
  async getAvailableModels(): Promise<WebLLMModelInfo[]> {
    try {
      // Get the list of models from WebLLM
      const modelRecords = webllm.prebuiltAppConfig.model_list;
      
      // Transform the model records into a more user-friendly format
      return modelRecords.map(model => {
        // Extract model size from the ID (e.g., "Llama-3.1-8B-Instruct" -> "8B")
        const sizeMatch = model.model_id.match(/(?:(\d+\.?\d*)[BM])|(?:gemma-\d+-(\d+)b)/);
        const size = sizeMatch ? 
          (sizeMatch[1] ? `${sizeMatch[1]}B` : `${sizeMatch[2]}B`) : 
          'Unknown';
        
        // Extract quantization info (e.g., "q4f32_1" -> "4-bit")
        const quantMatch = model.model_id.match(/q(\d+)f(\d+)/);
        const quantization = quantMatch ? `${quantMatch[1]}-bit` : 'Unknown';
        
        // Format the model name for display
        const name = model.model_id
          .replace(/-/g, ' ')
          .replace(/q\d+f\d+_\d+/, '')
          .replace(/MLC$/, '')
          .replace(/gemma-(\d+)-(\d+)b/, 'Gemma $1 $2B')
          .trim();
        
        // Determine if it's an instruction model
        const isInstruct = model.model_id.includes('-Instruct') || model.model_id.includes('-it');
        
        return {
          id: model.model_id,
          name: name,
          size: size,
          description: `${name} (${size}, ${quantization})${isInstruct ? ' - Instruction-tuned' : ''}`,
          // Estimate download size based on model size
          downloadSize: this.estimateDownloadSize(size)
        };
      });
    } catch (error) {
      logger.error('Error getting available WebLLM models:', error);
      // Return a default list of models if we can't get them from WebLLM
      return [
        {
          id: 'Llama-2-7b-chat-hf-q4f32_1',
          name: 'Llama 2 7B Chat',
          size: '7B',
          description: 'Llama 2 7B Chat (7B, 4-bit) - Instruction-tuned',
          downloadSize: '~4GB'
        },
        {
          id: 'Llama-2-13b-chat-hf-q4f32_1',
          name: 'Llama 2 13B Chat',
          size: '13B',
          description: 'Llama 2 13B Chat (13B, 4-bit) - Instruction-tuned',
          downloadSize: '~7GB'
        }
      ];
    }
  }
  
  // Helper method to estimate download size
  private estimateDownloadSize(modelSize: string): string {
    if (modelSize.includes('0.5B')) return '~250MB';
    if (modelSize.includes('1B') || modelSize.includes('1.5B')) return '~500MB';
    if (modelSize.includes('2B')) return '~1GB';
    if (modelSize.includes('3B')) return '~1.5GB';
    if (modelSize.includes('7B') || modelSize.includes('8B')) return '~4GB';
    if (modelSize.includes('13B')) return '~7GB';
    return 'Unknown';
  }
  
  /**
   * Check if a model is currently loaded
   */
  isModelLoaded(): boolean {
    return this.engine !== null && this.currentModel !== null;
  }
  
  /**
   * Get the current model loading state
   */
  getModelLoadingState(): { 
    isLoading: boolean; 
    progress: number; 
    error: string | null;
    currentModel: string | null;
  } {
    return {
      isLoading: this.isModelLoading,
      progress: this.modelLoadingProgress,
      error: this.modelLoadingError,
      currentModel: this.currentModel
    };
  }
  
  // Get the current model
  getCurrentModel(): string {
    return this.currentModel || '';
  }
  
  // Abort generation (if possible)
  abortGeneration(): void {
    if (this.engine) {
      try {
        logger.log('Attempting to abort WebLLM generation');
        // Currently WebLLM doesn't have a clean way to abort generation
        // We could potentially reload the model to force a reset
      } catch (error) {
        logger.error('Error aborting generation:', error);
      }
    }
  }
} 