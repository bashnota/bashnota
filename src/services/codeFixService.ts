import { AIService } from '@/services/aiService'
import type { GenerationResult } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

export interface CodeFixResult {
  fixedCode: string
  explanation: string
  provider: string
}

export class CodeFixService {
  private aiService: AIService
  private aiSettings = useAISettingsStore()
  
  constructor() {
    this.aiService = new AIService()
  }
  
  /**
   * Generate a fix for code that has errors
   * @param originalCode The original code with errors
   * @param errorOutput The error output from running the code
   * @param language The programming language of the code
   * @returns A promise that resolves to the fixed code and explanation
   */
  async generateFix(
    originalCode: string,
    errorOutput: string,
    language: string
  ): Promise<CodeFixResult> {
    // Create a prompt for the AI to fix the code
    const prompt = this.createFixPrompt(originalCode, errorOutput, language)
    
    // Get the preferred provider and API key
    let providerId = this.aiSettings.settings.preferredProviderId
    let apiKey = this.aiSettings.getApiKey(providerId)
    
    // Check if WebLLM is selected but not loaded
    if (providerId === 'webllm' && !this.aiService.isModelLoaded()) {
      // Try to find a fallback provider
      const fallbackProviders = ['openai', 'anthropic', 'ollama', 'gemini']
      const availableFallback = fallbackProviders.find(id => 
        id !== 'webllm' && this.aiSettings.getApiKey(id)
      )
      
      if (availableFallback) {
        console.log(`WebLLM not loaded, falling back to ${availableFallback}`)
        providerId = availableFallback
        apiKey = this.aiSettings.getApiKey(providerId)
      } else {
        throw new Error(
          'WebLLM is not loaded. Please load a WebLLM model in Settings > AI > WebLLM tab, ' +
          'or configure another AI provider like OpenAI or Anthropic.'
        )
      }
    }
    
    // Generate the fix using the AI service
    const result = await this.aiService.generateText(providerId, apiKey, {
      prompt,
      maxTokens: this.aiSettings.settings.maxTokens,
      temperature: this.aiSettings.settings.temperature
    })
    
    // Parse the response
    const parsedResult = this.parseFixResponse(result)
    
    return parsedResult
  }
  
  /**
   * Create a prompt for the AI to fix code
   * @param originalCode The original code with errors
   * @param errorOutput The error output from running the code
   * @param language The programming language of the code
   * @returns A prompt string
   */
  private createFixPrompt(
    originalCode: string,
    errorOutput: string,
    language: string
  ): string {
    // Add any custom system prompt from settings
    const systemPrompt = this.aiSettings.settings.customPrompt || 
      "You are an expert programmer who specializes in fixing code errors."
    
    return `${systemPrompt}

I need help fixing code that has errors.

ORIGINAL CODE:
\`\`\`${language}
${originalCode}
\`\`\`

ERROR OUTPUT:
\`\`\`
${errorOutput}
\`\`\`

Please analyze the code and error, then provide:
1. A brief explanation of what's wrong with the code
2. The fixed code that resolves the issue

Format your response as follows:
EXPLANATION: Your explanation here
FIXED_CODE:
\`\`\`${language}
The fixed code here
\`\`\`

Make sure your fix addresses the specific error in the output. Be concise but thorough in your explanation.`
  }
  
  /**
   * Parse the AI response to extract the explanation and fixed code
   * @param result The generation result from the AI service
   * @returns The parsed code fix result
   */
  private parseFixResponse(result: GenerationResult): CodeFixResult {
    const response = result.text
    let explanation = ""
    let fixedCode = ""
    
    // Extract explanation
    const explanationMatch = response.match(/EXPLANATION:\s*([\s\S]*?)(?=FIXED_CODE:|$)/i)
    if (explanationMatch && explanationMatch[1]) {
      explanation = explanationMatch[1].trim()
    } else {
      explanation = "The AI has fixed your code but didn't provide a detailed explanation."
    }
    
    // Extract fixed code
    const codeMatch = response.match(/```(?:\w+)?\s*([\s\S]*?)```/i)
    if (codeMatch && codeMatch[1]) {
      fixedCode = codeMatch[1].trim()
    } else {
      // Fallback: try to extract code after FIXED_CODE:
      const fallbackMatch = response.match(/FIXED_CODE:\s*([\s\S]*)/i)
      if (fallbackMatch && fallbackMatch[1]) {
        fixedCode = fallbackMatch[1].trim()
      } else {
        throw new Error("Could not extract fixed code from AI response")
      }
    }
    
    return {
      fixedCode,
      explanation,
      provider: result.provider
    }
  }
} 