<template>
  <div class="vibe-task-board space-y-3">
    <!-- Task summary -->
    <div class="flex justify-between items-center border-b pb-2">
      <div class="text-sm">
        <Badge variant="outline" class="mr-2">
          {{ completedTasks.length }}/{{ tasks.length }}
        </Badge>
        tasks complete
      </div>
      <div class="flex gap-2">
        <Button 
          v-if="hasInProgressTasks || tasks.length > completedTasks.length + failedTasks.length" 
          @click="$emit('refresh')" 
          variant="ghost" 
          size="sm"
        >
          <RefreshCw class="h-4 w-4 mr-2" />
          Refresh
        </Button>
        
        <Button 
          v-if="hasStuckTasks" 
          @click="$emit('reset')" 
          variant="outline" 
          size="sm"
          class="text-destructive"
        >
          <Undo2 class="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
    
    <!-- Tabs for task board UI -->
    <Tabs class="w-full" defaultValue="tasks">
      <TabsList class="w-full">
        <TabsTrigger class="flex-1" value="tasks">
          <ListChecks class="h-4 w-4 mr-2" />
          Tasks
        </TabsTrigger>
        <TabsTrigger class="flex-1" value="database">
          <Database class="h-4 w-4 mr-2" />
          Database
        </TabsTrigger>
        <TabsTrigger class="flex-1" value="graph">
          <Network class="h-4 w-4 mr-2" />
          Graph
        </TabsTrigger>
      </TabsList>

      <!-- Tasks Panel -->
      <TabsContent value="tasks" class="p-0 border-0 mt-2">
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
        class="p-0 border-0 mt-2"
        @select="$emit('load-database')"
      >
        <slot name="database-content">
          <!-- Database tables list -->
          <div class="text-center p-4 text-muted-foreground">
            No database tables available yet
          </div>
        </slot>
      </TabsContent>
      
      <!-- Graph Panel -->
      <TabsContent value="graph" class="p-0 border-0 mt-2">
        <slot name="graph-content">
          <TaskGraph 
            :tasks="tasks" 
            :selected-task-id="selectedTaskId"
            @node-click="$emit('select-task', $event)"
          />
        </slot>
        
        <!-- Task details panel when a node is selected -->
        <div v-if="selectedTaskId && selectedTask" class="mt-3 border p-3 rounded-md">
          <div class="text-sm font-medium">
            {{ selectedTask.title }}
            <Badge class="ml-2">{{ getActorName(selectedTask.actorType) }}</Badge>
          </div>
          
          <div class="text-xs mt-1">{{ selectedTask.description }}</div>
          
          <div class="mt-3 flex gap-2">
            <Button 
              v-if="selectedTask && canInsertResult(selectedTask)" 
              @click="$emit('insert-result', selectedTask)"
              size="sm"
              class="flex-1"
            >
              <ClipboardCopy class="h-4 w-4 mr-2" />
              Insert Result
            </Button>
            
            <Button
              @click="$emit('view-details', selectedTask)"
              size="sm"
              variant="outline"
              class="flex-1"
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
import { RefreshCw, Undo2, ListChecks, Database, Network, ClipboardCopy, Maximize2 } from 'lucide-vue-next'
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

const selectedTask = computed(() =>
  props.tasks.find(task => task.id === props.selectedTaskId)
)

// Get actor name for display
function getActorName(actorType) {
  switch (actorType) {
    case ActorType.RESEARCHER: return 'Researcher'
    case ActorType.ANALYST: return 'Analyst'
    case ActorType.CODER: return 'Coder'
    case ActorType.PLANNER: return 'Planner'
    case ActorType.COMPOSER: return 'Composer'
    default: return actorType
  }
}
</script>

<style scoped>
.vibe-task-board {
  @apply w-full;
}
</style> 