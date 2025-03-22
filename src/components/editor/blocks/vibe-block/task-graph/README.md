# Task Graph Component

A modular Vue component for visualizing task dependencies as a graph.

## Components

- **TaskGraph.vue**: Main component that renders a task dependency graph
- **TaskNodeComponent.vue**: Component for rendering individual task nodes
- **useTaskGraph.ts**: Composable hook that handles the task graph logic
- **types.ts**: TypeScript definitions for the task graph components

## Usage

```vue
<template>
  <TaskGraph
    :tasks="tasks"
    :loading="loading"
    :selectedTaskId="selectedTaskId"
    @node-click="handleNodeClick"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TaskGraph } from './task-graph'

const tasks = ref([
  {
    id: 'task-1',
    title: 'Task 1',
    status: 'completed',
    actorType: 'RESEARCHER',
    description: 'First task description'
  },
  {
    id: 'task-2',
    title: 'Task 2',
    status: 'in_progress',
    actorType: 'CODER',
    description: 'Second task description',
    dependencies: ['task-1']
  }
])

const loading = ref(false)
const selectedTaskId = ref(null)

const handleNodeClick = (nodeId) => {
  selectedTaskId.value = nodeId
  // Handle node selection logic
}
</script>
```

## Features

- Visualizes task dependencies as a directed graph
- Supports different task statuses (pending, in_progress, completed, failed)
- Differentiates node styles based on actor type
- Animated edges for in-progress tasks
- Interactive node selection
- Debugging tools for troubleshooting
- TypeScript support for better DX

## Dependencies

- Vue 3
- @vue-flow/core
- lucide-vue-next (for icons) 