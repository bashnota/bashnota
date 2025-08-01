import { ref, computed, watch } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'

export interface ActionExecutionContext {
  code: string
  language: string
  error?: string | null
  blockId: string
  sessionInfo?: {
    sessionId?: string
    kernelName?: string
  }
}

export interface ActionResult {
  id: string
  actionId: string
  content: string
  timestamp: Date
  isSuccess: boolean
  executionTime?: number
  metadata?: Record<string, any>
}

export function useAIActions(context: ActionExecutionContext) {
  const aiActionsStore = useAIActionsStore()
  
  // State
  const executingActions = ref<Set<string>>(new Set())
  const actionResults = ref<Map<string, ActionResult>>(new Map())
  const isAnalyzing = ref(false)
  
  // Computed
  const isProviderConfigured = computed(() => aiActionsStore.isProviderConfigured())
  const providerConfigMessage = computed(() => aiActionsStore.getProviderConfigurationMessage())
  const availableActions = computed(() => aiActionsStore.codeActions.filter(action => action.isBuiltIn))
  
  // Smart action suggestions based on context
  const suggestedActions = computed(() => {
    const actions = availableActions.value
    
    // Error-specific suggestions
    if (context.error) {
      return actions.filter(a => 
        ['fix-error', 'debug-code', 'explain-error'].includes(a.id)
      ).slice(0, 3)
    }
    
    // Language-specific suggestions
    const languageActions = getLanguageSpecificActions(context.language)
    const contextActions = getContextualActions(context.code)
    
    return [...languageActions, ...contextActions].slice(0, 4)
  })
  
  const quickActions = computed(() => {
    return {
      analysis: availableActions.value.filter(a => 
        ['explain-code', 'code-review', 'analyze-complexity'].includes(a.id)
      ),
      improvement: availableActions.value.filter(a => 
        ['optimize-performance', 'improve-readability', 'add-error-handling'].includes(a.id)
      ),
      generation: availableActions.value.filter(a => 
        ['add-comments', 'generate-tests', 'create-documentation'].includes(a.id)
      )
    }
  })
  
  // Methods
  const executeAction = async (action: CustomAIAction): Promise<ActionResult | null> => {
    if (executingActions.value.has(action.id) || !context.code.trim()) {
      return null
    }

    executingActions.value.add(action.id)
    isAnalyzing.value = true
    
    const startTime = Date.now()
    
    try {
      const actionContext = {
        code: context.code,
        language: context.language,
        error: context.error || undefined,
        blockId: context.blockId,
        sessionInfo: context.sessionInfo,
        hasOutput: false, // This could be passed from parent
        executionTime: 0, // This could be passed from parent
      }
      
      const response = await aiActionsStore.executeCustomAction(action.id, actionContext)
      const executionTime = Date.now() - startTime
      
      const result: ActionResult = {
        id: generateResultId(),
        actionId: action.id,
        content: response,
        timestamp: new Date(),
        isSuccess: true,
        executionTime,
        metadata: {
          actionName: action.name,
          actionDescription: action.description
        }
      }
      
      actionResults.value.set(result.id, result)
      return result
      
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error)
      
      const result: ActionResult = {
        id: generateResultId(),
        actionId: action.id,
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date(),
        isSuccess: false,
        executionTime: Date.now() - startTime
      }
      
      actionResults.value.set(result.id, result)
      return result
      
    } finally {
      executingActions.value.delete(action.id)
      isAnalyzing.value = executingActions.value.size > 0
    }
  }
  
  const executeCustomPrompt = async (prompt: string): Promise<ActionResult | null> => {
    if (!prompt.trim() || isAnalyzing.value) return null

    isAnalyzing.value = true
    const startTime = Date.now()
    
    try {
      const actionContext = {
        code: context.code,
        language: context.language,
        error: context.error || undefined,
        blockId: context.blockId,
        customPrompt: prompt,
        sessionInfo: context.sessionInfo
      }
      
      const response = await aiActionsStore.executeCustomAction('custom-prompt', actionContext)
      const executionTime = Date.now() - startTime
      
      const result: ActionResult = {
        id: generateResultId(),
        actionId: 'custom-prompt',
        content: response,
        timestamp: new Date(),
        isSuccess: true,
        executionTime,
        metadata: {
          actionName: 'Custom Prompt',
          prompt: prompt
        }
      }
      
      actionResults.value.set(result.id, result)
      return result
      
    } catch (error) {
      console.error('Failed to execute custom prompt:', error)
      return null
    } finally {
      isAnalyzing.value = false
    }
  }
  
  const isActionExecuting = (actionId: string): boolean => {
    return executingActions.value.has(actionId)
  }
  
  const getResultsForAction = (actionId: string): ActionResult[] => {
    return Array.from(actionResults.value.values())
      .filter(result => result.actionId === actionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  const clearResults = () => {
    actionResults.value.clear()
  }
  
  const removeResult = (resultId: string) => {
    actionResults.value.delete(resultId)
  }
  
  // Helper functions
  function getLanguageSpecificActions(language: string): CustomAIAction[] {
    const languageMap: Record<string, string[]> = {
      python: ['optimize-python', 'add-type-hints', 'pythonic-code'],
      javascript: ['modern-js', 'async-await', 'error-handling'],
      typescript: ['type-safety', 'interface-design', 'generic-types'],
      sql: ['query-optimization', 'index-suggestions', 'performance-tuning'],
      rust: ['memory-safety', 'performance-rust', 'error-handling-rust'],
      go: ['concurrency-go', 'error-handling-go', 'performance-go']
    }
    
    const actionIds = languageMap[language.toLowerCase()] || []
    return availableActions.value.filter(a => actionIds.includes(a.id))
  }
  
  function getContextualActions(code: string): CustomAIAction[] {
    const suggestions: string[] = []
    
    // Analyze code patterns
    if (code.includes('TODO') || code.includes('FIXME')) {
      suggestions.push('complete-todo')
    }
    
    if (code.includes('function') || code.includes('def ') || code.includes('func ')) {
      suggestions.push('add-documentation', 'generate-tests')
    }
    
    if (code.includes('console.log') || code.includes('print(')) {
      suggestions.push('add-proper-logging')
    }
    
    if (code.length > 500) {
      suggestions.push('refactor-code', 'extract-functions')
    }
    
    return availableActions.value.filter(a => suggestions.includes(a.id))
  }
  
  function generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  return {
    // State
    executingActions: computed(() => executingActions.value),
    actionResults: computed(() => actionResults.value),
    isAnalyzing: computed(() => isAnalyzing.value),
    
    // Computed
    isProviderConfigured,
    providerConfigMessage,
    availableActions,
    suggestedActions,
    quickActions,
    
    // Methods
    executeAction,
    executeCustomPrompt,
    isActionExecuting,
    getResultsForAction,
    clearResults,
    removeResult
  }
}
