import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { aiService } from '@/features/ai/services/aiService'

import { logger } from '@/services/logger'

export interface CustomAIAction {
  id: string
  name: string
  description: string
  icon: string
  prompt: string
  category: 'analysis' | 'transformation' | 'generation' | 'debugging'
  isBuiltIn: boolean
  isEnabled: boolean
  shortcut?: string
  outputType: 'text' | 'code' | 'markdown'
  createdAt: string
  updatedAt: string
}

export interface AIProviderSettings {
  provider: string
  fallbackProvider?: string
  apiKeys: Record<string, string>
  maxTokens: number
  temperature: number
  retryFailedRequests: boolean
  cacheResponses: boolean
  webllmAutoLoad?: boolean
  webllmDefaultModel?: string
  webllmAutoLoadStrategy?: 'default' | 'smallest' | 'fastest' | 'balanced'
  enabledFeatures: {
    // Text block features
    rewriteWithAI: boolean
    fixGrammar: boolean
    improveWriting: boolean
    summarizeText: boolean
    translateText: boolean
    changeWritingStyle: boolean
    // Code block features
    codeExplanation: boolean
    errorAnalysis: boolean
    securityAnalysis: boolean
    performanceAnalysis: boolean
    codeTransformation: boolean
    autoAnalyzeErrors: boolean
    enableCodeSuggestions: boolean
    showComplexityBadges: boolean
    customActions: boolean
  }
}

export interface ErrorTriggerConfig {
  autoTrigger: boolean
  showQuickFix: boolean
  showExplanation: boolean
  suggestedActions: string[] // IDs of custom actions to suggest
}

interface AIActionsState {
  customActions: CustomAIAction[]
  providerSettings: AIProviderSettings
  errorTriggerConfig: ErrorTriggerConfig
  isLoading: boolean
  lastError: string | null
}

