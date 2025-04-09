<template>
  <div class="task-list-container">
    <div class="space-y-2 task-list-scrollable">
      <Collapsible 
        v-for="task in tasks" 
        :key="task.id"
        :id="'task-' + task.id"
        :open="expandedTaskIds.includes(task.id)"
        @update:open="toggleTask(task.id)"
        class="border rounded-md transition-all duration-200 hover:border-primary/50"
        :class="{
          'border-primary': task.id === selectedTaskId,
          'shadow-sm': task.id === selectedTaskId,
          'bg-primary/5': task.id === selectedTaskId,
          'border-amber-200 bg-amber-50/30': task.status === 'pending',
          'border-blue-200 bg-blue-50/30': task.status === 'in_progress',
          'border-green-200 bg-green-50/30': task.status === 'completed',
          'border-red-200 bg-red-50/30': task.status === 'failed',
        }"
      >
        <CollapsibleTrigger 
          class="flex w-full items-center justify-between p-4 text-left"
          :aria-label="`Toggle task: ${task.title}`"
        >
          <div class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <div 
                class="h-3.5 w-3.5 rounded-full flex items-center justify-center"
                :class="{
                  'bg-gray-200 text-gray-700': task.status === 'pending',
                  'bg-blue-500 animate-pulse': task.status === 'in_progress',
                  'bg-green-500': task.status === 'completed',
                  'bg-red-500': task.status === 'failed'
                }"
                aria-hidden="true"
              >
                <CheckIcon v-if="task.status === 'completed'" class="h-2 w-2 text-white" />
                <XIcon v-if="task.status === 'failed'" class="h-2 w-2 text-white" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium truncate" :class="{'text-green-800': task.status === 'completed', 'text-red-800': task.status === 'failed'}">
                {{ task.title }}
              </div>
              <div class="flex items-center text-xs space-x-2">
                <span class="text-muted-foreground">{{ getActorName(task.actorType) }}</span>
                <Badge 
                  v-if="task.status !== 'pending'" 
                  class="capitalize text-[10px] h-4"
                  :variant="getStatusVariant(task.status)"
                >
                  {{ task.status.replace('_', ' ') }}
                </Badge>
              </div>
            </div>
          </div>
          <ChevronDown 
            class="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" 
            :class="{ 'rotate-180 transform': expandedTaskIds.includes(task.id) }"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent class="overflow-hidden transition-all data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div class="p-4 pt-0 space-y-4 text-sm border-t border-border/40">
            <!-- Task description -->
            <div>
              <div class="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Description</div>
              <div class="text-sm bg-muted/30 p-2 rounded-md">{{ task.description }}</div>
            </div>
            
            <!-- Task dependencies -->
            <div v-if="task.dependencies && task.dependencies.length > 0">
              <div class="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Dependencies</div>
              <div class="flex flex-wrap gap-1.5">
                <Badge 
                  v-for="depId in task.dependencies" 
                  :key="depId"
                  variant="outline"
                  class="px-2 py-0.5 text-xs cursor-pointer hover:bg-muted transition-colors"
                  @click="$emit('select-dependency', depId)"
                  :class="{ 'border-primary': tasks.find(t => t.id === depId)?.status === 'completed' }"
                >
                  {{ getDependencyTitle(depId) }}
                </Badge>
              </div>
            </div>
            
            <!-- Task result -->
            <div v-if="task.status === 'completed'">
              <div class="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Result</span>
                <span v-if="task.startedAt && task.completedAt" class="text-xs font-normal text-muted-foreground">
                  {{ calculateDuration(task.startedAt, task.completedAt) }}
                </span>
              </div>
              <div class="bg-muted/30 p-3 rounded-md border border-border/40 mb-2">
                <div class="whitespace-pre-wrap max-h-40 overflow-y-auto text-sm">{{ getResultPreview(task.result) }}</div>
              </div>
              
              <div class="flex flex-col sm:flex-row gap-2">
                <Tooltip v-if="canInsertResult(task)" content="Insert this result into your document">
                  <Button 
                    @click="$emit('insert-result', task)"
                    size="sm"
                    class="flex-1"
                    aria-label="Insert result into document"
                  >
                    <ClipboardCopy class="h-4 w-4 mr-2" />
                    Insert Result
                  </Button>
                </Tooltip>
                
                <Tooltip content="View complete task details and results">
                  <Button
                    @click="$emit('view-details', task)"
                    size="sm"
                    variant="outline"
                    class="flex-1"
                    aria-label="View full task details"
                  >
                    <Maximize2 class="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Tooltip>
              </div>
            </div>
            
            <!-- Task error -->
            <div v-if="task.status === 'failed'">
              <div class="text-xs font-medium text-destructive mb-1 uppercase tracking-wider">Error</div>
              <div class="bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive">
                {{ task.error }}
              </div>
            </div>
            
            <!-- Task timing -->
            <div v-if="task.startedAt" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
              <div v-if="task.startedAt" class="flex items-center">
                <Clock class="h-3 w-3 mr-1" />
                Started: {{ formatDate(task.startedAt) }}
              </div>
              <div v-if="task.completedAt" class="flex items-center">
                <CheckCircle class="h-3 w-3 mr-1" />
                Completed: {{ formatDate(task.completedAt) }}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <!-- Empty state if no tasks -->
      <div v-if="tasks.length === 0" class="text-center py-8 text-muted-foreground">
        <ClockIcon class="h-10 w-10 mx-auto mb-2 opacity-20" />
        <p>No tasks have been created yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Tooltip } from '@/components/ui/tooltip'
