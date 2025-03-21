<template>
  <div class="task-graph-container">
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-base font-semibold">Task Dependency Graph</h3>
      <div class="flex gap-2">
        <Button 
          @click="fitView" 
          variant="outline" 
          size="sm"
        >
          <MaximizeIcon class="h-4 w-4 mr-1" />
          Fit View
        </Button>
      </div>
    </div>
    
    <div class="task-graph">
      <div v-if="!props.tasks || props.tasks.length === 0" class="flex items-center justify-center h-full">
        <p class="text-gray-500">No tasks available to display</p>
      </div>
      <div v-else-if="elements.length === 0" class="flex items-center justify-center h-full">
        <p class="text-orange-500">Tasks loaded but graph not rendered. Check console for errors.</p>
        <Button @click="useTestData" variant="outline" size="sm" class="ml-2">
          Use Test Data
        </Button>
      </div>
      <div v-else class="vue-flow-wrapper">
        <VueFlow
          v-model="elements"
          class="task-flow-graph"
          @nodeClick="onNodeClick"
        >
          <Background pattern="dots" />
          <Controls />
          <MiniMap />
          
          <template #node-default="nodeProps">
            <div
              class="custom-node actor-node"
              :class="{ 
                'status-pending': nodeProps.data.status === 'pending',
                'status-in-progress': nodeProps.data.status === 'in_progress',
                'status-completed': nodeProps.data.status === 'completed',
                'status-failed': nodeProps.data.status === 'failed',
              }"
            >
              <div class="node-header" :class="'actor-type-' + nodeProps.data.actorType.toLowerCase()">
                <div class="actor-icon" v-if="getActorIcon(nodeProps.data.actorType)">
                  <component :is="getActorIcon(nodeProps.data.actorType)" class="h-4 w-4" />
                </div>
                <div class="actor-type">{{ nodeProps.data.actorType }}</div>
              </div>
              <div class="node-title" :title="nodeProps.data.title">{{ nodeProps.data.title }}</div>
              <div class="node-status">
                <span class="status-indicator" :class="'status-' + nodeProps.data.status"></span>
                <span class="status-text">{{ formatStatus(nodeProps.data.status) }}</span>
              </div>
            </div>
          </template>
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'

import { 
  Brain, 
  SearchCode, 
  BarChart, 
  FileCode, 
  PenTool,
  Maximize as MaximizeIcon
} from 'lucide-vue-next'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import { Button } from '@/components/ui/button'
import { ActorType } from '@/types/vibe'

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  selectedTaskId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['node-click'])

// Elements for the graph
const elements = ref([])

// Use Vue Flow with proper options
const vueFlowInstance = useVueFlow({
  defaultEdgeOptions: {
    type: 'default',
    style: { strokeWidth: 2 }
  },
  defaultViewport: { zoom: 1.2 },
  autoPanOnNodeDrag: true,
  fitViewOnInit: true,
})

// Extract needed methods from vueFlowInstance
const { fitView, getNodes, getEdges } = vueFlowInstance

// Check if tasks data is valid
const hasValidTasks = computed(() => {
  return props.tasks && 
         Array.isArray(props.tasks) && 
         props.tasks.length > 0 &&
         props.tasks.every(task => task.id && task.title)
})

// Default test data for debugging
const sampleTasks = [
  {
    id: 'task-1',
    title: 'Sample Task 1',
    status: 'completed',
    actorType: 'RESEARCHER',
    description: 'This is a sample task for testing'
  },
  {
    id: 'task-2',
    title: 'Sample Task 2',
    status: 'in_progress',
    actorType: 'CODER',
    description: 'This is another sample task',
    dependencies: ['task-1']
  }
]

// Expose current elements state for debugging
const currentElements = computed(() => elements.value)

// Format task status for display
function formatStatus(status) {
  switch (status) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    default: return status
  }
}

// Get icon for actor type
function getActorIcon(actorType) {
  switch (actorType) {
    case ActorType.RESEARCHER: return Brain
    case ActorType.ANALYST: return BarChart
    case ActorType.CODER: return FileCode
    case ActorType.PLANNER: return PenTool
    case ActorType.COMPOSER: return SearchCode
    default: return null
  }
}

// Handle node click
function onNodeClick(event, { id }) {
  console.log('Node clicked:', id)
  emit('node-click', id)
}

// Watch for changes in tasks and rebuild the graph
watch(() => props.tasks, (newTasks) => {
  console.log('Tasks changed:', newTasks)
  if (newTasks && newTasks.length > 0) {
    nextTick(() => {
      buildGraph()
      // Wait for elements to update then fit view
      nextTick(() => {
        setTimeout(() => {
          if (elements.value.length > 0) {
            fitView({ padding: 0.2 })
          }
        }, 100)
      })
    })
  } else {
    // Clear the graph if no tasks
    elements.value = []
  }
}, { deep: true, immediate: true })

// Watch for changes in elements to log for debugging
watch(elements, (newElements) => {
  console.log('Elements updated:', newElements)
}, { deep: true })

