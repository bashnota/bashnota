import { useVibeStore } from '@/stores/vibeStore'
import { ActorType, type VibeTask } from '@/types/vibe'
import { Planner } from './actors/Planner'
import { Researcher } from './actors/Researcher'
import { Analyst } from './actors/Analyst'
import { Coder } from './actors/Coder'
import { Composer } from './actors/Composer'
import { BaseActor } from './actors/BaseActor'
import { type Editor } from '@tiptap/core'
import { notaExtensionService } from '@/services/notaExtensionService'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'

/**
 * Class for executing tasks in the correct order
 */
export class VibeTaskExecutor {
  private vibeStore = useVibeStore()
  private runningTasks: Record<string, Promise<any>> = {}
  private jupyterConfig: {
    server: JupyterServer | null,
    kernel: KernelSpec | null
  }
  private recursionDepth = 0
  private maxRecursionDepth = 10
  private isDisposed = false
  private editor?: Editor  // Store the editor instance
  private retryAttempts = 0
  private maxRetryAttempts = 10  // Maximum number of retry attempts
  private startTime: number      // Timestamp when execution started
  private maxExecutionTime = 10 * 60 * 1000  // Maximum execution time (10 minutes)
  private timeoutTimer: any = null   // Timer for execution timeout
  
  /**
   * Constructor
   * @param boardId ID of the board to execute tasks for
   * @param editor Editor instance for tasks that need to interact with the document
   * @param jupyterConfig Optional Jupyter configuration
   */
  constructor(
    private boardId: string, 
    editor?: Editor,
    jupyterConfig?: {
      server: JupyterServer | null,
      kernel: KernelSpec | null
    }
  ) {
    if (editor) {
      this.editor = editor  // Store the editor instance
      notaExtensionService.setEditor(editor)
    }
    
    this.jupyterConfig = jupyterConfig || { server: null, kernel: null }
    
    // Record start time for timeout tracking
    this.startTime = Date.now()
    
    // Set up execution timeout
    this.timeoutTimer = setTimeout(() => {
      this.handleExecutionTimeout()
    }, this.maxExecutionTime)
  }
  
