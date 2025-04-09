import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { ActorType, TaskPriority, DatabaseEntryType } from '@/types/vibe'
import type { TaskStatus, ActorConfig, VibeTask, TaskBoard, DatabaseTable, DatabaseEntry, CustomActor } from '@/types/vibe'
import { logger } from '@/services/logger'
import { vibeDB, type StoredActorConfig } from '@/services/vibeDB'
import { defaultActorConfigs, actorDescriptions } from '@/config/actorDefaults'

/**
 * Store for managing Vibe tasks and boards
 */
export const useVibeStore = defineStore('vibe', () => {
  // State
  const boards = ref<TaskBoard[]>([])
  const tables = ref<DatabaseTable[]>([])
  const entries = ref<DatabaseEntry[]>([])
  const customActors = ref<CustomActor[]>([])
  const actorConfigs = ref<Record<ActorType, ActorConfig>>(defaultActorConfigs)
  const initialized = ref(false)
  
  /**
   * Save the current state to localStorage
   */
  async function saveToLocalStorage() {
    try {
      localStorage.setItem('vibe-boards', JSON.stringify(boards.value))
      localStorage.setItem('vibe-tables', JSON.stringify(tables.value))
      localStorage.setItem('vibe-entries', JSON.stringify(entries.value))
      logger.log('Vibe state saved to localStorage')
    } catch (error) {
      logger.error('Failed to save vibe state to localStorage:', error)
    }
  }
  
  /**
   * Load actor configurations from the database
   */
  async function loadActorConfigs() {
    try {
      // First initialize default configs if they don't exist
      await vibeDB.initializeDefaults()
      
      // Load all actor configs
      const storedConfigs = await vibeDB.actorConfigs.toArray()
      const storedActors = await vibeDB.customActors.toArray()
      
      // Convert stored configs to the actorConfigs format
      const newActorConfigs: Record<ActorType, ActorConfig> = { ...defaultActorConfigs }
      
      for (const config of storedConfigs) {
        if (config.id in ActorType) {
          newActorConfigs[config.id as ActorType] = {
            enabled: config.enabled,
            modelId: config.modelId,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            customInstructions: config.customInstructions
          }
        }
      }
      
      // Update state
      actorConfigs.value = newActorConfigs
      customActors.value = storedActors
      
      initialized.value = true
      logger.log('Actor configurations loaded from database')
    } catch (error: unknown) {
      logger.error('Error loading actor configurations:', error)
      throw error
    }
  }
  
  /**
   * Restore all actors to their default values
   */
  async function restoreToDefaults() {
    try {
      // Restore defaults in the database
      await vibeDB.restoreToDefaults()
      
      // Reload configurations
      await loadActorConfigs()
      
      logger.log('All actors restored to default values')
    } catch (error) {
      logger.error('Error restoring actors to defaults:', error)
      throw error
    }
  }
  
  /**
   * Save the current actor configurations to the database
   */
  async function saveActorConfigs() {
    try {
      // Convert actorConfigs to StoredActorConfig format
      const configsToStore: StoredActorConfig[] = Object.entries(actorConfigs.value)
        .map(([actorType, config]) => ({
          id: actorType,
          name: actorType,
          description: actorDescriptions[actorType as ActorType] || '',
          isDefault: true,
          updatedAt: new Date(),
          ...config
        }))
      
      // Update the database
      await vibeDB.transaction('rw', vibeDB.actorConfigs, async () => {
        for (const config of configsToStore) {
          await vibeDB.actorConfigs.put(config)
        }
      })
      
      logger.log('Actor configurations saved to database')
    } catch (error) {
      logger.error('Error saving actor configurations:', error)
      throw error
    }
  }
  
  /**
   * Get a description for an actor type
   * @param actorType The actor type
   * @returns The actor description
   */
  function getActorDescription(actorType: ActorType): string {
    const descriptions: Record<ActorType, string> = {
      [ActorType.PLANNER]: 'Creates detailed task plans with logical dependencies and workflow sequencing',
      [ActorType.RESEARCHER]: 'Specializes in gathering information, literature reviews, and comprehensive knowledge synthesis',
      [ActorType.ANALYST]: 'Analyzes data, creates visualizations, and extracts insights from information',
      [ActorType.CODER]: 'Generates code, implements algorithms, and provides technical solutions',
      [ActorType.COMPOSER]: 'Orchestrates and coordinates execution across multiple tasks',
      [ActorType.WRITER]: 'Creates comprehensive reports with markdown formatting and visualization integration',
      [ActorType.CUSTOM]: 'User-defined custom actor with specialized instructions'
    }
    
    return descriptions[actorType] || 'No description available'
  }

  // Actions
  /**
   * Create a new task board
   * @param options Board creation options with query and optional Jupyter config
   * @returns The created board
   */
  function createBoard(options: { 
    query: string,
    jupyterConfig?: {
      server: {
        ip: string
        port: string
        token: string
      }
      kernel: {
        name: string
        displayName: string
      }
    } | null
  }): TaskBoard {
    logger.log('Creating board with options:', options)
    
    const board: TaskBoard = {
      id: uuidv4(),
      title: options.query,
      tasks: [],
      createdAt: new Date(),
      jupyterConfig: options.jupyterConfig || undefined
    }
    
    boards.value.push(board)
    return board
  }
  
  /**
   * Get a board by id
   * @param id The id of the board to get
   * @returns The board with the given id
   */
  function getBoard(id: string): TaskBoard | null {
    if (!id) {
      console.error('[VibeStore] Cannot get board with undefined id')
      return null
    }

    const board = boards.value.find(board => board.id === id)
    
    if (board) {
      // Validate that all tasks have the correct boardId
      const fixedTasks = board.tasks.map(task => {
        if (task.boardId !== id) {
          console.warn(`[VibeStore] Task ${task.id} has incorrect boardId ${task.boardId}, fixing to ${id}`)
          return { ...task, boardId: id }
        }
        return task
      })
      
      // If any tasks were fixed, update the board
      if (fixedTasks.some((task, index) => task.boardId !== board.tasks[index].boardId)) {
        board.tasks = fixedTasks
        // Save changes to localStorage asynchronously
        saveToLocalStorage()
      }
    }
    
    return board || null
  }
  
  /**
   * Create a new task in a board
   * @param boardId Board ID
   * @param task Task data
   * @returns The created task
   */
  async function createTask(boardId: string, task: Partial<VibeTask>): Promise<string> {
    logger.log('createTask', { boardId, task })
    const board = getBoard(boardId)
    if (!board) {
      logger.error('Board not found', { boardId })
      throw new Error(`Board ${boardId} not found`)
    }

    const newTask: VibeTask = {
      id: task.id || uuidv4(),
      title: task.title || 'New Task',
      description: task.description || '',
      boardId: boardId,
      status: (task.status as TaskStatus) || 'pending',
      actorType: task.actorType || ActorType.CODER,
      priority: task.priority || TaskPriority.MEDIUM,
      dependencies: task.dependencies || [],
      createdAt: new Date(),
      metadata: task.metadata || {}
    }

    board.tasks.push(newTask)
    
    // Ensure task is persisted immediately
    await saveToLocalStorage()
    
    return newTask.id
  }
  
  /**
   * Get a task from a board
   * @param boardId The id of the board
   * @param taskId The id of the task
   * @returns The task or null if not found
   */
  function getTaskFromBoard(boardId: string, taskId: string): VibeTask | null {
    if (!boardId || !taskId) {
      console.error('[VibeStore] Cannot get task with undefined board or task id')
      return null
    }
    
    const board = getBoard(boardId)
    if (!board) {
      console.error(`[VibeStore] Board ${boardId} not found`)
      return null
    }
    
    const task = board.tasks.find(task => task.id === taskId)
    if (task) {
      // Ensure the task has the correct boardId
      if (task.boardId !== boardId) {
        console.warn(`[VibeStore] Task ${task.id} has incorrect boardId ${task.boardId}, fixing to ${boardId}`)
        task.boardId = boardId
        // Save changes to localStorage asynchronously
        saveToLocalStorage()
      }
      return task
    }
    
    return null
  }
  
  /**
   * Update a task
   * @param boardId Board ID
   * @param taskId Task ID
   * @param updates Updates to apply to the task
   * @returns The updated task
   */
  async function updateTask(boardId: string, taskId: string, updates: Partial<VibeTask>) {
    try {
      logger.log(`Updating task ${taskId} in board ${boardId}:`, updates)
      
      // Find the board index
      const boardIndex = boards.value.findIndex(b => b.id === boardId)
      if (boardIndex === -1) {
        logger.error(`Board ${boardId} not found when updating task ${taskId}`)
        throw new Error(`Board ${boardId} not found`)
      }

      // Find the task index
      const taskIndex = boards.value[boardIndex].tasks.findIndex(t => t.id === taskId)
      if (taskIndex === -1) {
        logger.error(`Task ${taskId} not found in board ${boardId}`)
        throw new Error(`Task ${taskId} not found in board ${boardId}`)
      }

      // Update the task
      const taskToUpdate = boards.value[boardIndex].tasks[taskIndex]
      const updatedTask = {
        ...taskToUpdate,
        ...updates
      }

      // Replace the task in the board
      boards.value[boardIndex].tasks[taskIndex] = updatedTask
      logger.log(`Task ${taskId} updated successfully`)
      
      await saveToLocalStorage()
      return updatedTask
    } catch (error) {
      logger.error('Error updating task:', error)
      throw error
    }
  }
  
  /**
   * Delete a task
   * @param boardId Board ID
   * @param taskId Task ID
   * @returns True if deleted, false if not found
   */
  function deleteTask(boardId: string, taskId: string): boolean {
    const board = getBoard(boardId)
    if (!board) return false
    
    const taskIndex = board.tasks.findIndex(task => task.id === taskId)
    if (taskIndex === -1) return false
    
    board.tasks.splice(taskIndex, 1)
    return true
  }
  
  /**
   * Get actor configuration
   * @param actorType Actor type
   * @returns Actor configuration
   */
  function getActorConfig(actorType: ActorType): ActorConfig {
    return actorConfigs.value[actorType]
  }
  
  /**
   * Update actor configuration
   * @param actorType Actor type
   * @param config Updated configuration
   */
  async function updateActorConfig(actorType: ActorType, config: Partial<ActorConfig>): Promise<void> {
    // Update in memory config
    actorConfigs.value[actorType] = {
      ...actorConfigs.value[actorType],
      ...config,
    }
    
    // Update in database
    try {
      // Get existing config or create a new one
      const existingConfig = await vibeDB.actorConfigs.get(actorType)
      
      if (existingConfig) {
        // Update existing config
        await vibeDB.actorConfigs.update(actorType, {
          ...existingConfig,
          ...config,
          updatedAt: new Date()
        })
      } else {
        // Create new config
        await vibeDB.actorConfigs.add({
          id: actorType,
          name: actorType,
          description: getActorDescription(actorType),
          isDefault: true,
          updatedAt: new Date(),
          ...actorConfigs.value[actorType] // Include full config
        })
      }
    } catch (error) {
      logger.error(`Error updating actor ${actorType} in database:`, error)
    }
  }
  
  /**
   * Create a new database table
   * @param boardId Board ID
   * @param name Table name
   * @param description Table description
   * @param schema Table schema
   * @returns The created table
   */
  function createTable(
    boardId: string,
    name: string,
    description: string,
    schema: Record<string, string>
  ): DatabaseTable {
    const table: DatabaseTable = {
      id: uuidv4(),
      boardId,
      name,
      description,
      schema,
      entries: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    tables.value.push(table)
    return table
  }
  
  /**
   * Get all tables for a board
   * @param boardId Board ID
   * @returns Tables for the board
   */
  function getTablesForBoard(boardId: string): DatabaseTable[] {
    return tables.value.filter(table => table.boardId === boardId)
  }
  
  /**
   * Get a table by ID
   * @param tableId Table ID
   * @returns The table or undefined if not found
   */
  function getTable(tableId: string): DatabaseTable | undefined {
    return tables.value.find(table => table.id === tableId)
  }
  
  /**
   * Create a new database entry
   * @param tableId Table ID
   * @param taskId Task ID
   * @param type Entry type
   * @param key Entry key
   * @param value Entry value
   * @param metadata Optional metadata
   * @returns The created entry
   */
  function createEntry(
    tableId: string,
    taskId: string,
    type: DatabaseEntryType,
    key: string,
    value: any,
    metadata?: Record<string, any>
  ): DatabaseEntry {
    const table = getTable(tableId)
    if (!table) {
      throw new Error(`Table ${tableId} not found`)
    }
    
    const entry: DatabaseEntry = {
      id: uuidv4(),
      boardId: table.boardId,
      tableId,
      taskId,
      type,
      key,
      value,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    entries.value.push(entry)
    table.entries.push(entry)
    return entry
  }
  
  /**
   * Get all entries for a table
   * @param tableId Table ID
   * @returns Entries for the table
   */
  function getEntriesForTable(tableId: string): DatabaseEntry[] {
    const table = getTable(tableId)
    if (!table) {
      throw new Error(`Table ${tableId} not found`)
    }
    
    return table.entries
  }
  
  /**
   * Get all entries for a task
   * @param taskId Task ID
   * @returns Entries created by the task
   */
  function getEntriesForTask(taskId: string): DatabaseEntry[] {
    return entries.value.filter(entry => entry.taskId === taskId)
  }
  
  /**
   * Get an entry by ID
   * @param entryId Entry ID
   * @returns The entry or undefined if not found
   */
  function getEntry(entryId: string): DatabaseEntry | undefined {
    return entries.value.find(entry => entry.id === entryId)
  }
  
  /**
   * Update an entry
   * @param entryId Entry ID
   * @param updates Updates to apply
   * @returns The updated entry
   */
  function updateEntry(
    entryId: string,
    updates: Partial<Omit<DatabaseEntry, 'id' | 'boardId' | 'taskId' | 'createdAt'>>
  ): DatabaseEntry | undefined {
    const entry = getEntry(entryId)
    if (!entry) return undefined
    
    // Apply updates
    Object.assign(entry, {
      ...updates,
      updatedAt: new Date()
    })
    
    return entry
  }
  
  /**
   * Delete an entry
   * @param entryId Entry ID
   * @returns True if deleted, false if not found
   */
  function deleteEntry(entryId: string): boolean {
    const entryIndex = entries.value.findIndex(entry => entry.id === entryId)
    if (entryIndex === -1) return false
    
    // Remove from entries
    const entry = entries.value[entryIndex]
    entries.value.splice(entryIndex, 1)
    
    // Remove from table
    const table = getTable(entry.tableId)
    if (table) {
      const tableEntryIndex = table.entries.findIndex(e => e.id === entryId)
      if (tableEntryIndex !== -1) {
        table.entries.splice(tableEntryIndex, 1)
      }
    }
    
    return true
  }

  /**
   * Add a custom actor
   * @param name Actor name
   * @param description Actor description
   * @param config Actor configuration
   * @returns The created custom actor
   */
  async function addCustomActor(name: string, description: string, config: ActorConfig): Promise<CustomActor> {
    const actor: CustomActor = {
      id: uuidv4(),
      name,
      description,
      config: {
        ...config,
        enabled: config.enabled ?? true,
        name,
        description,
        isCustom: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Add to in-memory store
    customActors.value.push(actor)
    
    // Add to database
    try {
      await vibeDB.customActors.add(actor)
    } catch (error) {
      logger.error('Error adding custom actor to database:', error)
    }
    
    return actor
  }

  /**
   * Update a custom actor
   * @param id Actor ID
   * @param updates Updates to apply
   * @returns The updated actor or undefined if not found
   */
  async function updateCustomActor(id: string, updates: Partial<Omit<CustomActor, 'id' | 'createdAt'>>): Promise<CustomActor | undefined> {
    // Update in memory
    const index = customActors.value.findIndex(actor => actor.id === id)
    if (index === -1) return undefined

    const actor = customActors.value[index]
    const updatedActor = {
      ...actor,
      ...updates,
      config: {
        ...actor.config,
        ...(updates.config || {}),
      },
      updatedAt: new Date()
    }

    customActors.value[index] = updatedActor
    
    // Update in database
    try {
      await vibeDB.customActors.update(id, updatedActor)
    } catch (error) {
      logger.error(`Error updating custom actor ${id} in database:`, error)
    }
    
    return updatedActor
  }

  /**
   * Remove a custom actor
   * @param id Actor ID
   * @returns True if actor was removed, false otherwise
   */
  async function removeCustomActor(id: string): Promise<boolean> {
    // Remove from memory
    const initialLength = customActors.value.length
    customActors.value = customActors.value.filter(actor => actor.id !== id)
    const removed = customActors.value.length < initialLength
    
    // Remove from database
    if (removed) {
      try {
        await vibeDB.customActors.delete(id)
      } catch (error) {
        logger.error(`Error removing custom actor ${id} from database:`, error)
      }
    }
    
    return removed
  }

  /**
   * Get a custom actor by ID
   * @param id Actor ID
   * @returns The actor or undefined if not found
   */
  function getCustomActor(id: string): CustomActor | undefined {
    return customActors.value.find(actor => actor.id === id)
  }

  /**
   * Get all custom actors
   * @returns Array of custom actors
   */
  function getCustomActors(): CustomActor[] {
    return customActors.value
  }

  /**
   * Get all enabled custom actors
   * @returns Array of enabled custom actors
   */
  function getEnabledCustomActors(): CustomActor[] {
    return customActors.value.filter(actor => actor.config.enabled)
  }

  /**
   * Delete a board and all its associated tasks and tables
   * @param boardId Board ID to delete
   * @returns True if the board was deleted
   */
  function deleteBoard(boardId: string): boolean {
    try {
      logger.log(`Deleting board ${boardId}`)
      
      // Find the board
      const boardIndex = boards.value.findIndex(board => board.id === boardId)
      if (boardIndex === -1) {
        logger.warn(`Board ${boardId} not found, cannot delete`)
        return false
      }
      
      // Delete all tasks from this board
      const boardTasks = boards.value[boardIndex].tasks
      for (const task of boardTasks) {
        deleteTask(boardId, task.id)
      }
      
      // Delete database tables for this board
      const boardTables = tables.value.filter(table => table.boardId === boardId)
      for (const table of boardTables) {
        // Remove entries for this table
        entries.value = entries.value.filter(entry => entry.tableId !== table.id)
      }
      
      // Remove the tables
      tables.value = tables.value.filter(table => table.boardId !== boardId)
      
      // Delete the board itself
      boards.value.splice(boardIndex, 1)
      
      // Save changes
      saveToLocalStorage()
      
      logger.log(`Board ${boardId} deleted successfully`)
      return true
    } catch (error) {
      logger.error(`Error deleting board ${boardId}:`, error)
      return false
    }
  }

  // Initialize on store creation
  if (!initialized.value) {
    loadActorConfigs()
  }

  // Return store
  return {
    // State
    boards,
    tables,
    entries,
    actorConfigs,
    customActors,
    
    // Actions
    createBoard,
    getBoard,
    deleteBoard,
    createTask,
    getTaskFromBoard,
    updateTask,
    deleteTask,
    getActorConfig,
    updateActorConfig,
    getActorDescription,
    createTable,
    getTablesForBoard,
    getTable,
    createEntry,
    getEntriesForTable,
    getEntriesForTask,
    getEntry,
    updateEntry,
    deleteEntry,
    addCustomActor,
    updateCustomActor,
    removeCustomActor,
    getCustomActor,
    getCustomActors,
    getEnabledCustomActors,
    loadActorConfigs,
    saveActorConfigs,
    restoreToDefaults,
    initialized,
    saveToLocalStorage
  }
}) 