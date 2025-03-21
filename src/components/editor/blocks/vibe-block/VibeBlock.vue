<template>
  <node-view-wrapper>
    <div class="vibe-block" :class="{ 'vibe-expanded': isExpanded }">
      <!-- Initial compact view -->
      <div class="vibe-header" @click="toggleExpand">
        <div class="vibe-title">
          <Zap class="h-4 w-4 mr-2" :class="{ 'text-primary': props.node.attrs.isActive }" />
          <span v-if="!props.node.attrs.isActive">Vibe Assistant</span>
          <span v-else>{{ props.node.attrs.query }}</span>
        </div>
        <div class="vibe-status">
          <Loader v-if="props.node.attrs.isLoading" class="h-4 w-4 animate-spin" />
          <CheckCircle v-else-if="hasCompletedTasks" class="h-4 w-4 text-success" />
          <AlertCircle v-else-if="props.node.attrs.error" class="h-4 w-4 text-destructive" />
          <CircleEllipsis v-else-if="props.node.attrs.isActive" class="h-4 w-4 text-primary" />
        </div>
        <div class="vibe-expand-icon">
          <ChevronDown v-if="isExpanded" class="h-4 w-4" />
          <ChevronRight v-else class="h-4 w-4" />
        </div>
      </div>

      <!-- Expanded content -->
      <div v-if="isExpanded" class="vibe-content">
        <!-- Input form when not active -->
        <div v-if="!props.node.attrs.isActive" class="vibe-input-panel">
          <div class="vibe-description">
            Ask Vibe to help you with research, analysis, or code generation.
          </div>
          <div class="flex gap-2">
            <input
              :value="queryText"
              placeholder="What would you like help with?"
              class="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @keyup.enter="onButtonClick"
              @input="e => { 
                queryText = e.target.value; 
                console.log('Input changed:', e.target.value, 'queryText now:', queryText);
              }"
            />
            <Button 
              @click.stop.prevent="onButtonClick" 
              class="whitespace-nowrap"
              type="button"
            >
              <Zap class="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </div>
        </div>

        <!-- Active content -->
        <div v-else class="vibe-active-panel space-y-3">
          <!-- Loading state -->
          <div v-if="props.node.attrs.isLoading" class="flex flex-col items-center justify-center p-4 text-center">
            <Loader class="h-8 w-8 animate-spin mb-3" />
            <p class="text-muted-foreground">{{ loadingMessage }}</p>
          </div>

          <!-- Error state -->
          <div v-else-if="props.node.attrs.error" class="flex flex-col items-center">
            <Alert variant="destructive" class="mb-3">
              <AlertCircle class="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ props.node.attrs.error }}</AlertDescription>
            </Alert>
            <Button @click="resetVibe" variant="outline" class="mt-2">
              <RefreshCw class="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>

          <!-- Task board details -->
          <div v-else-if="boardTasks.length > 0" class="flex flex-col gap-3">
            <!-- Task summary -->
            <div class="flex justify-between items-center border-b pb-2">
              <div class="text-sm">
                <Badge variant="outline" class="mr-2">
                  {{ completedTasks.length }}/{{ boardTasks.length }}
                </Badge>
                tasks complete
              </div>
              <div class="flex gap-2">
                <Button 
                  @click="showTasksTab" 
                  variant="ghost" 
                  size="sm"
                  :class="{ 'bg-secondary': activeTab === 'tasks' }"
                >
                  Tasks
                </Button>
                <Button 
                  @click="showDatabaseTab" 
                  variant="ghost" 
                  size="sm"
                  :class="{ 'bg-secondary': activeTab === 'database' }"
                >
                  Database
                </Button>
                <Button 
                  v-if="hasInProgressTasks" 
                  @click="refreshTasks" 
                  variant="ghost" 
                  size="sm"
                >
                  <RefreshCw class="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            <!-- Task list tab -->
            <div v-if="activeTab === 'tasks'" class="space-y-3">
              <Card 
                v-for="task in boardTasks" 
                :key="task.id" 
                class="overflow-hidden"
                :class="{
                  'border-success/20 bg-success/5': task.status === 'completed',
                  'border-primary/20 bg-primary/5': task.status === 'in_progress',
                  'border-destructive/20 bg-destructive/5': task.status === 'failed'
                }"
              >
                <CardHeader class="p-3 pb-0">
                  <div class="flex justify-between items-center">
                    <Badge variant="secondary" class="uppercase text-xs">
                      {{ task.actorType }}
                    </Badge>
                    <Badge 
                      :variant="
                        task.status === 'completed' ? 'success' : 
                        task.status === 'in_progress' ? 'default' : 
                        task.status === 'failed' ? 'destructive' : 'outline'
                      "
                    >
                      {{ task.status }}
                    </Badge>
                  </div>
                  <CardTitle class="text-sm mt-2">{{ task.title }}</CardTitle>
                </CardHeader>
                
                <CardContent class="p-3 pt-2">
                  <!-- Show result preview for completed tasks -->
                  <div v-if="task.status === 'completed' && task.result" class="mt-2">
                    <div class="text-xs bg-card p-2 rounded border mb-2 overflow-auto max-h-32">
                      <pre class="whitespace-pre-wrap text-sm">{{ getResultPreview(task.result) }}</pre>
                    </div>
                    <Button 
                      v-if="canInsertResult(task)" 
                      @click="insertTaskResult(task)" 
                      variant="outline"
                      size="sm"
                      class="w-full"
                    >
                      <Download class="h-3 w-3 mr-2" />
                      Insert into Document
                    </Button>
                  </div>
                  
                  <!-- Show error for failed tasks -->
                  <Alert v-if="task.status === 'failed' && task.error" variant="destructive" class="mt-2">
                    <AlertCircle class="h-4 w-4 mr-2" />
                    <AlertDescription class="text-xs">{{ task.error }}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <!-- Database tab -->
            <div v-else-if="activeTab === 'database'" class="space-y-3">
              <!-- Database tables list -->
              <div v-if="databaseTables.length === 0" class="text-center p-4 text-muted-foreground">
                No database tables available yet
              </div>
              <div v-else>
                <div v-for="table in databaseTables" :key="table.id" class="mb-4">
                  <Card>
                    <CardHeader class="p-3 pb-0">
                      <div class="flex justify-between items-center">
                        <Badge variant="outline">Table</Badge>
                        <Badge variant="secondary">{{ table.entries.length }} entries</Badge>
                      </div>
                      <CardTitle class="text-sm mt-2">{{ table.name }}</CardTitle>
                      <p class="text-xs text-muted-foreground mt-1">{{ table.description }}</p>
                    </CardHeader>
                    
                    <CardContent class="p-3 pt-2">
                      <!-- Schema info -->
                      <div class="text-xs mb-2">
                        <span class="font-medium">Schema:</span> 
                        <span v-for="(type, field) in table.schema" :key="field" class="ml-1">
                          <Badge variant="outline" class="text-xs">{{ field }}: {{ type }}</Badge>
                        </span>
                      </div>
                      
                      <!-- Table entries -->
                      <Collapsible>
                        <CollapsibleTrigger class="w-full" @click="toggleTableExpansion(table.id)">
                          <Button variant="outline" size="sm" class="w-full">
                            <ChevronDown v-if="expandedTableIds.includes(table.id)" class="h-3 w-3 mr-2" />
                            <ChevronRight v-else class="h-3 w-3 mr-2" />
                            {{ expandedTableIds.includes(table.id) ? 'Hide' : 'Show' }} Entries
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent :forceMount="expandedTableIds.includes(table.id)">
                          <div v-if="table.entries.length === 0" class="text-center p-2 text-xs text-muted-foreground">
                            No entries in this table
                          </div>
                          <div v-else class="mt-2 space-y-2">
                            <Card v-for="entry in table.entries" :key="entry.id" class="p-2 text-xs">
                              <div class="flex justify-between mb-1">
                                <Badge variant="secondary">{{ entry.type }}</Badge>
                                <Badge variant="outline">{{ entry.key }}</Badge>
                              </div>
                              <div class="bg-muted p-2 rounded max-h-32 overflow-auto">
                                <pre class="whitespace-pre-wrap text-xs">{{ formatEntryValue(entry.value) }}</pre>
                              </div>
                            </Card>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, onBeforeUnmount } from 'vue'
