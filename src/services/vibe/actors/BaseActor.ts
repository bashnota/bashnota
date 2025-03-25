import { ActorType, type ActorConfig, type VibeTask, DatabaseEntryType, type DatabaseTable, type DatabaseEntry } from '@/types/vibe'
import { useVibeStore } from '@/stores/vibeStore'
import { aiService, supportedProviders } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { notaExtensionService } from '@/services/notaExtensionService'
import { type Editor } from '@tiptap/core'
import { logger } from '@/services/logger'
import { vibeDB } from '@/services/vibeDB'

/**
 * Base class for all Vibe actors
 */
export abstract class BaseActor {
  protected config: ActorConfig
  protected vibeStore = useVibeStore()
  private actorLogger: any;
  
  // Static properties for rate limiting across all actor instances
  private static lastApiCallTime = 0
  private static minTimeBetweenCalls = 1000 // 1 second minimum between API calls
  private static callQueue: (() => Promise<any>)[] = []
  private static isProcessingQueue = false
  
  constructor(protected actorType: ActorType) {
    // Default configuration can be overridden by subclasses
    this.config = {
      enabled: true,
      modelId: 'default',
      maxTokens: 2000,
      temperature: 0.7
    }
    
    // Create a logger specific to this actor type
    this.actorLogger = logger.createPrefixedLogger(actorType);
  }
  
