<template>
  <TaskGraph
    :tasks="tasks"
    :loading="loading"
    :selectedTaskId="selectedTaskId"
    @node-click="handleNodeClick"
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import TaskGraph from './task-graph/TaskGraph.vue'

const props = defineProps({
  block: {
    type: Object,
    required: false,
    default: () => ({ data: { tasks: [] } })
  }
})

const emit = defineEmits(['updateGraphData'])

// Component state
const loading = ref(true)
const tasks = ref([])
const selectedTaskId = ref(null)

// Extract tasks from block data
const extractTasks = () => {
  if (!props.block || !props.block.data || !props.block.data.tasks) {
    console.warn('No tasks data available in block:', props.block)
    tasks.value = []
    loading.value = false
    return
  }

  tasks.value = props.block.data.tasks.map(task => ({
    id: task.id,
    title: task.title,
    status: task.status,
    actorType: task.actorType,
    description: task.description,
    dependencies: task.dependencies
  }))
  
  console.log('Extracted tasks:', tasks.value)
  loading.value = false
}

// Handle node click events
const handleNodeClick = (nodeId) => {
  console.log('Node clicked:', nodeId)
  selectedTaskId.value = nodeId
  emit('updateGraphData', { selectedTaskId: nodeId })
}

// Watch for changes in block data
watch(() => props.block?.data?.tasks, () => {
  console.log('Block data changed, extracting tasks...')
  extractTasks()
}, { deep: true, immediate: true })

// Initialize component
onMounted(() => {
  console.log('TaskGraph mounted, extracting tasks...')
  extractTasks()
})
</script>

<style scoped>
/* Component styles moved to task-graph/TaskGraph.vue */
</style> 