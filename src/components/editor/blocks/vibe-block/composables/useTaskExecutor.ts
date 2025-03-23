// Task executor management composable
import { ref } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { VibeTaskExecutor } from '@/services/vibe/VibeTaskExecutor'
import { useToast } from '@/components/ui/toast/use-toast'
import type { Ref } from 'vue'
import { logger } from '@/services/logger'

/**
 * Composable for task execution in the Vibe block
 */
export function useTaskExecutor(
  boardId: Ref<string>,
  editor: Ref<any>,
  jupyterConfig: Ref<any>,
  updateAttributes: Function
) {
  const vibeStore = useVibeStore()
  const { toast } = useToast()
  const taskExecutor = ref<any>(null)
  const refreshInterval = ref<NodeJS.Timeout | null>(null)
  const loadingMessage = ref('')

  /**
   * Start the refresh interval to periodically check task status
   */
  async function startRefreshInterval(loadTasks: () => Promise<void>) {
    logger.log('Starting refresh interval')
    // Clear any existing interval
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
    }
    
    // Clean up any existing task executor
    if (taskExecutor.value) {
      logger.log('Disposing existing task executor')
      taskExecutor.value.dispose()
      taskExecutor.value = null
    }
    
    // Load tasks initially
    await loadTasks()
    
    // Start the task executor if we have a board ID
    if (boardId.value) {
      try {
        // Verify board exists before creating the executor
        const board = await vibeStore.getBoard(boardId.value)
        
        if (!board) {
          logger.error(`Board ${boardId.value} not found`)
          updateAttributes({
            error: `Board not found. It may have been deleted or never created.`
          })
          return
        }
        
        // Create a task executor for this board with Jupyter configuration
        taskExecutor.value = new VibeTaskExecutor(
          boardId.value, 
          editor.value,
          jupyterConfig.value
        )
        
        // Execute tasks asynchronously
        taskExecutor.value.executeAllTasks().catch((error: Error) => {
          logger.error('Error executing tasks:', error)
          // Only update error if it's not already set
          if (!updateAttributes) return
          updateAttributes({
            error: `Error executing tasks: ${error.message}`
          })
        })
      } catch (error: any) {
        logger.error('Error in startRefreshInterval:', error)
        updateAttributes({
          error: `Error starting task execution: ${error.message}`
        })
        return
      }
    }
    
    // Set up polling to refresh task status
    refreshInterval.value = setInterval(() => {
      loadTasks()
    }, 5000) // Check every 5 seconds
  }

  /**
   * Clean up resources when component is unmounted
   */
  function cleanupExecutor() {
    logger.log('Cleaning up task executor')
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
    
    // Clean up task executor if it exists
    if (taskExecutor.value) {
      logger.log('Disposing task executor')
      taskExecutor.value.dispose()
      taskExecutor.value = null
    }
  }

  /**
   * Reset task execution if it gets stuck
   */
  async function resetTaskExecution(resetInProgressTasks: () => Promise<void>, refreshTasks: () => Promise<void>) {
    try {
      logger.log('Attempting to reset task execution')
      
      if (!taskExecutor.value) {
        logger.warn('No task executor available to reset')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Cannot reset execution - no active executor'
        })
        return
      }
      
      // Reset the task executor state
      taskExecutor.value.resetState()
      
      // Reset any in_progress tasks back to pending
      await resetInProgressTasks()
      
      // Restart task execution
      await taskExecutor.value.executeAllTasks()
      
      // Refresh the task list
      await refreshTasks()
      
      toast({
        title: 'Execution Reset',
        description: 'Task execution has been reset and will continue'
      })
    } catch (error: any) {
      logger.error('Error resetting task execution:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset execution: ' + (error.message || 'Unknown error')
      })
    }
  }

  return {
    taskExecutor,
    refreshInterval,
    loadingMessage,
    startRefreshInterval,
    cleanupExecutor,
    resetTaskExecution
  }
} 