  // Static method to wait for the throttle period
  private static async waitForThrottle(): Promise<void> {
    const now = Date.now()
    const timeSinceLastCall = now - this.lastApiCallTime
    
    if (timeSinceLastCall < this.minTimeBetweenCalls) {
      const waitTime = this.minTimeBetweenCalls - timeSinceLastCall
      logger.debug(`Rate limiting: Waiting ${waitTime}ms before next API call`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastApiCallTime = Date.now()
  }
  
  // Static method to process the queue of API calls
  private static async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    
    try {
      while (this.callQueue.length > 0) {
        await this.waitForThrottle()
        const nextCall = this.callQueue.shift()
        if (nextCall) {
          await nextCall()
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }
  
  // Static method to enqueue an API call
  private static async enqueueApiCall<T>(apiCallFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.callQueue.push(async () => {
        try {
          const result = await apiCallFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      // Start processing the queue if it's not already being processed
      if (!this.isProcessingQueue) {
        this.processQueue()
      }
    })
  }
  
  /**
   * Executes a task, updating its status and storing the result
   * @param task Task to execute
   * @returns Task result
   */
  public async executeTask(task: VibeTask, editor?: Editor): Promise<any> {
    if (!this.config.enabled) {
      throw new Error(`Actor ${this.actorType} is disabled`)
    }
    
    // Load the latest config from the vibeStore
    await this.loadActorConfig();
    
    // Keep track of whether we set the editor in this method
    const setEditorInMethod = !!editor && !notaExtensionService.hasEditor();
    
    // Set the editor reference in the extension service if provided
    if (editor) {
      this.actorLogger.debug(`Setting editor instance for task ${task.id}`)
      notaExtensionService.setEditor(editor)
    }
    
    try {
      // Update task status to in progress
      await this.vibeStore.updateTask(task.boardId, task.id, {
        status: 'in_progress',
        startedAt: new Date()
      })
      
      // Check if editor is still available before executing
      if (!notaExtensionService.hasEditor() && editor) {
        this.actorLogger.debug(`Re-setting editor instance for task ${task.id} as it was lost`)
        notaExtensionService.setEditor(editor)
      }
      
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
      this.actorLogger.error(`Error executing task (${task.id}):`, error)
      
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
      if (setEditorInMethod) {
        this.actorLogger.debug(`Clearing editor instance after task ${task.id}`)
        notaExtensionService.clearEditor()
      }
    }
  }
  
  /**
   * Load the actor configuration from the vibeStore and database
   */
  private async loadActorConfig(): Promise<void> {
    try {
      // First, get config from vibeStore
      const storeConfig = this.vibeStore.getActorConfig(this.actorType);
      if (storeConfig) {
        this.config = { ...this.config, ...storeConfig };
      }
      
      // Then, try to get the latest config from the database
      try {
        const dbConfig = await vibeDB.actorConfigs.get(this.actorType);
        if (dbConfig) {
          // Update config with the database values, preserving any memory-only properties
          this.config = { ...this.config, ...dbConfig };
          this.actorLogger.debug(`Loaded config for ${this.actorType} from database`);
        }
      } catch (dbError) {
        this.actorLogger.warn(`Could not load config for ${this.actorType} from database:`, dbError);
      }
    } catch (error) {
      this.actorLogger.error(`Error loading config for ${this.actorType}:`, error);
    }
  }
  
  /**
   * Update the actor's custom instructions
   * @param instructions The new instructions
   * @returns Whether the update was successful
   */
  public async updateInstructions(instructions: string): Promise<boolean> {
    try {
      // Update the instructions in memory
      this.config.customInstructions = instructions;
      
      // Update the actor in the database
      await vibeDB.actorConfigs.update(this.actorType, {
        customInstructions: instructions,
        updatedAt: new Date()
      });
      
      // Also update in the vibeStore
      const storeConfig = this.vibeStore.getActorConfig(this.actorType);
      if (storeConfig) {
        storeConfig.customInstructions = instructions;
        // Update the config in the store
        this.vibeStore.updateActorConfig(this.actorType, storeConfig);
      }
      
      this.actorLogger.debug(`Updated instructions for actor ${this.actorType}`);
      return true;
    } catch (error) {
      this.actorLogger.error(`Error updating instructions for actor ${this.actorType}:`, error);
      return false;
    }
  }
  
  /**
   * Generates text completion using the configured AI service
   * @param prompt The prompt to generate text from
   * @returns The generated text
   */
  protected async generateCompletion(prompt: string): Promise<string> {
    // Get AI settings
    const aiSettingsStore = useAISettingsStore()
    const providerId = aiSettingsStore.settings.preferredProviderId
    const provider = supportedProviders.find(p => p.id === providerId)
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }
    
    // Get API key from AI settings store
    const apiKey = aiSettingsStore.getApiKey(providerId)
    
    this.actorLogger.debug(`Using AI provider: ${provider.name}`)
    
    // Get model-specific settings for Gemini
    const modelId = providerId === 'gemini' ? aiSettingsStore.settings.geminiModel : undefined
    const safetyThreshold = providerId === 'gemini' ? aiSettingsStore.settings.geminiSafetyThreshold : undefined
    
    // Use our rate limiting mechanism by wrapping the API call
    const response = await BaseActor.enqueueApiCall(() => {
      return aiService.generateText(
        providerId,
        apiKey,
        {
          prompt,
          maxTokens: this.config.maxTokens || 2000,
          temperature: this.config.temperature || 0.7
        },
        modelId,
        safetyThreshold
      )
    })
    
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
   * Safely insert content to the editor if available
   * This is a helper method that actors can use instead of direct notaExtensionService calls
   * @param content The content to insert
   * @returns True if insertion was successful, false otherwise
   */
  protected safelyInsertContent(content: any): boolean {
    try {
      if (!notaExtensionService.hasEditor()) {
        this.actorLogger.warn(`Cannot insert content, no editor instance available`)
        return false
      }
      
      return notaExtensionService.insertContent(content)
    } catch (error) {
      this.actorLogger.error(`Error inserting content:`, error)
      return false
    }
  }

  /**
   * Safely execute an editor command if editor is available
   * @param commandName Command to execute
   * @param params Parameters for the command
   * @returns Result of the command or false if editor not available
   */
  protected safelyExecuteCommand<T = boolean>(commandName: string, params: any = {}): T | false {
    try {
      if (!notaExtensionService.hasEditor()) {
        this.actorLogger.warn(`Cannot execute command ${commandName}, no editor instance available`)
        return false as any
      }
      
      return notaExtensionService.executeCommand<T>(commandName, params)
    } catch (error) {
      this.actorLogger.error(`Error executing command ${commandName}:`, error)
      return false as any
    }
  }

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