<template>
  <div 
    ref="terminalRef"
    class="vibe-terminal" 
    :class="terminalClasses"
    :style="(applyVisibilityStyles() as any)"
    @click="handleClick"
    role="region"
    aria-label="Vibe Terminal"
  >
    <!-- Mode toggle buttons -->
    <div class="terminal-mode-toggles" role="toolbar" aria-label="Terminal display modes">
      <button 
        class="mode-toggle-btn" 
        :class="{ active: displayMode === 'bottom' }"
        @click.stop="setDisplayMode('bottom')"
        title="Bottom Mode"
        :aria-pressed="displayMode === 'bottom'"
      >
        <ArrowDown class="w-4 h-4" />
        <span class="sr-only">Bottom Mode</span>
      </button>
      <button 
        class="mode-toggle-btn" 
        :class="{ active: displayMode === 'side' }"
        @click.stop="setDisplayMode('side')"
        title="Side Mode"
        :aria-pressed="displayMode === 'side'"
      >
        <PanelRight class="w-4 h-4" />
        <span class="sr-only">Side Mode</span>
      </button>
      <button 
        class="mode-toggle-btn" 
        :class="{ active: displayMode === 'right-nav' }"
        @click.stop="setDisplayMode('right-nav')"
        title="Right Nav Mode"
        :aria-pressed="displayMode === 'right-nav'"
      >
        <Sidebar class="w-4 h-4" />
        <span class="sr-only">Right Nav Mode</span>
      </button>
      <button 
        class="mode-toggle-btn" 
        :class="{ active: displayMode === 'fullscreen' }"
        @click.stop="toggleFullscreen"
        title="Fullscreen Mode"
        :aria-pressed="isFullscreen"
      >
        <Maximize class="w-4 h-4" />
        <span class="sr-only">Fullscreen Mode</span>
      </button>
    </div>
    
    <!-- Close button -->
    <button 
      class="terminal-close-btn" 
      @click.stop="closeTerminal"
      title="Close terminal"
      aria-label="Close terminal"
    >
      <X class="w-4 h-4" />
    </button>

    <!-- Terminal Header Component -->
    <VibeTerminalHeader 
      :task-count="tasksInQueue"
      :status="status"
      :is-collapsed="isCollapsed"
      :is-expanded="isExpanded"
      :is-fullscreen="isFullscreen"
      :has-active-tasks="hasActiveTasks"
      :has-failed-tasks="hasFailedTasks"
      :has-all-completed="hasAllCompleted"
      :completed-task-count="completedTaskCount"
      :total-task-count="totalTaskCount"
      :has-active-board="hasActiveBoard"
      :has-in-progress-tasks="hasInProgressTasks"
      :tasks-in-queue="tasksInQueue"
      :stdout-output="stdoutOutput"
      :stderr-output="stderrOutput"
      :current-task="currentTask"
      @toggle-expand="toggleExpand"
      @toggle-fullscreen="toggleFullscreen"
      @clear-terminal="clearAllTasks()"
    />

    <!-- Terminal Content - Use CSS for visibility instead of v-show -->
    <div class="terminal-content" ref="terminalContentRef">
      <!-- Blank terminal state -->
      <div v-if="!hasActiveBoard" class="terminal-empty-state">
        <!-- List of existing boards -->
        <VibeSavedBoardsList
          v-if="savedBoards.length > 0"
          :boards="savedBoards"
          @select-board="selectBoard"
        />
        
        <Braces class="h-12 w-12 mb-3 text-muted-foreground/20" />
        <p class="text-sm mb-2">No active Vibe session</p>
        <p class="text-xs text-muted-foreground mb-4">Start a new Vibe session to get help with tasks</p>
        
        <Button variant="outline" @click="createNewVibeAgent" class="flex items-center gap-1">
          <Zap class="h-4 w-4 mr-1" />
          Create New Vibe Agent
        </Button>
      </div>

      <!-- Active terminal content -->
      <div v-else class="terminal-active-content">
        <!-- Loading state with improved animation -->
        <VibeLoadingState
          v-if="terminalLoading"
          :message="props.loadingMessage || 'Processing your request...'"
        />

        <!-- Error state -->
        <VibeErrorState
          v-else-if="terminalError"
          :error="terminalError"
          @retry="resetVibe"
        />

        <!-- Input Panel for active board -->
        <VibeQueryInput 
          v-else
          :disabled="hasInProgressTasks"
          :query="queryInput"
          :is-initial-query="tasks.length === 0"
          @update:query="queryInput = $event"
          @submit="submitQuery"
        />

        <!-- Task board details -->
        <VibeTaskBoard
          v-if="tasks.length > 0"
          :tasks="tasks" 
          :expandedTaskIds="expandedTaskIds"
          :selectedTaskId="selectedTaskId"
          :canInsertResult="canInsertResult"
          :hasStuckTasks="hasStuckTasks"
          @refresh="refreshTasks"
          @reset="resetTaskExecution"
          @toggle-task="toggleTask"
          @select-dependency="selectDependency"
          @select-task="selectedTaskId = $event"
          @insert-result="insertTaskResult"
          @view-details="showTaskDetailsModal"
          @load-database="loadDatabaseTables"
          @start-execution="manuallyStartExecution"
        >
          <template #database-content>
            <VibeDatabaseView
              :tables="databaseTables"
              :expandedTableIds="expandedTableIds"
              @toggle-table="toggleTableExpansion"
            />
          </template>
        </VibeTaskBoard>

        <!-- Manual execution indicator when stuck -->
        <VibeExecutionPrompt
          v-else-if="props.boardId && !terminalLoading && !terminalError && tasks.length === 0"
          @start-execution="manuallyStartExecution"
        />
      </div>
    </div>

    <!-- Task details modal -->
    <VibeTaskDetails
      :task="selectedTaskForModal"
      :canInsertResult="canInsertResult"
      @update:task="selectedTaskForModal = $event"
      @insert-result="insertTaskResult"
    />
    
    <!-- Delete dialog -->
    <VibeDeleteDialog
      :show="showDeleteDialog"
      @update:show="(value: boolean) => showDeleteDialog = value"
      @confirm="deleteAgent"
    />

    <!-- Resizers -->
    <div 
      v-if="displayMode === 'side' && !isCollapsed"
      class="horizontal-resizer"
      ref="horizontalResizerRef"
      @mousedown="(e) => startResize('horizontal', e)"
    ></div>
    <div 
      v-if="displayMode === 'bottom' && !isCollapsed"
      class="vertical-resizer"
      ref="verticalResizerRef"
      @mousedown="(e) => startResize('vertical', e)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { useVibeStore } from '@/stores/vibeStore'
