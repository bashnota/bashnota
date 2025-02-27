import axios from 'axios'

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
]

export class AIService {
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
}

export const aiService = new AIService() 