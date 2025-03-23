<template>
  <node-view-wrapper>
    <div class="vibe-block" :class="{ 'vibe-expanded': isExpanded }">
      <!-- Initial compact view -->
      <VibeBlockHeader
        :isActive="isActive"
        :isExpanded="isExpanded"
        :query="query"
        :error="error"
        :isLoading="isLoading"
        :hasCompletedTasks="hasCompletedTasks"
        @toggle-expand="toggleExpand"
      />

      <!-- Expanded content -->
      <div v-if="isExpanded" class="vibe-content">
        <!-- Input form when not active -->
        <VibeInputPanel
          v-if="!isActive"
          v-model="queryText"
          :showJupyterConfig="showJupyterConfig"
          :jupyterConfig="jupyterConfig"
          @toggle-jupyter="toggleJupyterConfig"
          @update-jupyter="updateJupyterConfig"
          @submit="onButtonClick"
        />

        <!-- Active content -->
        <div v-else class="vibe-active-panel space-y-3">
          <!-- Loading state -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center p-4 text-center">
            <Loader class="h-8 w-8 animate-spin mb-3" />
            <p class="text-muted-foreground">{{ loadingMessage }}</p>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="flex flex-col items-center">
            <Alert variant="destructive" class="mb-3">
              <AlertCircle class="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>
            <Button @click="resetVibe" variant="outline" class="mt-2">
              <RefreshCw class="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>

          <!-- Task board details -->
          <VibeTaskBoard
            v-else-if="boardTasks.length > 0"
                  :tasks="boardTasks" 
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
          >
            <template #database-content>
              <VibeDatabaseView
                :tables="databaseTables"
                :expandedTableIds="expandedTableIds"
                @toggle-table="toggleTableExpansion"
              />
            </template>
          </VibeTaskBoard>
        </div>
      </div>
    </div>

    <!-- Task details modal -->
    <VibeTaskDetails
      :task="selectedTaskForModal"
      :canInsertResult="canInsertResult"
      @update:task="selectedTaskForModal = $event"
      @insert-result="insertTaskResult"
    />
  </node-view-wrapper>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { useVibeStore } from '@/stores/vibeStore'
import { useAISettingsStore } from '../../../../stores/aiSettingsStore'
import { useJupyterStore } from '@/stores/jupyterStore'
import { ActorType } from '@/types/vibe'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { 
  Loader, 
  AlertCircle, 
  RefreshCw
} from 'lucide-vue-next'

// Import UI components
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

// Import utilities
import { 
  TaskStatus, 
  TaskPriority, 
  getActorName,
  formatDate,
  calculateDuration
} from './utils'

// Import composables
import { 
  useTasks, 
  useDatabase, 
  useTaskExecutor, 
  useTaskResults,
  useJupyter 
} from './composables'

// Import modular components
import VibeBlockHeader from './components/VibeBlockHeader.vue'
import VibeInputPanel from './components/VibeInputPanel.vue'
import VibeTaskBoard from './components/VibeTaskBoard.vue'
import VibeDatabaseView from './components/VibeDatabaseView.vue'
import VibeTaskDetails from './components/VibeTaskDetails.vue'

// Import logger
import { logger } from '@/services/logger'

const props = defineProps({
  editor: Object,
  node: Object,
  updateAttributes: Function,
  deleteNode: Function,
  getPos: Function
})

const { toast } = useToast()
const vibeStore = useVibeStore()

// Safely get the AI settings store with error handling
let aiSettingsStore
try {
  aiSettingsStore = useAISettingsStore()
} catch (error) {
  logger.error('Error loading AISettingsStore:', error)
  // Provide a fallback implementation with basic defaults
  aiSettingsStore = {
    settings: {
      preferredProviderId: 'openai',
      apiKeys: {},
      maxTokens: 1024,
      temperature: 0.7
    },
    getApiKey: () => '',
    preferredProvider: { id: 'openai', name: 'OpenAI' }
  }
}

const jupyterStore = useJupyterStore()
const taskExecutor = ref(null)
const boardTasks = ref([])
const databaseTables = ref([])
const expandedTableIds = ref([])
const expandedTaskIds = ref([])
const selectedTaskId = ref(null)
const refreshInterval = ref(null)
const queryText = ref('')
const loadingMessage = ref('')
const isExpanded = ref(true)
const showJupyterConfig = ref(false)
const jupyterConfig = ref({
  server: null,
  kernel: null
})
const selectedTaskForModal = ref(null)

// Set up composables
const taskBoardId = computed(() => props.node.attrs.taskBoardId)
const editorRef = computed(() => props.editor)

// Initialize composables
const { 
  jupyterConfig: jupyterConfigComposable,
  showJupyterConfig: showJupyterConfigComposable,
  toggleJupyterConfig,
  updateJupyterConfig,
  getJupyterInfoForAPI
} = useJupyter()