import { Button } from '@/components/ui/button'
import { Braces, Zap, ArrowDown, PanelRight, Sidebar, Maximize, X } from 'lucide-vue-next'

// Import components
import VibeTerminalHeader from './VibeTerminalHeader.vue'
import VibeQueryInput from './VibeQueryInput.vue'
import VibeTaskBoard from './VibeTaskBoard.vue'
import VibeDatabaseView from './VibeDatabaseView.vue'
import VibeTaskDetails from './VibeTaskDetails.vue'
import VibeExecutionPrompt from './VibeExecutionPrompt.vue'
import VibeSavedBoardsList from './VibeSavedBoardsList.vue'
import VibeLoadingState from './VibeLoadingState.vue'
import VibeErrorState from './VibeErrorState.vue'
import VibeDeleteDialog from './VibeDeleteDialog.vue'

// Import composables
import { useTaskManagement } from '../../../../../composables/vibe/useTaskManagement'
import { useVibeAgent } from '../../../../../composables/vibe/useVibeAgent'
import { useDateFormatter } from '../../../../../composables/useDateFormatter'
import { useTerminalExpansion } from '../composables/useTerminalExpansion'

// Import logger and service
import { logger } from '@/services/logger'
import { vibeUIService } from '@/services/vibe/VibeUIService'

// Import task types
import { ActorType, TaskPriority, type VibeTask, type DatabaseTable, type TaskBoard } from '@/types/vibe'
import type { Editor } from '@tiptap/core'

