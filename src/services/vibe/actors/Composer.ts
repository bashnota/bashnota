import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, TaskPriority } from '@/types/vibe'
import { Planner, type TaskPlan } from './Planner'
import { Researcher } from './Researcher'
import { Analyst } from './Analyst'
import { Coder } from './Coder'
import { DatabaseEntryType } from '@/types/vibe'
import { logger } from '@/services/logger'

// Maximum number of retry attempts for code execution
const MAX_CODE_RETRY_ATTEMPTS = 3;

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
      dependencies: [],
      priority: TaskPriority.HIGH
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
      logger.error('Error in Composer execution:', error)
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
        dependencies: [], // We'll update these after all tasks are created
        priority: this.mapStringToPriority(plannedTask.priority),
        customActorId: plannedTask.customActorId // Add customActorId for CUSTOM actor tasks
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

    // Function to detect circular dependencies
    const detectCircularDependencies = (taskIdx: number, visited: Set<number>, path: number[]): boolean => {
      // Mark current node as visited and add to path
      visited.add(taskIdx);
      path.push(taskIdx);
      
      // Check all dependencies of current task
      const dependencies = plan.tasks[taskIdx].dependencies;
      for (const depStr of dependencies) {
        const depIdx = typeof depStr === 'number' ? depStr : parseInt(depStr, 10);
        
        // Skip invalid dependencies
        if (isNaN(depIdx) || depIdx < 0 || depIdx >= plan.tasks.length) {
          continue;
        }
        
        // If dependency has not been visited, check it recursively
        if (!visited.has(depIdx)) {
          if (detectCircularDependencies(depIdx, visited, path)) {
            return true;
          }
        } 
        // If dependency is in current path, we found a cycle
        else if (path.includes(depIdx)) {
          return true;
        }
      }
      
      // Remove current node from path
      path.pop();
      return false;
    };

    // Build a dependency graph to validate before updating tasks
    const dependencyGraph: Record<number, number[]> = {};
    const invalidDependencies: Record<number, number[]> = {};
    
    // First pass: detect circular dependencies and collect invalid dependencies
    for (let i = 0; i < plan.tasks.length; i++) {
      const plannedTask = plan.tasks[i];
      
      // Convert dependencies to indices and filter out invalid ones
      const depIndices = plannedTask.dependencies
        .map(depStr => {
          const depIdx = typeof depStr === 'number' ? depStr : parseInt(depStr, 10);
          // Check if dependency is valid
          if (isNaN(depIdx) || depIdx < 0 || depIdx >= plan.tasks.length || depIdx === i) {
            // Store invalid dependencies to report
            if (!invalidDependencies[i]) {
              invalidDependencies[i] = [];
            }
            invalidDependencies[i].push(typeof depStr === 'number' ? depStr : parseInt(depStr, 10));
            return null;
          }
          return depIdx;
        })
        .filter((depIdx): depIdx is number => depIdx !== null);
      
      dependencyGraph[i] = depIndices;
    }

    // Second pass: check for circular dependencies in the graph
    const circularDependencies: [number, number[]][] = [];
    for (let i = 0; i < plan.tasks.length; i++) {
      const visited = new Set<number>();
      const path: number[] = [];
      
      if (detectCircularDependencies(i, visited, path)) {
        // Find the cycle in the path
        const cycle = [...path];
        circularDependencies.push([i, cycle]);
      }
    }
    
    // Log any issues found before updating tasks
    if (Object.keys(invalidDependencies).length > 0) {
      logger.warn('Invalid dependencies detected:', invalidDependencies);
    }
    
    if (circularDependencies.length > 0) {
      logger.warn('Circular dependencies detected:', circularDependencies);
      
      // Break circular dependencies by removing the dependency from the task with higher index
      circularDependencies.forEach(([taskIdx, cycle]) => {
        // Find the cycle and break it
        for (let i = 0; i < cycle.length; i++) {
          const current = cycle[i];
          const next = cycle[(i + 1) % cycle.length];
          
          // Break the cycle at the highest index dependency
          if (current > next) {
            const index = dependencyGraph[current].indexOf(next);
            if (index !== -1) {
              logger.warn(`Breaking circular dependency: Removing dependency from task ${current} to ${next}`);
              dependencyGraph[current].splice(index, 1);
              
              // Remove from planned task dependencies too
              const depIndex = plan.tasks[current].dependencies.findIndex(dep => {
                const depIdx = typeof dep === 'number' ? dep : parseInt(dep, 10);
                return depIdx === next;
              });
              
              if (depIndex !== -1) {
                plan.tasks[current].dependencies.splice(depIndex, 1);
              }
            }
          }
        }
      });
    }

    // Check for isolated tasks (tasks with no dependencies and not depended on by any other task)
    const hasDependents: Set<number> = new Set();
    Object.entries(dependencyGraph).forEach(([taskIdx, deps]) => {
      deps.forEach(depIdx => hasDependents.add(depIdx));
    });

    const isolatedTasks: number[] = [];
    const rootTasks: number[] = [];

    for (let i = 0; i < plan.tasks.length; i++) {
      const deps = dependencyGraph[i] || [];
      
      // Task has no dependencies and is not depended on by others
      if (deps.length === 0 && !hasDependents.has(i)) {
        isolatedTasks.push(i);
      }
      
      // Task has no dependencies but is used by others - it's a root
      if (deps.length === 0 && hasDependents.has(i)) {
        rootTasks.push(i);
      }
    }

    if (isolatedTasks.length > 0) {
      logger.warn(`Found ${isolatedTasks.length} isolated tasks that aren't connected to the workflow`);
      
      // Handle isolated tasks by connecting them to the workflow
      if (rootTasks.length > 0) {
        // If we have root tasks, make isolated tasks depend on the first root task
        const primaryRoot = rootTasks[0];
        
        isolatedTasks.forEach(taskIdx => {
          logger.warn(`Connecting isolated task ${taskIdx} to root task ${primaryRoot}`);
          dependencyGraph[taskIdx] = [primaryRoot];
          plan.tasks[taskIdx].dependencies.push(primaryRoot.toString());
        });
      } else if (isolatedTasks.length > 1) {
        // If no root tasks but multiple isolated tasks, create a task chain
        // Sort by priority (if available) or by index
        isolatedTasks.sort((a, b) => {
          const priorityMap = { 'high': 0, 'medium': 1, 'low': 2 };
          const aPriority = priorityMap[plan.tasks[a].priority.toLowerCase() as keyof typeof priorityMap] ?? 1;
          const bPriority = priorityMap[plan.tasks[b].priority.toLowerCase() as keyof typeof priorityMap] ?? 1;
          
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a - b;
        });
        
        // Create a chain with the highest priority task at the root
        for (let i = 1; i < isolatedTasks.length; i++) {
          const current = isolatedTasks[i];
          const previous = isolatedTasks[i-1];
          
          logger.warn(`Connecting isolated task ${current} to depend on task ${previous}`);
          dependencyGraph[current] = [previous];
          plan.tasks[current].dependencies.push(previous.toString());
        }
      }
    }

    // Ensure every task has at least one dependent (except for terminal tasks)
    const terminalTasks: number[] = [];
    for (let i = 0; i < plan.tasks.length; i++) {
      if (!hasDependents.has(i)) {
        terminalTasks.push(i);
      }
    }

    // If we have multiple terminal tasks, create a unified ending
    if (terminalTasks.length > 1) {
      // Find or create a final integration task
      let integrationTaskIdx = -1;
      
      // Look for an existing task that could serve as final integration
      for (const idx of terminalTasks) {
        const task = plan.tasks[idx];
        if (task.title.toLowerCase().includes('integrat') || 
            task.title.toLowerCase().includes('final') ||
            task.title.toLowerCase().includes('complet')) {
          integrationTaskIdx = idx;
          break;
        }
      }
      
      // If no suitable integration task exists, use the last terminal task
      if (integrationTaskIdx === -1) {
        terminalTasks.sort((a, b) => b - a); // Sort in descending order
        integrationTaskIdx = terminalTasks[0];
      }
      
      // Make the integration task depend on all other terminal tasks
      for (const idx of terminalTasks) {
        if (idx !== integrationTaskIdx) {
          // Add dependency from integration task to other terminal tasks
          if (!dependencyGraph[integrationTaskIdx]) {
            dependencyGraph[integrationTaskIdx] = [];
          }
          
          if (!dependencyGraph[integrationTaskIdx].includes(idx)) {
            logger.warn(`Adding dependency from final task ${integrationTaskIdx} to terminal task ${idx}`);
            dependencyGraph[integrationTaskIdx].push(idx);
            plan.tasks[integrationTaskIdx].dependencies.push(idx.toString());
          }
        }
      }
    }

    // Now update dependencies using the validated dependency graph
    for (let i = 0; i < plan.tasks.length; i++) {
      const taskId = taskIdMap[i];
      
      // Map dependency indexes to task IDs using the validated graph
      const dependencyIds = (dependencyGraph[i] || []).map(depIdx => taskIdMap[depIdx])
        .filter(Boolean); // Remove any undefined values
      
      // Update task dependencies
      if (dependencyIds.length > 0) {
        await this.vibeStore.updateTask(boardId, taskId, {
          dependencies: dependencyIds
        });
        
        // Update task in database
        taskDatabase.tasks[taskId].dependencies = dependencyIds;
        taskDatabase.dependencies[taskId] = dependencyIds;
        
        // Update the task entry in the database table
        this.createEntry(
          tasksTableId,
          taskId,
          DatabaseEntryType.DATA,
          `dependencies_${taskId}`,
          dependencyIds
        );
      } else {
        taskDatabase.dependencies[taskId] = [];
      }
    }

    return createdTasks;
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

  /**
   * Execute a task with retry capability for Coder tasks
   * @param task The task to execute
   * @returns The task result
   */
  public async executeTaskWithRetry(task: VibeTask): Promise<any> {
    // Create a table for storing task execution results
    const executionTable = this.createTable(
      task.boardId,
      'task_executions',
      'Contains detailed task execution info',
      {
        taskId: 'string',
        attempt: 'number',
        status: 'string',
        error: 'string',
        timeSpent: 'number'
      }
    );

    // For non-coder tasks, execute normally
    if (task.actorType !== ActorType.CODER) {
      const actor = this.getActorForType(task.actorType);
      return actor.executeTask(task);
    }

    // For coder tasks, implement retry logic
    let attempt = 1;
    let lastError: Error | null = null;
    let lastResult: any = null;

    while (attempt <= MAX_CODE_RETRY_ATTEMPTS) {
      try {
        logger.log(`Executing coder task (attempt ${attempt}/${MAX_CODE_RETRY_ATTEMPTS}): ${task.id}`);
        const startTime = Date.now();
        
        // Get a fresh coder instance for each attempt
        const coder = new Coder();
        lastResult = await coder.executeTask(task);
        
        // Check if execution failed
        if (lastResult?.execution?.success === false) {
          const errorMessage = lastResult.execution.error || 'Unknown execution error';
          
          // Log the error
          this.createEntry(
            executionTable.id,
            task.id,
            DatabaseEntryType.DATA,
            `attempt_${attempt}`,
            {
              taskId: task.id,
              attempt,
              status: 'failed',
              error: errorMessage,
              timeSpent: Date.now() - startTime
            }
          );
          
          // Create an enhanced task description for retry
          if (attempt < MAX_CODE_RETRY_ATTEMPTS) {
            const enhancedDescription = this.createEnhancedTaskDescription(
              task.description,
              lastResult.code,
              errorMessage
            );
            
            // Update the task with the enhanced description
            task = {
              ...task,
              description: enhancedDescription
            };
            
            logger.log(`Coder task failed with error: ${errorMessage}. Retrying...`);
            attempt++;
            continue;
          }
        }
        
        // Execution succeeded or reached max attempts
        this.createEntry(
          executionTable.id,
          task.id,
          DatabaseEntryType.DATA,
          `final_result`,
          {
            taskId: task.id,
            attempt,
            status: lastResult?.execution?.success ? 'succeeded' : 'failed_all_attempts',
            error: lastResult?.execution?.error || null,
            timeSpent: Date.now() - startTime
          }
        );
        
        return lastResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Log the error
        this.createEntry(
          executionTable.id,
          task.id,
          DatabaseEntryType.DATA,
          `attempt_${attempt}_exception`,
          {
            taskId: task.id,
            attempt,
            status: 'exception',
            error: lastError.message,
            stack: lastError.stack
          }
        );
        
        logger.error(`Exception in coder task (attempt ${attempt}): ${lastError.message}`);
        
        if (attempt < MAX_CODE_RETRY_ATTEMPTS) {
          attempt++;
          continue;
        }
        break;
      }
    }

    // If we've exhausted all attempts, throw the last error
    if (lastError) {
      throw new Error(`Failed to execute coder task after ${MAX_CODE_RETRY_ATTEMPTS} attempts: ${lastError.message}`);
    }
    
    return lastResult;
  }

  /**
   * Create an enhanced task description for retry attempts
   * @param originalDescription The original task description
   * @param failedCode The code that failed
   * @param errorMessage The error message
   * @returns Enhanced task description
   */
  private createEnhancedTaskDescription(
    originalDescription: string,
    failedCode: string,
    errorMessage: string
  ): string {
    return `${originalDescription}

IMPORTANT: Previous code failed with the following error:
${errorMessage}

Here is the code that needs to be fixed:
\`\`\`
${failedCode}
\`\`\`

Please fix the code to address this specific error and ensure it executes successfully.
Analyze the error message carefully and make necessary corrections.
Provide complete, runnable code that fixes the issue.`;
  }

  /**
   * Execute a sequence of tasks in the right order, respecting dependencies
   * @param boardId The board ID
   * @param tasks The tasks to execute
   * @param taskDatabase The task database to update
   * @param tasksTableId The ID of the tasks table in the database
   * @returns The results of task execution
   */
  public async executeTaskSequence(
    boardId: string,
    tasks: VibeTask[],
    taskDatabase: TaskDatabase,
    tasksTableId: string
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const completedTasks = new Set<string>(taskDatabase.completedTasks);
    const taskMap: Record<string, VibeTask> = {};
    
    // Rate limiting: Delay between task executions
    const DELAY_BETWEEN_TASKS = 2000; // 2 seconds
    
    // Create a map of task ID to task
    tasks.forEach(task => {
      taskMap[task.id] = task;
    });
    
    // Function to check if all dependencies of a task are completed
    const areDependenciesMet = (task: VibeTask): boolean => {
      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }
      
      return task.dependencies.every(depId => completedTasks.has(depId));
    };
    
    // Execute tasks in topological order respecting dependencies
    let executedCount = 0;
    let progress = true;
    
    while (executedCount < tasks.length && progress) {
      progress = false;
      
      for (const task of tasks) {
        // Skip already completed or failed tasks
        if (completedTasks.has(task.id) || 
            taskDatabase.failedTasks.includes(task.id)) {
          continue;
        }
        
        // Check if all dependencies are met
        if (areDependenciesMet(task)) {
          try {
            logger.log(`Executing task ${task.id}: ${task.title}`);
            
            // Update task status to in_progress
            await this.vibeStore.updateTask(boardId, task.id, {
              status: 'in_progress',
              startedAt: new Date()
            });
            
            // Add delay before executing task to prevent rate limiting
            if (executedCount > 0) {
              logger.log(`Rate limiting: Waiting ${DELAY_BETWEEN_TASKS}ms before next task execution`);
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TASKS));
            }
            
            // Execute the task with retry for Coder tasks
            const result = await this.executeTaskWithRetry(task);
            
            // Update results
            results[task.id] = result;
            taskDatabase.results[task.id] = result;
            completedTasks.add(task.id);
            taskDatabase.completedTasks.push(task.id);
            
            // Update task status to completed
            await this.vibeStore.updateTask(boardId, task.id, {
              status: 'completed',
              completedAt: new Date(),
              result
            });
            
            // Store the task result in the database
            this.createEntry(
              tasksTableId,
              task.id,
              DatabaseEntryType.RESULT,
              `result_${task.id}`,
              result
            );
            
            executedCount++;
            progress = true;
          } catch (error) {
            logger.error(`Failed to execute task ${task.id}:`, error);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Update task status to failed
            await this.vibeStore.updateTask(boardId, task.id, {
              status: 'failed',
              error: errorMessage
            });
            
            // Add to failed tasks
            taskDatabase.failedTasks.push(task.id);
            
            // Store the error in the database
            this.createEntry(
              tasksTableId,
              task.id,
              DatabaseEntryType.TEXT,
              `error_${task.id}`,
              errorMessage
            );
            
            // Bubble up the error to skip dependent tasks
            if (!task.dependencies || task.dependencies.length === 0) {
              // Only throw if this is a root task failure
              throw new Error(`Critical task failure: ${errorMessage}`);
            }
          }
        }
      }
    }
    
    // Check if all tasks were executed
    if (executedCount < tasks.length) {
      logger.warn(`Not all tasks were executed. Completed: ${executedCount}/${tasks.length}`);
      
      // Log tasks with unmet dependencies
      const unexecuted = tasks.filter(task => 
        !completedTasks.has(task.id) && 
        !taskDatabase.failedTasks.includes(task.id)
      );
      
      logger.warn('Unexecuted tasks:', unexecuted.map(t => `${t.id} (${t.title})`));
    }
    
    return results;
  }

  /**
   * Execute the Composer actor with a full plan execution workflow
   * @param task The composition task
   * @returns The composition result including execution results
   */
  public async executeWithPlan(task: VibeTask): Promise<ComposerResult & { executionResults: Record<string, any> }> {
    // First create the tasks
    const composerResult = await this.execute(task);
    
    // Extract all tasks from the database
    const tasksToExecute = Object.values(composerResult.taskDatabase.tasks)
      // Skip the planner task as it's already executed
      .filter(task => task.actorType !== ActorType.PLANNER);
    
    // Create a tasks database table for execution results
    const tasksTable = this.createTable(
      task.boardId,
      'task_executions',
      'Contains execution results for tasks',
      {
        taskId: 'string',
        status: 'string',
        result: 'object',
        error: 'string'
      }
    );
    
    try {
      // Execute the tasks in sequence
      const executionResults = await this.executeTaskSequence(
        task.boardId, 
        tasksToExecute, 
        composerResult.taskDatabase,
        tasksTable.id
      );
      
      // Update the composer result with execution results
      return {
        ...composerResult,
        executionResults,
        summary: `${composerResult.summary} Executed ${Object.keys(executionResults).length} tasks.`
      };
    } catch (error) {
      logger.error('Error executing task sequence:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Store the error in the database
      this.createEntry(
        tasksTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        'execution_error',
        errorMessage
      );
      
      // Return the composer result with the error
      return {
        ...composerResult,
        executionResults: {},
        summary: `${composerResult.summary} Failed to execute tasks: ${errorMessage}`
      };
    }
  }

  /**
   * Maps a string priority to TaskPriority enum
   * @param priority The priority string
   * @returns The corresponding TaskPriority enum value
   */
  private mapStringToPriority(priority?: string): TaskPriority {
    if (!priority) return TaskPriority.MEDIUM;
    
    switch(priority.toLowerCase()) {
      case 'high':
        return TaskPriority.HIGH;
      case 'critical':
        return TaskPriority.CRITICAL;
      case 'low':
        return TaskPriority.LOW;
      case 'medium':
      default:
        return TaskPriority.MEDIUM;
    }
  }
} 