import { useToast } from '@/components/ui/toast/use-toast'
import { useVibeStore } from '@/stores/vibeStore'
import { ActorType } from '@/types/vibe'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { 
  Zap, 
  Loader, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Download,
  CircleEllipsis
} from 'lucide-vue-next'

// Import UI components individually
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

// Add import for VibeTaskExecutor
import { VibeTaskExecutor } from '@/services/vibe/VibeTaskExecutor'

// Define TaskStatus enum if not already defined in vibe types
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

// Define TaskPriority enum if not already defined in vibe types
const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
}

const props = defineProps({
  ...nodeViewProps,
  editor: Object // Editor instance for extension access
})

const { toast } = useToast()
let vibeStore
try {
  vibeStore = useVibeStore()
  console.log('VibeStore initialized:', vibeStore)
} catch (error) {
  console.error('Failed to initialize vibeStore', error)
}

const queryText = ref('')
const loadingMessage = ref('')
const isExpanded = ref(true)
const boardTasks = ref([])
const refreshInterval = ref(null)
const databaseTables = ref([])
const activeTab = ref('tasks')
const expandedTableIds = ref([])

// Computed properties
const hasCompletedTasks = computed(() => 
  boardTasks.value.some(task => task.status === 'completed')
)

const hasInProgressTasks = computed(() => 
  boardTasks.value.some(task => task.status === 'in_progress')
)

