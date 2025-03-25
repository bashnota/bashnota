import Dexie, { type Table } from 'dexie'
import { type ActorConfig, type CustomActor, ActorType } from '@/types/vibe'

/**
 * Stored actor configuration with ID
 */
export interface StoredActorConfig extends ActorConfig {
  id: string
  name: string
  description: string
  isDefault: boolean
  updatedAt: Date
}

// Default prompts for built-in actors to initialize the database
const defaultPrompts: Record<ActorType, string> = {
  [ActorType.PLANNER]: 'You are a strategic Planning AI assistant that creates detailed, actionable work plans for complex tasks. You excel at breaking down large objectives into logical, manageable subtasks.\n\nYour mission is to create a comprehensive, executable plan to accomplish this task effectively. The plan should be optimized for completeness, logical sequencing, dependency management, and appropriate task assignment.',
  [ActorType.RESEARCHER]: 'You are an expert Research AI assistant that excels at gathering, synthesizing, and organizing information on any topic. You provide comprehensive and factual information with proper citations when available.\n\nYour goal is to collect relevant information about the topic and present it in a clear, well-structured format that addresses all aspects of the query.',
  [ActorType.ANALYST]: 'You are an analytical AI assistant that specializes in examining data, identifying patterns, and drawing insightful conclusions. You excel at statistical analysis, data interpretation, and generating meaningful visualizations.\n\nYour task is to analyze the provided information critically, identify key trends and patterns, and provide actionable insights based on your analysis.',
  [ActorType.CODER]: 'You are an expert Coding AI assistant that specializes in generating clean, efficient, and well-documented code. You excel at implementing algorithms, debugging issues, and providing practical software solutions.\n\nYour task is to create functional, optimized code that follows best practices and solves the specific programming challenge presented to you.',
  [ActorType.COMPOSER]: 'You are an Orchestration AI assistant that coordinates and composes various elements into cohesive outputs. You excel at organizing information, structuring content, and ensuring consistency across different components.\n\nYour task is to take various inputs and compose them into a unified, coherent result that meets the specified requirements and goals.',
  [ActorType.WRITER]: 'You are a professional Writer AI assistant that specializes in creating comprehensive, well-structured reports in markdown format. You excel at organizing information logically, incorporating visualizations effectively, and presenting complex topics in an accessible manner.\n\nYour task is to create a cohesive report that integrates findings from various sources, includes appropriate visualizations with subfigure arrangements where helpful, and presents the information in a polished, professional format.',
  [ActorType.CUSTOM]: 'You are a custom AI assistant with specialized capabilities. Your role is to perform the specific task assigned to you based on your custom instructions.'
}

// Default descriptions for built-in actors
const actorDescriptions: Record<ActorType, string> = {
  [ActorType.PLANNER]: 'Creates detailed task plans with logical dependencies and workflow sequencing',
  [ActorType.RESEARCHER]: 'Specializes in gathering information, literature reviews, and comprehensive knowledge synthesis',
  [ActorType.ANALYST]: 'Analyzes data, creates visualizations, and extracts insights from information',
  [ActorType.CODER]: 'Generates code, implements algorithms, and provides technical solutions',
  [ActorType.COMPOSER]: 'Orchestrates and coordinates execution across multiple tasks',
  [ActorType.WRITER]: 'Creates comprehensive reports with markdown formatting and visualization integration',
  [ActorType.CUSTOM]: 'User-defined custom actor with specialized instructions'
}

/**
 * Database for Vibe actors
 */
export class VibeDB extends Dexie {
  actorConfigs!: Table<StoredActorConfig>
  customActors!: Table<CustomActor>

  constructor() {
    super('vibeDB')
    this.version(1).stores({
      actorConfigs: 'id, name, enabled, isDefault',
      customActors: 'id, name, enabled, updatedAt'
    })
  }

  /**
   * Initialize default actor configurations if they don't exist
   * @param defaultConfigs Default actor configurations
   */
  async initializeDefaults(defaultConfigs: Record<string, ActorConfig>) {
    // Check if we have any default configs already
    const existingDefaults = await this.actorConfigs.where('isDefault').equals(1).toArray()
    
    if (existingDefaults.length === 0) {
      // If no defaults exist, add them all with default prompts
      const configsToAdd: StoredActorConfig[] = Object.entries(defaultConfigs).map(([id, config]) => ({
        id,
        name: id,
        description: actorDescriptions[id as ActorType] || '',
        isDefault: true, // This will be converted to 1 for indexing purposes
        updatedAt: new Date(),
        customInstructions: defaultPrompts[id as ActorType] || '',
        ...config
      }))
      
      await this.actorConfigs.bulkAdd(configsToAdd)
    } else {
      // Update existing defaults with any new properties while preserving custom changes
      for (const [id, config] of Object.entries(defaultConfigs)) {
        const existingConfig = await this.actorConfigs.get(id)
        
        if (!existingConfig) {
          // This is a new default config
          await this.actorConfigs.add({
            id,
            name: id,
            description: actorDescriptions[id as ActorType] || '',
            isDefault: true,
            updatedAt: new Date(),
            customInstructions: defaultPrompts[id as ActorType] || '',
            ...config
          })
        } else {
          // Update only the default properties that aren't already set
          const updatedConfig = {
            ...existingConfig,
            // Only update properties that haven't been customized
            modelId: existingConfig.modelId || config.modelId,
            maxTokens: existingConfig.maxTokens || config.maxTokens,
            temperature: existingConfig.temperature || config.temperature,
            // Always ensure enabled flag exists
            enabled: existingConfig.enabled !== undefined ? existingConfig.enabled : config.enabled,
            // Make sure the description exists
            description: existingConfig.description || actorDescriptions[id as ActorType] || '',
            // Only add a default prompt if one doesn't exist
            customInstructions: existingConfig.customInstructions || defaultPrompts[id as ActorType] || '',
            updatedAt: new Date()
          }
          
          await this.actorConfigs.update(id, updatedConfig)
        }
      }
    }
  }
}

export const vibeDB = new VibeDB() 