  /**
   * Handle execution timeout by marking pending tasks as failed
   */
  private async handleExecutionTimeout(): Promise<void> {
    if (this.isDisposed) {
      return
    }
    
    console.warn(`VibeTaskExecutor execution timeout after ${this.maxExecutionTime/1000} seconds`)
    
    try {
      // Get current board state
      const board = await this.vibeStore.getBoard(this.boardId)
      if (!board) {
        console.warn(`Board ${this.boardId} not found during timeout handling`)
        return
      }
      
      // Find all pending tasks
      const pendingTasks = board.tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'failed'
      )
      
      if (pendingTasks.length > 0) {
        console.warn(`Marking ${pendingTasks.length} pending tasks as failed due to execution timeout`)
        
        // Mark all pending tasks as failed
        for (const task of pendingTasks) {
          await this.vibeStore.updateTask(this.boardId, task.id, {
            status: 'failed',
            error: 'Execution timed out after 10 minutes'
          })
        }
      }
    } catch (error) {
      console.error('Error handling execution timeout:', error)
    } finally {
      // Clean up
      this.dispose()
    }
  }
  
  /**
   * Dispose of the executor
   * This will prevent further task execution
   */
  public dispose(): void {
    console.log(`Disposing VibeTaskExecutor for board ${this.boardId}`)
    
    // Mark as disposed so no new tasks can be executed
    this.isDisposed = true
    
    // Clear the editor reference to avoid memory leaks
    if (this.editor) {
      notaExtensionService.clearEditor()
      this.editor = undefined
    }
    
    // Clear running tasks to allow pending promises to be garbage collected
    // Note: We don't cancel them, we just forget about them
    const runningTaskCount = Object.keys(this.runningTasks).length
    if (runningTaskCount > 0) {
      console.log(`Abandoning ${runningTaskCount} running tasks during disposal`)
    }
    
    // Clear running tasks map
    this.runningTasks = {}
    
    // Reset retry attempts
    this.retryAttempts = 0
    
    // Reset recursion depth
    this.recursionDepth = 0
  }
  
  /**
   * Execute all pending tasks in the correct order
   * @returns Promise that resolves when all tasks are complete
   */
  public async executeAllTasks(): Promise<void> {
    // Check if already disposed
    if (this.isDisposed) {
      console.warn('VibeTaskExecutor has been disposed, skipping task execution')
      return
    }
    
    // Check recursion depth to prevent stack overflow
    if (this.recursionDepth >= this.maxRecursionDepth) {
      console.error(`Maximum recursion depth (${this.maxRecursionDepth}) reached in executeAllTasks`)
      throw new Error('Maximum recursion depth reached in task execution')
    }
    
    this.recursionDepth++
    console.log(`Executing all tasks, recursion depth: ${this.recursionDepth}`)
    
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
      
      // Check for disposed state before continuing
      if (this.isDisposed) {
        console.warn('VibeTaskExecutor was disposed during execution, aborting')
        return
      }
      
      // Get ready tasks (no dependencies or all dependencies completed)
      const readyTasks = this.getReadyTasks(tasks, dependencyGraph)
      
      // Check if there are any ready tasks
      if (readyTasks.length === 0) {
        console.log('No ready tasks to execute')
        
        // Check if there are any running tasks
        const runningTaskCount = Object.keys(this.runningTasks).length
        
        // Check if there are any pending tasks that are not ready
        const pendingTasks = tasks.filter(task => 
          task.status !== 'completed' && 
          task.status !== 'failed' && 
          !(task.id in this.runningTasks)
        )
        
        if (pendingTasks.length > 0) {
          console.log(`There are ${pendingTasks.length} pending tasks, but none are ready yet`)
          
          // Reset retry attempts if we find pending tasks that might become ready
          this.retryAttempts = 0
          
          // If there are running tasks, wait for them to complete before checking again
          if (runningTaskCount > 0) {
            console.log(`There are ${runningTaskCount} running tasks that might unlock dependencies`)
            
            // Decrement recursion depth before waiting
            this.recursionDepth--
            
            // Wait for running tasks to complete and then retry
            await this.waitForTasks()
            return
          } else {
            // No running tasks but there are pending tasks - this might indicate a dependency issue
            console.warn('No tasks are running but there are pending tasks - checking for dependency issues')
            
            // Visualize the dependency graph for debugging
            this.visualizeDependencyGraph(tasks, dependencyGraph)
            
            // Check for circular dependencies
            const { hasCircularDependencies, circularPaths, stuckTasks } = this.checkForCircularDependencies(tasks, dependencyGraph)
            
            if (hasCircularDependencies) {
              console.warn(`Found circular dependencies in tasks. Cycles:`, circularPaths)
              
              // Mark all tasks in circular dependencies as failed
              if (stuckTasks.length > 0) {
                console.warn(`Found ${stuckTasks.length} tasks stuck in dependency cycles`)
                
                // Mark these tasks as failed since their dependencies form a cycle
                for (const task of stuckTasks) {
                  await this.vibeStore.updateTask(this.boardId, task.id, {
                    status: 'failed',
                    error: 'Circular dependency detected'
                  })
                }
                
                // Try executing again after marking stuck tasks
                this.recursionDepth--
                await this.executeAllTasks()
                return
              }
            }
            
            // If we've retried too many times in a row without progress, mark all remaining pending tasks as failed
            if (this.retryAttempts >= this.maxRetryAttempts / 2) {
              console.warn(`Retry count is high (${this.retryAttempts}), checking for tasks with missing dependencies`)
              
              // Check for tasks with potentially unresolvable dependencies (missing or invalid)
              const tasksWithPotentialMissingDependencies = pendingTasks.filter(task => {
                const dependencies = dependencyGraph[task.id] || []
                return dependencies.some(depId => !tasks.some(t => t.id === depId))
              })
              
              if (tasksWithPotentialMissingDependencies.length > 0) {
                console.warn(`Found ${tasksWithPotentialMissingDependencies.length} tasks with missing dependencies`)
                
                // Mark these tasks as failed since their dependencies can't be found
                for (const task of tasksWithPotentialMissingDependencies) {
                  await this.vibeStore.updateTask(this.boardId, task.id, {
                    status: 'failed',
                    error: 'Missing dependencies'
                  })
                }
                
                // Try executing again after marking failed tasks
                this.recursionDepth--
                await this.executeAllTasks()
                return
              }
            }
            
            // If retry count has reached maximum, mark all pending tasks as failed to break out of infinite loop
            if (this.retryAttempts >= this.maxRetryAttempts) {
              console.warn(`Maximum retry attempts (${this.maxRetryAttempts}) reached, marking all pending tasks as failed`)
              
              // Mark all pending tasks as failed to break the loop
              for (const task of pendingTasks) {
                await this.vibeStore.updateTask(this.boardId, task.id, {
                  status: 'failed',
                  error: 'Execution timed out after maximum retries'
                })
              }
              
              this.retryAttempts = 0
              this.recursionDepth--
              return
            }
            
            // Check for tasks with potentially unresolvable dependencies
            const tasksWithUnresolvableDependencies = pendingTasks.filter(task => {
              const dependencies = dependencyGraph[task.id] || []
              const dependencyTasks = tasks.filter(t => dependencies.includes(t.id))
              
              // Check if any dependencies failed
              return dependencyTasks.some(depTask => depTask.status === 'failed')
            })
            
            if (tasksWithUnresolvableDependencies.length > 0) {
              console.warn(`Found ${tasksWithUnresolvableDependencies.length} tasks with failed dependencies`)
              
              // Mark these tasks as failed since their dependencies failed
              for (const task of tasksWithUnresolvableDependencies) {
                await this.vibeStore.updateTask(this.boardId, task.id, {
                  status: 'failed',
                  error: 'Dependencies failed to complete'
                })
              }
              
              // Try executing again after marking failed tasks
              this.recursionDepth--
              await this.executeAllTasks()
              return
            }
            
            // If no obvious dependency issues, wait a bit and retry
            this.recursionDepth--
            await this.waitForTasks()
            return
          }
        }
        
        // Since there are no ready tasks and no pending tasks, decrement recursion depth and return
        console.log('No more tasks to execute')
        this.recursionDepth--
        return
      }
      
      console.log(`Executing ${readyTasks.length} ready tasks`)
      
      // Reset retry attempts since we found tasks to execute
      this.retryAttempts = 0
      
      // Start executing ready tasks
      // Instead of running all tasks in parallel, process them sequentially
      // to avoid overwhelming the API with concurrent requests
      console.log(`Executing ${readyTasks.length} ready tasks sequentially`)
      for (const task of readyTasks) {
        // Check if already disposed before each task
        if (this.isDisposed) {
          console.warn('VibeTaskExecutor was disposed during execution, aborting')
          this.recursionDepth--
          return
        }
        
        // Execute tasks one at a time
        await this.executeTask(task)
      }
      
      // Check for disposed state before continuing
      if (this.isDisposed) {
        console.warn('VibeTaskExecutor was disposed during execution, aborting')
        this.recursionDepth--
        return
      }
      
      // Check if there are still tasks to execute
      const remainingTasks = tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'failed'
      )
      
      if (remainingTasks.length > 0) {
        console.log(`There are ${remainingTasks.length} remaining tasks, continuing execution`)
        // Reset retry attempts for next execution cycle
        this.retryAttempts = 0
        // Recursively execute remaining tasks
        await this.executeAllTasks()
      } else {
        console.log('All tasks completed successfully')
        // Reset retry attempts
        this.retryAttempts = 0
      }
    } catch (error) {
      console.error(`Error executing tasks for board ${this.boardId}:`, error)
      // Re-throw the error to be handled by the caller
      throw error
    } finally {
      // Decrement recursion depth
      this.recursionDepth--
    }
  }
  
  /**
   * Execute a single task
   * @param task Task to execute
   * @returns Promise that resolves when the task is complete
   */
  public async executeTask(task: VibeTask): Promise<any> {
    // Check if already disposed
    if (this.isDisposed) {
      console.warn(`VibeTaskExecutor has been disposed, skipping task ${task.id}`)
      return
    }
    
    // Skip already completed or failed tasks
    if (task.status === 'completed' || task.status === 'failed') {
      return task.result
    }
    
    // Skip already running tasks
    if (task.id in this.runningTasks) {
      return this.runningTasks[task.id]
    }
    
    try {
      // Check if all dependencies are complete
      const board = await this.vibeStore.getBoard(this.boardId)
      if (!board) {
        console.warn(`Board ${this.boardId} not found when executing task ${task.id}, skipping`)
        return
      }
      
      if (task.dependencies && task.dependencies.length > 0) {
        const dependencies = board.tasks.filter(t => 
          task.dependencies?.includes(t.id)
        )
        
        const allDependenciesComplete = dependencies.every(
          dep => dep.status === 'completed'
        )
        
        if (!allDependenciesComplete) {
          // Check if any dependencies failed
          const failedDependencies = dependencies.filter(dep => dep.status === 'failed')
          
          if (failedDependencies.length > 0) {
            console.warn(`Cannot execute task ${task.id}: dependencies failed`)
            // Mark this task as failed since its dependencies failed
            await this.vibeStore.updateTask(this.boardId, task.id, {
              status: 'failed',
              error: 'Dependencies failed to complete'
            })
            return
          }
          
          // Otherwise, dependencies are still pending or in progress
          console.log(`Cannot execute task ${task.id}: dependencies not complete yet`)
          return
        }
      }
      
      console.log(`Executing task ${task.id}: ${task.title}`)
      
      // Get the appropriate actor for the task
      const actor = this.getActorForType(task.actorType)
      
      // Execute the task
      try {
        // Create a promise for the task execution
        // Always pass the editor instance to ensure it's available to actors
        // even if the notaExtensionService editor reference was lost
        console.log(`VibeTaskExecutor: Starting task ${task.id} (${task.actorType})`)
        
        // Get the current editor from the extension service or supply our own
        const editorInstance = notaExtensionService.hasEditor() 
          ? undefined  // If service already has an editor, don't provide a new one
          : this.getEditorInstance() // Otherwise provide our instance
        
        const promise = actor.executeTask(task, editorInstance)
        this.runningTasks[task.id] = promise
        
        // Wait for the task to complete
        const result = await promise
        
        // If the executor was disposed during execution, don't update the task
        if (this.isDisposed) {
          console.warn(`VibeTaskExecutor was disposed during execution of task ${task.id}`)
          return
        }
        
        console.log(`Task ${task.id} completed`)
        return result
      } catch (error) {
        // If not disposed, log the error and rethrow
        if (!this.isDisposed) {
          console.error(`Error executing task ${task.id}:`, error)
          throw error
        }
      } finally {
        // Remove the task from the running tasks list
        delete this.runningTasks[task.id]
      }
    } catch (error) {
      // Make sure to remove from running tasks on error
      delete this.runningTasks[task.id]
      
      console.error(`Error in executeTask for task ${task.id}:`, error)
      throw error
    }
  }
  
  /**
   * Get the editor instance stored during initialization
   * This ensures we always have a reference to the original editor
   */
  private getEditorInstance(): Editor | undefined {
    // Check if the notaExtensionService has an editor
    if (notaExtensionService.hasEditor()) {
      return undefined; // Extension service already has an editor reference
    }
    
    // We need to set up the editor again
    if (this.editor) {
      console.log(`VibeTaskExecutor: Re-setting editor instance from stored reference`)
      return this.editor;
    }
    
    console.warn(`VibeTaskExecutor: No editor instance available`)
    return undefined;
  }
  
  /**
   * Reset the state of the executor to allow for a fresh start
   * This can be called if execution gets stuck
   */
  public resetState(): void {
    console.log(`Resetting VibeTaskExecutor state for board ${this.boardId}`)
    
    // Clear running tasks tracking
    this.runningTasks = {}
    
    // Reset counters
    this.retryAttempts = 0
    this.recursionDepth = 0
    
    // Keep the executor as not disposed
    this.isDisposed = false
    
    // Re-set the editor if we have one
    if (this.editor) {
      notaExtensionService.setEditor(this.editor)
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
      
      // Check if all dependencies are either complete or running
      const dependencies = dependencyGraph[task.id] || []
      if (dependencies.length === 0) {
        return true
      }
      
      // Find the actual dependency tasks
      const dependencyTasks = tasks.filter(t => dependencies.includes(t.id))
      
      // All dependencies must be complete (not just in progress)
      const areAllDependenciesComplete = dependencyTasks.every(depTask => 
        depTask.status === 'completed'
      )
      
      if (areAllDependenciesComplete) {
        return true
      }
      
      // If any dependency has failed, this task can't run
      const hasFailedDependencies = dependencyTasks.some(depTask => 
        depTask.status === 'failed'
      )
      
      if (hasFailedDependencies) {
        // Log but don't automatically fail the task - we'll do that in executeTask
        console.log(`Task ${task.id} has failed dependencies, will be marked as failed`)
      }
      
      // Not ready yet
      return false
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
      case ActorType.CODER: {
        const coder = new Coder()
        
        // Set Jupyter configuration if available
        if (this.jupyterConfig.server && this.jupyterConfig.kernel) {
          coder.setJupyterConfig(this.jupyterConfig.server, this.jupyterConfig.kernel)
        }
        
        return coder
      }
      case ActorType.PLANNER:
        return new Planner()
      case ActorType.COMPOSER:
        return new Composer()
      default:
        throw new Error(`Unsupported actor type: ${actorType}`)
    }
  }
  
  /**
   * Wait for currently running tasks to complete and then retry execution
   * @returns Promise that resolves when tasks complete and retry starts
   */
  private async waitForTasks(): Promise<void> {
    if (this.isDisposed) {
      console.warn('VibeTaskExecutor was disposed, not waiting for tasks')
      return
    }
    
    // Increment retry attempts
    this.retryAttempts++
    
    if (this.retryAttempts > this.maxRetryAttempts) {
      console.warn(`Maximum retry attempts (${this.maxRetryAttempts}) reached`)
      this.retryAttempts = 0
      return
    }
    
    console.log(`Waiting for running tasks to complete (attempt ${this.retryAttempts}/${this.maxRetryAttempts})`)
    
    const runningTasksArray = Object.values(this.runningTasks)
    
    // Store the current task state to check if we're making progress
    const boardBefore = await this.vibeStore.getBoard(this.boardId)
    if (!boardBefore) {
      console.warn(`Board ${this.boardId} not found during waitForTasks, aborting`)
      return
    }
    
    const taskStatusBefore = new Map(
      boardBefore.tasks.map(task => [task.id, task.status])
    )
    
    // Wait for running tasks or sleep a bit if no running tasks
    if (runningTasksArray.length === 0) {
      console.log('No running tasks to wait for, will retry immediately')
      // Wait a short time to avoid tight loops
      await new Promise(resolve => setTimeout(resolve, 500))
    } else {
      try {
        // Wait for all running tasks to complete
        console.log(`Waiting for ${runningTasksArray.length} running tasks to complete`)
        await Promise.all(runningTasksArray)
        console.log('All running tasks completed')
      } catch (error) {
        console.error('Error waiting for running tasks:', error)
      }
    }
    
    // Check if we've made progress by comparing task status before and after
    const boardAfter = await this.vibeStore.getBoard(this.boardId)
    if (!boardAfter) {
      console.warn(`Board ${this.boardId} not found after waiting, aborting`)
      return
    }
    
    // Check if we're making progress
    let madeProgress = false
    for (const task of boardAfter.tasks) {
      const statusBefore = taskStatusBefore.get(task.id)
      if (statusBefore !== task.status) {
        console.log(`Task ${task.id} changed status from ${statusBefore} to ${task.status}`)
        madeProgress = true
        break
      }
    }
    
    // If we're not making progress after multiple attempts, we might be in a deadlock
    if (!madeProgress && this.retryAttempts > 3) {
      console.warn(`No progress detected after ${this.retryAttempts} attempts, may be deadlocked`)
      
      // After multiple attempts with no progress, check for circular dependencies
      const dependencyGraph: Record<string, string[]> = {}
      
      // Build dependency graph
      for (const task of boardAfter.tasks) {
        dependencyGraph[task.id] = task.dependencies || []
      }
      
      // Check for circular dependencies
      const { hasCircularDependencies, stuckTasks } = this.checkForCircularDependencies(
        boardAfter.tasks, 
        dependencyGraph
      )
      
      if (hasCircularDependencies && stuckTasks.length > 0) {
        console.warn(`Detected ${stuckTasks.length} tasks stuck in circular dependencies`)
        
        // Mark these tasks as failed to break the deadlock
        for (const task of stuckTasks) {
          await this.vibeStore.updateTask(this.boardId, task.id, {
            status: 'failed',
            error: 'Task was part of a circular dependency'
          })
        }
      } else if (this.retryAttempts > this.maxRetryAttempts / 2) {
        // If we're past half of max retries with no progress, mark pending tasks as failed
        const pendingTasks = boardAfter.tasks.filter(task => 
          task.status !== 'completed' && 
          task.status !== 'failed' && 
          !(task.id in this.runningTasks)
        )
        
        console.warn(`Marking ${pendingTasks.length} pending tasks as failed due to lack of progress`)
        
        for (const task of pendingTasks) {
          await this.vibeStore.updateTask(this.boardId, task.id, {
            status: 'failed',
            error: 'Task execution stalled'
          })
        }
      }
    }
    
    // Reset recursion depth and retry
    this.recursionDepth = 0
    console.log('Retrying task execution after waiting')
    await this.executeAllTasks()
  }
  
  /**
   * Check for circular dependencies in the task graph
   * @param tasks All tasks
   * @param dependencyGraph Dependency graph
   * @returns Object containing circular dependency info and stuck tasks
   */
  private checkForCircularDependencies(
    tasks: VibeTask[],
    dependencyGraph: Record<string, string[]>
  ): { 
    hasCircularDependencies: boolean, 
    circularPaths: string[][],
    stuckTasks: VibeTask[] 
  } {
    const visited: Record<string, boolean> = {}
    const recStack: Record<string, boolean> = {}
    const circularPaths: string[][] = []
    
    // Function to detect cycles using DFS
    const detectCycle = (taskId: string, path: string[] = []): boolean => {
      // If not visited, mark as visited and add to recursion stack
      if (!visited[taskId]) {
        visited[taskId] = true
        recStack[taskId] = true
        
        const currentPath = [...path, taskId]
        
        // Visit all dependencies
        const dependencies = dependencyGraph[taskId] || []
        for (const depId of dependencies) {
          // If not visited, recurse
          if (!visited[depId] && detectCycle(depId, currentPath)) {
            return true
          } 
          // If in recursion stack, we found a cycle
          else if (recStack[depId]) {
            // Find the start of the cycle
            const cycleStartIndex = currentPath.indexOf(depId)
            if (cycleStartIndex !== -1) {
              const cyclePath = [...currentPath.slice(cycleStartIndex), depId]
              circularPaths.push(cyclePath)
            } else {
              circularPaths.push([...currentPath, depId])
            }
            return true
          }
        }
      }
      
      // Remove from recursion stack
      recStack[taskId] = false
      return false
    }
    
    // Run cycle detection for each task
    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        continue
      }
      
      if (!visited[task.id]) {
        detectCycle(task.id)
      }
    }
    
    // Find stuck tasks (pending tasks involved in cycles)
    const stuckTasks = tasks.filter(task => {
      // Skip tasks that are already done or running
      if (task.status === 'completed' || task.status === 'failed' || task.id in this.runningTasks) {
        return false
      }
      
      // Check if this task is part of any circular path
      return circularPaths.some(path => path.includes(task.id))
    })
    
    return { 
      hasCircularDependencies: circularPaths.length > 0,
      circularPaths,
      stuckTasks
    }
  }
  
  /**
   * Visualize the dependency graph for debugging
   * @param tasks All tasks
   * @param dependencyGraph Dependency graph
   */
  private visualizeDependencyGraph(tasks: VibeTask[], dependencyGraph: Record<string, string[]>): void {
    console.group('Task Dependency Graph')
    
    for (const task of tasks) {
      const deps = dependencyGraph[task.id] || []
      const status = task.status
      const isRunning = task.id in this.runningTasks
      
      console.log(`Task ${task.id} (${task.title}) - Status: ${status}${isRunning ? ' (RUNNING)' : ''}`)
      
      if (deps.length > 0) {
        console.group('Dependencies:')
        for (const depId of deps) {
          const depTask = tasks.find(t => t.id === depId)
          if (depTask) {
            console.log(`  ${depId} (${depTask.title}) - Status: ${depTask.status}`)
          } else {
            console.log(`  ${depId} - MISSING TASK`)
          }
        }
        console.groupEnd()
      }
    }
    
    console.groupEnd()
  }
} 