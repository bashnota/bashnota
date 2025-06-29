import { logger } from '@/services/logger';
import type {
  AIProvider,
  GenerationOptions,
  GenerationResult,
  StreamCallbacks
} from '@/features/ai/services/types';
import { handleApiError, requestWithRetry } from '@/features/ai/services/utils';

export class OllamaProvider implements AIProvider {
  id: string = 'ollama';
  name: string = 'Ollama (Local)';
  private apiEndpoint: string;
  private defaultModel: string = 'llama3';

  constructor(apiEndpoint: string = 'http://localhost:11434/api') {
    this.apiEndpoint = apiEndpoint;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await requestWithRetry({
        url: `${this.apiEndpoint}/tags`,
        method: 'GET',
        timeout: 2000 // Short timeout to check availability
      });
      return true;
    } catch (error) {
      logger.error('Ollama API not available:', error);
      return false;
    }
  }

  async generateText(options: GenerationOptions): Promise<GenerationResult> {
    try {
      const modelId = options.modelId || this.defaultModel;
      const endpoint = `${this.apiEndpoint}/generate`;
      
      const payload = {
        model: modelId,
        prompt: options.prompt,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          max_tokens: options.maxTokens || 2048,
        }
      };
      
      const response = await requestWithRetry<any>({
        url: endpoint,
        method: 'POST',
        data: payload
      });
      
      return {
        text: response.data.response || '',
        provider: 'ollama',
        tokens: response.data.eval_count || 0
      };
    } catch (error) {
      throw handleApiError(error, 'Ollama');
    }
  }

  async generateTextStream(
    options: GenerationOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      const modelId = options.modelId || this.defaultModel;
      const endpoint = `${this.apiEndpoint}/generate`;
      
      const payload = {
        model: modelId,
        prompt: options.prompt,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          max_tokens: options.maxTokens || 2048,
        },
        stream: true
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Ollama API error: ${response.status} ${errorText}`);
        if (callbacks.onError) callbacks.onError(error);
        throw error;
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      await this.processStream(response.body, callbacks);
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw handleApiError(error, 'Ollama');
    }
  }

  supportsMultimodal(): boolean {
    return false;
  }

  async getAvailableModels(): Promise<{ id: string, name: string, description: string }[]> {
    try {
      const endpoint = `${this.apiEndpoint}/tags`;
      
      const response = await requestWithRetry<any>({
        url: endpoint,
        method: 'GET'
      });
      
      return response.data.models.map((model: any) => ({
        id: model.name,
        name: this.formatModelName(model.name),
        description: `${this.formatModelName(model.name)} (${this.formatSize(model.size)})`
      }));
    } catch (error) {
      logger.error('Error fetching Ollama models:', error);
      return [{ 
        id: 'llama3', 
        name: 'Llama 3',
        description: 'Llama 3 (8B)'
      }];
    }
  }

  private formatModelName(name: string): string {
    // Convert model names like "llama3" to "Llama 3"
    return name
      .replace(/(\d+)/g, ' $1') // Add space before numbers
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  private formatSize(bytes: number): string {
    if (!bytes) return 'Unknown size';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  setDefaultModel(modelId: string): void {
    this.defaultModel = modelId;
  }

  private async processStream(
    stream: ReadableStream<Uint8Array>, 
    callbacks: StreamCallbacks
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let totalTokens = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete({
            text: fullText,
            provider: 'ollama',
            tokens: totalTokens
          });
          return;
        }
        
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        
        // Process JSON objects line by line
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last line in the buffer as it might be incomplete
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              fullText += data.response;
              callbacks.onChunk(data.response);
            }
            
            // Track token usage if available
            if (data.eval_count) {
              totalTokens = data.eval_count;
            }
            
            // If this is the final message, we're done
            if (data.done) {
              callbacks.onComplete({
                text: fullText,
                provider: 'ollama',
                tokens: totalTokens
              });
              reader.releaseLock();
              return;
            }
          } catch (error) {
            logger.warn('Error parsing Ollama stream chunk:', error);
          }
        }
      }
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      reader.releaseLock();
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
} 








