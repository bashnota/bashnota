<template>
  <div
    class="custom-node actor-node"
    :class="{ 
      'status-pending': nodeData.status === 'pending',
      'status-in-progress': nodeData.status === 'in_progress',
      'status-completed': nodeData.status === 'completed',
      'status-failed': nodeData.status === 'failed',
    }"
  >
    <div class="node-header" :class="'actor-type-' + (nodeData.actorType || '').toLowerCase()">
      <div class="actor-icon" v-if="icon">
        <component :is="icon" class="h-4 w-4" />
      </div>
      <div class="actor-type">{{ nodeData.actorType }}</div>
    </div>
    <div class="node-title" :title="nodeData.title">{{ nodeData.title }}</div>
    <div class="node-status">
      <span class="status-indicator" :class="'status-' + nodeData.status"></span>
      <span class="status-text">{{ formattedStatus }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Brain, SearchCode, BarChart, FileCode, PenTool } from 'lucide-vue-next'
import { ActorType } from '@/types/vibe'
import type { TaskNodeData } from './types'

const props = defineProps<{
  nodeData: TaskNodeData
}>()

// Get icon for actor type
const icon = computed(() => {
  const actorType = props.nodeData?.actorType
  if (!actorType) return null
  
  switch (actorType) {
    case ActorType.RESEARCHER: return Brain
    case ActorType.ANALYST: return BarChart
    case ActorType.CODER: return FileCode
    case ActorType.PLANNER: return PenTool
    case ActorType.COMPOSER: return SearchCode
    default: return null
  }
})

// Format task status for display
const formattedStatus = computed(() => {
  const status = props.nodeData?.status
  if (!status) return ''
  
  switch (status) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    default: return status
  }
})
</script>

<style scoped>
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