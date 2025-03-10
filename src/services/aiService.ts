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

export const supportedProviders: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    requiresApiKey: true,
    maxTokens: 4096,
    defaultPrompt: 'You are a helpful assistant.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    requiresApiKey: true,
    maxTokens: 100000,
    defaultPrompt: 'You are Claude, a helpful AI assistant.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
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
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const provider = supportedProviders.find(p => p.id === providerId)
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not supported`)
    }
    
    try {
      switch (providerId) {
        case 'openai':
          return await this.generateWithOpenAI(apiKey, options)
        case 'anthropic':
          return await this.generateWithAnthropic(apiKey, options)
        case 'gemini':
          return await this.generateWithGemini(apiKey, options)
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

  private async generateWithOpenAI(
    apiKey: string, 
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: options.prompt },
          { role: 'user', content: options.prompt }
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    return {
      text: response.data.choices[0].message.content,
      provider: 'openai',
      tokens: response.data.usage.total_tokens
    }
  }

  private async generateWithAnthropic(
    apiKey: string, 
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'user', content: options.prompt }
        ],
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Anthropic-Version': '2023-06-01',
          'X-API-Key': apiKey
        }
      }
    )

    return {
      text: response.data.content[0].text,
      provider: 'anthropic',
      tokens: 0 // Anthropic doesn't return token count in the same way
    }
  }

  private async generateWithGemini(
    apiKey: string, 
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await axios.post(
        endpoint,
        {
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
            topK: 40,
          },
          safetySettings: [
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
          ]
        }
      );

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
      }
    } catch (error) {
      // Add better error handling for debugging
      if (axios.isAxiosError(error) && error.response) {
        console.error('Gemini API error:', error.response.data);
        
        if (error.response.status === 404) {
          throw new Error('Gemini API model not found. The model name may have changed.');
        } else if (error.response.status === 400) {
          throw new Error(`Gemini API error: ${error.response.data?.error?.message || 'Bad request'}`);
        } else if (error.response.status === 403) {
          throw new Error('Gemini API error: Invalid API key or lacking permissions');
        }
      }
      throw error;
    }
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
        text: generatedText,
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
}

export const aiService = new AIService() 