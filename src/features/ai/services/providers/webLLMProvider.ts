import * as webllm from '@mlc-ai/web-llm';
import { logger } from '@/services/logger';
import { webLLMDefaultModelService } from '../webLLMDefaultModelService';
import type {
  AIProvider,
  GenerationOptions,
  GenerationResult,
  StreamCallbacks,
  WebLLMModelInfo,
  WebLLMProgressCallback,
} from '@/features/ai/services/types';

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
    logger.info(`WebLLM generateText called. Engine: ${!!this.engine}, Model: ${this.currentModel}, Loading: ${this.isModelLoading}`);
    
    // Check if auto-loading is needed
    if (!this.engine && webLLMDefaultModelService.shouldAutoLoad(this.currentModel)) {
      let autoLoadModelId = webLLMDefaultModelService.getAutoLoadModelId();
      
      // 🔥 ENHANCED: Smart model selection based on user preferences and auto-load strategy
      if (!autoLoadModelId) {
        logger.info('No WebLLM model configured, attempting intelligent model selection...');
        try {
          const availableModels = await this.getAvailableModels();
          const config = webLLMDefaultModelService.getDefaultModelConfig();
          
          // Use configured strategy or default to smallest for auto-loading
          const strategy = config.autoLoadStrategy || 'smallest';
          const recommendedModel = webLLMDefaultModelService.getRecommendationForStrategy(availableModels, strategy);
          
          if (recommendedModel) {
            autoLoadModelId = recommendedModel.id;
            logger.info(`Auto-selected WebLLM model using ${strategy} strategy: ${autoLoadModelId}`);
            
            // Save this as the default for future use, preserving user preferences
            webLLMDefaultModelService.saveDefaultModelConfig({
              modelId: autoLoadModelId,
              enabled: true,
              autoLoadOnRequest: true,
              autoLoadStrategy: strategy
            });
          } else {
            // Fallback to any small model if strategy fails
            const fallbackModel = webLLMDefaultModelService.selectBestDefaultModel(availableModels, {
              preferredSize: 'small',
              maxDownloadSize: 2,
              preferInstructTuned: true,
              excludeExperimental: true
            });
            
            if (fallbackModel) {
              autoLoadModelId = fallbackModel.id;
              logger.info(`Fallback WebLLM model selected: ${autoLoadModelId}`);
              
              webLLMDefaultModelService.saveDefaultModelConfig({
                modelId: autoLoadModelId,
                enabled: true,
                autoLoadOnRequest: true,
                autoLoadStrategy: 'smallest'
              });
            } else {
              throw new Error('No suitable WebLLM models found for auto-loading');
            }
          }
        } catch (error) {
          logger.error('Failed to auto-select WebLLM model:', error);
          throw new Error('WebLLM auto-loading failed: No suitable models found. Please manually select a model in Settings > AI Assistant > AI Providers or check your browser compatibility.');
        }
      }
      
      if (autoLoadModelId) {
        logger.info(`Auto-loading WebLLM model: ${autoLoadModelId}`);
        try {
          await this.initializeModel(autoLoadModelId);
        } catch (error) {
          logger.error('Auto-loading failed:', error);
          throw new Error(`Failed to auto-load WebLLM model ${autoLoadModelId}. Please manually select and load a model in Settings > AI Assistant > AI Providers.`);
        }
      }
    }
    
    if (!this.engine) {
      logger.error('WebLLM engine not initialized', {
        currentModel: this.currentModel,
        isModelLoading: this.isModelLoading,
        modelLoadingError: this.modelLoadingError
      });
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
    logger.info(`WebLLM generateTextStream called. Engine: ${!!this.engine}, Model: ${this.currentModel}, Loading: ${this.isModelLoading}`);
    
    // Check if auto-loading is needed
    if (!this.engine && webLLMDefaultModelService.shouldAutoLoad(this.currentModel)) {
      let autoLoadModelId = webLLMDefaultModelService.getAutoLoadModelId();
      
              // 🔥 ENHANCED: Smart model selection for streaming (reuse main logic)
        if (!autoLoadModelId) {
          logger.info('No WebLLM model configured for streaming, attempting intelligent model selection...');
          try {
            const availableModels = await this.getAvailableModels();
            const config = webLLMDefaultModelService.getDefaultModelConfig();
            
            const strategy = config.autoLoadStrategy || 'smallest';
            const recommendedModel = webLLMDefaultModelService.getRecommendationForStrategy(availableModels, strategy);
            
            if (recommendedModel) {
              autoLoadModelId = recommendedModel.id;
              logger.info(`Auto-selected WebLLM model for streaming using ${strategy} strategy: ${autoLoadModelId}`);
              
              webLLMDefaultModelService.saveDefaultModelConfig({
                modelId: autoLoadModelId,
                enabled: true,
                autoLoadOnRequest: true,
                autoLoadStrategy: strategy
              });
            } else {
              const fallbackModel = webLLMDefaultModelService.selectBestDefaultModel(availableModels, {
                preferredSize: 'small',
                maxDownloadSize: 2,
                preferInstructTuned: true,
                excludeExperimental: true
              });
              
              if (fallbackModel) {
                autoLoadModelId = fallbackModel.id;
                logger.info(`Fallback WebLLM model selected for streaming: ${autoLoadModelId}`);
                
                webLLMDefaultModelService.saveDefaultModelConfig({
                  modelId: autoLoadModelId,
                  enabled: true,
                  autoLoadOnRequest: true,
                  autoLoadStrategy: 'smallest'
                });
              } else {
                throw new Error('No suitable WebLLM models found for auto-loading');
              }
            }
          } catch (error) {
            logger.error('Failed to auto-select WebLLM model for streaming:', error);
            throw new Error('WebLLM auto-loading failed: No suitable models found. Please manually select a model in Settings > AI Assistant > AI Providers or check your browser compatibility.');
          }
        }
      
      if (autoLoadModelId) {
        logger.info(`Auto-loading WebLLM model for streaming: ${autoLoadModelId}`);
        try {
          await this.initializeModel(autoLoadModelId);
        } catch (error) {
          logger.error('Auto-loading failed for streaming:', error);
          throw new Error(`Failed to auto-load WebLLM model ${autoLoadModelId}. Please manually select and load a model in Settings > AI Assistant > AI Providers.`);
        }
      }
    }
    
    if (!this.engine) {
      logger.error('WebLLM engine not initialized when generating text stream', {
        currentModel: this.currentModel,
        isModelLoading: this.isModelLoading,
        modelLoadingError: this.modelLoadingError
      });
      throw new Error('WebLLM engine not initialized. Please select and load a model first.');
    }

    try {
      let fullText = '';
      
      logger.info('Starting WebLLM streaming generation with prompt length:', options.prompt.length);
      
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

      logger.info('WebLLM stream created, waiting for chunks');
      
      // Process each chunk as it arrives
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          logger.debug('Received WebLLM chunk, calling onChunk callback', { contentLength: content.length });
          if (callbacks.onChunk) {
            callbacks.onChunk(content);
          }
        }
        
        // If this is the last chunk with usage information
        if (chunk.usage) {
          logger.info('WebLLM streaming complete, calling onComplete callback');
          if (callbacks.onComplete) {
            callbacks.onComplete({
              text: fullText,
              provider: 'webllm',
              tokens: chunk.usage.completion_tokens || 0
            });
          }
          return;
        }
      }
      
      // If we didn't get usage information, still complete the stream
      logger.info('WebLLM streaming complete (no usage info), calling onComplete callback');
      if (callbacks.onComplete) {
        callbacks.onComplete({
          text: fullText,
          provider: 'webllm',
          tokens: 0
        });
      }
    } catch (error) {
      logger.error('WebLLM streaming generation failed:', error);
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw new Error(error instanceof Error ? error.message : 'WebLLM streaming generation failed');
    }
  }
  
  supportsMultimodal(): boolean {
    return false;
  }
  
  async initializeModel(modelId: string, progressCallback?: WebLLMProgressCallback): Promise<void> {
    logger.info(`WebLLM initializeModel called with modelId: ${modelId}. Current state: engine=${!!this.engine}, model=${this.currentModel}, loading=${this.isModelLoading}`);
    
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
      
      // Create a new chat instance
      this.engine = await webllm.CreateMLCEngine(
        modelId,
        { 
          initProgressCallback: (report: webllm.InitProgressReport) => {
            this.modelLoadingProgress = report.progress;
            logger.info(`WebLLM loading progress: ${Math.round(report.progress * 100)}% - ${report.text}`);
            // Pass the progress report to the callback if it exists
            if (progressCallback) {
              progressCallback(report);
            }
          },
        }
      );

      // Update state on success
      this.isModelLoading = false;
      this.currentModel = modelId;
      this.modelLoadingError = null;
      
      logger.info(`WebLLM model ${modelId} loaded successfully. Final state: engine=${!!this.engine}, model=${this.currentModel}`);
    } catch (error) {
      // Handle initialization error
      this.isModelLoading = false;
      this.modelLoadingError = error instanceof Error ? error.message : 'Unknown error loading model';
      this.currentModel = null;
      
      logger.error(`Error initializing WebLLM model ${modelId}:`, error);
      throw error;
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
        } as WebLLMModelInfo;
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
        } as WebLLMModelInfo,
        {
          id: 'Llama-2-13b-chat-hf-q4f32_1',
          name: 'Llama 2 13B Chat',
          size: '13B',
          description: 'Llama 2 13B Chat (13B, 4-bit) - Instruction-tuned',
          downloadSize: '~7GB'
        } as WebLLMModelInfo
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
  
  // Get the current model loading state
  getModelLoadingState(): { 
    isLoading: boolean; 
    progress: number; 
    error: string | null;
    currentModel: string | null;
  } {
    const state = {
      isLoading: this.isModelLoading,
      progress: this.modelLoadingProgress,
      error: this.modelLoadingError,
      currentModel: this.currentModel || null
    };
    
    logger.debug('WebLLM getModelLoadingState:', state);
    return state;
  }
  
  // Check if a model is loaded
  isModelLoaded(): boolean {
    return !!this.engine && !!this.currentModel;
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








