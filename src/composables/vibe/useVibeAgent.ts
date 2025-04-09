import type { Ref } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { ActorType, TaskPriority, type VibeTask } from '@/types/vibe'
import { logger } from '@/services/logger'
import { vibeUIService } from '@/services/vibe/VibeUIService'
import type { Editor } from '@tiptap/core'
import { nextTick } from 'vue'

type VibeStoreInstance = ReturnType<typeof useVibeStore>

/**
 * Vibe agent lifecycle management composable
 */
export function useVibeAgent(
  vibeStore: VibeStoreInstance,
  props: { boardId: string, editor: Editor | null },
  emit: any,
  tasks: Ref<VibeTask[]>,
  queryInput: Ref<string>,
  terminalLoading: Ref<boolean>,
  terminalError: Ref<string>,
  showDeleteDialog: Ref<boolean>,
  expandedTaskIds: Ref<string[]>,
  selectedTaskId: Ref<string | null>,
  refreshTasks: () => void,
  loadBoardTasks: () => void,
  loadDatabaseTables: () => void,
  toast: any
) {
  /**
   * Create a new Vibe agent
   */
  const createNewVibeAgent = async () => {
    if (props.boardId) return props.boardId
    
    try {
      terminalLoading.value = true
      
      // Create a board with default settings
      const board = vibeStore.createBoard({
        query: 'New Vibe Session',
        jupyterConfig: null
      })
      
      // Ensure board has a valid ID
      if (!board || !board.id) {
        throw new Error('Failed to create board: invalid board returned')
      }
      
      logger.log('Created new vibe board:', board.id)
      
      // Save the board to localStorage immediately
      await vibeStore.saveToLocalStorage()
      
      // Update the current boardId via emit
      emit('board-created', board.id)
      
      // Load the tasks for this board
      loadBoardTasks()
      loadDatabaseTables()
      
      // Don't create any default tasks, wait for user input
      toast({
        title: 'Vibe Agent Created',
        description: 'Enter your query to start the agent',
        duration: 5000
      })
      
      return board.id
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error creating vibe board:', error)
      terminalError.value = errorMessage
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to create Vibe agent: ${errorMessage}`
      })
      
      return null
    } finally {
      terminalLoading.value = false
    }
  }

  /**
   * Submit a query to create tasks
   */
  async function submitQuery() {
    const query = queryInput.value.trim()
    if (!query || !props.boardId) return

    try {
      // Show loading state
      terminalLoading.value = true
      emit('refresh')
      
      // Ensure the board exists
      const board = vibeStore.getBoard(props.boardId)
      if (!board) {
        throw new Error(`Board ${props.boardId} not found`)
      }
      
      logger.log('Submitting query for board:', props.boardId, query)
      
      // Create baseline tasks for the query
      const { composerTask, plannerTask } = await createBaselineTasks(props.boardId, query, [
        ActorType.COMPOSER,
        ActorType.PLANNER,
        ActorType.RESEARCHER,
        ActorType.ANALYST,
        ActorType.CODER,
        ActorType.WRITER
      ])
      
      // Clear the input once tasks are created
      queryInput.value = ''
      
      // Refresh to show the new tasks
      loadBoardTasks()
      
      // Select the newly created task
      selectedTaskId.value = composerTask.id
      if (!expandedTaskIds.value.includes(composerTask.id)) {
        expandedTaskIds.value.push(composerTask.id)
      }
      
      // Now execute the tasks automatically
      await manuallyStartExecution()
      
      toast({
        title: 'Query submitted',
        description: 'Your query has been submitted to the Vibe agent'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error submitting query:', error)
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to submit query: ${errorMessage}`
      })
    } finally {
      terminalLoading.value = false
    }
  }

  /**
   * Create baseline tasks for a query
   */
  async function createBaselineTasks(boardId: string, query: string, enabledActors: ActorType[]): Promise<{ composerTask: VibeTask, plannerTask: VibeTask }> {
    logger.log(`Creating baseline tasks for board ${boardId} with query: ${query}`);

    // 1. Create tasks and get their IDs
    const composerTaskId = await vibeStore.createTask(boardId, {
      title: 'Orchestrate tasks',
      description: query,
      actorType: ActorType.COMPOSER,
      dependencies: [],
      priority: TaskPriority.HIGH,
      metadata: { enabledActors }
    });
    logger.log('Composer task created with ID:', composerTaskId);

    const plannerTaskId = await vibeStore.createTask(boardId, {
      title: 'Create execution plan',
      description: query,
      actorType: ActorType.PLANNER,
      dependencies: [],
      priority: TaskPriority.HIGH
    });
    logger.log('Planner task created with ID:', plannerTaskId);

    // Ensure IDs were returned
    if (!composerTaskId || !plannerTaskId) {
      throw new Error('Failed to get IDs for created tasks');
    }

    // 2. Retrieve the full task objects using the IDs
    await nextTick();
    let composerTask = vibeStore.getTaskFromBoard(boardId, composerTaskId);
    let plannerTask = vibeStore.getTaskFromBoard(boardId, plannerTaskId);

    // 3. Verify tasks were retrieved properly, retry if needed
    if (!composerTask || !plannerTask) {
      logger.error('Tasks created but could not be retrieved from store initially', { composerTaskId, plannerTaskId });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      composerTask = vibeStore.getTaskFromBoard(boardId, composerTaskId);
      plannerTask = vibeStore.getTaskFromBoard(boardId, plannerTaskId);

      // Check again after retry
      if (!composerTask || !plannerTask) {
        logger.error('Retry failed: Tasks still could not be retrieved from store');
        throw new Error('Tasks were created but could not be retrieved from store after retry');
      }
      logger.log('Successfully retrieved created tasks after retry.');
    } else {
      logger.log('Successfully retrieved created tasks on first attempt.');
    }
    
    // At this point, TypeScript knows composerTask and plannerTask are non-null
    // due to the throw statement in the checks above.

    // Ensure tasks have proper boardId (now using the guaranteed non-null objects)
    const composerHasBoard = composerTask.boardId === boardId;
    const plannerHasBoard = plannerTask.boardId === boardId;

    if (!composerHasBoard || !plannerHasBoard) {
      logger.warn('Tasks retrieved but have incorrect boardId, fixing...');

      // No need for null checks here because of the checks above
      if (!composerHasBoard) {
        logger.log(`Fixing boardId for composer task: ${composerTask.id}`);
        await vibeStore.updateTask(boardId, composerTask.id, {
          boardId: boardId
        });
      }

      if (!plannerHasBoard) {
        logger.log(`Fixing boardId for planner task: ${plannerTask.id}`);
        await vibeStore.updateTask(boardId, plannerTask.id, {
          boardId: boardId
        });
      }
    }

    // Ensure tasks are persisted
    await vibeStore.saveToLocalStorage();

    // Return the fetched task objects (now guaranteed to be non-null)
    return {
      composerTask: composerTask, 
      plannerTask: plannerTask   
    };
  }

  /**
   * Manually start task execution
   */
  const manuallyStartExecution = async () => {
    if (!props.boardId) { 
      logger.warn('Cannot start execution: Missing board ID');
      return;
    }
    
    terminalLoading.value = true
    const loadingMsg = 'Starting execution manually...'
    emit('refresh', loadingMsg)
    
    try {
      // Ensure board exists
      const board = vibeStore.getBoard(props.boardId)
      if (!board) {
        throw new Error(`Board ${props.boardId} not found`)
      }
      
      // Verify the board has tasks
      if (!board.tasks || board.tasks.length === 0) {
        throw new Error('No tasks found to execute')
      }
      
      // Pass the correctly typed editor, converting null to undefined
      await vibeUIService.executeTasksForBoard(props.boardId, props.editor || undefined)
      
      // Refresh tasks to show updated status
      refreshTasks()
      
      toast({
        title: 'Execution Started',
        description: 'Task execution has been started manually'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error manually starting execution:', error)
      terminalError.value = errorMessage
      emit('error', terminalError.value)
      
      toast({
        variant: 'destructive',
        title: 'Execution Error',
        description: errorMessage
      })
    } finally {
      terminalLoading.value = false
      emit('refresh')
    }
  }

  /**
   * Stop all running tasks
   */
  function stopExecution() {
    if (!props.boardId) return
    
    try {
      terminalLoading.value = true
      
      // Get all in-progress tasks
      const board = vibeStore.getBoard(props.boardId)
      if (!board) {
        throw new Error('Board not found')
      }
      
      // Mark all in-progress tasks as failed
      const inProgressTasks = board.tasks.filter(t => t.status === 'in_progress')
      
      if (inProgressTasks.length === 0) {
        toast({
          title: 'Info',
          description: 'No tasks are currently running'
        })
        terminalLoading.value = false
        return
      }
      
      // Update all in-progress tasks to failed
      inProgressTasks.forEach(task => {
        vibeStore.updateTask(props.boardId, task.id, {
          status: 'failed',
          error: 'Execution manually stopped by user'
        })
      })
      
      // Clean up any running executors in the service
      if (vibeUIService.hasExecutor()) {
        vibeUIService.disposeExecutor()
      }
      
      refreshTasks()
      
      toast({
        title: 'Execution Stopped',
        description: `Stopped ${inProgressTasks.length} running tasks`
      })
    } catch (error) {
      logger.error('Error stopping execution:', error)
      terminalError.value = error instanceof Error ? error.message : 'Failed to stop execution'
    } finally {
      terminalLoading.value = false
    }
  }

  /**
   * Restart the agent with fresh tasks
   */
  async function restartAgent() {
    if (!props.boardId) { 
      logger.warn('Cannot restart agent: Missing board ID');
      return;
    }
    
    try { 
      terminalLoading.value = true
      
      // Get the board to keep the ID
      const board = vibeStore.getBoard(props.boardId)
      if (!board) {
        throw new Error('Board not found')
      }
      
      // First clean up any existing executors
      if (vibeUIService.hasExecutor()) {
        vibeUIService.disposeExecutor()
      }
      
      // Clear all existing tasks for this board
      board.tasks.forEach(task => {
        vibeStore.updateTask(props.boardId, task.id, {
          status: 'failed',
          error: 'Agent restarted by user'
        })
      })
      
      // Create new base tasks
      const composerTask = vibeStore.createTask(props.boardId, {
        title: 'Orchestrate tasks',
        description: board.title || 'Restarted Vibe Session',
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
      })
      
      const plannerTask = vibeStore.createTask(props.boardId, {
        title: 'Create execution plan',
        description: board.title || 'Restarted Vibe Session',
        actorType: ActorType.PLANNER,
        dependencies: [],
        priority: TaskPriority.HIGH
      })
      
      // Ensure tasks are persisted
      await vibeStore.saveToLocalStorage()
      
      // Refresh to show the new tasks
      refreshTasks()
      
      // Start execution, converting null to undefined
      vibeUIService.executeTasksForBoard(props.boardId, props.editor || undefined)
        .then(() => {
          refreshTasks()
        })
        .catch((error) => {
          logger.error('Error starting execution after restart:', error)
          terminalError.value = error instanceof Error ? error.message : 'Failed to start execution'
        })
        .finally(() => {
          terminalLoading.value = false
        })
      
      toast({
        title: 'Agent Restarted',
        description: 'Vibe agent has been restarted with fresh tasks'
      })
    } catch (error) {
      logger.error('Error restarting agent:', error)
      terminalError.value = error instanceof Error ? error.message : 'Failed to restart agent'
      terminalLoading.value = false
    }
  }

  /**
   * Show the delete confirmation dialog
   */
  function confirmDeleteAgent() {
    showDeleteDialog.value = true
  }

  /**
   * Delete the current agent
   */
  function deleteAgent() {
    if (!props.boardId) return
    
    try {
      // Close dialog
      showDeleteDialog.value = false
      
      terminalLoading.value = true
      
      // Clean up any existing executors
      if (vibeUIService.hasExecutor()) {
        vibeUIService.disposeExecutor()
      }
      
      // Delete the board and all its tasks
      vibeStore.deleteBoard(props.boardId)
      
      // Clear local state
      tasks.value = []
      
      // Clear board ID via emit
      emit('board-created', '')
      
      toast({
        title: 'Agent Deleted',
        description: 'Vibe agent has been deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting agent:', error)
      terminalError.value = error instanceof Error ? error.message : 'Failed to delete agent'
    } finally {
      terminalLoading.value = false
    }
  }

  return {
    createNewVibeAgent,
    submitQuery,
    createBaselineTasks,
    manuallyStartExecution,
    stopExecution,
    restartAgent,
    confirmDeleteAgent,
    deleteAgent
  }
} 