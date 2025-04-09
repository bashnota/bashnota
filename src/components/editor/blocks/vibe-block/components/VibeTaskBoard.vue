<template>
  <div class="vibe-task-board space-y-4">
    <!-- Task summary header -->
    <div class="flex justify-between items-center p-3 border rounded-md bg-muted/10">
      <div class="flex items-center space-x-2">
        <div class="flex items-center">
          <Badge variant="success" class="mr-2" aria-label="Completed tasks">
            {{ completedTasks.length }}/{{ tasks.length }}
          </Badge>
          <span class="text-sm">tasks complete</span>
        </div>
        
        <div v-if="hasStuckTasks" class="ml-3">
          <Badge variant="destructive" aria-label="Stuck tasks">
            {{ failedTasks.length }} failed
          </Badge>
        </div>
      </div>
      
      <div class="flex gap-2">
        <Tooltip v-if="hasInProgressTasks || tasks.length > completedTasks.length + failedTasks.length" content="Refresh task status and results">
          <Button 
            @click="$emit('refresh')" 
            variant="ghost" 
            size="sm"
            aria-label="Refresh tasks"
          >
            <RefreshCw class="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </Tooltip>
        
        <Tooltip v-if="hasStuckTasks" content="Reset stuck or failed tasks">
          <Button 
            @click="$emit('reset')" 
            variant="outline" 
            size="sm"
            class="text-destructive"
            aria-label="Reset stuck tasks"
          >
            <Undo2 class="h-4 w-4 mr-1" />
            Reset
          </Button>
        </Tooltip>
      </div>
    </div>
    
    <!-- Progress bar -->
    <div class="w-full bg-muted h-1.5 rounded-full overflow-hidden" aria-hidden="true">
      <div 
        class="h-full transition-all duration-500 ease-in-out"
        :class="{
          'bg-blue-500': progressPercentage < 100 && !hasFailedTasks,
          'bg-green-500': progressPercentage === 100 && !hasFailedTasks,
          'bg-amber-500': hasFailedTasks
        }"
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center">
      <div class="animate-spin h-8 w-8 border-2 border-primary border-r-transparent rounded-full mb-4"></div>
      <p class="text-muted-foreground">Loading tasks...</p>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="tasks.length === 0" class="py-12 flex flex-col items-center justify-center text-center">
      <ServerCog class="h-12 w-12 text-muted-foreground/20 mb-3" />
      <h3 class="text-lg font-medium mb-2">No tasks created yet</h3>
      <p class="text-muted-foreground max-w-md mb-4">
        Vibe will create tasks automatically based on your query. Each task will be assigned to the most appropriate AI agent.
      </p>
    </div>
    
    <!-- Tabs for task board UI -->
    <Tabs v-else class="w-full" defaultValue="tasks">
      <TabsList class="w-full grid grid-cols-3">
        <TabsTrigger value="tasks" class="flex items-center justify-center" aria-label="View tasks">
          <ListChecks class="h-4 w-4 mr-2" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="database" class="flex items-center justify-center" aria-label="View database">
          <Database class="h-4 w-4 mr-2" />
          Database
        </TabsTrigger>
        <TabsTrigger value="graph" class="flex items-center justify-center" aria-label="View dependency graph">
          <Network class="h-4 w-4 mr-2" />
          Graph
        </TabsTrigger>
      </TabsList>

      <!-- Tasks Panel -->
      <TabsContent value="tasks" class="p-0 border-0 mt-3">
        <VibeTaskList 
          :tasks="tasks"
          :expandedTaskIds="expandedTaskIds"
          :selectedTaskId="selectedTaskId"
          :canInsertResult="canInsertResult"
          @toggle-task="$emit('toggle-task', $event)" 
          @select-dependency="$emit('select-dependency', $event)"
          @insert-result="$emit('insert-result', $event)"
          @view-details="$emit('view-details', $event)"
        />
      </TabsContent>

      <!-- Database Panel -->
      <TabsContent 
        value="database" 
        class="p-0 border-0 mt-3"
        @select="$emit('load-database')"
      >
        <slot name="database-content">
          <!-- Database tables list -->
          <div class="text-center p-8 text-muted-foreground">
            <Database class="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
            <p class="mb-2">No database tables available yet</p>
            <p class="text-xs max-w-md mx-auto">
              Database tables are created when tasks need to store structured data
            </p>
          </div>
        </slot>
      </TabsContent>
      
      <!-- Graph Panel -->
      <TabsContent value="graph" class="p-0 border-0 mt-3">
        <slot name="graph-content">
          <TaskGraph 
            :tasks="tasks" 
            :selected-task-id="selectedTaskId"
            @node-click="$emit('select-task', $event)"
          />
        </slot>
        
        <!-- Task details panel when a node is selected -->
        <div 
          v-if="selectedTaskId && selectedTask" 
          class="mt-4 border p-4 rounded-md transition-all duration-300"
          :class="{
            'bg-green-50/30 border-green-200': selectedTask.status === 'completed',
            'bg-red-50/30 border-red-200': selectedTask.status === 'failed',
            'bg-blue-50/30 border-blue-200': selectedTask.status === 'in_progress',
            'bg-muted/30': selectedTask.status === 'pending'
          }"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <h3 class="text-sm font-medium">{{ selectedTask.title }}</h3>
              <Badge>{{ getActorName(selectedTask.actorType) }}</Badge>
              <Badge 
                v-if="selectedTask.status !== 'pending'" 
                :variant="getStatusVariant(selectedTask.status)"
                class="capitalize"
              >
                {{ selectedTask.status.replace('_', ' ') }}
              </Badge>
            </div>
          </div>
          
          <div class="text-xs mb-3 bg-muted/30 p-2 rounded-md">{{ selectedTask.description }}</div>
          
          <div class="flex flex-wrap gap-2">
            <Button 
              v-if="selectedTask && canInsertResult(selectedTask)" 
              @click="$emit('insert-result', selectedTask)"
              size="sm"
              class="flex-1"
              aria-label="Insert task result into document"
            >
              <ClipboardCopy class="h-4 w-4 mr-2" />
              Insert Result
            </Button>
            
            <Button
              @click="$emit('view-details', selectedTask)"
              size="sm"
              variant="outline"
              class="flex-1"
              aria-label="View full task details"
            >
              <Maximize2 class="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { 
  RefreshCw, 
  Undo2, 
  ListChecks, 
  Database, 
  Network, 
  ClipboardCopy, 
  Maximize2, 
  ServerCog 
} from 'lucide-vue-next'
import { ActorType } from '@/types/vibe'
import VibeTaskList from './VibeTaskList.vue'
import TaskGraph from '../TaskGraph.vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  expandedTaskIds: {
    type: Array,
    default: () => []
  },
  selectedTaskId: {
    type: String,
    default: null
  },
  canInsertResult: {
    type: Function,
    default: () => false
  },
  hasStuckTasks: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'refresh', 
  'reset', 
  'toggle-task', 
  'select-dependency', 
  'select-task',
  'insert-result', 
  'view-details',
  'load-database'
])

