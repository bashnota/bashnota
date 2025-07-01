import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIAction } from '@/features/ai/types/aiActions'
import { DEFAULT_AI_ACTIONS } from '@/features/ai/types/aiActions'
import { logger } from '@/services/logger'

export const useAIActionsStore = defineStore('aiActions', () => {
  const actions = ref<AIAction[]>([])
  const isLoaded = ref(false)

  // Computed properties
  const enabledActions = computed(() => 
    isLoaded.value ? actions.value.filter(action => action.enabled) : []
  )

  const customActions = computed(() => 
    actions.value.filter(action => action.isCustom === true)
  )

  const defaultActions = computed(() => 
    actions.value.filter(action => action.isCustom !== true)
  )

  // Actions
  const loadActions = () => {
    try {
      const savedActions = localStorage.getItem('ai-actions')
      if (savedActions) {
        const parsed = JSON.parse(savedActions) as AIAction[]
        
        // Merge with default actions to ensure we have all defaults
        const mergedActions = [...DEFAULT_AI_ACTIONS]
        
        // Update existing actions with saved settings
        parsed.forEach(savedAction => {
          const existingIndex = mergedActions.findIndex(a => a.id === savedAction.id)
          if (existingIndex >= 0) {
            // Update existing action
            mergedActions[existingIndex] = { ...mergedActions[existingIndex], ...savedAction }
          } else if (savedAction.isCustom) {
            // Add custom action
            mergedActions.push(savedAction)
          }
        })
        
        actions.value = mergedActions
      } else {
        // First time - use defaults
        actions.value = [...DEFAULT_AI_ACTIONS]
        saveActions()
      }
    } catch (error) {
      logger.error('Failed to load AI actions from localStorage', error)
      actions.value = [...DEFAULT_AI_ACTIONS]
    } finally {
      isLoaded.value = true
    }
  }

  const saveActions = () => {
    try {
      localStorage.setItem('ai-actions', JSON.stringify(actions.value))
    } catch (error) {
      logger.error('Failed to save AI actions to localStorage', error)
    }
  }

  const updateAction = (actionId: string, updates: Partial<AIAction>) => {
    const index = actions.value.findIndex(a => a.id === actionId)
    if (index >= 0) {
      actions.value[index] = { ...actions.value[index], ...updates }
      saveActions()
    }
  }

  const addCustomAction = (action: Omit<AIAction, 'id' | 'isCustom'>) => {
    const newAction: AIAction = {
      ...action,
      id: `custom-${Date.now()}`,
      isCustom: true
    }
    actions.value.push(newAction)
    saveActions()
    return newAction.id
  }

  const removeAction = (actionId: string) => {
    const action = actions.value.find(a => a.id === actionId)
    if (action && action.isCustom) {
      actions.value = actions.value.filter(a => a.id !== actionId)
      saveActions()
      return true
    }
    return false
  }

  const toggleAction = (actionId: string) => {
    updateAction(actionId, { enabled: !actions.value.find(a => a.id === actionId)?.enabled })
  }

  const resetToDefaults = () => {
    actions.value = [...DEFAULT_AI_ACTIONS]
    saveActions()
  }

  const duplicateAction = (actionId: string) => {
    const originalAction = actions.value.find(a => a.id === actionId)
    if (originalAction) {
      const duplicated = {
        ...originalAction,
        name: `${originalAction.name} (Copy)`,
        isCustom: true
      }
      return addCustomAction(duplicated)
    }
    return null
  }

  const moveAction = (fromIndex: number, toIndex: number) => {
    if (fromIndex >= 0 && fromIndex < actions.value.length && 
        toIndex >= 0 && toIndex < actions.value.length) {
      const item = actions.value.splice(fromIndex, 1)[0]
      actions.value.splice(toIndex, 0, item)
      saveActions()
    }
  }

  const getActionById = (actionId: string) => {
    return actions.value.find(a => a.id === actionId)
  }

  const validateAction = (action: Partial<AIAction>): string[] => {
    const errors: string[] = []
    
    if (!action.name?.trim()) {
      errors.push('Name is required')
    }
    
    if (!action.prompt?.trim()) {
      errors.push('Prompt is required')
    }
    
    if (action.name && actions.value.some(a => a.name === action.name && a.id !== action.id)) {
      errors.push('An action with this name already exists')
    }
    
    return errors
  }

  // Initialize store
  loadActions()

  return {
    // State
    actions,
    isLoaded,
    
    // Getters
    enabledActions,
    customActions,
    defaultActions,
    
    // Actions
    loadActions,
    saveActions,
    updateAction,
    addCustomAction,
    removeAction,
    toggleAction,
    resetToDefaults,
    duplicateAction,
    moveAction,
    getActionById,
    validateAction
  }
}) 