<template>
  <div class="space-y-2">
    <Collapsible 
      v-for="task in tasks" 
      :key="task.id"
      :id="'task-' + task.id"
      :open="expandedTaskIds.includes(task.id)"
      @update:open="toggleTask(task.id)"
      class="border rounded-md"
      :class="{
        'border-primary': task.id === selectedTaskId,
        'shadow-sm': task.id === selectedTaskId
      }"
    >
      <CollapsibleTrigger class="flex w-full items-center justify-between p-4 text-left">
        <div class="flex items-center">
          <div 
            class="mr-3 h-3 w-3 rounded-full" 
            :class="{
              'bg-gray-300': task.status === 'pending',
              'bg-blue-500 animate-pulse': task.status === 'in_progress',
              'bg-green-500': task.status === 'completed',
              'bg-red-500': task.status === 'failed'
            }"
          ></div>
          <div>
            <div class="text-sm font-medium">{{ task.title }}</div>
            <div class="text-xs text-gray-500">{{ getActorName(task.actorType) }}</div>
          </div>
        </div>
        <ChevronDown class="h-4 w-4 shrink-0 transition-transform ui-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent class="p-4 pt-0 text-sm">
        <div class="space-y-3">
          <!-- Task description -->
          <div>
            <div class="text-xs text-muted-foreground mb-1">Description:</div>
            <div class="text-sm">{{ task.description }}</div>
          </div>
          
          <!-- Task dependencies -->
          <div v-if="task.dependencies && task.dependencies.length > 0">
            <div class="text-xs text-muted-foreground mb-1">Dependencies:</div>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="depId in task.dependencies" 
                :key="depId"
                class="px-2 py-0.5 bg-muted text-xs rounded cursor-pointer"
                @click="$emit('select-dependency', depId)"
              >
                {{ getDependencyTitle(depId) }}
              </span>
            </div>
          </div>
          
          <!-- Task result -->
          <div v-if="task.status === 'completed'">
            <div class="text-xs text-muted-foreground mb-1">Result:</div>
            <div class="bg-muted/30 p-2 rounded">
              <div class="whitespace-pre-wrap max-h-40 overflow-y-auto">{{ getResultPreview(task.result) }}</div>
            </div>
            
            <div class="mt-2 flex gap-2">
              <Button 
                v-if="canInsertResult(task)" 
                @click="$emit('insert-result', task)"
                size="sm"
                class="flex-1"
              >
                <ClipboardCopy class="h-4 w-4 mr-2" />
                Insert Result Below
              </Button>
              
              <Button
                @click="$emit('view-details', task)"
                size="sm"
                variant="outline"
                class="flex-1"
              >
                <Maximize2 class="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
          
          <!-- Task error -->
          <div v-if="task.status === 'failed'">
            <div class="text-xs text-destructive mb-1">Error:</div>
            <div class="bg-destructive/10 p-2 rounded text-destructive">
              {{ task.error }}
            </div>
          </div>
          
          <!-- Task timing -->
          <div v-if="task.startedAt || task.completedAt" class="mt-2 text-xs text-muted-foreground">
            <div v-if="task.startedAt">Started: {{ formatDate(task.startedAt) }}</div>
            <div v-if="task.completedAt">Completed: {{ formatDate(task.completedAt) }}</div>
            <div v-if="task.startedAt && task.completedAt">
              Duration: {{ calculateDuration(task.startedAt, task.completedAt) }}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, ClipboardCopy, Maximize2 } from 'lucide-vue-next'
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

// Get dependency title
function getDependencyTitle(depId) {
  const depTask = props.tasks.find(t => t.id === depId)
  return depTask ? depTask.title : `Task ${depId.substring(0, 8)}...`
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
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
  
  return `${minutes}m ${remainingSeconds}s`
}
</script> 