// Computed properties
const completedTasks = computed(() => 
  props.tasks.filter(task => task.status === 'completed')
)

const failedTasks = computed(() => 
  props.tasks.filter(task => task.status === 'failed')
)

const hasInProgressTasks = computed(() =>
  props.tasks.some(task => task.status === 'in_progress')
)

const hasFailedTasks = computed(() =>
  props.tasks.some(task => task.status === 'failed')
)

const selectedTask = computed(() =>
  props.tasks.find(task => task.id === props.selectedTaskId)
)

const progressPercentage = computed(() => {
  if (props.tasks.length === 0) return 0
  return Math.round((completedTasks.value.length / props.tasks.length) * 100)
})

// Get actor name for display
function getActorName(actorType) {
  switch (actorType) {
    case ActorType.RESEARCHER: return 'Researcher'
    case ActorType.ANALYST: return 'Analyst'
    case ActorType.CODER: return 'Coder'
    case ActorType.PLANNER: return 'Planner'
    case ActorType.COMPOSER: return 'Composer'
    case ActorType.WRITER: return 'Writer'
    case ActorType.CUSTOM: return 'Custom'
    default: return actorType
  }
}

// Get badge variant for task status
function getStatusVariant(status) {
  switch (status) {
    case 'in_progress': return 'secondary'
    case 'completed': return 'success'
    case 'failed': return 'destructive'
    default: return 'outline'
  }
}
</script>

<style scoped>
/* Dark mode overrides */
:global(.dark) .bg-green-50\/30 {
  background-color: rgba(0, 45, 16, 0.3) !important;
}

:global(.dark) .bg-red-50\/30 {
  background-color: rgba(69, 0, 0, 0.3) !important;
}

:global(.dark) .bg-blue-50\/30 {
  background-color: rgba(0, 24, 82, 0.3) !important;
}

:global(.dark) .border-green-200 {
  border-color: rgba(0, 192, 80, 0.4) !important;
}

:global(.dark) .border-red-200 {
  border-color: rgba(255, 84, 84, 0.4) !important;
}

:global(.dark) .border-blue-200 {
  border-color: rgba(0, 119, 255, 0.4) !important;
}
</style> 