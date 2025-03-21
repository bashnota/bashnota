import { ActorType, type ActorConfig, type VibeTask, DatabaseEntryType, type DatabaseTable, type DatabaseEntry } from '@/types/vibe'
import { useVibeStore } from '@/stores/vibeStore'
import { aiService, supportedProviders } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { notaExtensionService } from '@/services/notaExtensionService'
import { type Editor } from '@tiptap/core'

/**
 * Base class for all Vibe actors
 */
export abstract class BaseActor {
  protected config: ActorConfig
  protected vibeStore = useVibeStore()
  
  constructor(protected actorType: ActorType) {
    this.config = this.vibeStore.getActorConfig(actorType)
  }
  
  /**
   * Executes a task assigned to this actor
   * @param task The task to execute
   * @param editor Optional editor instance for interacting with the document
   *               (can be omitted if using notaExtensionService centrally)
   * @returns The result of the task execution
   */
  public async executeTask(task: VibeTask, editor?: Editor): Promise<any> {
    if (!this.config.enabled) {
      throw new Error(`Actor ${this.actorType} is disabled`)
    }
    
    // Set the editor reference in the extension service if provided
    if (editor) {
      notaExtensionService.setEditor(editor)
    }
    
    try {
      // Update task status to in progress
      await this.vibeStore.updateTask(task.boardId, task.id, {
        status: 'in_progress',
        startedAt: new Date()
      })
      
      // Execute the task
      const result = await this.execute(task)
      
      // Update task with result
      await this.vibeStore.updateTask(task.boardId, task.id, {
        status: 'completed',
        result,
        completedAt: new Date()
      })
      
      return result
    } catch (error: unknown) {
      console.error(`Error executing task (${task.id}):`, error)
      
      // Update task with error
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.vibeStore.updateTask(task.boardId, task.id, {
        status: 'failed',
        error: errorMessage
      })
      
      throw error
    } finally {
      // Clear the editor reference from the extension service
      // only if we set it in this method (to avoid clearing it if it was set elsewhere)
      if (editor) {
        notaExtensionService.clearEditor()
      }
    }
  }
  
  /**
   * Generates AI completions using the actor's configured model
   * @param prompt The prompt to send to the AI
   * @returns The AI completion
   */
  protected async generateCompletion(prompt: string): Promise<string> {
    // Get AI settings store
    const aiSettingsStore = useAISettingsStore()
    
    // Use the preferred provider from global settings
    const providerId = aiSettingsStore.settings.preferredProviderId
    const provider = supportedProviders.find(p => p.id === providerId)
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }
    
    // Get API key from AI settings store
    const apiKey = aiSettingsStore.getApiKey(providerId)
    
    console.log(`Using AI provider: ${provider.name}`)
    
    // Call generateText directly on aiService
    const response = await aiService.generateText(
      providerId,
      apiKey,
      {
        prompt,
        maxTokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7
      }
    )
    
    return response.text
  }
  
  /**
   * Executes the specific actor logic for a task
   * This method should be implemented by each actor subclass
   * @param task The task to execute
   * @returns The result of the task execution
   */
  protected abstract execute(task: VibeTask): Promise<any>

  /**
   * Create a table in the task board database
   * @param boardId Board ID
   * @param name Table name
   * @param description Table description
   * @param schema Table schema
   * @returns The created table
   */
  protected createTable(
    boardId: string,
    name: string,
    description: string,
    schema: Record<string, string>
  ): DatabaseTable {
    return this.vibeStore.createTable(boardId, name, description, schema)
  }

  /**
   * Create an entry in a table
   * @param tableId Table ID
   * @param taskId Task ID
   * @param type Entry type
   * @param key Entry key
   * @param value Entry value
   * @param metadata Optional metadata
   * @returns The created entry
   */
  protected createEntry(
    tableId: string,
    taskId: string,
    type: DatabaseEntryType,
    key: string,
    value: any,
    metadata?: Record<string, any>
  ): DatabaseEntry {
    return this.vibeStore.createEntry(tableId, taskId, type, key, value, metadata)
  }

  /**
   * Get all entries for a table
   * @param tableId Table ID
   * @returns Entries for the table
   */
  protected getEntriesForTable(tableId: string): DatabaseEntry[] {
    return this.vibeStore.getEntriesForTable(tableId)
  }

  /**
   * Get all entries for a task
   * @param taskId Task ID
   * @returns Entries created by the task
   */
  protected getEntriesForTask(taskId: string): DatabaseEntry[] {
    return this.vibeStore.getEntriesForTask(taskId)
  }
} 