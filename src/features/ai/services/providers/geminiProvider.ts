import { logger } from '@/services/logger';
import type {
  AIProvider,
  GeminiModelInfo,
  GenerationOptions,
  GenerationResult,
  MultimodalGenerationOptions,
  StreamCallbacks
} from '@/features/ai/services/types';
import { handleApiError, imageToBase64, requestWithRetry } from '@/features/ai/services/utils';

export class GeminiProvider implements AIProvider {
  id: string = 'gemini';
  name: string = 'Google Gemini';
  private apiKey: string;
  private defaultModel: string = 'gemini-1.5-pro';
  private models: GeminiModelInfo[] = [
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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      await requestWithRetry({
        url: endpoint,
        method: 'GET'
      });
      return true;
    } catch (error) {
      logger.error('Gemini API not available:', error);
      return false;
    }
  }

  async generateText(options: GenerationOptions): Promise<GenerationResult> {
    try {
      const modelId = options.modelId || this.defaultModel;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
      
      const payload = this.buildPayload(options);
      
      const response = await requestWithRetry<any>({
        url: endpoint,
        method: 'POST',
        data: payload
      });
      
      logger.log('Gemini API response:', JSON.stringify(response.data));
      
      const generatedText = this.extractTextFromResponse(response.data);
      
      return {
        text: generatedText,
        provider: 'gemini',
        tokens: response.data.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      throw handleApiError(error, 'Gemini');
    }
  }

  async generateTextStream(
    options: GenerationOptions, 
    callbacks: StreamCallbacks
  ): Promise<void> {
    const modelId = options.modelId || this.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${this.apiKey}`;
    
    try {
      const payload = this.buildPayload(options);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} ${errorText}`);
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
      throw handleApiError(error, 'Gemini');
    }
  }

  supportsMultimodal(): boolean {
    return true;
  }

  async generateMultimodal(
    options: MultimodalGenerationOptions,
    callbacks?: StreamCallbacks
  ): Promise<GenerationResult> {
    try {
      const modelId = options.modelId || this.defaultModel;
      
      // Use streaming if callbacks are provided
      if (callbacks) {
        await this.generateMultimodalStream(options, callbacks);
        return { text: '', provider: 'gemini', tokens: 0 }; // The actual result is provided through callbacks
      }
      
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
      
      // Build payload with images
      const payload = await this.buildMultimodalPayload(options);
      
      const response = await requestWithRetry<any>({
        url: endpoint,
        method: 'POST',
        data: payload
      });
      
      const generatedText = this.extractTextFromResponse(response.data);
      
      return {
        text: generatedText,
        provider: 'gemini',
        tokens: response.data.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      throw handleApiError(error, 'Gemini');
    }
  }

  async getModels(): Promise<GeminiModelInfo[]> {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      
      const response = await requestWithRetry<any>({
        url: endpoint,
        method: 'GET'
      });
      
      // Filter for Gemini models
      const geminiModels = response.data.models
        .filter((model: any) => model.name.includes('gemini'))
        .map((model: any) => {
          const modelId = model.name.split('/').pop();
          const supportsImages = model.supportedGenerationMethods?.includes('generateContent') || false;
          
          // Readable name
          const modelName = modelId
            .replace('gemini-', 'Gemini ')
            .replace(/-/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Determine token limit based on model
          let maxTokens = 8192; // Default
          if (modelId.includes('flash')) {
            maxTokens = 16384;
          } else if (modelId.includes('pro')) {
            maxTokens = 32768;
          } else if (modelId.includes('ultra')) {
            maxTokens = 1048576;
          }
          
          return {
            id: modelId,
            name: modelName,
            description: model.description || `${modelName} model`,
            maxTokens,
            supportsImages
          };
        });
      
      // Update our models list if we got valid results
      if (geminiModels.length > 0) {
        this.models = geminiModels;
      }
      
      return this.models;
    } catch (error) {
      logger.error('Error fetching Gemini models:', error);
      return this.models; // Return default models on error
    }
  }

  setDefaultModel(modelId: string): void {
    // Verify the model exists
    if (!this.models.some(m => m.id === modelId)) {
      throw new Error(`Gemini model "${modelId}" not found`);
    }
    this.defaultModel = modelId;
  }

  private buildPayload(options: GenerationOptions): any {
    const payload: any = {
      contents: [
        {
          parts: [
            { text: options.prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
      }
    };
    
    // Add safety settings if provided
    if (options.safetyThreshold) {
      payload.safetySettings = [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: options.safetyThreshold
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: options.safetyThreshold
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: options.safetyThreshold
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: options.safetyThreshold
        }
      ];
    }
    
    return payload;
  }

  private async buildMultimodalPayload(options: MultimodalGenerationOptions): Promise<any> {
    // Start with basic payload
    const payload = this.buildPayload(options);
    
    // Add images if provided
    if (options.images && options.images.length > 0) {
      // The first part is already the text prompt, so we'll add images as additional parts
      for (const imageUrl of options.images) {
        try {
          const base64Image = await imageToBase64(imageUrl);
          
          // Get MIME type from data URI or default to JPEG
          const mimeType = imageUrl.startsWith('data:') 
            ? imageUrl.split(';')[0].split(':')[1] 
            : "image/jpeg";
          
          // Add the image to parts
          payload.contents[0].parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          });
        } catch (error) {
          logger.error(`Failed to process image ${imageUrl}:`, error);
        }
      }
    }
    
    // Add additional tuning options if provided
    if (options.tuningOptions) {
      if (options.tuningOptions.topK) {
        payload.generationConfig.topK = options.tuningOptions.topK;
      }
      
      if (options.tuningOptions.candidateCount) {
        payload.generationConfig.candidateCount = options.tuningOptions.candidateCount;
      }
      
      if (options.tuningOptions.stopSequences) {
        payload.generationConfig.stopSequences = options.tuningOptions.stopSequences;
      }
      
      if (options.tuningOptions.safetySettings) {
        payload.safetySettings = options.tuningOptions.safetySettings;
      }
    }
    
    return payload;
  }

  private extractTextFromResponse(responseData: any): string {
    // Extract the generated text from Gemini's response format
    let generatedText = '';
    
    if (responseData.candidates && 
        responseData.candidates[0] && 
        responseData.candidates[0].content &&
        responseData.candidates[0].content.parts) {
      
      // Concatenate all text parts from the response
      generatedText = responseData.candidates[0].content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join('');
    } else if (responseData.candidates?.[0]?.text) {
      generatedText = responseData.candidates[0].text;
    } else if (responseData.text) {
      generatedText = responseData.text;
    } else if (typeof responseData === 'string') {
      generatedText = responseData;
    }
    
    // If we still don't have text, check finish reason and provide appropriate message
    if (!generatedText) {
      const finishReason = responseData.candidates?.[0]?.finishReason;
      
      if (finishReason === 'MAX_TOKENS') {
        generatedText = "I apologize, but I couldn't complete generating a response due to length constraints. Please try a more specific prompt.";
      } else if (finishReason === 'SAFETY') {
        generatedText = "I apologize, but I can't provide a response to that prompt due to safety guidelines.";
      } else if (finishReason === 'RECITATION') {
        generatedText = "I apologize, but I can't provide a detailed response as it would require reciting content that I shouldn't reproduce.";
      } else {
        generatedText = "I'm sorry, I couldn't generate a response. Please try again with a different prompt.";
      }
    }
    
    return generatedText;
  }

  private async processStream(
    stream: ReadableStream<Uint8Array>,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process any remaining buffer
          if (buffer.trim() !== '') {
            this.processBufferChunk(buffer, callbacks, fullText);
          }
          
          callbacks.onComplete({
            text: fullText,
            provider: 'gemini',
            tokens: 0
          });
          
          return;
        }
        
        // Decode and process this chunk
        const text = decoder.decode(value, { stream: true });
        ({ buffer, fullText } = this.processBufferChunk(buffer + text, callbacks, fullText));
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

  private processBufferChunk(
    buffer: string,
    callbacks: StreamCallbacks,
    currentFullText: string
  ): { buffer: string, fullText: string } {
    let fullText = currentFullText;
    const lines = buffer.split('\n');
    // Keep the last potentially incomplete line in the buffer
    const newBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      try {
        // Make sure the line is valid JSON before parsing
        const trimmedLine = line.trim();
        if (!(trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) && 
            !(trimmedLine.startsWith('[') && trimmedLine.endsWith(']'))) {
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
              callbacks.onChunk(part.text);
            }
          }
        }
      } catch (parseError) {
        logger.warn('Error parsing JSON chunk:', parseError);
      }
    }
    
    return { buffer: newBuffer, fullText };
  }

  private async generateMultimodalStream(
    options: MultimodalGenerationOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const modelId = options.modelId || this.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${this.apiKey}`;
    
    try {
      const payload = await this.buildMultimodalPayload(options);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini API error: ${response.status} ${errorText}`);
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
      throw handleApiError(error, 'Gemini');
    }
  }
} 