// Props
const props = defineProps({
  boardId: {
    type: String,
    default: 'default'
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  loadingMessage: {
    type: String,
    default: 'Processing...'
  },
  editor: {
    type: Object as () => Editor | null,
    default: null
  },
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['reset', 'refresh', 'update:expanded', 'board-created', 'error', 'close'])

// State
const vibeStore = useVibeStore()
const { toast } = useToast()
const tasks = ref<VibeTask[]>([])
const expandedTaskIds = ref<string[]>([])
const selectedTaskId = ref<string | null>(null)
const databaseTables = ref<DatabaseTable[]>([])
const expandedTableIds = ref<string[]>([])
const selectedTaskForModal = ref<VibeTask | null>(null)
const refreshInterval = ref<NodeJS.Timeout | null>(null)
const savedBoards = ref<TaskBoard[]>([])
const queryInput = ref('')
const terminalLoading = ref(!!props.isLoading)
const terminalError = ref(props.error || '')
const showDeleteDialog = ref(false)
const terminalContentRef = ref<HTMLElement | null>(null)

// Sync terminal loading and error state with props
watch(() => props.isLoading, (newIsLoading) => {
  terminalLoading.value = newIsLoading
})

watch(() => props.error, (newError) => {
  terminalError.value = newError
})

// Terminal width state from service
const terminalWidth = computed(() => vibeUIService.state.value.width)

// Use terminal expansion composable
const { 
  isCollapsed,
  isExpanded,
  isFullscreen,
  displayMode,
  terminalClasses,
  toggleExpand,
  toggleFullscreen,
  setDisplayMode,
  applyVisibilityStyles
} = useTerminalExpansion({ defaultCollapsed: true })

// Reference for the terminal element and resizers
const terminalRef = ref<HTMLElement | null>(null)
const horizontalResizerRef = ref<HTMLElement | null>(null)
const verticalResizerRef = ref<HTMLElement | null>(null)

// Enhanced resize handlers
const isResizing = ref(false)
const resizeDirection = ref<'horizontal' | 'vertical' | null>(null)
const initialWidth = ref(0)
const initialHeight = ref(0)
const initialX = ref(0)
const initialY = ref(0)
const width = ref<number | null>(null)
const height = ref<number | null>(null)

// Computed properties
const currentTask = computed(() => {
  if (!selectedTaskId.value || !tasks.value.length) return null
  return tasks.value.find(task => task.id === selectedTaskId.value) || null
})

const terminalContentStyle = computed(() => {
  return applyVisibilityStyles()
})

// Current task computed properties
const taskHasOutput = computed(() => {
  return !!currentTask.value && 
    !!currentTask.value.result && 
    typeof currentTask.value.result.output === 'string' && 
    currentTask.value.result.output.trim().length > 0
})

// Rename to avoid conflict with the function from useTaskManagement
const canInsertCurrentTaskResult = computed(() => {
  return taskHasOutput.value && props.editor !== null
})

// Computed
const hasActiveBoard = computed(() => !!props.boardId)
const hasActiveTasks = computed(() => tasks.value.length > 0)
const totalTaskCount = computed(() => tasks.value.length)
const completedTaskCount = computed(() => tasks.value.filter(t => t.status === 'completed').length)
const hasAllCompleted = computed(() => completedTaskCount.value === totalTaskCount.value && totalTaskCount.value > 0)
const hasFailedTasks = computed(() => tasks.value.some(t => t.status === 'failed'))
const hasStuckTasks = computed(() => hasFailedTasks.value)
const hasInProgressTasks = computed(() => 
  tasks.value.some(t => t.status === 'in_progress')
)

// Current task and output computed values for terminal header
const tasksInQueue = computed(() => tasks.value.filter(t => t.status === 'pending' || t.status === 'in_progress').length)
const stdoutOutput = computed(() => {
  const task = currentTask.value
  if (!task) return ''
  // Safely access potential properties
  return (task as any)?.result?.stdout || (task as any)?.output?.stdout || ''
})
const stderrOutput = computed(() => {
  const task = currentTask.value
  if (!task) return ''
  // Safely access potential properties 
  return (task as any)?.result?.stderr || (task as any)?.output?.stderr || ''
})
const status = computed(() => {
  if (hasInProgressTasks.value) return 'running'
  if (props.error) return 'error'
  return 'idle'
})

// Methods from task management composable
const { 
  loadBoardTasks,
  loadDatabaseTables,
  toggleTask,
  selectDependency,
  toggleTableExpansion,
  insertTaskResult,
  showTaskDetailsModal,
  refreshTasks,
  canInsertResult
} = useTaskManagement(vibeStore, props, tasks, expandedTaskIds, selectedTaskId, databaseTables, expandedTableIds, selectedTaskForModal, toast)

// Task execution methods
function resetTaskExecution() {
  emit('reset')
  
  // Reset tasks to pending status first
  if (props.boardId) {
    // Refresh tasks to ensure we have the latest data
    refreshTasks()
    
    // Use the vibeUIService to restart task execution
    vibeUIService.executeTasksForBoard(props.boardId, props.editor ?? undefined)
      .then(() => {
        refreshTasks()
        // Make sure styles are properly applied after refresh
        applyVisibilityStyles()
      })
      .catch((error) => {
        logger.error('Error restarting task execution:', error)
        terminalError.value = error instanceof Error ? error.message : 'Failed to restart execution'
      })
  }
}

function resetVibe() {
  emit('reset')
  
  // Clear error state
  terminalError.value = ''
  
  // If we have a board, try executing tasks again
  if (props.boardId) {
    // Reset tasks to pending status first
    refreshTasks()
    
    // Use the vibeUIService to restart task execution
    vibeUIService.executeTasksForBoard(props.boardId, props.editor ?? undefined)
      .then(() => {
        refreshTasks()
      })
      .catch((error) => {
        logger.error('Error restarting task execution:', error)
        terminalError.value = error instanceof Error ? error.message : 'Failed to restart execution'
      })
  }
}

// Agent lifecycle methods from the agent composable
const { 
  createNewVibeAgent,
  submitQuery,
  createBaselineTasks,
  manuallyStartExecution,
  stopExecution,
  restartAgent,
  confirmDeleteAgent,
  deleteAgent
} = useVibeAgent(
  vibeStore, 
  props, 
  emit, 
  tasks, 
  queryInput, 
  terminalLoading, 
  terminalError, 
  showDeleteDialog,
  expandedTaskIds,
  selectedTaskId,
  refreshTasks,
  loadBoardTasks,
  loadDatabaseTables,
  toast
)

// Saved boards methods
function loadSavedBoards() {
  savedBoards.value = vibeStore.boards.filter(board => board.id !== props.boardId)
}

function selectBoard(boardId: string) {
  emit('board-created', boardId)
}

// Watch for changes in boardId to load tasks
watch(() => props.boardId, (newBoardId) => {
  // Load saved boards regardless of board ID change
  loadSavedBoards()
  
  if (newBoardId) {
    // If board ID changes, load tasks and database tables
    terminalLoading.value = true
    loadBoardTasks()
    loadDatabaseTables()
    terminalLoading.value = false
    
    // Ensure proper visibility after loading content
    nextTick(() => {
      applyVisibilityStyles()
    })
    
    // Start refresh interval
    if (!refreshInterval.value) {
      refreshInterval.value = setInterval(() => {
        refreshTasks()
        loadSavedBoards() // Refresh boards list periodically
        
        // Reapply visibility styles after each refresh
        if (isCollapsed.value) {
          applyVisibilityStyles()
        }
      }, 5000)
    }
  } else {
    // Clear tasks if board ID is removed
    tasks.value = []
    databaseTables.value = []
    
    // Clear interval
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
})

// Optimized event handler creation
function createOptimizedEventHandler(handler: Function) {
  return (event: Event) => {
    // Use requestAnimationFrame for visual updates
    requestAnimationFrame(() => {
      handler(event)
    })
  }
}

// Watch for collapsed state changes
watch(isCollapsed, (newCollapsedState) => {
  // Use requestAnimationFrame for DOM updates
  requestAnimationFrame(() => {
    // Apply padding to document body when collapsed to prevent content from hiding behind terminal
    if (newCollapsedState) {
      // Only add padding if not in fullscreen mode
      if (!isFullscreen.value) {
        // Add class to body to adjust layout
        document.body.classList.add('vibe-terminal-collapsed-active')
      }
    } else {
      // Remove class when expanded
      document.body.classList.remove('vibe-terminal-collapsed-active')
    }
  })
})

// Watch for fullscreen mode
watch(isFullscreen, (newFullscreenState) => {
  // Use requestAnimationFrame for DOM updates
  requestAnimationFrame(() => {
    if (newFullscreenState) {
      // Remove other classes
      document.body.classList.remove('vibe-terminal-collapsed-active')
      // Add fullscreen class
      document.body.classList.add('vibe-terminal-fullscreen-active')
    } else {
      // Remove fullscreen class
      document.body.classList.remove('vibe-terminal-fullscreen-active')
      // If still collapsed, restore appropriate class
      if (isCollapsed.value) {
        document.body.classList.add('vibe-terminal-collapsed-active')
      }
    }
  })
})

// Enhanced scrolling for terminal content
function initSmoothScrolling() {
  if (!terminalContentRef.value) return
  
  const content = terminalContentRef.value
  let isScrolling = false
  let scrollTimeout: NodeJS.Timeout | null = null
  
  content.addEventListener('scroll', () => {
    if (!isScrolling) {
      // Add class while scrolling
      content.classList.add('is-scrolling')
      isScrolling = true
    }
    
    // Clear previous timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    
    // Set timeout to remove scrolling class
    scrollTimeout = setTimeout(() => {
      content.classList.remove('is-scrolling')
      isScrolling = false
    }, 150)
  })
}

// Add styles to document when component is mounted
onMounted(() => {
  // Add CSS to document head for global page layout adjustments
  const style = document.createElement('style')
  style.innerHTML = `
    /* Global styles for adjusting page layout when terminal is collapsed */
    body.vibe-terminal-collapsed-active {
      padding-bottom: 50vh !important; /* Add padding to prevent content hiding */
      transition: padding-bottom 0.3s ease;
    }
    
    body.vibe-terminal-fullscreen-active {
      overflow: hidden !important; /* Prevent scrolling in fullscreen mode */
    }
    
    /* Loading animation improvements */
    @keyframes pulse-opacity {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 0.4; }
    }
    
    .vibe-terminal .loading-pulse {
      animation: pulse-opacity 1.5s ease-in-out infinite;
    }
  `
  document.head.appendChild(style)
  
  // Initialize smooth scrolling
  nextTick(() => {
    initSmoothScrolling()
  })
  
  // Use passive event listeners for scroll events
  if (terminalContentRef.value) {
    terminalContentRef.value.addEventListener('scroll', () => {}, { passive: true })
  }
  
  // Load saved boards
  loadSavedBoards()
  
  // Only load existing board data, don't auto-create
  if (props.boardId) {
    loadBoardTasks()
    loadDatabaseTables()
    
    // Set up refresh interval
    refreshInterval.value = setInterval(() => {
      refreshTasks()
      // Reapply visibility styles after each refresh
      if (isCollapsed.value) {
        applyVisibilityStyles()
      }
    }, 5000)
  }
  
  // Ensure terminal starts collapsed
  isExpanded.value = false
  isFullscreen.value = false
  
  // Check if terminal should be visible initially
  if (terminalRef.value && !vibeUIService.state.value.isVisible) {
    terminalRef.value.style.display = 'none';
  }
})

// Clean up when component is unmounted
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
  
  // Remove body classes
  document.body.classList.remove('vibe-terminal-collapsed-active')
  document.body.classList.remove('vibe-terminal-fullscreen-active')
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  
  // Reset UI service state if needed
  try {
    vibeUIService.state.value.isVisible = false
  } catch (error) {
    console.error('Could not reset terminal visibility state', error)
  }
})

// Handle click method for terminal panel
function handleClick(event: MouseEvent) {
  // Prevent clicks on the terminal content from propagating
  // This is necessary to enable selecting text in the terminal
  event.stopPropagation()
}

// Function to clear all tasks - safer implementation
function clearAllTasks() {
  tasks.value = []
  // Use a safer approach - check if method exists
  const store = vibeStore as any
  if (store && typeof store.clearTasks === 'function') {
    store.clearTasks(props.boardId)
  } else {
    // Fallback
    console.warn('clearTasksForBoard not available, using alternative approach')
    // Reset tasks array and update store
    if (props.boardId && typeof store.updateBoard === 'function') {
      store.updateBoard(props.boardId, { tasks: [] })
    }
  }
}

// Close terminal function
function closeTerminal(event: MouseEvent) {
  event.stopPropagation()
  
  // Hide terminal immediately
  isExpanded.value = false
  isFullscreen.value = false
  
  // Set terminal as fully collapsed
  if (terminalRef.value) {
    terminalRef.value.style.display = 'none';
  }
  
  // Remove any terminal-related body classes
  document.body.classList.remove('vibe-terminal-collapsed-active')
  document.body.classList.remove('vibe-terminal-fullscreen-active')
  
  // Emit close event for parent components to handle
  emit('close')
  
  // If using Vibe store, update visibility state
  try {
    vibeUIService.state.value.isVisible = false;
  } catch (error) {
    console.error('Could not update terminal visibility state', error);
  }
}

// Enhanced resize handlers
function startResize(direction: 'horizontal' | 'vertical', event: MouseEvent) {
  event.preventDefault()
  
  if (!terminalRef.value) return
  
  isResizing.value = true
  resizeDirection.value = direction
  
  // Store initial dimensions and mouse position
  initialWidth.value = terminalRef.value.offsetWidth
  initialHeight.value = terminalRef.value.offsetHeight
  initialX.value = event.clientX
  initialY.value = event.clientY
  
  // Add event listeners for resize
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  // Prevent text selection during resize
  document.body.style.userSelect = 'none'
}

// Handle resize with debounce
const handleResize = (() => {
  let debounceTimer: NodeJS.Timeout | null = null
  
  return (event: MouseEvent) => {
    if (!isResizing.value || !terminalRef.value) return
    
    // Clear existing timer
    if (debounceTimer) clearTimeout(debounceTimer)
    
    // Immediate visual feedback
    if (resizeDirection.value === 'horizontal') {
      if (displayMode.value === 'side') {
        const newWidth = initialWidth.value - (event.clientX - initialX.value)
        width.value = Math.max(300, Math.min(window.innerWidth * 0.8, newWidth))
        terminalRef.value.style.width = `${width.value}px`
      }
    } else if (resizeDirection.value === 'vertical') {
      if (displayMode.value === 'bottom') {
        const newHeight = initialHeight.value - (event.clientY - initialY.value)
        height.value = Math.max(200, Math.min(window.innerHeight * 0.8, newHeight))
        terminalRef.value.style.height = `${height.value}px`
      }
    }
    
    // Debounce the state saving
    debounceTimer = setTimeout(() => {
      // Save dimensions to vibeUIService if needed
      if (displayMode.value === 'side' && width.value) {
        vibeUIService.state.value.width = width.value
      }
    }, 100)
  }
})()

function stopResize() {
  isResizing.value = false
  resizeDirection.value = null
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  
  // Restore text selection
  document.body.style.userSelect = ''
  
  // Save dimensions to vibeUIService if needed
  if (displayMode.value === 'side' && width.value) {
    vibeUIService.state.value.width = width.value
  }
}
</script>

<style>
@import '../styles/vibe-terminal.css';

/* Terminal base styles - keep only base styling here, positioning is handled by the composable */
.vibe-terminal {
  background-color: hsl(var(--background)) !important;
  border-top: 1px solid hsl(var(--border));
  transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden; /* Hide overflow content when collapsed */
  display: flex; /* Use flex for better layout control */
  flex-direction: column;
  will-change: transform, width, height, opacity;
}

/* Mode specific styling */
.vibe-terminal.mode-side,
.vibe-terminal.mode-right-nav {
  border-left: 1px solid hsl(var(--border));
  border-top: none;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
}

.vibe-terminal.mode-right-nav {
  border-radius: 8px 0 0 8px;
  margin-top: 60px;
}

/* Mode toggle buttons container */
.terminal-mode-toggles {
  position: absolute;
  top: 8px;
  left: 15px;
  z-index: 62;
  display: flex;
  gap: 8px;
}

/* Mode toggle button styling */
.mode-toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background-color: transparent;
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  color: hsl(var(--muted-foreground));
}

