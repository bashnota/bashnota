<template>
  <div class="w-full mb-4">
    <h3 class="text-sm font-medium mb-2">Your Vibe Agents</h3>
    <div class="saved-boards-list">
      <div 
        v-for="board in props.boards" 
        :key="board.id" 
        class="saved-board-item"
        @click="emit('select-board', board.id)"
      >
        <div class="flex items-center gap-2">
          <Zap class="h-4 w-4 text-primary" />
          <span class="truncate">{{ board.title || 'Untitled Agent' }}</span>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ formatDate(board.createdAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Zap } from 'lucide-vue-next'
import type { TaskBoard } from '@/types/vibe'

const props = defineProps<{
  boards: TaskBoard[]
}>()

const emit = defineEmits<{
  'select-board': [boardId: string]
}>()

// Format dates helper function
function formatDate(date: string | Date) {
  if (!date) return ''
  
  // Handle string dates
  if (typeof date === 'string') {
    date = new Date(date)
  }
  
  // If date is invalid, return empty string
  if (isNaN(date.getTime())) {
    return ''
  }
  
  // If date is today, return time
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // If date is yesterday, return "Yesterday"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  
  // Otherwise return date
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric' 
  })
}
</script>

<style scoped>
.saved-boards-list {
  max-height: 300px;
  overflow-y: auto;
  width: 100%;
}

.saved-board-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.2s ease;
}

.saved-board-item:hover {
  background-color: hsl(var(--accent));
}
</style> 