/**
 * Actor types in the Vibe system
 */
export enum ActorType {
  CODER = 'coder',
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  PLANNER = 'planner',
  COMPOSER = 'composer'
}

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/**
 * Task in the Vibe system
 */
export interface VibeTask {
  id: string
  boardId: string
  title: string
  description: string
  actorType: ActorType
  status: TaskStatus
  dependencies?: string[]
  result?: any
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

/**
 * Configuration for an actor
 */
export interface ActorConfig {
  enabled: boolean
  modelId: string
  temperature?: number
  maxTokens?: number
  customInstructions?: string
}

/**
 * Board containing multiple tasks
 */
export interface TaskBoard {
  id: string
  title: string
  tasks: VibeTask[]
  createdAt: Date
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
  }
}

/**
 * Database entry types for actor communication
 */
export enum DatabaseEntryType {
  TEXT = 'text',
  CODE = 'code',
  DATA = 'data',
  REFERENCE = 'reference',
  IMAGE = 'image',
  CHART = 'chart',
  RESULT = 'result'
}

/**
 * Database entry in the Vibe system
 */
export interface DatabaseEntry {
  id: string
  boardId: string
  tableId: string
  taskId: string
  type: DatabaseEntryType
  key: string
  value: any
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Database table in the Vibe system
 */
export interface DatabaseTable {
  id: string
  boardId: string
  name: string
  description: string
  schema: Record<string, string>
  entries: DatabaseEntry[]
  createdAt: Date
  updatedAt: Date
} 