const {
  boardTasks: boardTasksComposable,
  expandedTaskIds: expandedTaskIdsComposable,
  selectedTaskId: selectedTaskIdComposable,
  selectedTaskForModal: selectedTaskForModalComposable,
  hasCompletedTasks,
  hasStuckTasks,
  loadBoardTasks,
  refreshTasks,
  toggleTask,
  selectDependency,
  showTaskDetailsModal,
  resetInProgressTasks
} = useTasks(taskBoardId)

const {
  databaseTables: databaseTablesComposable,
  expandedTableIds: expandedTableIdsComposable,
  loadDatabaseTables,
  toggleTableExpansion
} = useDatabase(taskBoardId)

const {
  taskExecutor: taskExecutorComposable,
  refreshInterval: refreshIntervalComposable,
  loadingMessage: executorLoadingMessage,
  startRefreshInterval,
  cleanupExecutor,
  resetTaskExecution: resetExecutionComposable
} = useTaskExecutor(taskBoardId, editorRef, jupyterConfigComposable, props.updateAttributes)

const {
  canInsertResult,
  insertTaskResult
} = useTaskResults(editorRef, props.getPos)

// Computed properties
const isActive = computed(() => props.node.attrs.isActive)
const query = computed(() => props.node.attrs.query)
const sessionId = computed(() => props.node.attrs.sessionId)
const isLoading = computed(() => props.node.attrs.isLoading)
const error = computed(() => props.node.attrs.error)
const hasTasks = computed(() => boardTasks.value.length > 0)
const hasInProgressTasks = computed(() => boardTasks.value.some(task => task.status === 'in_progress'))

const completedTasks = computed(() => 
  boardTasks.value.filter(task => task.status === 'completed')
)

const failedTasks = computed(() => 
  boardTasks.value.filter(task => task.status === 'failed')
)

// Synchronize state variables with composable counterparts
watch(boardTasksComposable, (newTasks) => {
  boardTasks.value = newTasks
})

watch(expandedTaskIdsComposable, (newIds) => {
  expandedTaskIds.value = newIds
})

watch(selectedTaskIdComposable, (newId) => {
  selectedTaskId.value = newId
})

watch(selectedTaskForModalComposable, (newTask) => {
  selectedTaskForModal.value = newTask
})

watch(databaseTablesComposable, (newTables) => {
  databaseTables.value = newTables
})

watch(expandedTableIdsComposable, (newIds) => {
  expandedTableIds.value = newIds
})

watch(jupyterConfigComposable, (newConfig) => {
  jupyterConfig.value = newConfig
})

watch(showJupyterConfigComposable, (newValue) => {
  showJupyterConfig.value = newValue
})

watch(taskExecutorComposable, (newExecutor) => {
  taskExecutor.value = newExecutor
})

watch(refreshIntervalComposable, (newInterval) => {
  refreshInterval.value = newInterval
})

// Watch for changes to executorLoadingMessage
watch(executorLoadingMessage, (newValue) => {
  if (newValue) {
    loadingMessage.value = newValue
  }
})

// Toggle expanded state
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// Reset task execution if it gets stuck
async function resetTaskExecution() {
  await resetExecutionComposable(resetInProgressTasks, refreshTasks)
}

// Combined task loading function that also loads database tables
async function loadTasksAndDatabase() {
  await loadBoardTasks()
  await loadDatabaseTables()
}