const completedTasks = computed(() => 
  boardTasks.value.filter(task => task.status === 'completed')
)

// Toggle expanded state
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// Toggle table expansion
function toggleTableExpansion(tableId) {
  const index = expandedTableIds.value.indexOf(tableId)
  if (index === -1) {
    expandedTableIds.value.push(tableId)
  } else {
    expandedTableIds.value.splice(index, 1)
  }
}

// Format entry value for display
function formatEntryValue(value) {
  if (value === null || value === undefined) return 'null'
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  
  return String(value)
}

// Show tasks tab
function showTasksTab() {
  activeTab.value = 'tasks'
}

// Show database tab
function showDatabaseTab() {
  activeTab.value = 'database'
  loadDatabaseTables()
}

// Load database tables
async function loadDatabaseTables() {
  try {
    const boardId = props.node.attrs.taskBoardId
    if (!boardId) {
      console.log('No board ID available yet')
      return
    }
    
    console.log('Loading database tables for board:', boardId)
    const tables = await vibeStore.getTablesForBoard(boardId)
    if (tables && tables.length > 0) {
      databaseTables.value = tables
      
      // Load entries for each table
      for (const table of databaseTables.value) {
        table.entries = await vibeStore.getEntriesForTable(table.id)
      }
      
      console.log('Loaded database tables:', databaseTables.value)
    } else {
      databaseTables.value = []
    }
  } catch (error) {
    console.error('Error loading database tables:', error)
    databaseTables.value = []
  }
}

// Update loadBoardTasks to also load database tables when tasks are complete
async function loadBoardTasks() {
  try {
    const boardId = props.node.attrs.taskBoardId
    if (!boardId) {
      console.log('No board ID available yet')
      return
    }
    
    console.log('Loading tasks for board:', boardId)
    const board = await vibeStore.getBoard(boardId)
    if (board) {
      boardTasks.value = board.tasks || []
      console.log('Loaded tasks:', boardTasks.value)
      
      // Load database tables if all tasks are complete and we're on the database tab
      if (activeTab.value === 'database' && 
          boardTasks.value.every(task => task.status === 'completed' || task.status === 'failed')) {
        await loadDatabaseTables()
      }
    }
  } catch (error) {
    console.error('Error loading board tasks:', error)
  }
}

// Refresh task status
async function refreshTasks() {
  console.log('Refreshing task status')
  await loadBoardTasks()
  
  // Auto-insert results if requested and all tasks are complete
  if (boardTasks.value.length > 0 && 
      boardTasks.value.every(task => task.status === 'completed' || task.status === 'failed')) {
    console.log('All tasks complete, clearing refresh interval')
    // Clear the refresh interval if all tasks are done
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  }
}

// Get a preview of the task result
function getResultPreview(result) {
  if (!result) return 'No result available'
  
  if (typeof result === 'string') {
    return result.length > 100 ? result.substring(0, 100) + '...' : result
  }
  
  if (typeof result === 'object') {
    // Handle different result types
    if (result.content) return result.content.substring(0, 100) + '...'
    return JSON.stringify(result).substring(0, 100) + '...'
  }
  
  return 'Result available'
}

// Check if a task result can be inserted
function canInsertResult(task) {
  return !!props.editor && task.status === 'completed' && !!task.result
}

// Insert a task result into the document
function insertTaskResult(task) {
  if (!canInsertResult(task)) return
  
  try {
    // Position after the Vibe block
    props.editor.commands.focus('end')
    
    // Insert content based on actor type
    switch (task.actorType) {
      case ActorType.RESEARCHER:
        // For researcher, insert content as paragraphs
        if (typeof task.result === 'object' && task.result.content) {
          props.editor.commands.insertContent(task.result.content)
        } else {
          props.editor.commands.insertContent(task.result.toString())
        }
        break
        
      case ActorType.ANALYST:
        // For analyst, insert any visualizations if available
        if (typeof task.result === 'object' && task.result.visualizations) {
          // This would insert visualizations - simplified for now
          props.editor.commands.insertContent(task.result.summary || '')
        } else {
          props.editor.commands.insertContent(task.result.toString())
        }
        break
        
      case ActorType.CODER:
        // For coder, insert code blocks
        if (typeof task.result === 'object' && task.result.code) {
          props.editor.commands.insertContent({
            type: 'executableCodeBlock',
            attrs: {
              language: task.result.language || 'javascript',
              executeable: true,
            },
            content: [{ type: 'text', text: task.result.code }],
          })
        } else {
          props.editor.commands.insertContent(task.result.toString())
        }
        break
        
      default:
        props.editor.commands.insertContent(
          typeof task.result === 'string' 
            ? task.result 
            : JSON.stringify(task.result, null, 2)
        )
    }
    
    toast({
      title: 'Success',
      description: 'Task result has been inserted into your document'
    })
  } catch (error) {
    console.error('Error inserting result:', error)
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to insert result into document'
    })
  }
}

