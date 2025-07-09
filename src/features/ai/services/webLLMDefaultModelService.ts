import { logger } from '@/services/logger'
import { toast } from '@/ui/toast'
import type { WebLLMModelInfo } from './types'

export interface DefaultModelConfig {
  enabled: boolean
  modelId: string
  autoLoadOnRequest: boolean
  preferSmallModels: boolean
  fallbackStrategy: 'smallest' | 'fastest' | 'none'
}

export interface ModelSelectionCriteria {
  preferredSize: 'small' | 'medium' | 'large'
  preferInstructTuned: boolean
  maxDownloadSize: number // in GB
  excludeExperimental: boolean
}

/**
 * Service for managing WebLLM default model selection and auto-loading
 */
export class WebLLMDefaultModelService {
  private static instance: WebLLMDefaultModelService | null = null
  
  private constructor() {}
  
  static getInstance(): WebLLMDefaultModelService {
    if (!WebLLMDefaultModelService.instance) {
      WebLLMDefaultModelService.instance = new WebLLMDefaultModelService()
    }
    return WebLLMDefaultModelService.instance
  }

  /**
   * Get default model configuration from settings
   */
  getDefaultModelConfig(): DefaultModelConfig {
    try {
      const saved = localStorage.getItem('webllm-default-model-config')
      if (saved) {
        return { ...this.getDefaultConfig(), ...JSON.parse(saved) }
      }
    } catch (error) {
      logger.error('Error loading default model config:', error)
    }
    return this.getDefaultConfig()
  }

  /**
   * Save default model configuration
   */
  saveDefaultModelConfig(config: Partial<DefaultModelConfig>): void {
    try {
      const currentConfig = this.getDefaultModelConfig()
      const newConfig = { ...currentConfig, ...config }
      localStorage.setItem('webllm-default-model-config', JSON.stringify(newConfig))
      logger.info('Default model config saved:', newConfig)
    } catch (error) {
      logger.error('Error saving default model config:', error)
    }
  }

  /**
   * Select the best default model based on criteria
   */
  selectBestDefaultModel(
    models: WebLLMModelInfo[], 
    criteria?: Partial<ModelSelectionCriteria>
  ): WebLLMModelInfo | null {
    if (!models || models.length === 0) {
      return null
    }

    const finalCriteria: ModelSelectionCriteria = {
      preferredSize: 'small',
      preferInstructTuned: true,
      maxDownloadSize: 8, // 8GB max by default
      excludeExperimental: true,
      ...criteria
    }

    logger.info('Selecting best default model with criteria:', finalCriteria)

    // Filter models based on criteria
    let candidates = models.filter(model => {
      // Filter by download size
      const sizeInGB = this.extractSizeInGB(model.downloadSize)
      if (sizeInGB > finalCriteria.maxDownloadSize) {
        return false
      }

      // Filter experimental models if requested
      if (finalCriteria.excludeExperimental && this.isExperimentalModel(model)) {
        return false
      }

      return true
    })

    if (candidates.length === 0) {
      logger.warn('No models match the criteria, falling back to all models')
      candidates = models
    }

    // Sort by preference
    candidates.sort((a, b) => {
      // Prefer instruction-tuned models
      if (finalCriteria.preferInstructTuned) {
        const aIsInstruct = this.isInstructionTuned(a)
        const bIsInstruct = this.isInstructionTuned(b)
        if (aIsInstruct && !bIsInstruct) return -1
        if (!aIsInstruct && bIsInstruct) return 1
      }

      // Prefer models by size category
      const aSize = this.getModelSizeCategory(a)
      const bSize = this.getModelSizeCategory(b)
      const sizePreference = this.getSizePreferenceScore(aSize, finalCriteria.preferredSize)
      const bSizePreference = this.getSizePreferenceScore(bSize, finalCriteria.preferredSize)
      
      if (sizePreference !== bSizePreference) {
        return sizePreference - bSizePreference
      }

      // Sort by actual size (smaller first for same category)
      const aSizeGB = this.extractSizeInGB(a.downloadSize)
      const bSizeGB = this.extractSizeInGB(b.downloadSize)
      return aSizeGB - bSizeGB
    })

    const selected = candidates[0]
    logger.info('Selected best default model:', selected?.id)
    return selected
  }

