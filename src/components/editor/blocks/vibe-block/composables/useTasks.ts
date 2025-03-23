// Task management composable
import { ref, computed } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import type { Ref } from 'vue'
import { logger } from '@/services/logger'

/**
 * Composable for managing tasks in the Vibe block
 */
export function useTasks(boardId: Ref<string>) {
  const vibeStore = useVibeStore()
  const boardTasks = ref<any[]>([])
  const expandedTaskIds = ref<string[]>([])
  const selectedTaskId = ref<string | null>(null)
  const selectedTaskForModal = ref<any | null>(null)
  
  // Computed properties
  const hasTasks = computed(() => boardTasks.value.length > 0)
  const hasInProgressTasks = computed(() => 
    boardTasks.value.some(task => task.status === 'in_progress')
  )
  const hasCompletedTasks = computed(() => 
    boardTasks.value.some(task => task.status === 'completed')
  )
  const completedTasks = computed(() => 
    boardTasks.value.filter(task => task.status === 'completed')
  )
  const failedTasks = computed(() => 
    boardTasks.value.filter(task => task.status === 'failed')
  )
  
  // Check if execution might be stuck
  const hasStuckTasks = computed(() => {
    // Check for pending tasks that aren't running
    const pendingNotRunning = boardTasks.value.some(task => 
      task.status === 'pending' && 
      !task.dependencies?.some((depId: string) => {
        const dep = boardTasks.value.find(t => t.id === depId)
        return dep && (dep.status === 'pending' || dep.status === 'in_progress')
      })
    )
    
    // Check for tasks that have been in progress for too long (over 5 minutes)
    const stuckInProgress = boardTasks.value.some(task => {
      if (task.status === 'in_progress' && task.startedAt) {
        const startTime = new Date(task.startedAt).getTime()
        const currentTime = new Date().getTime()
        const executionTime = currentTime - startTime
        // Consider stuck if running for more than 5 minutes
        return executionTime > 5 * 60 * 1000
      }
      return false
    })
    
    return pendingNotRunning || stuckInProgress
  })

  /**
   * Load tasks for the current board
   */
  async function loadBoardTasks() {
    try {
      if (!boardId.value) {
        logger.log('No board ID available yet')
        return
      }
      
      logger.log('Loading tasks for board:', boardId.value)
      const board = await vibeStore.getBoard(boardId.value)
      if (board) {
        boardTasks.value = board.tasks || []
        logger.log('Loaded tasks:', boardTasks.value)
      }
    } catch (error) {
      logger.error('Error loading board tasks:', error)
    }
  }

  /**
   * Refresh task status
   */
  async function refreshTasks() {
    logger.log('Refreshing task status')
    await loadBoardTasks()
  }

  /**
   * Toggle task expansion
   */
  function toggleTask(taskId: string) {
    const index = expandedTaskIds.value.indexOf(taskId)
    if (index === -1) {
      expandedTaskIds.value.push(taskId)
    } else {
      expandedTaskIds.value.splice(index, 1)
    }
    
    // Update selected task if we're expanding
    if (index === -1) {
      selectedTaskId.value = taskId
    } else if (selectedTaskId.value === taskId) {
      selectedTaskId.value = null
    }
  }

  /**
   * Get dependency title
   */
  function getDependencyTitle(depId: string) {
    const depTask = boardTasks.value.find(t => t.id === depId)
    return depTask ? depTask.title : `Task ${depId.substring(0, 8)}...`
  }

  /**
   * Select a dependency task
   */
  function selectDependency(depId: string) {
    // Set as selected task
    selectedTaskId.value = depId
    
    // Expand the task
    if (!expandedTaskIds.value.includes(depId)) {
      expandedTaskIds.value.push(depId)
    }
    
    // Scroll to the task
    setTimeout(() => {
      const element = document.getElementById(`task-${depId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  /**
   * Show task details modal
   */
  function showTaskDetailsModal(task: any) {
    selectedTaskForModal.value = task
  }

  /**
   * Get selected task
   */
  function getSelectedTask() {
    return boardTasks.value.find(task => task.id === selectedTaskId.value)
  }

  /**
   * Reset any in-progress tasks to pending
   */
  async function resetInProgressTasks() {
    const inProgressTasks = boardTasks.value.filter(task => task.status === 'in_progress')
    if (inProgressTasks.length > 0) {
      logger.log(`Resetting ${inProgressTasks.length} in-progress tasks back to pending`)
      
      for (const task of inProgressTasks) {
        await vibeStore.updateTask(boardId.value, task.id, {
          status: 'pending'
        })
      }
    }
  }

  // Handle task graph node click
  function handleTaskGraphNodeClick(taskId: string) {
    selectedTaskId.value = taskId
    
    // Expand the task in the tasks tab
    if (!expandedTaskIds.value.includes(taskId)) {
      expandedTaskIds.value.push(taskId)
    }
    
    // Find the tab element and programmatically select it
    const tabsElement = document.querySelector('[data-tabs-root]')
    if (tabsElement) {
      // Find the tasks tab trigger and simulate a click
      const tabsTrigger = tabsElement.querySelector('[data-value="tasks"]')
      if (tabsTrigger) {
        // Cast to HTMLElement to access click method
        (tabsTrigger as HTMLElement).click()
      }
    }
    
    // Scroll to the task element after a short delay to ensure DOM is updated
    setTimeout(() => {
      const element = document.getElementById(`task-${taskId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  return {
    boardTasks,
    expandedTaskIds,
    selectedTaskId,
    selectedTaskForModal,
    hasTasks,
    hasInProgressTasks,
    hasCompletedTasks,
    completedTasks,
    failedTasks,
    hasStuckTasks,
    loadBoardTasks,
    refreshTasks,
    toggleTask,
    getDependencyTitle,
    selectDependency,
    showTaskDetailsModal,
    getSelectedTask,
    resetInProgressTasks,
    handleTaskGraphNodeClick
  }
} 