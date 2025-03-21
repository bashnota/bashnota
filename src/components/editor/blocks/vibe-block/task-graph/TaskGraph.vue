<template>
  <div class="task-graph-container">
    <div v-if="loading" class="task-graph-loading">
      Loading tasks...
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
      >
        <template #node-default="nodeProps">
          <TaskNodeComponent :nodeData="nodeProps.data" />
        </template>
        
        <Background :pattern-color="'#aaa'" :gap="8" />
        <MiniMap />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { VueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import TaskNodeComponent from './TaskNodeComponent.vue'
import { useTaskGraph } from './useTaskGraph'
import type { Task } from './types'

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

// Initialize task graph
const {
  elements,
  fitView,
  buildGraph,
  useTestData,
  hasValidTasks,
  handleNodeClick: handleNodeClickInternal
} = useTaskGraph({
  initialTasks: props.tasks,
  selectedTaskId: props.selectedTaskId,
  onNodeClick: (nodeId) => emit('node-click', nodeId)
})

// Handle node click
const handleNodeClick = (e: NodeMouseEvent) => {
  if (e.node && e.node.id) {
    emit('node-click', e.node.id)
  }
}

// Watch for changes in tasks and rebuild graph
watch(() => props.tasks, (newTasks) => {
  buildGraph()
}, { deep: true })

// Watch for changes in selected task
watch(() => props.selectedTaskId, (newId) => {
  // Update selected node in graph
  elements.value = elements.value.map(el => {
    if (el.type === 'default' && 'id' in el) {
      return {
        ...el,
        selected: el.id === newId
      }
    }
    return el
  })
})

// Fit view when component is mounted
onMounted(() => {
  if (elements.value.length > 0) {
    setTimeout(() => {
      fitView({ padding: 0.2 })
    }, 100)
  }
})
</script>

<style scoped>
.task-graph-container {
  width: 100%;
  height: 500px;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
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

.debug-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.debug-button:hover {
  background-color: #2563eb;
}
</style> 