  /**
   * Get recommended models organized by use case
   */
  getRecommendedModels(models: WebLLMModelInfo[]): {
    fastest: WebLLMModelInfo | null
    balanced: WebLLMModelInfo | null
    highest_quality: WebLLMModelInfo | null
    smallest: WebLLMModelInfo | null
  } {
    const recommendations = {
      fastest: null as WebLLMModelInfo | null,
      balanced: null as WebLLMModelInfo | null,
      highest_quality: null as WebLLMModelInfo | null,
      smallest: null as WebLLMModelInfo | null
    }

    if (!models || models.length === 0) {
      return recommendations
    }

    // Smallest model
    const sortedBySize = [...models].sort((a, b) => 
      this.extractSizeInGB(a.downloadSize) - this.extractSizeInGB(b.downloadSize)
    )
    recommendations.smallest = sortedBySize[0]

    // Fastest (usually smaller instruction-tuned models)
    const fastCandidates = models.filter(m => 
      this.getModelSizeCategory(m) === 'small' && this.isInstructionTuned(m)
    )
    recommendations.fastest = fastCandidates.length > 0 ? fastCandidates[0] : recommendations.smallest

    // Balanced (medium size, instruction-tuned)
    const balancedCandidates = models.filter(m => 
      this.getModelSizeCategory(m) === 'medium' && this.isInstructionTuned(m)
    )
    recommendations.balanced = balancedCandidates.length > 0 ? balancedCandidates[0] : recommendations.fastest

    // Highest quality (largest available)
    const qualityCandidates = models.filter(m => this.isInstructionTuned(m))
    if (qualityCandidates.length > 0) {
      const sortedByQuality = qualityCandidates.sort((a, b) => 
        this.extractSizeInGB(b.downloadSize) - this.extractSizeInGB(a.downloadSize)
      )
      recommendations.highest_quality = sortedByQuality[0]
    }

    return recommendations
  }

  /**
   * Check if a model should be auto-loaded on request
   */
  shouldAutoLoad(currentModel: string | null): boolean {
    const config = this.getDefaultModelConfig()
    
    // Don't auto-load if disabled
    if (!config.enabled || !config.autoLoadOnRequest) {
      return false
    }

    // Don't auto-load if a model is already loaded
    if (currentModel) {
      return false
    }

    // 🔥 ENHANCED: Auto-load if no model is loaded, even without a configured modelId
    // The provider will auto-select a suitable model if none is configured
    return true
  }

  /**
   * Get the model ID that should be auto-loaded
   */
  getAutoLoadModelId(): string | null {
    const config = this.getDefaultModelConfig()
    return config.enabled && config.modelId ? config.modelId : null
  }

  // Private helper methods

  private getDefaultConfig(): DefaultModelConfig {
    return {
      enabled: true,
      modelId: '',
      autoLoadOnRequest: true,
      preferSmallModels: true,
      fallbackStrategy: 'smallest'
    }
  }

  private extractSizeInGB(sizeString: string): number {
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2]
      return unit === 'GB' ? value : value / 1024
    }
    return 0
  }

  private isInstructionTuned(model: WebLLMModelInfo): boolean {
    const indicators = ['instruct', '-it', 'chat', 'assistant', 'instruction']
    const modelText = `${model.id} ${model.name || ''} ${model.description || ''}`.toLowerCase()
    return indicators.some(indicator => modelText.includes(indicator))
  }

  private isExperimentalModel(model: WebLLMModelInfo): boolean {
    const experimentalIndicators = ['experimental', 'beta', 'alpha', 'dev', 'test']
    const modelText = `${model.id} ${model.name || ''} ${model.description || ''}`.toLowerCase()
    return experimentalIndicators.some(indicator => modelText.includes(indicator))
  }

  private getModelSizeCategory(model: WebLLMModelInfo): 'small' | 'medium' | 'large' {
    const sizeInGB = this.extractSizeInGB(model.downloadSize)
    
    if (sizeInGB <= 4) return 'small'
    if (sizeInGB <= 8) return 'medium'
    return 'large'
  }

  private getSizePreferenceScore(size: 'small' | 'medium' | 'large', preferred: 'small' | 'medium' | 'large'): number {
    const sizeOrder = { small: 0, medium: 1, large: 2 }
    const preferredIndex = sizeOrder[preferred]
    const currentIndex = sizeOrder[size]
    
    // Return distance from preferred size (lower is better)
    return Math.abs(currentIndex - preferredIndex)
  }
}

// Export singleton instance
export const webLLMDefaultModelService = WebLLMDefaultModelService.getInstance() 