// Function to use sample test data for debugging
function useTestData() {
  console.log('Using test data for debugging')
  
  // Clear current elements
  elements.value = []
  
  // Use nextTick to ensure the DOM is updated
  nextTick(() => {
    // Build graph with sample data
    const nodes = [
      {
        id: 'test-1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: {
          title: 'Test Task 1',
          status: 'completed',
          actorType: 'RESEARCHER',
          description: 'Test task for debugging'
        }
      },
      {
        id: 'test-2',
        type: 'default',
        position: { x: 400, y: 100 },
        data: {
          title: 'Test Task 2',
          status: 'in_progress',
          actorType: 'CODER',
          description: 'Another test task'
        }
      }
    ]
    
    const edges = [
      {
        id: 'e-test-1-test-2',
        source: 'test-1',
        target: 'test-2',
        style: { stroke: '#64748b', strokeWidth: 2 },
        animated: true
      }
    ]
    
    // Update elements with test nodes and edges
    elements.value = [...nodes, ...edges]
    
    // Wait for elements to update then fit view
    nextTick(() => {
      setTimeout(() => {
        fitView({ 
          padding: 0.2,
          includeHiddenNodes: false,
          duration: 500
        })
      }, 200)
    })
  })
}

// Build the graph from tasks or use sample data for debugging
function buildGraph() {
  try {
    const tasksToUse = props.tasks
    
    if (!tasksToUse || tasksToUse.length === 0) {
      console.warn('Cannot build graph: No valid tasks provided')
      elements.value = []
      return
    }

    const nodes = []
    const edges = []
    
    console.log('Building graph with tasks:', tasksToUse)
    
    // Create a node for each task
    tasksToUse.forEach((task, index) => {
      if (!task.id) {
        console.warn('Task missing ID, skipping:', task)
        return
      }
      
      // Create node with task data
      const node = {
        id: task.id,
        type: 'default',
        position: { 
          x: 100 + (index % 3) * 300, 
          y: 100 + Math.floor(index / 3) * 200 
        },
        data: {
          title: task.title || 'Untitled Task',
          status: task.status || 'pending',
          actorType: task.actorType || 'Unknown',
          description: task.description || ''
        }
      }
      
      nodes.push(node)
      
      // Create edges for dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          // Verify the dependency ID exists
          const dependencyExists = tasksToUse.some(t => t.id === depId);
          
          if (!dependencyExists) {
            console.warn(`Task ${task.id} depends on missing task ${depId}`)
            return
          }
          
          edges.push({
            id: `e-${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: 'default',
            style: {
              stroke: task.status === 'failed' ? '#ef4444' : '#64748b',
              strokeWidth: 2
            },
            animated: task.status === 'in_progress'
          })
        })
      }
    })
    
    console.log('Created nodes:', nodes)
    console.log('Created edges:', edges)
    
    // Make sure to update the elements with both nodes and edges
    if (nodes.length > 0) {
      elements.value = [...nodes, ...edges]
    } else {
      console.warn('No valid nodes created')
      elements.value = []
    }
  } catch (error) {
    console.error('Error building graph:', error)
    elements.value = []
  }
}

// Watch for selectedTaskId changes
watch(() => props.selectedTaskId, (newId) => {
  if (newId) {
    // Highlight the selected node
    elements.value = elements.value.map(el => {
      if (el.id === newId && el.type !== 'edge') {
        return {
          ...el,
          style: { ...el.style, border: '2px solid #3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }
        }
      } else if (el.type !== 'edge') {
        return {
          ...el,
          style: { ...el.style, border: null, boxShadow: null }
        }
      }
      return el
    })
  }
})

// Initial build
onMounted(() => {
  console.log('TaskGraph mounted, tasks:', props.tasks)
  
  // Only build graph if there are tasks
  if (props.tasks && props.tasks.length > 0) {
    buildGraph()
    
    // Use nextTick then setTimeout to ensure the graph is rendered before fitting
    nextTick(() => {
      setTimeout(() => {
        console.log('Fitting view to elements:', elements.value)
        if (elements.value.length > 0) {
          fitView({ 
            padding: 0.2,
            includeHiddenNodes: false,
            duration: 500
          })
        }
      }, 500) // Longer delay to ensure DOM is ready
    })
  }
})
</script>

<style scoped>
.task-graph-container {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  height: 500px; /* Fixed height */
}

.task-graph {
  flex: 1;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background-color: #f8fafc;
  min-height: 450px;
  height: 450px;
}

.vue-flow-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Force proper dimensions for VueFlow */
:deep(.vue-flow) {
  width: 100% !important;
  height: 100% !important;
}

.task-flow-graph {
  width: 100%;
  height: 100%;
}

.custom-node {
  width: 200px;
  padding: 0;
  border-radius: 6px;
  background: white;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  border: 2px solid #e2e8f0;
  color: #1e293b;
}

.node-header {
  padding: 8px 10px;
  border-radius: 4px 4px 0 0;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.actor-type-researcher { background-color: #dbeafe; color: #1e40af; }
.actor-type-analyst { background-color: #dcfce7; color: #166534; }
.actor-type-coder { background-color: #f3e8ff; color: #6b21a8; }
.actor-type-planner { background-color: #fff7ed; color: #9a3412; }
.actor-type-composer { background-color: #ede9fe; color: #4c1d95; }

.node-title {
  padding: 10px;
  font-weight: 500;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: 1px solid #e2e8f0;
}

.node-status {
  padding: 8px 10px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
}

.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-pending { background-color: #cbd5e1; }
.status-in_progress { background-color: #3b82f6; }
.status-completed { background-color: #10b981; }
.status-failed { background-color: #ef4444; }

.status-in-progress {
  border-color: #3b82f6;
}

.status-completed {
  border-color: #10b981;
}

.status-failed {
  border-color: #ef4444;
}
</style> 