.mode-toggle-btn:hover {
  background-color: hsl(var(--accent) / 0.1);
  color: hsl(var(--accent));
}

.mode-toggle-btn.active {
  background-color: hsl(var(--accent) / 0.2);
  border-color: hsl(var(--accent));
  color: hsl(var(--accent));
}

/* Resizers */
.horizontal-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 5px;
  cursor: ew-resize;
  background-color: transparent;
  z-index: 61;
}

.vertical-resizer {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 5px;
  cursor: ns-resize;
  background-color: transparent;
  z-index: 61;
}

.horizontal-resizer:hover, .vertical-resizer:hover {
  background-color: hsla(var(--accent) / 0.3);
}

.vibe-terminal.mode-side .horizontal-resizer,
.vibe-terminal.mode-right-nav .horizontal-resizer {
  display: block;
}

.vibe-terminal.mode-bottom .vertical-resizer {
  display: block;
}

.vibe-terminal.mode-fullscreen .horizontal-resizer,
.vibe-terminal.mode-fullscreen .vertical-resizer {
  display: none;
}

/* Terminal content styling - initially hidden in collapsed state */
.vibe-terminal .terminal-content {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  background-color: hsl(var(--background));
  transition: opacity 0.3s ease, max-height 0.3s ease;
  border-top: 1px solid hsl(var(--border));
  padding-bottom: 10px;
  z-index: 1030;  /* CRITICAL: Always maintain z-index even when collapsed */
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  will-change: opacity, max-height;
}

