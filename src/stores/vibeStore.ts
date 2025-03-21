import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { type ActorConfig, type VibeTask, type TaskBoard, ActorType, type DatabaseTable, type DatabaseEntry, DatabaseEntryType } from '@/types/vibe'

/**
 * Store for managing Vibe tasks and boards
 */
export const useVibeStore = defineStore('vibe', () => {
  // State
  const boards = ref<TaskBoard[]>([])
  const tables = ref<DatabaseTable[]>([])
  const entries = ref<DatabaseEntry[]>([])
  const actorConfigs = ref<Record<ActorType, ActorConfig>>({
    [ActorType.CODER]: {
      enabled: true,
      modelId: 'anthropic/claude-3-opus',
      temperature: 0.1,
      maxTokens: 4000,
    },
    [ActorType.RESEARCHER]: {
      enabled: true,
      modelId: 'anthropic/claude-3-opus',
      temperature: 0.3,
      maxTokens: 8000,
    },
    [ActorType.ANALYST]: {
      enabled: true,
      modelId: 'anthropic/claude-3-opus',
      temperature: 0.2,
      maxTokens: 4000,
    },
    [ActorType.PLANNER]: {
      enabled: true,
      modelId: 'anthropic/claude-3-opus',
      temperature: 0.2,
      maxTokens: 4000,
      customInstructions: 'Create detailed, logical plans with clear dependencies between tasks.'
    },
    [ActorType.COMPOSER]: {
      enabled: true,
      modelId: 'anthropic/claude-3-opus',
      temperature: 0.1,
      maxTokens: 2000,
      customInstructions: 'Orchestrate and coordinate task execution efficiently.'
    },
  })

  // Actions
  /**
   * Create a new task board
   * @param options Board creation options with query
   * @returns The created board
   */
  function createBoard(options: { query: string }): TaskBoard {
    console.log('Creating board with options:', options)
    
    const board: TaskBoard = {
      id: uuidv4(),
      title: options.query,
      tasks: [],
      createdAt: new Date(),
    }
    
    boards.value.push(board)
    return board
  }
  
  /**
   * Get a board by ID
   * @param boardId Board ID
   * @returns The board or undefined if not found
   */
  function getBoard(boardId: string): TaskBoard | undefined {
    return boards.value.find(board => board.id === boardId)
  }
  
  /**
   * Create a new task in a board
   * @param boardId Board ID
   * @param task Task data
   * @returns The created task
   */
  function createTask(
    boardId: string, 
    task: Omit<VibeTask, 'id' | 'boardId' | 'status' | 'createdAt'>
  ): VibeTask {
    const board = getBoard(boardId)
    if (!board) {
      throw new Error(`Board ${boardId} not found`)
    }
    
    const newTask: VibeTask = {
      id: uuidv4(),
      boardId,
      status: 'pending',
      createdAt: new Date(),
      ...task,
    }
    
    board.tasks.push(newTask)
    return newTask
  }
  
  /**
   * Get a task from a board
   * @param boardId Board ID
   * @param taskId Task ID
   * @returns The task or undefined if not found
   */
  function getTaskFromBoard(boardId: string, taskId: string): VibeTask | undefined {
    const board = getBoard(boardId)
    if (!board) return undefined
    
    return board.tasks.find(task => task.id === taskId)
  }
  
  /**
   * Update a task
   * @param boardId Board ID
   * @param taskId Task ID
   * @param updates Updates to apply to the task
   * @returns The updated task
   */
  function updateTask(
    boardId: string,
    taskId: string,
    updates: Partial<VibeTask>
  ): VibeTask | undefined {
    const board = getBoard(boardId)
    if (!board) return undefined
    
    const taskIndex = board.tasks.findIndex(task => task.id === taskId)
    if (taskIndex === -1) return undefined
    
    // Apply updates
    board.tasks[taskIndex] = {
      ...board.tasks[taskIndex],
      ...updates,
    }
    
    return board.tasks[taskIndex]
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
  function updateActorConfig(actorType: ActorType, config: Partial<ActorConfig>): void {
    actorConfigs.value[actorType] = {
      ...actorConfigs.value[actorType],
      ...config,
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

  return {
    boards,
    actorConfigs,
    createBoard,
    getBoard,
    createTask,
    getTaskFromBoard,
    updateTask,
    deleteTask,
    getActorConfig,
    updateActorConfig,
    tables,
    entries,
    createTable,
    getTablesForBoard,
    getTable,
    createEntry,
    getEntriesForTable,
    getEntriesForTask,
    getEntry,
    updateEntry,
    deleteEntry
  }
}) 