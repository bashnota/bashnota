import { ref, computed, watch } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'

export interface AICodeAssistantOptions {
  autoAnalyzeErrors?: boolean
  enableQuickActions?: boolean
  enableCustomActions?: boolean
}

export function useAICodeAssistant(
  blockId: string, 
  options: AICodeAssistantOptions = {}
) {
  const aiActionsStore = useAIActionsStore()
  
  // Local state
  const isVisible = ref(false)
  const executingActions = ref<Set<string>>(new Set())
  const actionResults = ref<Record<string, string>>({})
  const lastAnalyzedCode = ref<string>('')
  const lastAnalyzedError = ref<string | null>(null)

  // Computed
  const isExecuting = computed(() => executingActions.value.size > 0)
  const hasResults = computed(() => Object.keys(actionResults.value).length > 0)
  
  // 🔥 UPDATED: Use only code-focused actions instead of all actions
  const quickActions = computed(() => 
    aiActionsStore.codeActions.filter(action => 
      action.isBuiltIn && ['explain-code', 'fix-error', 'optimize-performance', 
      'add-documentation', 'refactor-code', 'code-review'].includes(action.id)
    )
  )
  
  const errorActions = computed(() =>
    aiActionsStore.codeActions.filter(action => 
      action.category === 'debugging' || action.id === 'fix-error'
    )
  )

  const analysisActions = computed(() =>
    aiActionsStore.codeActions.filter(action => action.category === 'analysis')
  )

  const transformationActions = computed(() =>
    aiActionsStore.codeActions.filter(action => action.category === 'transformation')
  )

  const generationActions = computed(() =>
    aiActionsStore.codeActions.filter(action => action.category === 'generation')
  )

  // Methods
  const executeAction = async (
    actionId: string, 
    code: string, 
    language: string, 
    error?: string,
    // 🔥 NEW: Enhanced execution context
    executionContext?: {
      executionTime?: number;
      sessionId?: string;
      kernelName?: string;
      hasOutput?: boolean;
      cellOutput?: string;
    }
  ): Promise<string> => {
    if (executingActions.value.has(actionId)) {
      throw new Error('Action already executing')
    }

    executingActions.value.add(actionId)
    
    try {
      // 🔥 NEW: Enhanced context with execution metadata
      const context = { 
        code, 
        language, 
        error,
        ...executionContext 
      }
      const result = await aiActionsStore.executeCustomAction(actionId, context)
      actionResults.value[actionId] = result
      return result
    } finally {
      executingActions.value.delete(actionId)
    }
  }

  const analyzeCode = async (code: string, language: string, executionContext?: any) => {
    if (code === lastAnalyzedCode.value) {
      return actionResults.value // Return cached results
    }

    lastAnalyzedCode.value = code
    
    try {
      const explainAction = quickActions.value.find(a => a.id === 'explain-code')
      if (explainAction) {
        await executeAction(explainAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Code analysis failed:', error)
    }
  }

  const analyzeError = async (
    code: string, 
    language: string, 
    error: string, 
    executionContext?: any
  ) => {
    if (error === lastAnalyzedError.value) {
      return actionResults.value['fix-error'] // Return cached result
    }

    lastAnalyzedError.value = error
    
    try {
      const fixAction = errorActions.value.find(a => a.id === 'fix-error')
      if (fixAction) {
        await executeAction(fixAction.id, code, language, error, executionContext)
      }
    } catch (err) {
      console.error('Error analysis failed:', err)
    }
  }

  const optimizeCode = async (code: string, language: string, executionContext?: any) => {
    try {
      const optimizeAction = quickActions.value.find(a => a.id === 'optimize-performance')
      if (optimizeAction) {
        return await executeAction(optimizeAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Code optimization failed:', error)
    }
  }

  const addDocumentation = async (code: string, language: string) => {
    try {
      const docAction = quickActions.value.find(a => a.id === 'add-documentation')
      if (docAction) {
        return await executeAction(docAction.id, code, language)
      }
    } catch (error) {
      console.error('Adding documentation failed:', error)
    }
  }

  const runSecurityReview = async (code: string, language: string) => {
    try {
      const securityAction = quickActions.value.find(a => a.id === 'security-review')
      if (securityAction) {
        return await executeAction(securityAction.id, code, language)
      }
    } catch (error) {
      console.error('Security review failed:', error)
    }
  }

  const generateTests = async (code: string, language: string, executionContext?: any) => {
    try {
      const testAction = generationActions.value.find(a => a.id === 'generate-tests')
      if (testAction) {
        return await executeAction(testAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Test generation failed:', error)
    }
  }

  // 🔥 NEW: Code-specific action methods
  const refactorCode = async (code: string, language: string, executionContext?: any) => {
    try {
      const refactorAction = transformationActions.value.find(a => a.id === 'refactor-code')
      if (refactorAction) {
        return await executeAction(refactorAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Code refactoring failed:', error)
    }
  }

  const addTypes = async (code: string, language: string, executionContext?: any) => {
    try {
      const typesAction = transformationActions.value.find(a => a.id === 'add-types')
      if (typesAction) {
        return await executeAction(typesAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Adding types failed:', error)
    }
  }

  const convertLanguage = async (code: string, language: string, targetLanguage: string = 'python', executionContext?: any) => {
    try {
      const convertAction = transformationActions.value.find(a => a.id === 'convert-language')
      if (convertAction) {
        // Customize the prompt for target language
        const customContext = { 
          ...executionContext,
          targetLanguage 
        }
        return await executeAction(convertAction.id, code, language, undefined, customContext)
      }
    } catch (error) {
      console.error('Language conversion failed:', error)
    }
  }

  const analyzeComplexity = async (code: string, language: string, executionContext?: any) => {
    try {
      const complexityAction = analysisActions.value.find(a => a.id === 'analyze-complexity')
      if (complexityAction) {
        return await executeAction(complexityAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Complexity analysis failed:', error)
    }
  }

  const performCodeReview = async (code: string, language: string, executionContext?: any) => {
    try {
      const reviewAction = analysisActions.value.find(a => a.id === 'code-review')
      if (reviewAction) {
        return await executeAction(reviewAction.id, code, language, undefined, executionContext)
      }
    } catch (error) {
      console.error('Code review failed:', error)
    }
  }

  const getResult = (actionId: string) => {
    return actionResults.value[actionId]
  }

  const clearResults = () => {
    actionResults.value = {}
    lastAnalyzedCode.value = ''
    lastAnalyzedError.value = null
  }

  const clearResult = (actionId: string) => {
    delete actionResults.value[actionId]
  }

  const extractCodeFromResult = (result: string): string | null => {
    const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/)
    return codeMatch?.[1]?.trim() || null
  }

  const isActionExecuting = (actionId: string) => {
    return executingActions.value.has(actionId)
  }

  const toggleVisibility = () => {
    isVisible.value = !isVisible.value
  }

  return {
    // State
    isVisible,
    isExecuting,
    hasResults,
    actionResults,
    executingActions,

    // Computed
    quickActions,
    errorActions,
    analysisActions,
    transformationActions,
    generationActions,

    // Methods
    executeAction,
    analyzeCode,
    analyzeError,
    optimizeCode,
    addDocumentation,
    runSecurityReview,
    generateTests,
    // 🔥 NEW: Code-specific methods
    refactorCode,
    addTypes,
    convertLanguage,
    analyzeComplexity,
    performCodeReview,
    // Utility methods
    getResult,
    clearResults,
    clearResult,
    extractCodeFromResult,
    isActionExecuting,
    toggleVisibility
  }
}

export type AICodeAssistant = ReturnType<typeof useAICodeAssistant> 