import { useVibeStore } from '@/stores/vibeStore'
import { ActorType, type VibeTask } from '@/types/vibe'
import { Planner } from './actors/Planner'
import { Researcher } from './actors/Researcher'
import { Analyst } from './actors/Analyst'
import { Coder } from './actors/Coder'
import { Composer } from './actors/Composer'
import { BaseActor } from './actors/BaseActor'
import { type Editor } from '@tiptap/core'

/**
 * Class for executing tasks in the correct order
 */
export class VibeTaskExecutor {
  private vibeStore = useVibeStore()
  private runningTasks: Record<string, Promise<any>> = {}
  private editor?: Editor
  
  /**
   * Constructor
   * @param boardId ID of the board to execute tasks for
   * @param editor Editor instance for tasks that need to interact with the document
   */
  constructor(private boardId: string, editor?: Editor) {
    this.editor = editor
  }
  
  /**
   * Execute all pending tasks in the correct order
   * @returns Promise that resolves when all tasks are complete
   */
  public async executeAllTasks(): Promise<void> {
    try {
      const board = await this.vibeStore.getBoard(this.boardId)
      if (!board) {
        console.warn(`Board ${this.boardId} not found, skipping task execution`)
        return
      }
      
      // Get all tasks
      const tasks = board.tasks
      
      // Create a dependency graph
      const dependencyGraph: Record<string, string[]> = {}
      const reverseDependencyGraph: Record<string, string[]> = {}
      
      // Initialize graphs
      for (const task of tasks) {
        dependencyGraph[task.id] = task.dependencies || []
        reverseDependencyGraph[task.id] = []
      }
      
      // Build reverse graph
      for (const task of tasks) {
        if (task.dependencies) {
          for (const depId of task.dependencies) {
            if (reverseDependencyGraph[depId]) {
              reverseDependencyGraph[depId].push(task.id)
            }
          }
        }
      }
      
      // Get ready tasks (no dependencies or all dependencies completed)
      const readyTasks = this.getReadyTasks(tasks, dependencyGraph)
      
      // Start executing ready tasks
      const promises = readyTasks.map(task => this.executeTask(task))
      
      // Wait for all ready tasks to complete
      await Promise.all(promises)
      
      // Check if there are still tasks to execute
      const remainingTasks = tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'failed'
      )
      
      if (remainingTasks.length > 0) {
        // Recursively execute remaining tasks
        await this.executeAllTasks()
      }
    } catch (error) {
      console.error(`Error executing tasks for board ${this.boardId}:`, error)
      // Re-throw the error to be handled by the caller
      throw error
    }
  }
  
  /**
   * Execute a single task
   * @param task Task to execute
   * @returns Promise that resolves when the task is complete
   */
  public async executeTask(task: VibeTask): Promise<any> {
    // Skip already completed or failed tasks
    if (task.status === 'completed' || task.status === 'failed') {
      return
    }
    
    // Skip already running tasks
    if (task.id in this.runningTasks) {
      return this.runningTasks[task.id]
    }
    
    // Check if all dependencies are complete
    const board = await this.vibeStore.getBoard(this.boardId)
    if (!board) {
      console.warn(`Board ${this.boardId} not found when executing task ${task.id}, skipping`)
      return
    }
    
    const dependencies = board.tasks.filter(t => 
      task.dependencies?.includes(t.id)
    )
    
    const allDependenciesComplete = dependencies.every(
      dep => dep.status === 'completed'
    )
    
    if (!allDependenciesComplete) {
      // Can't execute this task yet
      return
    }
    
    // Get the appropriate actor
    const actor = this.getActorForType(task.actorType)
    
    // Execute the task
    try {
      const promise = actor.executeTask(task, this.editor)
      this.runningTasks[task.id] = promise
      
      const result = await promise
      
      // Clear from running tasks
      delete this.runningTasks[task.id]
      
      return result
    } catch (error) {
      // Clear from running tasks
      delete this.runningTasks[task.id]
      
      // Re-throw the error
      throw error
    }
  }
  
  /**
   * Get tasks that are ready to be executed
   * @param tasks All tasks
   * @param dependencyGraph Dependency graph
   * @returns Tasks that can be executed now
   */
  private getReadyTasks(tasks: VibeTask[], dependencyGraph: Record<string, string[]>): VibeTask[] {
    return tasks.filter(task => {
      // Skip already completed or failed tasks
      if (task.status === 'completed' || task.status === 'failed') {
        return false
      }
      
      // Skip already running tasks
      if (task.id in this.runningTasks) {
        return false
      }
      
      // Check if all dependencies are complete
      const dependencies = dependencyGraph[task.id] || []
      if (dependencies.length === 0) {
        return true
      }
      
      // Find the actual dependency tasks
      const dependencyTasks = tasks.filter(t => dependencies.includes(t.id))
      
      // All dependencies must be complete
      return dependencyTasks.every(depTask => depTask.status === 'completed')
    })
  }
  
  /**
   * Get the appropriate actor for a task type
   * @param actorType Actor type
   * @returns Actor instance
   */
  private getActorForType(actorType: ActorType): BaseActor {
    switch (actorType) {
      case ActorType.RESEARCHER:
        return new Researcher()
      case ActorType.ANALYST:
        return new Analyst()
      case ActorType.CODER:
        return new Coder()
      case ActorType.PLANNER:
        return new Planner()
      case ActorType.COMPOSER:
        return new Composer()
      default:
        throw new Error(`Unsupported actor type: ${actorType}`)
    }
  }
} 