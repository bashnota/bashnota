import type { Ref } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import type { VibeTask, DatabaseTable } from '@/types/vibe'
import { logger } from '@/services/logger'
import type { Editor } from '@tiptap/core'

type VibeStoreInstance = ReturnType<typeof useVibeStore>

/**
 * Task management composable
 */
export function useTaskManagement(
  vibeStore: VibeStoreInstance,
  props: { boardId: string, editor: Editor | null },
  tasks: Ref<VibeTask[]>,
  expandedTaskIds: Ref<string[]>,
  selectedTaskId: Ref<string | null>,
  databaseTables: Ref<DatabaseTable[]>,
  expandedTableIds: Ref<string[]>,
  selectedTaskForModal: Ref<VibeTask | null>,
  toast: any
) {
  /**
   * Load tasks for the current board
   */
  function loadBoardTasks() {
    if (!props.boardId) return

    logger.log('Loading board tasks for terminal:', props.boardId)
    
    // Get board is not a promise, handle it synchronously
    const board = vibeStore.getBoard(props.boardId)
    if (board) {
      tasks.value = board.tasks
    } else {
      logger.warn(`Board ${props.boardId} not found in loadBoardTasks`)
      tasks.value = []
    }
  }

  /**
   * Load database tables for the current board
   */
  function loadDatabaseTables() {
    if (!props.boardId) return

    logger.log('Loading database tables for terminal:', props.boardId)
    
    // getTablesForBoard is not a promise, handle it synchronously
    const tables = vibeStore.getTablesForBoard(props.boardId)
    databaseTables.value = tables || []
  }

  /**
   * Toggle task expansion
   */
  function toggleTask(taskId: string) {
    if (expandedTaskIds.value.includes(taskId)) {
      expandedTaskIds.value = expandedTaskIds.value.filter(id => id !== taskId)
    } else {
      expandedTaskIds.value.push(taskId)
    }
  }

  /**
   * Select a task dependency
   */
  function selectDependency(depId: string) {
    selectedTaskId.value = depId
    if (!expandedTaskIds.value.includes(depId)) {
      expandedTaskIds.value.push(depId)
    }
  }

  /**
   * Toggle database table expansion
   */
  function toggleTableExpansion(tableId: string) {
    if (expandedTableIds.value.includes(tableId)) {
      expandedTableIds.value = expandedTableIds.value.filter(id => id !== tableId)
    } else {
      expandedTableIds.value.push(tableId)
    }
  }

  /**
   * Check if task result can be inserted
   */
  function canInsertResult(task: VibeTask) {
    return task.status === 'completed' && !!props.editor
  }

  /**
   * Insert task result into editor
   */
  function insertTaskResult(task: VibeTask) {
    if (!props.editor || !task.result) return

    try {
      // Insert the result at cursor position
      const content = typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)
      props.editor.commands.insertContent(content)
      toast({
        title: 'Success',
        description: 'Result inserted into document'
      })
    } catch (error) {
      logger.error('Error inserting result:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to insert result'
      })
    }
  }

  /**
   * Show task details modal
   */
  function showTaskDetailsModal(task: VibeTask) {
    selectedTaskForModal.value = task
  }

  /**
   * Refresh tasks and database tables
   */
  function refreshTasks() {
    loadBoardTasks()
    loadDatabaseTables()
  }

  return {
    loadBoardTasks,
    loadDatabaseTables,
    toggleTask,
    selectDependency,
    toggleTableExpansion,
    canInsertResult,
    insertTaskResult,
    showTaskDetailsModal,
    refreshTasks
  }
} 