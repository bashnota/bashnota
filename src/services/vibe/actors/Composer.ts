import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask } from '@/types/vibe'
import { Planner, type TaskPlan } from './Planner'
import { Researcher } from './Researcher'
import { Analyst } from './Analyst'
import { Coder } from './Coder'
import { DatabaseEntryType } from '@/types/vibe'

/**
 * Interface for storing task information in the database
 */
export interface TaskDatabase {
  tasks: Record<string, VibeTask>
  results: Record<string, any>
  dependencies: Record<string, string[]>
  completedTasks: string[]
  failedTasks: string[]
}

/**
 * Result from the Composer actor
 */
export interface ComposerResult {
  summary: string
  tasksCreated: number
  taskDatabase: TaskDatabase
}

/**
 * The Composer actor - responsible for orchestrating task execution
 */
export class Composer extends BaseActor {
  constructor() {
    super(ActorType.COMPOSER)
  }

  /**
   * Execute the Composer actor
   * @param task The composition task
   * @returns The composition result
   */
  protected async execute(task: VibeTask): Promise<ComposerResult> {
    // Create a tasks database table
    const tasksTable = this.createTable(
      task.boardId,
      'tasks',
      'Contains task status and coordination information',
      {
        taskId: 'string',
        status: 'string',
        dependencies: 'array',
        result: 'object'
      }
    )
    
    // Initialize task database
    const taskDatabase: TaskDatabase = {
      tasks: {},
      results: {},
      dependencies: {},
      completedTasks: [],
      failedTasks: []
    }

    // First, create a planning task
    const plannerTask = await this.vibeStore.createTask(task.boardId, {
      title: 'Create execution plan',
      description: task.description,
      actorType: ActorType.PLANNER,
      dependencies: []
    })

    // Add to database
    taskDatabase.tasks[plannerTask.id] = plannerTask
    taskDatabase.dependencies[plannerTask.id] = []
    
    // Store the task in the database table
    this.createEntry(
      tasksTable.id,
      task.id,
      DatabaseEntryType.DATA,
      `task_${plannerTask.id}`,
      {
        taskId: plannerTask.id,
        status: plannerTask.status,
        dependencies: []
      }
    )

    // Execute the planner actor
    const planner = new Planner()
    try {
      const planResult = await planner.executeTask(plannerTask)
      
      // Add the planning task to the database
      taskDatabase.tasks[plannerTask.id] = plannerTask
      taskDatabase.results[plannerTask.id] = planResult
      taskDatabase.completedTasks.push(plannerTask.id)
      
      // Store the result in the tasks table
      this.createEntry(
        tasksTable.id,
        task.id,
        DatabaseEntryType.RESULT,
        'plan_result',
        planResult
      )
      
      // Create tasks from the plan
      const createdTasks = await this.createTasksFromPlan(
        task.boardId,
        planResult.plan, 
        taskDatabase,
        tasksTable.id
      )
      
      return {
        summary: `Created ${createdTasks.length} tasks from plan. ${planResult.summary}`,
        tasksCreated: createdTasks.length + 1, // +1 for the planner task
        taskDatabase
      }
    } catch (error: unknown) {
      console.error('Error in Composer execution:', error)
      taskDatabase.failedTasks.push(plannerTask.id)
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Store the error in the database
      this.createEntry(
        tasksTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        `error_${plannerTask.id}`,
        errorMessage
      )
      
      throw new Error(`Failed to compose tasks: ${errorMessage}`)
    }
  }

  /**
   * Create tasks from a plan
   * @param boardId The board ID to associate tasks with
   * @param plan The task plan
   * @param taskDatabase The task database to update
   * @param tasksTableId The ID of the tasks table in the database
   * @returns The created tasks
   */
  private async createTasksFromPlan(
    boardId: string, 
    plan: TaskPlan,
    taskDatabase: TaskDatabase,
    tasksTableId: string
  ): Promise<VibeTask[]> {
    const createdTasks: VibeTask[] = []
    const taskIdMap: Record<number, string> = {} // Maps task index to task ID

    // Create tasks in order
    for (let i = 0; i < plan.tasks.length; i++) {
      const plannedTask = plan.tasks[i]
      
      // Create the task
      const newTask = await this.vibeStore.createTask(boardId, {
        title: plannedTask.title,
        description: plannedTask.description,
        actorType: plannedTask.actorType,
        dependencies: [] // We'll update these after all tasks are created
      })

      // Store the task ID mapping
      taskIdMap[i] = newTask.id
      
      // Add to database
      taskDatabase.tasks[newTask.id] = newTask
      createdTasks.push(newTask)
      
      // Store the task in the database table
      this.createEntry(
        tasksTableId,
        newTask.id,
        DatabaseEntryType.DATA,
        `task_${newTask.id}`,
        {
          taskId: newTask.id,
          title: plannedTask.title,
          actorType: plannedTask.actorType,
          priority: plannedTask.priority,
          estimatedCompletion: plannedTask.estimatedCompletion,
          status: 'pending',
          dependencies: [] // We'll update these next
        }
      )
    }

    // Now update dependencies
    for (let i = 0; i < plan.tasks.length; i++) {
      const plannedTask = plan.tasks[i]
      const taskId = taskIdMap[i]
      
      // Map dependency indexes to task IDs
      const dependencyIds = plannedTask.dependencies.map(depIdx => {
        // Handle case where dependency is specified by a number
        const depIndex = typeof depIdx === 'number' ? depIdx : parseInt(depIdx, 10)
        return taskIdMap[depIndex]
      }).filter(Boolean) // Remove any undefined values
      
      // Update task dependencies
      if (dependencyIds.length > 0) {
        await this.vibeStore.updateTask(boardId, taskId, {
          dependencies: dependencyIds
        })
        
        // Update task in database
        taskDatabase.tasks[taskId].dependencies = dependencyIds
        taskDatabase.dependencies[taskId] = dependencyIds
        
        // Update the task entry in the database table
        this.createEntry(
          tasksTableId,
          taskId,
          DatabaseEntryType.DATA,
          `dependencies_${taskId}`,
          dependencyIds
        )
      } else {
        taskDatabase.dependencies[taskId] = []
      }
    }

    return createdTasks
  }

  /**
   * Get the appropriate actor for a task
   * @param actorType The actor type
   * @returns The actor instance
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
      default:
        throw new Error(`Unsupported actor type: ${actorType}`)
    }
  }
} 