import { 
  ChevronDown, 
  ClipboardCopy, 
  Maximize2, 
  Clock, 
  CheckCircle,
  Check as CheckIcon,
  X as XIcon,
  Clock as ClockIcon
} from 'lucide-vue-next'
import { ActorType } from '@/types/vibe'

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
  }
})

const emit = defineEmits(['toggle-task', 'select-dependency', 'insert-result', 'view-details'])

// Toggle task expansion
function toggleTask(taskId) {
  emit('toggle-task', taskId)
}

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

// Get badge variant for task status
function getStatusVariant(status) {
  switch (status) {
    case 'in_progress': return 'secondary'
    case 'completed': return 'success'
    case 'failed': return 'destructive'
    default: return 'outline'
  }
}

// Get a preview of the task result
function getResultPreview(result) {
  if (!result) return 'No result available'
  
  if (typeof result === 'string') {
    return result.length > 500 ? result.substring(0, 500) + '...' : result
  }
  
  if (typeof result === 'object') {
    // Handle different result types
    if (result.content) return result.content.substring(0, 500) + '...'
    return JSON.stringify(result, null, 2).substring(0, 500) + '...'
  }
  
  return 'Result available'
}

// Get dependency title
function getDependencyTitle(depId) {
  const depTask = props.tasks.find(t => t.id === depId)
  return depTask ? depTask.title : `Task ${depId.substring(0, 8)}...`
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Calculate duration between two dates
function calculateDuration(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const durationMs = endDate.getTime() - startDate.getTime()
  
  // Format as minutes and seconds
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `Completed in ${minutes}m ${remainingSeconds}s`
}
</script>

<style scoped>
@keyframes collapsible-down {
  from { height: 0 }
  to { height: var(--radix-collapsible-content-height) }
}

@keyframes collapsible-up {
  from { height: var(--radix-collapsible-content-height) }
  to { height: 0 }
}

.task-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-list-scrollable {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px; /* Compensate for the padding to keep layout consistent */
  scrollbar-width: thin;
}

/* Styling for webkit scrollbars */
.task-list-scrollable::-webkit-scrollbar {
  width: 6px;
}

.task-list-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.task-list-scrollable::-webkit-scrollbar-thumb {
  background-color: rgba(100, 116, 139, 0.3);
  border-radius: 3px;
}

:global(.dark) .task-list-scrollable::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.3);
}

:global(.dark) .bg-amber-50\/30 {
  background-color: rgba(32, 27, 0, 0.3) !important;
}

:global(.dark) .bg-blue-50\/30 {
  background-color: rgba(0, 24, 82, 0.3) !important;
}

:global(.dark) .bg-green-50\/30 {
  background-color: rgba(0, 45, 16, 0.3) !important;
}

:global(.dark) .bg-red-50\/30 {
  background-color: rgba(69, 0, 0, 0.3) !important;
}

:global(.dark) .border-amber-200 {
  border-color: rgba(180, 150, 0, 0.4) !important;
}

:global(.dark) .border-blue-200 {
  border-color: rgba(0, 119, 255, 0.4) !important;
}

:global(.dark) .border-green-200 {
  border-color: rgba(0, 192, 80, 0.4) !important;
}

:global(.dark) .border-red-200 {
  border-color: rgba(255, 84, 84, 0.4) !important;
}
</style> 