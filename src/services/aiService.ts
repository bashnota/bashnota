import axios from 'axios'
import * as webllm from "@mlc-ai/web-llm";

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

export interface GenerationOptions {
  prompt: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
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

export interface GenerationResult {
  text: string
  provider: string
  tokens: number
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

export const supportedProviders: LLMProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    requiresApiKey: true,
    maxTokens: 8192,
    defaultPrompt: 'You are Gemini, a helpful AI assistant from Google.',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    apiEndpoint: 'http://localhost:11434/api/generate',
    requiresApiKey: false,
    maxTokens: 4096,
    defaultPrompt: 'You are a helpful AI assistant.',
  },
  {
    id: 'webllm',
    name: 'WebLLM (Browser)',
    apiEndpoint: '', // Not needed for WebLLM as it runs locally
    requiresApiKey: false,
    maxTokens: 4096, // This can vary based on the model
    defaultPrompt: 'You are a helpful AI assistant running locally in the browser.',
  },
]

export class AIService {
  private webllmEngine: webllm.MLCEngine | null = null;
  private webllmModel: string = '';
  private modelLoadingProgress: number = 0;
  private isModelLoading: boolean = false;
  private modelLoadingError: string | null = null;
  private defaultGeminiModel: string = 'gemini-1.5-pro';
  private geminiModels: GeminiModelInfo[] = [
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
    },
    {
      id: 'gemini-1.5-ultra',
      name: 'Gemini 1.5 Ultra',
      description: 'Top-tier model with cutting-edge capabilities',
      maxTokens: 1048576,
      supportsImages: true
    },
    {
      id: 'gemini-2.0-pro-exp-02-05',
      name: 'Gemini 2.0 Pro Exp',
      description: 'Experimental version of Gemini 2.0 Pro',
      maxTokens: 32768,
      supportsImages: true
    }
  ];

  async isWebGPUSupported(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    
    try {
      return 'gpu' in navigator;
    } catch (error) {
      console.error('Error checking WebGPU support:', error);
      return false;
    }
  }

  async initializeWebLLM(modelName: string): Promise<void> {
    if (this.isModelLoading) {
      throw new Error('A model is already being loaded');
    }
    
    try {
      this.isModelLoading = true;
      this.modelLoadingProgress = 0;
      this.modelLoadingError = null;
      
      // Progress callback function with correct type
      const initProgressCallback = (report: InitProgressReport) => {
        this.modelLoadingProgress = report.progress;
        console.log(`Loading model: ${Math.round(report.progress * 100)}% - ${report.text}`);
      };
      
      // If we already have an engine, reload it with the new model
      if (this.webllmEngine) {
        this.webllmModel = modelName;
        await this.webllmEngine.reload(modelName);
      } else {
        // Create a new engine with the selected model
        this.webllmEngine = await webllm.CreateMLCEngine(
          modelName,
          { 
            initProgressCallback,
            // Optional: Add custom configuration here
            // appConfig: { ... }
          }
        );
        this.webllmModel = modelName;
      }
    } catch (error) {
      this.modelLoadingError = error instanceof Error ? error.message : 'Unknown error loading model';
      console.error('Error initializing WebLLM:', error);
      throw error;
    } finally {
      this.isModelLoading = false;
    }
  }

  async generateText(
    providerId: string, 
    apiKey: string, 
    options: GenerationOptions,
    modelId?: string,
    safetyThreshold?: string
  ): Promise<GenerationResult> {
    const provider = supportedProviders.find(p => p.id === providerId)
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not supported`)
    }
    
    try {
      switch (providerId) {
        case 'gemini':
          // If this is a GeminiGenerationOptions, merge the safety threshold
          if (safetyThreshold) {
            const geminiOptions = options as GeminiGenerationOptions;
            
            // Create or update tuningOptions to include safety settings
            if (!geminiOptions.tuningOptions) {
              geminiOptions.tuningOptions = {};
            }
            
            // Apply safety settings
            geminiOptions.tuningOptions.safetySettings = [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: safetyThreshold as any
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: safetyThreshold as any
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: safetyThreshold as any
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: safetyThreshold as any
              }
            ];
            
            return await this.generateWithGemini(apiKey, geminiOptions, modelId)
          } else {
            return await this.generateWithGemini(apiKey, options, modelId)
          }
        case 'ollama':
          return await this.generateWithOllama(options)
        case 'webllm':
          return await this.generateWithWebLLM(options)
        default:
          throw new Error(`Provider ${providerId} not implemented`)
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      throw error
    }
  }

  private async generateWithGemini(
    apiKey: string, 
    options: GenerationOptions | GeminiGenerationOptions,
    modelId?: string
  ): Promise<GenerationResult> {
    // Use the provided model ID or fall back to the default
    const model = modelId || this.defaultGeminiModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Check if we have Gemini-specific tuning options
    const geminiOptions = options as GeminiGenerationOptions;
    const tuningOptions = geminiOptions.tuningOptions || {};
    
    // Retry configuration
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 1000; // 1 second
    
    let retryCount = 0;
    let lastError: any = null;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        // Build the request payload
        const payload: any = {
          contents: [
            {
              parts: [
                {
                  text: options.prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            topP: options.topP || 0.95,
            topK: tuningOptions.topK || 40,
          }
        };
        
        // Add optional generation parameters if specified
        if (tuningOptions.candidateCount) {
          payload.generationConfig.candidateCount = tuningOptions.candidateCount;
        }
        
        if (tuningOptions.stopSequences && tuningOptions.stopSequences.length > 0) {
          payload.generationConfig.stopSequences = tuningOptions.stopSequences;
        }
        
        // Add safety settings
        if (tuningOptions.safetySettings && tuningOptions.safetySettings.length > 0) {
          payload.safetySettings = tuningOptions.safetySettings;
        } else {
          // Default safety settings if none provided
          payload.safetySettings = [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ];
        }

        const response = await axios.post(endpoint, payload);

        // Extract the generated text from Gemini's response format
        let generatedText = '';
        if (response.data.candidates && 
            response.data.candidates[0] && 
            response.data.candidates[0].content &&
            response.data.candidates[0].content.parts) {
          
          // Concatenate all text parts from the response
          generatedText = response.data.candidates[0].content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }

        return {
          text: generatedText,
          provider: 'gemini',
          tokens: 0 // Gemini doesn't provide token count in the same way
        };
      } catch (error) {
        lastError = error;
        
        // Determine if we should retry
        let shouldRetry = false;
        
        if (axios.isAxiosError(error) && error.response) {
          console.error(`Gemini API error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.response.data);
          
          // Check for rate limit error (429)
          if (error.response.status === 429) {
            shouldRetry = true;
            console.warn(`Rate limit hit with Gemini API. Retrying in ${(INITIAL_RETRY_DELAY * Math.pow(2, retryCount)) / 1000} seconds...`);
          }
        }
        
        // If we shouldn't retry or we're out of retries, throw the error
        if (!shouldRetry || retryCount >= MAX_RETRIES) {
          // Handle specific error cases before giving up
          if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 404) {
              throw new Error(`Gemini model "${model}" not found. Please check if the model ID is correct.`);
            } else if (error.response.status === 400) {
              throw new Error(`Gemini API error: ${error.response.data?.error?.message || 'Bad request'}`);
            } else if (error.response.status === 403) {
              throw new Error('Gemini API error: Invalid API key or lacking permissions');
            } else if (error.response.status === 429) {
              throw new Error('Gemini API rate limit exceeded. Please try again later.');
            }
          }
          throw error;
        }
        
        // Wait with exponential backoff before retrying
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    // Should never reach here but just in case
    throw lastError || new Error('Failed to generate text with Gemini after retries');
  }

  private async generateWithOllama(
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'llama3',
        prompt: options.prompt,
        options: {
          temperature: options.temperature || 0.7,
        }
      }
    )

    return {
      text: response.data.response,
      provider: 'ollama',
      tokens: 0 // Ollama doesn't return token count in the same way
    }
  }

  private async generateWithWebLLM(
    options: GenerationOptions
  ): Promise<GenerationResult> {
    if (!this.webllmEngine) {
      throw new Error('WebLLM engine not initialized. Please select and load a model first.');
    }

    try {
      // Create a chat completion using the OpenAI-compatible API
      const response = await this.webllmEngine.chat.completions.create({
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
      console.error('WebLLM generation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'WebLLM generation failed');
    }
  }

  async generateWithWebLLMStreaming(
    options: GenerationOptions,
    onChunk: (text: string) => void,
    onComplete: (result: GenerationResult) => void
  ): Promise<void> {
    if (!this.webllmEngine) {
      throw new Error('WebLLM engine not initialized. Please select and load a model first.');
    }

    try {
      let fullText = '';
      
      // Create a streaming chat completion
      const stream = await this.webllmEngine.chat.completions.create({
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
          onChunk(content);
        }
        
        // If this is the last chunk with usage information
        if (chunk.usage) {
          onComplete({
            text: fullText,
            provider: 'webllm',
            tokens: chunk.usage.completion_tokens || 0
          });
        }
      }
    } catch (error) {
      console.error('WebLLM streaming generation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'WebLLM streaming generation failed');
    }
  }

  async setWebLLMModel(modelName: string): Promise<void> {
    if (this.isModelLoading) {
      throw new Error('A model is already being loaded');
    }
    
    if (this.webllmModel === modelName && this.webllmEngine) {
      // Model is already loaded
      return;
    }
    
    await this.initializeWebLLM(modelName);
  }

  async getAvailableWebLLMModels(): Promise<WebLLMModelInfo[]> {
    // Get the list of models from WebLLM
    const modelRecords = webllm.prebuiltAppConfig.model_list;
    
    // Transform the model records into a more user-friendly format
    return modelRecords.map(model => {
      // Extract model size from the ID (e.g., "Llama-3.1-8B-Instruct" -> "8B")
      const sizeMatch = model.model_id.match(/(\d+\.?\d*[BM])/);
      const size = sizeMatch ? sizeMatch[0] : 'Unknown';
      
      // Format the model name for display
      const name = model.model_id
        .replace(/-/g, ' ')
        .replace(/q4f32_\d+/, '')
        .replace(/MLC$/, '')
        .trim();
      
      return {
        id: model.model_id,
        name: name,
        size: size,
        description: `${name} (${size})`,
        // Estimate download size based on model size
        downloadSize: this.estimateDownloadSize(size)
      };
    });
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
  
  // Add methods to get the current model loading state
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
      currentModel: this.webllmModel || null
    };
  }
  
  // Add a method to check if a model is loaded
  isModelLoaded(): boolean {
    return !!this.webllmEngine && !!this.webllmModel;
  }
  
  // Add a method to get the current model
  getCurrentModel(): string {
    return this.webllmModel;
  }
  
  // Add a method to abort generation
  abortGeneration(): void {
    if (this.webllmEngine) {
      try {
        // Since there's no direct cancel method, we can try to create a new completion
        // which should effectively cancel the previous one
        console.log('Attempting to abort WebLLM generation');
        // We could potentially reload the model to force a reset
        // or just let the current generation complete
      } catch (error) {
        console.error('Error aborting generation:', error);
      }
    }
  }

  // Add a method to get the available Gemini models
  getAvailableGeminiModels(): GeminiModelInfo[] {
    return this.geminiModels;
  }
  
  // Set default Gemini model
  setDefaultGeminiModel(modelId: string): void {
    // Check if the model exists in our list
    const modelExists = this.geminiModels.some(model => model.id === modelId);
    
    if (!modelExists) {
      throw new Error(`Gemini model "${modelId}" not found in the list of available models`);
    }
    
    this.defaultGeminiModel = modelId;
  }

  // Get the current default Gemini model
  getDefaultGeminiModel(): string {
    return this.defaultGeminiModel;
  }

  // Fetch the available Gemini models directly from the API
  async fetchAvailableGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      // Filter models to include only Gemini models
      const geminiModels = response.data.models
        .filter((model: any) => model.name.includes('gemini'))
        .map((model: any) => {
          const modelId = model.name.split('/').pop();
          const supportsImages = model.supportedGenerationMethods?.includes('generateContent') || false;
          
          // Extract size info if available in the name (e.g., gemini-1.5-pro)
          let modelName = modelId;
          
          // Make the name more readable
          modelName = modelName
            .replace('gemini-', 'Gemini ')
            .replace('-', ' ')
            .replace('-', ' ');
          
          // Capitalize first letter of each word
          const words = modelName.split(' ');
          modelName = words
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Dynamic token limit estimation based on model name
          let maxTokens = 8192; // Default
          if (modelId.includes('flash')) {
            maxTokens = 16384;
          } else if (modelId.includes('pro')) {
            maxTokens = 32768;
          } else if (modelId.includes('ultra')) {
            maxTokens = 1048576; // 1M tokens
          }
          
          // Create a model info object
          return {
            id: modelId,
            name: modelName,
            description: model.description || `${modelName} model`,
            maxTokens: maxTokens,
            supportsImages: supportsImages
          };
        });
      
      // Update our local models list
      if (geminiModels.length > 0) {
        this.geminiModels = geminiModels;
      }
      
      return geminiModels;
    } catch (error) {
      console.error('Error fetching Gemini models:', error);
      // On error, return the static list we have
      return this.geminiModels;
    }
  }

  // Get usage and quota information for Gemini API
  async getGeminiUsageInfo(apiKey: string): Promise<{ 
    available: boolean;
    tokensUsed: number;
    tokensRemaining: number | null;
    tokensLimit: number | null;
    resetTime: Date | null;
  }> {
    try {
      // Note: This is a simplified approach since Google AI API doesn't have a direct
      // endpoint for checking quotas. We're making a very small request to check if
      // the API key works and to get any quota information from response headers.
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      
      const response = await axios.get(endpoint);
      
      // Check if the request was successful
      const available = response.status === 200;
      
      // Attempt to get quota information from headers (if available)
      // Note: Google's API may not expose these headers, so this is speculative
      const quotaLimit = parseInt(response.headers['x-ratelimit-limit'] || '0');
      const quotaRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');
      const quotaReset = response.headers['x-ratelimit-reset'] ? 
        new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000) : null;
      
      // Return the available information
      return {
        available: available,
        tokensUsed: quotaLimit - quotaRemaining,
        tokensRemaining: quotaRemaining || null,
        tokensLimit: quotaLimit || null,
        resetTime: quotaReset
      };
    } catch (error) {
      // If there's an error (such as an invalid API key), return appropriate values
      return {
        available: false,
        tokensUsed: 0,
        tokensRemaining: null,
        tokensLimit: null,
        resetTime: null
      };
    }
  }

  async generateMultimodalText(
    providerId: string,
    apiKey: string,
    options: MultimodalGenerationOptions,
    modelId?: string
  ): Promise<GenerationResult> {
    const provider = supportedProviders.find(p => p.id === providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not supported`);
    }
    
    // Currently only Gemini supports multimodal inputs
    if (providerId !== 'gemini') {
      throw new Error(`Multimodal generation is not supported by ${providerId}`);
    }
    
    try {
      return await this.generateWithGeminiMultimodal(apiKey, options, modelId);
    } catch (error) {
      console.error('Multimodal AI generation failed:', error);
      throw error;
    }
  }

  private async generateWithGeminiMultimodal(
    apiKey: string,
    options: MultimodalGenerationOptions,
    modelId?: string
  ): Promise<GenerationResult> {
    // Use the provided model ID or fall back to the default
    const model = modelId || this.defaultGeminiModel;
    
    // Check if the model supports images
    const modelInfo = this.geminiModels.find(m => m.id === model);
    if (!modelInfo) {
      throw new Error(`Gemini model "${model}" not found`);
    }
    
    if (!modelInfo.supportsImages && options.images && options.images.length > 0) {
      throw new Error(`Gemini model "${model}" does not support image inputs`);
    }
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Get tuning options if provided
    const tuningOptions = options.tuningOptions || {};
    
    try {
      // Prepare the content parts array with text prompt
      const parts: any[] = [{ text: options.prompt }];
      
      // Add image parts if provided
      if (options.images && options.images.length > 0) {
        for (const image of options.images) {
          // Check if the image is a URL or base64
          if (image.startsWith('http')) {
            parts.push({
              inlineData: {
                mimeType: "image/jpeg", // Assumes JPEG, could be made dynamic
                data: await this.fetchAndConvertImageToBase64(image)
              }
            });
          } else if (image.startsWith('data:')) {
            // Extract base64 content from data URI
            const base64Data = image.split(',')[1];
            parts.push({
              inlineData: {
                mimeType: image.split(';')[0].split(':')[1],
                data: base64Data
              }
            });
          } else {
            // Assuming the input is already base64 encoded
            parts.push({
              inlineData: {
                mimeType: "image/jpeg", // Default assumption
                data: image
              }
            });
          }
        }
      }
      
      // Build the request payload
      const payload: any = {
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.95,
          topK: tuningOptions.topK || 40,
        }
      };
      
      // Add optional generation parameters if specified
      if (tuningOptions.candidateCount) {
        payload.generationConfig.candidateCount = tuningOptions.candidateCount;
      }
      
      if (tuningOptions.stopSequences && tuningOptions.stopSequences.length > 0) {
        payload.generationConfig.stopSequences = tuningOptions.stopSequences;
      }
      
      // Add safety settings
      if (tuningOptions.safetySettings && tuningOptions.safetySettings.length > 0) {
        payload.safetySettings = tuningOptions.safetySettings;
      } else {
        // Default safety settings if none provided
        payload.safetySettings = [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ];
      }

      const response = await axios.post(endpoint, payload);
      
      // Extract the generated text from Gemini's response format
      let generatedText = '';
      if (response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts) {
        
        // Concatenate all text parts from the response
        generatedText = response.data.candidates[0].content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('');
      }
      
      return {
        text: generatedText,
        provider: 'gemini',
        tokens: 0 // Gemini doesn't provide token count in the same way
      };
    } catch (error) {
      // Add better error handling for debugging
      if (axios.isAxiosError(error) && error.response) {
        console.error('Gemini Multimodal API error:', error.response.data);
        
        if (error.response.status === 404) {
          throw new Error(`Gemini model "${model}" not found. Please check if the model ID is correct.`);
        } else if (error.response.status === 400) {
          throw new Error(`Gemini API error: ${error.response.data?.error?.message || 'Bad request'}`);
        } else if (error.response.status === 403) {
          throw new Error('Gemini API error: Invalid API key or lacking permissions');
        }
      }
      throw error;
    }
  }
  
  private async fetchAndConvertImageToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];
      
      // Browser-compatible way to convert ArrayBuffer to base64
      const arrayBuffer = response.data;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      return base64;
    } catch (error) {
      console.error('Error fetching and converting image:', error);
      throw new Error('Failed to fetch and convert image to base64');
    }
  }

  async generateWithGeminiMultimodalStreaming(
    apiKey: string,
    options: MultimodalGenerationOptions,
    onChunk: (text: string) => void,
    onComplete: (result: GenerationResult) => void,
    modelId?: string
  ): Promise<void> {
    // Use the provided model ID or fall back to the default
    const model = modelId || this.defaultGeminiModel;
    
    // Check if the model supports images
    const modelInfo = this.geminiModels.find(m => m.id === model);
    if (!modelInfo) {
      throw new Error(`Gemini model "${model}" not found`);
    }
    
    if (!modelInfo.supportsImages && options.images && options.images.length > 0) {
      throw new Error(`Gemini model "${model}" does not support image inputs`);
    }
    
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
    
    // Get tuning options if provided
    const tuningOptions = options.tuningOptions || {};
    
    // Retry configuration
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 1000; // 1 second
    
    let retryCount = 0;
    let lastError: any = null;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        let fullText = '';
        
        // Build the request payload
        const payload: any = {
          contents: [
            {
              parts: [
                {
                  text: options.prompt
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1024,
            temperature: options.temperature || 0.7,
            topP: options.topP || 0.95,
            topK: tuningOptions.topK || 40,
          }
        };
        
        // Add images if provided
        if (options.images && options.images.length > 0) {
          // Add images to the parts array
          for (const imageUrl of options.images) {
            try {
              const base64Image = await this.fetchAndConvertImageToBase64(imageUrl);
              
              // Add the image to the parts array of the first content item
              payload.contents[0].parts.push({
                inlineData: {
                  mimeType: "image/jpeg", // Assuming JPEG, adjust if needed
                  data: base64Image
                }
              });
            } catch (error) {
              console.error(`Failed to process image ${imageUrl}:`, error);
              // Continue with other images
            }
          }
        }
        
        // Add optional generation parameters if specified
        if (tuningOptions.candidateCount) {
          payload.generationConfig.candidateCount = tuningOptions.candidateCount;
        }
        
        if (tuningOptions.stopSequences && tuningOptions.stopSequences.length > 0) {
          payload.generationConfig.stopSequences = tuningOptions.stopSequences;
        }
        
        // Add safety settings
        if (tuningOptions.safetySettings && tuningOptions.safetySettings.length > 0) {
          payload.safetySettings = tuningOptions.safetySettings;
        } else {
          // Default safety settings if none provided
          payload.safetySettings = [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ];
        }
        
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          
          // Check for rate limit errors
          if (response.status === 429) {
            console.warn(`Rate limit hit with Gemini API multimodal streaming (attempt ${retryCount + 1}/${MAX_RETRIES + 1}). Retrying in ${(INITIAL_RETRY_DELAY * Math.pow(2, retryCount)) / 1000} seconds...`);
            throw new Error('Rate limit exceeded');
          }
          
          // Check for other error responses
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API error (status ${response.status}):`, errorText);
            
            if (response.status === 404) {
              throw new Error(`Gemini model "${model}" not found. Please check if the model ID is correct.`);
            } else if (response.status === 400) {
              throw new Error(`Gemini API error: ${errorText || 'Bad request'}`);
            } else if (response.status === 403) {
              throw new Error('Gemini API error: Invalid API key or lacking permissions');
            } else {
              throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processText = (text: string) => {
            // Process each line as it might contain multiple JSON objects
            const lines = (buffer + text).split('\n');
            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                // Make sure the line is valid JSON before parsing
                const trimmedLine = line.trim();
                if (!(trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) && 
                    !(trimmedLine.startsWith('[') && trimmedLine.endsWith(']'))) {
                  console.warn('Skipping non-JSON line:', trimmedLine);
                  continue;
                }
                
                const data = JSON.parse(trimmedLine);
                
                // Extract text content from the response
                if (data.candidates && 
                    data.candidates[0] && 
                    data.candidates[0].content && 
                    data.candidates[0].content.parts) {
                  
                  const parts = data.candidates[0].content.parts;
                  for (const part of parts) {
                    if (part.text) {
                      fullText += part.text;
                      onChunk(part.text);
                    }
                  }
                }
              } catch (parseError) {
                console.warn('Error parsing JSON chunk:', parseError);
              }
            }
          };

          // Read the stream
          const read = async () => {
            try {
              const { done, value } = await reader.read();
              
              if (done) {
                // Process any remaining buffer
                if (buffer.trim() !== '') {
                  processText(buffer);
                }
                
                onComplete({
                  text: fullText,
                  provider: 'gemini',
                  tokens: 0
                });
                return;
              }

              // Process this chunk
              processText(decoder.decode(value, { stream: true }));
              
              // Continue reading
              await read();
            } catch (error) {
              console.error('Error reading stream:', error);
              throw error;
            }
          };

          await read();
          
          // Success, return and don't retry
          return;
        } catch (error: any) {
          // Propagate certain errors for retry logic
          if (error.message === 'Rate limit exceeded' || 
              (error instanceof TypeError && error.message.includes('fetch'))) {
            throw error; // This will be caught by the outer try/catch
          }
          
          console.error('Gemini multimodal streaming fetch error:', error);
          throw error;
        }
      } catch (error: any) {
        lastError = error;
        
        // Determine if we should retry
        let shouldRetry = false;
        
        // Check for rate limit error
        if (error.message === 'Rate limit exceeded' || 
            error.message?.includes('429') || 
            (error.response && error.response.status === 429)) {
          shouldRetry = true;
        }
        
        // Also retry on network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          shouldRetry = true;
          console.warn(`Network error with Gemini API multimodal streaming. Retrying in ${(INITIAL_RETRY_DELAY * Math.pow(2, retryCount)) / 1000} seconds...`);
        }
        
        // If we shouldn't retry or we're out of retries, throw the error
        if (!shouldRetry || retryCount >= MAX_RETRIES) {
          if (error.message === 'Rate limit exceeded' || 
              error.message?.includes('429') || 
              (error.response && error.response.status === 429)) {
            onComplete({
              text: "⚠️ Rate limit exceeded. Please try again later.",
              provider: 'gemini',
              tokens: 0
            });
            return;
          }
          
          console.error('Gemini multimodal streaming setup failed:', error);
          onComplete({
            text: `Error: ${error.message || 'An unknown error occurred'}`,
            provider: 'gemini',
            tokens: 0
          });
          return;
        }
        
        // Wait with exponential backoff before retrying
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    // Should never reach here but just in case
    onComplete({
      text: lastError ? `Error after ${MAX_RETRIES} retries: ${lastError.message}` : 'Failed to generate text with Gemini after retries',
      provider: 'gemini',
      tokens: 0
    });
  }
}

export const aiService = new AIService() 