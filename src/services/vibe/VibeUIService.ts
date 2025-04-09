import { ref } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { logger } from '@/services/logger'
import { VibeTaskExecutor } from './VibeTaskExecutor'
import { Editor } from '@tiptap/core'
import { ActorType, TaskPriority } from '@/types/vibe'

// Define types
interface VibeUIState {
  isVisible: boolean
  windowMode: boolean
  activeTaskId: string | null
  expandedTaskIds: string[]
  error: string
  loading: boolean
  width: number
}

// Create a singleton service for Vibe UI state management
class VibeUIService {
  private vibeStore = useVibeStore()
  private taskExecutor: VibeTaskExecutor | null = null
  
  // Default width for the Vibe panel
  private readonly DEFAULT_WIDTH = 450
  private readonly MIN_WIDTH = 300
  private readonly MAX_WIDTH = 800
  
  // Reactive state
  public state = ref<VibeUIState>({
    isVisible: false,
    windowMode: false,
    activeTaskId: null,
    expandedTaskIds: [],
    error: '',
    loading: false,
    width: this.DEFAULT_WIDTH
  })

  // Constructor initializes from localStorage if available
  constructor() {
    this.initFromLocalStorage()
  }

  private initFromLocalStorage() {
    try {
      const savedState = localStorage.getItem('vibe-ui-state')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        this.state.value = {
          ...this.state.value,
          isVisible: parsedState.isVisible ?? false,
          windowMode: parsedState.windowMode ?? false,
          width: parsedState.width ?? this.DEFAULT_WIDTH
        }
      }
    } catch (error) {
      logger.error('Failed to parse saved vibe UI state', error)
    }
  }

  // Save state to localStorage
  private saveState() {
    localStorage.setItem('vibe-ui-state', JSON.stringify({
      isVisible: this.state.value.isVisible,
      windowMode: this.state.value.windowMode,
      activeTaskId: this.state.value.activeTaskId,
      width: this.state.value.width
    }))
  }

  // Toggle visibility of the Vibe panel
  public toggleVisibility() {
    this.state.value.isVisible = !this.state.value.isVisible
    this.saveState()
    return this.state.value.isVisible
  }

  // Set visibility explicitly
  public setVisibility(isVisible: boolean) {
    this.state.value.isVisible = isVisible
    this.saveState()
  }

  // Toggle window mode
  public toggleWindowMode() {
    this.state.value.windowMode = !this.state.value.windowMode
    this.saveState()
    return this.state.value.windowMode
  }

  // Set active task
  public setActiveTask(taskId: string | null) {
    this.state.value.activeTaskId = taskId
    if (taskId && !this.state.value.expandedTaskIds.includes(taskId)) {
      this.state.value.expandedTaskIds.push(taskId)
    }
    this.saveState()
  }

  // Toggle task expansion
  public toggleTaskExpansion(taskId: string) {
    const { expandedTaskIds } = this.state.value
    if (expandedTaskIds.includes(taskId)) {
      this.state.value.expandedTaskIds = expandedTaskIds.filter(id => id !== taskId)
    } else {
      this.state.value.expandedTaskIds.push(taskId)
    }
  }

  // Set loading state
  public setLoading(loading: boolean) {
    this.state.value.loading = loading
  }

  // Set error message
  public setError(error: string) {
    this.state.value.error = error
  }
  
  // Set panel width
  public setWidth(width: number) {
    const clampedWidth = Math.max(this.MIN_WIDTH, Math.min(width, this.MAX_WIDTH))
    this.state.value.width = clampedWidth
    this.saveState()
  }
  
  // Reset width to default
  public resetWidth() {
    this.state.value.width = this.DEFAULT_WIDTH
    this.saveState()
  }

  // Refresh Vibe data
  public async refreshVibe(boardId: string) {
    if (!boardId) return

    this.setLoading(true)
    this.setError('')
    
    try {
      // Get the board data synchronously, not a promise
      const board = this.vibeStore.getBoard(boardId)
      if (!board) {
        throw new Error(`Board ${boardId} not found`)
      }
      
      // Load tables synchronously
      const tables = this.vibeStore.getTablesForBoard(boardId)
      
      logger.log('Vibe refreshed')
    } catch (error: unknown) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error instanceof Error ? error.message : 'An unknown error occurred'
      
      this.setError(errorMessage)
      logger.error('Vibe refresh error:', error)
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Execute tasks for a board directly, inspired by the implementation in VibeBlock
   * @param boardId The ID of the board to execute tasks for
   * @param editor Optional editor instance to pass to the task executor
   */
  public async executeTasksForBoard(boardId: string, editor?: Editor): Promise<void> {
    if (!boardId) {
      logger.error('Cannot execute tasks: boardId is undefined or null');
      this.setError('Board ID is required to execute tasks');
      return;
    }
    
    logger.log(`Starting task execution for board: ${boardId}`);
    this.setLoading(true);
    this.setError('');
    
    try {
      // Clean up any existing task executor
      this.disposeExecutor();
      
      // Get board to verify it exists
      const board = this.vibeStore.getBoard(boardId);
      if (!board) {
        throw new Error(`Board ${boardId} not found`);
      }
      
      // Verify board state is valid
      if (!board.id || board.id !== boardId) {
        throw new Error(`Board exists but has invalid ID: ${board.id} != ${boardId}`);
      }
      
      // Verify each task in the board has a valid boardId
      const tasksWithMissingBoardId = board.tasks.filter(task => !task.boardId || task.boardId !== boardId);
      if (tasksWithMissingBoardId.length > 0) {
        logger.warn(`Found ${tasksWithMissingBoardId.length} tasks with missing or incorrect boardId, fixing...`);
        
        for (const task of tasksWithMissingBoardId) {
          await this.vibeStore.updateTask(boardId, task.id, {
            boardId: boardId
          });
        }
        
        // Save changes to localStorage
        await this.vibeStore.saveToLocalStorage();
        
        // Reload the board to get the updated tasks
        const updatedBoard = this.vibeStore.getBoard(boardId);
        if (!updatedBoard) {
          throw new Error(`Board ${boardId} could not be reloaded after fixing tasks`);
        }
        
        // Replace the board reference with the updated one
        board.tasks = updatedBoard.tasks;
      }
      
      // Create baseline tasks if needed
      const hasTasks = await this.ensureBaselineTasks(board);
      if (!hasTasks) {
        logger.warn(`No tasks found on board ${boardId} and couldn't create baseline tasks`);
        this.setError('Could not create baseline tasks');
        return;
      }
      
      // Ensure all changes are persisted to localStorage before execution
      logger.log('Saving board state to localStorage before execution');
      await this.vibeStore.saveToLocalStorage();
      
      // Create a task executor
      logger.log(`Creating new task executor for board ${boardId}`);
      this.taskExecutor = new VibeTaskExecutor(boardId, editor);
      
      // Execute all tasks and catch any errors
      logger.log('Executing all tasks');
      await this.taskExecutor.executeAllTasks();
      
    } catch (error: unknown) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error instanceof Error ? error.message : 'An unknown error occurred';
      
      this.setError(errorMessage);
      logger.error('Task execution error:', error);
      
      // Attempt to clean up after error
      this.disposeExecutor();
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Ensure baseline tasks exist on a board
   * @param board The board to check/update
   * @returns True if the board has at least one task
   */
  private async ensureBaselineTasks(board: any): Promise<boolean> {
    try {
      if (!board || !board.id) {
        logger.error('Invalid board object in ensureBaselineTasks:', board);
        return false;
      }
      
      if (!board.tasks || !Array.isArray(board.tasks)) {
        logger.error('Board has invalid tasks array:', board.tasks);
        return false;
      }
      
      // Validate and fix existing tasks
      for (const task of board.tasks) {
        if (!task.boardId || task.boardId !== board.id) {
          logger.warn(`Task ${task.id} has incorrect boardId, fixing it`);
          await this.vibeStore.updateTask(board.id, task.id, {
            boardId: board.id
          });
        }
      }
      
      // Check if we have a planner task, and create one if needed
      const plannerTask = board.tasks.find((task: any) => task.actorType === ActorType.PLANNER);
      if (!plannerTask) {
        logger.log('No planner task found, creating one');
        try {
          await this.vibeStore.createTask(board.id, {
            title: 'Create execution plan',
            description: board.title || 'Manual execution',
            actorType: ActorType.PLANNER,
            dependencies: [],
            priority: TaskPriority.HIGH
          });
          
          // Explicitly save after creating the task
          await this.vibeStore.saveToLocalStorage();
        } catch (error) {
          logger.error('Error creating planner task:', error);
          return false;
        }
      }
      
      // Create a composer task if needed to drive execution
      const composerTask = board.tasks.find((task: any) => task.actorType === ActorType.COMPOSER);
      if (!composerTask) {
        logger.log('No composer task found, creating one');
        try {
          await this.vibeStore.createTask(board.id, {
            title: 'Orchestrate tasks',
            description: board.title || 'Manual execution',
            actorType: ActorType.COMPOSER,
            dependencies: [],
            priority: TaskPriority.HIGH,
            metadata: {
              enabledActors: [
                ActorType.COMPOSER,
                ActorType.PLANNER,
                ActorType.RESEARCHER,
                ActorType.ANALYST,
                ActorType.CODER,
                ActorType.WRITER
              ]
            }
          });
          
          // Explicitly save after creating the task
          await this.vibeStore.saveToLocalStorage();
        } catch (error) {
          logger.error('Error creating composer task:', error);
          return false;
        }
      }
      
      // Verify the board now has tasks - refresh from the store to get the latest state
      const updatedBoard = this.vibeStore.getBoard(board.id);
      const hasValidTasks = !!(updatedBoard && updatedBoard.tasks && updatedBoard.tasks.length > 0);
      
      if (!hasValidTasks) {
        logger.error(`Board ${board.id} still has no tasks after creation attempts`);
      } else {
        logger.log(`Board ${board.id} now has ${updatedBoard.tasks.length} tasks`);
      }
      
      return hasValidTasks;
    } catch (error) {
      logger.error('Error ensuring baseline tasks:', error);
      return false;
    }
  }

  /**
   * Check if the service has an active task executor
   * @returns True if an executor exists
   */
  public hasExecutor(): boolean {
    return this.taskExecutor !== null
  }

  /**
   * Dispose the current task executor if it exists
   */
  public disposeExecutor(): void {
    if (this.taskExecutor) {
      logger.log('Disposing task executor')
      this.taskExecutor.dispose()
      this.taskExecutor = null
    }
  }
}

// Export as singleton
export const vibeUIService = new VibeUIService() 