// Reset the Vibe block
function resetVibe() {
  logger.log('Resetting Vibe block')
  
  // Clean up task executor if it exists
  if (taskExecutor.value) {
    logger.log('Disposing task executor')
    taskExecutor.value.dispose()
    taskExecutor.value = null
  }
  
  props.updateAttributes({
    query: '',
    isActive: false,
    isLoading: false,
    taskBoardId: '',
    error: ''
  })
  
  queryText.value = ''
  boardTasks.value = []
  
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Watch for changes to taskBoardId
watch(() => props.node.attrs.taskBoardId, async (newVal) => {
  if (newVal) {
    await loadTasksAndDatabase()
  }
})

// Update the onMounted hook with more logging
onMounted(async () => {
  logger.log('VibeBlock mounted with props:', props.node.attrs)
  logger.log('queryText initial value:', queryText.value)
  
  // Initialize queryText from props if available
  if (props.node.attrs.query) {
    logger.log('Setting queryText from props:', props.node.attrs.query)
    queryText.value = props.node.attrs.query
    logger.log('queryText after setting from props:', queryText.value)
  }
  
  // If the block already has a board ID, load the tasks
  if (props.node.attrs.taskBoardId) {
    logger.log('Block has taskBoardId, starting refresh interval')
    await startRefreshInterval(loadTasksAndDatabase)
  }
  
  // Load saved Jupyter config if available
  try {
    const savedConfig = localStorage.getItem('vibe-jupyter-config')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      // Try to find matching server and kernel
      if (parsedConfig.server && parsedConfig.kernel) {
        // Find server
        const server = jupyterStore.jupyterServers.find(
          s => s.ip === parsedConfig.server.ip && s.port === parsedConfig.server.port
        )
        
        if (server) {
          jupyterConfig.value.server = server
          
          // Load kernels for this server if needed
          const serverKey = `${server.ip}:${server.port}`
          if (!jupyterStore.kernels[serverKey] || jupyterStore.kernels[serverKey].length === 0) {
            // We need to refresh kernels before we can select one
            // This will happen asynchronously
            logger.log('Loading kernels for saved server config')
          } else {
            // Find kernel by name
            const kernel = jupyterStore.kernels[serverKey].find(
              k => k.name === parsedConfig.kernel.name
            )
            
            if (kernel) {
              jupyterConfig.value.kernel = kernel
              logger.log('Restored Jupyter config from localStorage')
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Failed to load saved Jupyter config:', error)
  }
})

onBeforeUnmount(() => {
  logger.log('VibeBlock unmounting, clearing interval and disposing executor')
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
  
  // Clean up task executor if it exists
  if (taskExecutor.value) {
    logger.log('Disposing task executor on unmount')
    taskExecutor.value.dispose()
    taskExecutor.value = null
  }
})

// Improve onButtonClick function with better logging and string handling
const onButtonClick = async (event) => {
  // Prevent default behavior
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  // Force queryText to be a string and handle potential null/undefined
  queryText.value = String(queryText.value || '').trim()
  
  // Log detailed information about the event and state
  logger.log('Button clicked, event type:', event?.type)
  logger.log('queryText value after trim:', JSON.stringify(queryText.value))
  logger.log('queryText length:', queryText.value.length)
  logger.log('queryText type:', typeof queryText.value)
  
  // Call activateVibe
  await activateVibe()
}

// Update activateVibe to use await with startRefreshInterval and store Jupyter config
const activateVibe = async () => {
  logger.log('activateVibe called with query:', JSON.stringify(queryText.value))
  
  if (!vibeStore) {
    logger.error('VibeStore is not available')
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Store not available'
    })
    return
  }
  
  // Do an explicit check for empty string after trimming
  const trimmedQuery = (queryText.value || '').trim()
  if (!trimmedQuery) {
    logger.log('Query is empty after trimming, showing toast')
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Please enter a task'
    })
    return
  }

  try {
    // Use the trimmed query for the rest of the function
    const query = trimmedQuery
    
    // First update the node to show loading state
    props.updateAttributes({
      isActive: true,
      isLoading: true,
      query: query,
      error: ''
    })
    
    loadingMessage.value = 'Creating your Vibe board...'
    logger.log('Creating board for query:', query)
    
    // Store Jupyter configuration information for the API
    const jupyterInfo = getJupyterInfoForAPI()
      
    // Create the board with Jupyter info
    const board = await vibeStore.createBoard({ 
      query,
      jupyterConfig: jupyterInfo
    })
    
    logger.log('Board created:', board)
    
    if (!board) {
      logger.error('Board creation failed - returned undefined')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create board'
      })
      props.updateAttributes({
        isLoading: false,
        error: 'Failed to create board'
      })
      loadingMessage.value = ''
      return
    }
    
    // Create a composer task that will orchestrate the entire process
    loadingMessage.value = 'Setting up task orchestration...'
    
    // Add Jupyter config information to the task metadata if available
    const taskMetadata = jupyterInfo ? { jupyterConfig: jupyterInfo } : undefined
    
    const composerTask = await vibeStore.createTask(board.id, {
      title: 'Orchestrate tasks',
      description: query,
      actorType: ActorType.COMPOSER,
      dependencies: [],
      metadata: taskMetadata
    })
    
    // Update block attributes with board ID
    logger.log('Updating node attributes with board ID:', board.id)
    props.updateAttributes({
      taskBoardId: board.id,
      isLoading: false
    })
    
    toast({
      title: 'Success',
      description: 'Created orchestration task to plan and execute your request'
    })
    
    // Start refresh interval to update tasks
    await startRefreshInterval(loadTasksAndDatabase)
  } catch (error) {
    logger.error('Error in activateVibe:', error)
    props.updateAttributes({
      isLoading: false,
      error: error instanceof Error ? error.message : String(error)
    })
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create Vibe board'
    })
    loadingMessage.value = ''
  }
}
</script>

<style scoped>
.vibe-block {
  @apply border rounded-md my-2 overflow-hidden shadow-sm bg-card text-card-foreground;
}

.vibe-content {
  @apply p-4;
}
</style> 