export const useAIActionsStore = defineStore('aiActions', () => {
  // State
  const state = reactive<AIActionsState>({
    customActions: [],
    providerSettings: {
      provider: 'gemini',
      apiKeys: {},
      maxTokens: 2048,
      temperature: 0.3,
      retryFailedRequests: true,
      cacheResponses: true,
      enabledFeatures: {
        // Text block features
        rewriteWithAI: true,
        fixGrammar: true,
        improveWriting: true,
        summarizeText: true,
        translateText: true,
        changeWritingStyle: true,
        // Code block features
        codeExplanation: true,
        errorAnalysis: true,
        securityAnalysis: true,
        performanceAnalysis: true,
        codeTransformation: true,
        autoAnalyzeErrors: true,
        enableCodeSuggestions: true,
        showComplexityBadges: true,
        customActions: true
      }
    },
    errorTriggerConfig: {
      autoTrigger: true,
      showQuickFix: true,
      showExplanation: true,
      suggestedActions: []
    },
    isLoading: false,
    lastError: null
  })

  // Computed
  const enabledCustomActions = computed(() => 
    state.customActions.filter(action => action.isEnabled)
  )



  const categorizedActions = computed(() => {
    const categories = {
      analysis: [] as CustomAIAction[],
      transformation: [] as CustomAIAction[],
      generation: [] as CustomAIAction[],
      debugging: [] as CustomAIAction[]
    }
    
    enabledCustomActions.value.forEach(action => {
      categories[action.category].push(action)
    })
    
    return categories
  })

  // 🔥 NEW: Separate code-focused actions from text-focused actions
  const codeActions = computed(() => 
    enabledCustomActions.value.filter(action => 
      // Include actions that work with {{code}} template or are code-specific
      action.prompt.includes('{{code}}') || 
      ['explain-code', 'fix-error', 'optimize-performance', 'add-documentation', 
       'security-review', 'generate-tests', 'refactor-code', 'add-types', 
       'convert-language', 'minify-code', 'format-code'].includes(action.id)
    )
  )

  const textActions = computed(() => 
    enabledCustomActions.value.filter(action => 
      // Include actions that work with {{text}} template
      action.prompt.includes('{{text}}') && !action.prompt.includes('{{code}}')
    )
  )

  const codeActionsByCategory = computed(() => {
    const categories = {
      analysis: [] as CustomAIAction[],
      transformation: [] as CustomAIAction[],
      generation: [] as CustomAIAction[],
      debugging: [] as CustomAIAction[]
    }
    
    codeActions.value.forEach(action => {
      categories[action.category].push(action)
    })
    
    return categories
  })

  const errorSuggestedActions = computed(() => 
    state.errorTriggerConfig.suggestedActions
      .map(id => state.customActions.find(action => action.id === id))
      .filter(Boolean) as CustomAIAction[]
  )

  // Built-in actions
  const builtInActions: CustomAIAction[] = [
    // Text block actions
    {
      id: 'rewrite-with-ai',
      name: 'Rewrite with AI',
      description: 'Rewrite text with AI assistance',
      icon: 'Edit',
      prompt: 'Please rewrite the following text to improve clarity and flow:\n\n{{text}}',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fix-grammar',
      name: 'Fix Grammar',
      description: 'Fix grammar and spelling errors',
      icon: 'CheckCircle',
      prompt: 'Please fix any grammar and spelling errors in the following text:\n\n{{text}}',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'improve-writing',
      name: 'Improve Writing',
      description: 'Improve writing style and clarity',
      icon: 'FileText',
      prompt: 'Please improve the writing style and clarity of the following text:\n\n{{text}}',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'summarize-text',
      name: 'Summarize',
      description: 'Create a concise summary',
      icon: 'FileText',
      prompt: 'Please provide a concise summary of the following text:\n\n{{text}}',
      category: 'analysis',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Code block actions
    {
      id: 'explain-code',
      name: 'Explain Code',
      description: 'Get a comprehensive explanation of what the code does',
      icon: 'MessageCircle',
      prompt: 'Please explain this {{language}} code in detail:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. A brief summary\n2. Step-by-step explanation\n3. Key concepts used\n4. Complexity assessment',
      category: 'analysis',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fix-error',
      name: 'Fix Error',
      description: 'Analyze and fix code execution errors with full context',
      icon: 'Wrench',
      prompt: 'This {{language}} code has an execution error:\n\n```{{language}}\n{{code}}\n```\n\nError message:\n{{error}}\n\n**Please provide a comprehensive analysis:**\n\n1. **Root Cause Analysis**: What exactly went wrong and why?\n2. **Corrected Code**: The fixed version with clear annotations\n3. **Fix Explanation**: Step-by-step explanation of the changes made\n4. **Prevention Tips**: How to avoid this error in the future\n5. **Testing Verification**: How to test that the fix works\n\n**Format your response with clear sections and include the corrected code in a code block.**',
      category: 'debugging',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'optimize-performance',
      name: 'Optimize Performance',
      description: 'Optimize code for better performance',
      icon: 'Zap',
      prompt: 'Please optimize this {{language}} code for better performance:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. Optimized code\n2. Explanation of optimizations\n3. Expected performance improvement',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'add-documentation',
      name: 'Add Documentation',
      description: 'Add comprehensive comments and documentation',
      icon: 'FileText',
      prompt: 'Please add comprehensive documentation to this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nInclude:\n1. Function/class documentation\n2. Inline comments for complex logic\n3. Parameter descriptions\n4. Return value descriptions',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'security-review',
      name: 'Security Review',
      description: 'Analyze code for security vulnerabilities',
      icon: 'Shield',
      prompt: 'Please perform a security review of this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nCheck for:\n1. Common vulnerabilities (injection, XSS, etc.)\n2. Input validation issues\n3. Authentication/authorization problems\n4. Provide secure alternatives',
      category: 'analysis',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'generate-tests',
      name: 'Generate Tests',
      description: 'Generate unit tests for the code',
      icon: 'TestTube',
      prompt: 'Please generate comprehensive unit tests for this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nInclude:\n1. Test cases for normal operation\n2. Edge cases and error conditions\n3. Mock data where needed\n4. Clear test descriptions',
      category: 'generation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // 🔥 NEW: Essential code-specific actions
    {
      id: 'refactor-code',
      name: 'Refactor Code',
      description: 'Refactor code for better structure and readability',
      icon: 'RefreshCw',
      prompt: 'Please refactor this {{language}} code to improve structure, readability, and maintainability:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. Refactored code with better structure\n2. Explanation of improvements made\n3. Benefits of the refactoring\n4. Any design patterns applied',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'add-types',
      name: 'Add Type Annotations',
      description: 'Add type annotations and improve type safety',
      icon: 'FileText',
      prompt: 'Please add comprehensive type annotations to this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. Code with proper type annotations\n2. Interface/type definitions if needed\n3. Explanation of type choices\n4. Benefits for type safety',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'convert-language',
      name: 'Convert to Another Language',
      description: 'Convert code to a different programming language',
      icon: 'ArrowLeftRight',
      prompt: 'Please convert this {{language}} code to Python (or specify target language):\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. Equivalent code in the target language\n2. Explanation of key differences\n3. Language-specific best practices applied\n4. Any libraries or imports needed',
      category: 'transformation',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'code',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'analyze-complexity',
      name: 'Analyze Complexity',
      description: 'Analyze algorithmic complexity and suggest optimizations',
      icon: 'TrendingUp',
      prompt: 'Please analyze the algorithmic complexity of this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nProvide:\n1. Time complexity (Big O notation)\n2. Space complexity analysis\n3. Bottlenecks identification\n4. Optimization suggestions\n5. Alternative algorithms if applicable',
      category: 'analysis',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Perform comprehensive code review with suggestions',
      icon: 'Eye',
      prompt: 'Please perform a comprehensive code review of this {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nReview for:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Maintainability and readability\n5. Specific language conventions\n6. Suggestions for improvement',
      category: 'analysis',
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  // Actions
  const loadSettings = () => {
    try {
      // Load provider settings
      const savedProviderSettings = localStorage.getItem('ai-code-preferences')
      if (savedProviderSettings) {
        const parsed = JSON.parse(savedProviderSettings)
        state.providerSettings = { ...state.providerSettings, ...parsed }
      }

      // Load custom actions
      const savedCustomActions = localStorage.getItem('ai-custom-actions')
      if (savedCustomActions) {
        const parsed = JSON.parse(savedCustomActions)
        state.customActions = [...builtInActions, ...parsed]
      } else {
        state.customActions = [...builtInActions]
      }

      // Load error trigger config
      const savedErrorConfig = localStorage.getItem('ai-error-trigger-config')
      if (savedErrorConfig) {
        const parsed = JSON.parse(savedErrorConfig)
        state.errorTriggerConfig = { ...state.errorTriggerConfig, ...parsed }
      }

      // Update AI service default provider
      aiService.setDefaultProviderId(state.providerSettings.provider)
    } catch (error) {
      logger.error('Failed to load AI settings:', error)
      state.customActions = [...builtInActions]
    }
  }

  const saveSettings = () => {
    try {
      localStorage.setItem('ai-code-preferences', JSON.stringify(state.providerSettings))
      
      // Save only custom (non-built-in) actions
      const customOnly = state.customActions.filter(action => !action.isBuiltIn)
      localStorage.setItem('ai-custom-actions', JSON.stringify(customOnly))
      
      localStorage.setItem('ai-error-trigger-config', JSON.stringify(state.errorTriggerConfig))
      
      // Update AI service
      aiService.setDefaultProviderId(state.providerSettings.provider)
    } catch (error) {
      logger.error('Failed to save AI settings:', error)
    }
  }

  const updateProviderSettings = (settings: Partial<AIProviderSettings>) => {
    state.providerSettings = { ...state.providerSettings, ...settings }
    saveSettings()
  }

  const updateErrorTriggerConfig = (config: Partial<ErrorTriggerConfig>) => {
    state.errorTriggerConfig = { ...state.errorTriggerConfig, ...config }
    saveSettings()
  }

  const addCustomAction = (action: Omit<CustomAIAction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAction: CustomAIAction = {
      ...action,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    state.customActions.push(newAction)
    saveSettings()
    return newAction
  }

  const updateCustomAction = (id: string, updates: Partial<CustomAIAction>) => {
    const index = state.customActions.findIndex(action => action.id === id)
    if (index !== -1) {
      state.customActions[index] = {
        ...state.customActions[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveSettings()
    }
  }

  const deleteCustomAction = (id: string) => {
    const index = state.customActions.findIndex(action => action.id === id && !action.isBuiltIn)
    if (index !== -1) {
      state.customActions.splice(index, 1)
      saveSettings()
    }
  }

  const toggleActionEnabled = (id: string) => {
    const action = state.customActions.find(action => action.id === id)
    if (action) {
      action.isEnabled = !action.isEnabled
      action.updatedAt = new Date().toISOString()
      saveSettings()
    }
  }

  const executeCustomAction = async (
    actionId: string, 
    context: { 
      code?: string; 
      language?: string; 
      error?: string; 
      text?: string;
      // 🔥 NEW: Enhanced execution context
      executionTime?: number;
      sessionId?: string;
      kernelName?: string;
      hasOutput?: boolean;
      cellOutput?: string;
      serverConfig?: any;
    }
  ): Promise<string> => {
    const action = state.customActions.find(a => a.id === actionId)
    if (!action) {
      throw new Error(`Action ${actionId} not found`)
    }

    // Check if provider is configured
    const provider = state.providerSettings.provider
    const apiKey = state.providerSettings.apiKeys[provider]
    
    // Validate provider configuration
    if (provider === 'gemini' && !apiKey) {
      throw new Error(`API key is required for ${provider} provider. Please configure your API key in Settings > AI Assistant > AI Providers.`)
    }
    
    if (provider === 'openai' && !apiKey) {
      throw new Error(`API key is required for ${provider} provider. Please configure your API key in Settings > AI Assistant > AI Providers.`)
    }

    // 🔥 NEW: Enhanced WebLLM validation and auto-loading
    if (provider === 'webllm') {
      const webllmAutoLoad = state.providerSettings.webllmAutoLoad ?? true
      if (!webllmAutoLoad) {
        throw new Error(`WebLLM auto-loading is disabled. Please enable auto-loading or manually load a model in Settings > AI Assistant > AI Providers.`)
      }
    }

    state.isLoading = true
    state.lastError = null

    try {
      // 🔥 NEW: Enhanced context building for more intelligent AI responses
      const executionMetadata = context.executionTime ? `\n\nExecution Metadata:
- Execution Time: ${context.executionTime}ms
- Session: ${context.sessionId || 'None'}
- Kernel: ${context.kernelName || 'Unknown'}
- Has Output: ${context.hasOutput ? 'Yes' : 'No'}` : ''
      
      const outputContext = context.cellOutput ? `\n\nCurrent Output:\n${context.cellOutput}` : ''
      
      // Replace template variables in prompt with enhanced context
      let prompt = action.prompt
        .replace(/\{\{code\}\}/g, context.code || '')
        .replace(/\{\{language\}\}/g, context.language || '')
        .replace(/\{\{error\}\}/g, context.error || '')
        .replace(/\{\{text\}\}/g, context.text || '')
      
      // 🔥 NEW: Add execution context to error-related actions
      if ((action.id === 'fix-error' || action.category === 'debugging') && (executionMetadata || outputContext)) {
        prompt += executionMetadata + outputContext
      }

      const result = await aiService.generateText(
        provider,
        {
          prompt,
          maxTokens: state.providerSettings.maxTokens,
          temperature: state.providerSettings.temperature
        },
        apiKey // This is now validated to exist for providers that need it
      )

      return result.text
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      state.lastError = errorMessage
      
      // 🔥 NEW: Enhanced error handling for WebLLM
      if (provider === 'webllm' && errorMessage.includes('not initialized')) {
        logger.error(`WebLLM initialization failed for action ${actionId}:`, error)
        throw new Error(`WebLLM model not initialized. Please go to Settings > AI Assistant > AI Providers and load a WebLLM model, or select a different AI provider.`)
      }
      
      logger.error(`Failed to execute action ${actionId}:`, error)
      throw error
    } finally {
      state.isLoading = false
    }
  }

  const getQuickErrorActions = () => {
    return [
      state.customActions.find(a => a.id === 'fix-error'),
      state.customActions.find(a => a.id === 'explain-code'),
      ...errorSuggestedActions.value
    ].filter(Boolean) as CustomAIAction[]
  }

  const isProviderConfigured = () => {
    const provider = state.providerSettings.provider
    const apiKey = state.providerSettings.apiKeys[provider]
    
    // Check provider-specific requirements
    switch (provider) {
      case 'gemini':
      case 'openai':
        return !!apiKey
      case 'webllm':
        // 🔥 ENHANCED: Check WebLLM auto-loading configuration
        const webllmAutoLoad = state.providerSettings.webllmAutoLoad ?? true
        return webllmAutoLoad // WebLLM is configured if auto-loading is enabled
      case 'ollama':
        return true // Ollama doesn't require API keys
      default:
        return false
    }
  }

  const getProviderConfigurationMessage = () => {
    const provider = state.providerSettings.provider
    
    if (isProviderConfigured()) {
      return null
    }
    
    switch (provider) {
      case 'gemini':
        return 'Please configure your Gemini API key in Settings > AI Assistant > AI Providers to use AI features.'
      case 'openai':
        return 'Please configure your OpenAI API key in Settings > AI Assistant > AI Providers to use AI features.'
      case 'webllm':
        return 'WebLLM auto-loading is disabled. Please enable auto-loading in Settings > AI Assistant > AI Providers or manually load a model to use AI features.'
      default:
        return `Provider ${provider} is not properly configured. Please check your settings.`
    }
  }

  const resetToDefaults = () => {
    state.providerSettings = {
      provider: 'gemini',
      apiKeys: {},
      maxTokens: 2048,
      temperature: 0.3,
      retryFailedRequests: true,
      cacheResponses: true,
      enabledFeatures: {
        // Text block features
        rewriteWithAI: true,
        fixGrammar: true,
        improveWriting: true,
        summarizeText: true,
        translateText: true,
        changeWritingStyle: true,
        // Code block features
        codeExplanation: true,
        errorAnalysis: true,
        securityAnalysis: true,
        performanceAnalysis: true,
        codeTransformation: true,
        autoAnalyzeErrors: true,
        enableCodeSuggestions: true,
        showComplexityBadges: true,
        customActions: true
      }
    }
    
    state.errorTriggerConfig = {
      autoTrigger: true,
      showQuickFix: true,
      showExplanation: true,
      suggestedActions: []
    }
    
    state.customActions = [...builtInActions]
    saveSettings()
  }

  // Initialize on store creation
  loadSettings()

  return {
    // State
    state: reactive(state),
    
    // Computed
    enabledCustomActions,
    categorizedActions,
    codeActions,
    textActions,
    codeActionsByCategory,
    errorSuggestedActions,
    
    // Actions
    loadSettings,
    saveSettings,
    updateProviderSettings,
    updateErrorTriggerConfig,
    addCustomAction,
    updateCustomAction,
    deleteCustomAction,
    toggleActionEnabled,
    executeCustomAction,
    getQuickErrorActions,
    isProviderConfigured,
    getProviderConfigurationMessage,
    resetToDefaults
  }
})

export type AIActionsStore = ReturnType<typeof useAIActionsStore> 