export interface AISettings {
  // Providers
  preferredProviderId: string
  apiKeys: Record<string, string>
  autoSelectProvider: boolean
  requestTimeout: number
  
  // Generation
  maxTokens: number
  temperature: number
  customPrompt: string
  
  // Provider-specific
  geminiModel: string
  geminiSafetyThreshold: string
  ollamaServerUrl: string
  ollamaModel: string
  webllmModel: string
  webllmDefaultModel: string
  webllmAutoLoad: boolean
  webllmAutoLoadStrategy: 'default' | 'smallest' | 'fastest' | 'balanced' | 'none'
  
  // UI
  sidebarWidth: number[]
  
  // Actions (from existing store)
  enabledActions: string[]
  customActions: any[]
}

export const aiSettingsDefaults: AISettings = {
  preferredProviderId: 'gemini',
  apiKeys: {},
  autoSelectProvider: true,
  requestTimeout: 30,
  maxTokens: 2048,
  temperature: 0.7,
  customPrompt: '',
  geminiModel: 'gemini-1.5-pro',
  geminiSafetyThreshold: 'BLOCK_MEDIUM_AND_ABOVE',
  ollamaServerUrl: 'http://localhost:11434',
  ollamaModel: 'llama2',
  webllmModel: '',
  webllmDefaultModel: '',
  webllmAutoLoad: true,
  webllmAutoLoadStrategy: 'smallest',
  sidebarWidth: [350],
  enabledActions: [],
  customActions: []
}
