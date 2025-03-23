<template>
  <div class="task-graph-container">
    <div class="task-graph-header">
      <h3 class="graph-title">Task Dependency Graph</h3>
      <div class="graph-controls">
        <button class="control-button" @click="fitView({ padding: 0.2, duration: 800 })">
          <span class="control-icon">⟲</span> Fit View
        </button>
        <button class="control-button" @click="zoomIn">
          <span class="control-icon">+</span>
        </button>
        <button class="control-button" @click="zoomOut">
          <span class="control-icon">−</span>
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="task-graph-loading">
      <div class="loading-spinner"></div>
      <p>Loading tasks...</p>
    </div>
    
    <div v-else-if="!hasValidTasks" class="task-graph-empty">
      <p>No tasks available to display.</p>
    </div>
    
    <div v-else-if="elements.length === 0 && tasks.length > 0" class="task-graph-error">
      <p>Tasks are loaded but the graph is not rendering properly.</p>
      <button class="debug-button" @click="useTestData">Use Test Data</button>
    </div>
    
    <div v-else class="task-graph">
      <VueFlow
        v-model="elements"
        class="task-flow"
        @nodeClick="handleNodeClick"
        :defaultZoom="1"
        :minZoom="0.2"
        :maxZoom="4"
        :snapToGrid="true"
        :snapGrid="[15, 15]"
      >
        <template #node-default="nodeProps">
          <TaskNodeComponent :nodeData="nodeProps.data" />
        </template>
        
        <Background :pattern-color="'#cbd5e1'" :gap="15" :size="1" />
        <MiniMap
          :nodeStrokeColor="(n) => n.selected ? '#3b82f6' : '#64748b'" 
          :nodeColor="(n) => getNodeStatusColor(n.data?.status)"
          :height="120"
          :width="200"
          pannable
        />
        <Controls :show-zoom="false" :show-fit-view="false" />
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import TaskNodeComponent from './TaskNodeComponent.vue'
import { useTaskGraph } from './useTaskGraph'
import type { Task } from './types'
import { logger } from '@/services/logger'

// Import required styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

// Define props
const props = defineProps<{
  tasks: Task[]
  loading?: boolean
  selectedTaskId?: string
}>()

// Define emits
const emit = defineEmits<{
  (e: 'node-click', nodeId: string): void
}>()

// Get VueFlow instance
const { zoomIn: zoomInFlow, zoomOut: zoomOutFlow } = useVueFlow()

// Initialize task graph
const {
  elements,
  fitView,
  buildGraph,
  useTestData,
  hasValidTasks,
  vueFlowInstance,
  updateTasks
} = useTaskGraph({
  initialTasks: props.tasks,
  selectedTaskId: props.selectedTaskId,
  onNodeClick: (nodeId) => emit('node-click', nodeId)
})

// Custom zoom controls
const zoomIn = () => {
  zoomInFlow({ duration: 300 })
}

const zoomOut = () => {
  zoomOutFlow({ duration: 300 })
}

// Get node color for minimap based on status
const getNodeStatusColor = (status?: string) => {
  if (!status) return '#94a3b8'
  
  switch (status) {
    case 'pending': return '#94a3b8'
    case 'in_progress': return '#3b82f6'
    case 'completed': return '#10b981'
    case 'failed': return '#ef4444'
    default: return '#94a3b8'
  }
}

// Handle node click
const handleNodeClick = (e: NodeMouseEvent) => {
  if (e.node && e.node.id) {
    // Highlight the clicked node with a subtle animation
    const nodeElement = document.querySelector(`.vue-flow__node[data-id="${e.node.id}"]`)
    if (nodeElement) {
      nodeElement.classList.add('node-clicked')
      setTimeout(() => {
        nodeElement.classList.remove('node-clicked')
      }, 1000)
    }
    
    emit('node-click', e.node.id)
  }
}

// Watch for changes in tasks and rebuild graph
watch(() => props.tasks, (newTasks) => {
  logger.log('Tasks changed in child component:', newTasks?.length || 0)
  if (newTasks && newTasks.length > 0) {
    updateTasks(newTasks)
    nextTick(() => {
      buildGraph()
    })
  }
}, { deep: true, immediate: true })

// Watch for changes in selected task
watch(() => props.selectedTaskId, (newId) => {
  // Update selected node in graph
  elements.value = elements.value.map(el => {
    if (el.type === 'default' && 'id' in el) {
      return {
        ...el,
        selected: el.id === newId,
        style: el.id === newId 
          ? { border: '2px solid #3b82f6', boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' } 
          : {}
      }
    }
    return el
  })
  
  // If a node is selected, center and zoom to it
  if (newId) {
    const selectedNode = elements.value.find(el => el.id === newId && el.type === 'default')
    if (selectedNode && 'position' in selectedNode) {
      vueFlowInstance.setCenter(
        selectedNode.position.x, 
        selectedNode.position.y, 
        { duration: 800, zoom: 1.2 }
      )
    }
  }
})

// Rebuild graph when component is mounted
onMounted(() => {
  logger.log('Child TaskGraph mounted, tasks:', props.tasks?.length || 0)
  
  // Delay slightly to ensure DOM is ready
  setTimeout(() => {
    if (props.tasks && props.tasks.length > 0) {
      updateTasks(props.tasks)
      buildGraph()
      nextTick(() => {
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 800 })
        }, 100)
      })
    }
  }, 50)
})
</script>

<style scoped>
.task-graph-container {
  width: 100%;
  height: 520px;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8fafc;
}

.task-graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background-color: white;
}

.graph-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.graph-controls {
  display: flex;
  gap: 8px;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.control-icon {
  font-size: 14px;
}

.task-graph, .task-graph-loading, .task-graph-empty, .task-graph-error {
  flex: 1;
  min-height: 450px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}

.task-graph {
  padding: 0;
}

.task-flow {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.vue-flow__minimap) {
  bottom: 20px;
  right: 20px;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

:deep(.vue-flow__controls) {
  bottom: 20px;
  left: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

:deep(.vue-flow__controls-button) {
  background-color: white;
  border: 1px solid #e2e8f0;
  color: #475569;
  transition: all 0.2s ease;
}

:deep(.vue-flow__controls-button:hover) {
  background-color: #f1f5f9;
}

:deep(.vue-flow__edge path) {
  stroke-width: 2;
  transition: stroke 0.3s ease, stroke-width 0.3s ease;
}

:deep(.vue-flow__edge:hover path) {
  stroke-width: 3;
}

:deep(.vue-flow__edge-animated path) {
  stroke-dasharray: 5;
  animation: flowEdgeAnimation 1s infinite linear;
}

@keyframes flowEdgeAnimation {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.loading-spinner {
  border: 3px solid rgba(203, 213, 225, 0.3);
  border-radius: 50%;
  border-top: 3px solid #3b82f6;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.debug-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.debug-button:hover {
  background-color: #2563eb;
}

:deep(.node-clicked) {
  animation: pulse 1s ease;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Add responsive adjustments */
@media (max-width: 768px) {
  .task-graph-container {
    height: 400px;
  }
  
  .task-graph-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .graph-controls {
    width: 100%;
    justify-content: flex-start;
  }
  
  :deep(.vue-flow__minimap) {
    width: 150px;
    height: 100px;
  }
}
</style> 