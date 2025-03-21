<template>
  <div class="vibe-task" :class="taskStatusClass">
    <div class="task-header">
      <div class="task-title">
        <h-icon :icon="getActorIcon(task.actorType)" class="actor-icon" />
        <h5>{{ task.title }}</h5>
      </div>
      <Badge :variant="getPriorityVariant(task.priority)">{{ task.priority }}</Badge>
    </div>
    
    <div class="task-body">
      <p class="task-description">{{ task.description }}</p>
      
      <div v-if="task.status === 'in_progress'" class="task-progress">
        <Loader2 class="animate-spin mr-2" :size="16" />
        <span>In progress...</span>
      </div>
      
      <div v-if="task.status === 'completed'" class="task-result">
        <AccordionRoot>
          <AccordionItem value="result">
            <AccordionTrigger>View Result</AccordionTrigger>
            <AccordionContent>
              <div class="result-content">
                <pre>{{ formatResult(task.result) }}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </AccordionRoot>
      </div>
      
      <div v-if="task.status === 'failed'" class="task-error">
        <AlertTriangle class="text-red-500 mr-2" :size="16" />
        <span>{{ task.error }}</span>
      </div>
    </div>
    
    <div class="task-footer">
      <div class="task-meta">
        <div v-if="task.dependencies && task.dependencies.length > 0" class="task-dependencies">
          <span class="dependencies-label">Dependencies:</span>
          <span class="dependencies-count">{{ task.dependencies ? task.dependencies.length : 0 }}</span>
        </div>
        
        <div v-if="task.startedAt || task.completedAt" class="task-timing">
          <span v-if="task.startedAt && !task.completedAt">
            Started {{ formatTimeAgo(task.startedAt) }}
          </span>
          <span v-if="task.completedAt">
            Completed {{ formatTimeAgo(task.completedAt) }}
          </span>
        </div>
      </div>
      
      <div class="task-actions">
        <Button 
          v-if="canExecute" 
          size="sm" 
          variant="outline" 
          @click="$emit('execute', task)"
        >
          <h-icon :icon="Play" class="mr-1" size="14" />
          Execute
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import { 
  Loader2, 
  AlertTriangle, 
  Play, 
  Brain, 
  ListTodo, 
  Code, 
  BarChart, 
  FileText 
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
// TODO: Fix missing accordion components
// import { 
//   Accordion as AccordionRoot, 
//   AccordionItem, 
//   AccordionTrigger, 
//   AccordionContent 
// } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { type VibeTask, ActorType, TaskPriority } from '@/types/vibe'

const props = defineProps<{
  task: VibeTask
  boardId: string
}>()

const emit = defineEmits<{
  execute: [task: VibeTask]
}>()

const vibeStore = useVibeStore()

// Get the status class for styling
const taskStatusClass = computed(() => {
  switch (props.task.status) {
    case 'pending':
      return 'task-pending'
    case 'in_progress':
      return 'task-in-progress'
    case 'completed':
      return 'task-completed'
    case 'failed':
      return 'task-failed'
    default:
      return ''
  }
})

// Determine if a task can be executed based on its dependencies
const canExecute = computed(() => {
  // Must be pending to execute
  if (props.task.status !== 'pending') return false
  
  // No dependencies, can execute
  if (!props.task.dependencies || props.task.dependencies.length === 0) return true
  
  // Get the board to check dependencies
  const board = vibeStore.getBoard(props.boardId)
  if (!board) return false
  
  // Check if all dependencies are completed
  return props.task.dependencies.every(depId => {
    const depTask = board.tasks.find((t: { id: string, status: string }) => t.id === depId)
    return depTask && depTask.status === 'completed'
  })
})

// Get an icon for the actor type
const getActorIcon = (actorType: ActorType) => {
  switch (actorType) {
    case ActorType.PLANNER:
      return Brain
    case ActorType.COMPOSER:
      return ListTodo
    case ActorType.CODER:
      return Code
    case ActorType.ANALYST:
      return BarChart
    case ActorType.RESEARCHER:
      return FileText
    default:
      return Brain
  }
}

// Get a badge variant based on priority
const getPriorityVariant = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.LOW:
      return 'outline'
    case TaskPriority.MEDIUM:
      return 'secondary'
    case TaskPriority.HIGH:
      return 'default'
    case TaskPriority.CRITICAL:
      return 'destructive'
    default:
      return 'outline'
  }
}

// Format a result for display
const formatResult = (result: any) => {
  if (!result) return 'No result'
  
  try {
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2)
    }
    return String(result)
  } catch (error) {
    return 'Error formatting result'
  }
}

// Format a date as a relative time string
const formatTimeAgo = (date: Date | string) => {
  if (!date) return ''
  
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

// Create simple stub components
const AccordionRoot = defineComponent({
  name: 'AccordionRoot',
  setup(_, { slots }: { slots: any }) {
    return () => h('div', { class: 'accordion-root' }, slots.default?.())
  }
})

const AccordionItem = defineComponent({
  name: 'AccordionItem',
  props: {
    value: String
  },
  setup(_, { slots }: { slots: any }) {
    return () => h('div', { class: 'accordion-item' }, slots.default?.())
  }
})

const AccordionTrigger = defineComponent({
  name: 'AccordionTrigger',
  setup(_, { slots }: { slots: any }) {
    return () => h('button', { class: 'accordion-trigger' }, slots.default?.())
  }
})

const AccordionContent = defineComponent({
  name: 'AccordionContent',
  setup(_, { slots }: { slots: any }) {
    return () => h('div', { class: 'accordion-content' }, slots.default?.())
  }
})
</script>

<style scoped>
.vibe-task {
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background-color: white;
  overflow: hidden;
  transition: all 0.2s ease;
}

.vibe-task:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.task-pending {
  border-left: 3px solid #94a3b8;
}

.task-in-progress {
  border-left: 3px solid #3b82f6;
}

.task-completed {
  border-left: 3px solid #22c55e;
}

.task-failed {
  border-left: 3px solid #ef4444;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-title h5 {
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0;
}

.actor-icon {
  color: #64748b;
}

.task-body {
  padding: 0.75rem;
}

.task-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #334155;
}

.task-progress,
.task-error {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  padding: 0.5rem;
  background-color: #f1f5f9;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
}

.task-error {
  background-color: #fee2e2;
  color: #b91c1c;
}

.result-content {
  max-height: 200px;
  overflow: auto;
  background-color: #f8fafc;
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #64748b;
}

.task-dependencies {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dependencies-count {
  background-color: #e2e8f0;
  border-radius: 9999px;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
}

.task-timing {
  display: flex;
  align-items: center;
}
</style> 