/* Expanded content styling */
.vibe-terminal.expanded .terminal-content {
  max-height: calc(100% - 40px) !important;
  overflow-y: auto;
  opacity: 1;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05); /* Subtle inner shadow */
}

/* Fullscreen content styling */
.vibe-terminal.fullscreen .terminal-content {
  max-height: calc(100vh - 40px) !important;
  overflow-y: auto;
  opacity: 1;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05); /* Subtle inner shadow */
}

/* Force visible class ensures content is always visible */
.vibe-terminal .terminal-content.force-visible {
  opacity: 1 !important;
  max-height: 50vh !important;
  overflow: auto !important;
  z-index: 9999 !important;
}

.vibe-terminal .terminal-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  min-height: 200px;
}

.vibe-terminal .terminal-active-content {
  padding: 0.5rem 1rem;
}

/* Improved scrollbar for terminal content */
.vibe-terminal .terminal-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.vibe-terminal .terminal-content::-webkit-scrollbar-track {
  background: transparent;
}

.vibe-terminal .terminal-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.vibe-terminal .terminal-content::-webkit-scrollbar-thumb:hover,
.vibe-terminal .terminal-content.is-scrolling::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground));
}

/* Close button styling */
.terminal-close-btn {
  position: absolute;
  right: 10px;
  top: 8px;
  z-index: 61;
  background: none;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--destructive));
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.terminal-close-btn:hover {
  background-color: hsla(var(--destructive), 0.1);
  color: hsl(var(--destructive));
  box-shadow: 0 0 0 1px hsla(var(--destructive), 0.3);
}

.terminal-close-btn:focus-visible {
  outline: 2px solid hsl(var(--destructive) / 0.5);
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Mode specific styling for right-nav mode */
.vibe-terminal.mode-right-nav {
  border-left: 1px solid hsl(var(--border));
  border-top: none;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
  border-radius: 8px 0 0 8px;
  margin-top: 60px;
  max-width: 350px;
}

/* Make the right-nav mode content more compact */
.vibe-terminal.mode-right-nav .terminal-content {
  padding: 0.25rem 0.5rem;
}
</style> 