// Reset the Vibe block
function resetVibe() {
  console.log('Resetting Vibe block')
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
    await loadBoardTasks()
  }
})

// Update the onMounted hook with more logging
onMounted(async () => {
  console.log('VibeBlock mounted with props:', props.node.attrs)
  console.log('queryText initial value:', queryText.value)
  
  // Initialize queryText from props if available
  if (props.node.attrs.query) {
    console.log('Setting queryText from props:', props.node.attrs.query)
    queryText.value = props.node.attrs.query
    console.log('queryText after setting from props:', queryText.value)
  }
  
  // If the block already has a board ID, load the tasks
  if (props.node.attrs.taskBoardId) {
    console.log('Block has taskBoardId, starting refresh interval')
    await startRefreshInterval()
  }
})

onBeforeUnmount(() => {
  console.log('VibeBlock unmounting, clearing interval')
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
})

// Update startRefreshInterval function to use VibeTaskExecutor
const startRefreshInterval = async () => {
  console.log('Starting refresh interval')
  // Clear any existing interval
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  // Load tasks initially
  await loadBoardTasks()
  
  // Start the task executor if we have a board ID
  if (props.node.attrs.taskBoardId) {
    try {
      // Verify board exists before creating the executor
      const board = await vibeStore.getBoard(props.node.attrs.taskBoardId)
      
      if (!board) {
        console.error(`Board ${props.node.attrs.taskBoardId} not found`)
        props.updateAttributes({
          error: `Board not found. It may have been deleted or never created.`
        })
        return
      }
      
      // Create a task executor for this board
      const executor = new VibeTaskExecutor(props.node.attrs.taskBoardId, props.editor)
      
      // Execute tasks asynchronously
      executor.executeAllTasks().catch(error => {
        console.error('Error executing tasks:', error)
        // Only update error if it's not already set
        if (!props.node.attrs.error) {
          props.updateAttributes({
            error: `Error executing tasks: ${error.message}`
          })
        }
      })
    } catch (error) {
      console.error('Error in startRefreshInterval:', error)
      props.updateAttributes({
        error: `Error starting task execution: ${error.message}`
      })
      return
    }
  }
  
  // Set up polling to refresh task status
  refreshInterval.value = setInterval(() => {
    loadBoardTasks()
  }, 5000) // Check every 5 seconds
}

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
  console.log('Button clicked, event type:', event?.type)
  console.log('queryText value after trim:', JSON.stringify(queryText.value))
  console.log('queryText length:', queryText.value.length)
  console.log('queryText type:', typeof queryText.value)
  
  // Call activateVibe
  await activateVibe()
}

// Add a watch for queryText to debug binding issues
watch(queryText, (newVal, oldVal) => {
  console.log('queryText changed:', { 
    newVal, 
    oldVal, 
    length: newVal?.length || 0, 
    isEmpty: !newVal || newVal.length === 0 
  })
}, { immediate: true })

// Update activateVibe to use await with startRefreshInterval
const activateVibe = async () => {
  console.log('activateVibe called with query:', JSON.stringify(queryText.value))
  
  if (!vibeStore) {
    console.error('VibeStore is not available')
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
    console.log('Query is empty after trimming, showing toast')
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
    console.log('Creating board for query:', query)
    
    const board = await vibeStore.createBoard({ query })
    console.log('Board created:', board)
    
    if (!board) {
      console.error('Board creation failed - returned undefined')
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
    
    const composerTask = await vibeStore.createTask(board.id, {
      title: 'Orchestrate tasks',
      description: query,
      actorType: ActorType.COMPOSER,
      dependencies: []
    })
    
    // Update block attributes with board ID
    console.log('Updating node attributes with board ID:', board.id)
    props.updateAttributes({
      taskBoardId: board.id,
      isLoading: false
    })
    
    toast({
      title: 'Success',
      description: 'Created orchestration task to plan and execute your request'
    })
    
    // Start refresh interval to update tasks
    await startRefreshInterval()
  } catch (error) {
    console.error('Error in activateVibe:', error)
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

<style>
.vibe-block {
  @apply border rounded-md my-2 overflow-hidden shadow-sm bg-card text-card-foreground;
}

.vibe-header {
  @apply flex p-3 cursor-pointer items-center bg-muted/20 border-b;
}

.vibe-title {
  @apply flex-1 font-medium flex items-center;
}

.vibe-status {
  @apply mr-2 flex items-center;
}

.vibe-content {
  @apply p-4;
}

.vibe-description {
  @apply text-muted-foreground mb-3;
}
</style> 