<template>
  <div class="server-info space-y-2">
    <!-- Server URL and Status -->
    <div class="flex justify-between items-start text-xs">
      <div class="flex-1 min-w-0">
        <span class="text-muted-foreground">URL:</span>
        <span class="ml-1 font-mono">{{ serverUrl }}</span>
      </div>
      
      <div v-if="lastUpdated" class="text-muted-foreground whitespace-nowrap ml-2">
        Last updated: {{ formatTimeAgo(lastUpdated) }}
      </div>
    </div>

    <!-- Connection Status Message -->
    <div
      v-if="testResult"
      class="text-xs p-2 rounded-md border"
      :class="statusClasses"
    >
      <div class="flex items-center gap-2">
        <div 
          class="w-2 h-2 rounded-full"
          :class="statusIndicatorClass"
        ></div>
        <span>{{ testResult.message }}</span>
      </div>
    </div>

    <!-- Server Details -->
    <div v-if="server.name" class="text-xs text-muted-foreground">
      <span class="font-medium">Name:</span> {{ server.name }}
    </div>
    
    <div v-if="server.token" class="text-xs text-muted-foreground">
      <span class="font-medium">Token:</span> 
      <span class="font-mono">{{ maskedToken }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JupyterServer } from '@/types/jupyter'

interface Props {
  server: JupyterServer
  testResult?: { success: boolean; message: string }
  lastUpdated?: Date
}

const props = defineProps<Props>()

// Computed properties
const serverUrl = computed(() => `${props.server.ip}:${props.server.port}`)

const maskedToken = computed(() => {
  if (!props.server.token) return 'None'
  if (props.server.token.length <= 8) return '••••••••'
  return props.server.token.slice(0, 4) + '••••' + props.server.token.slice(-4)
})

const statusClasses = computed(() => ({
  'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300': 
    props.testResult?.success,
  'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300': 
    props.testResult && !props.testResult.success,
}))

const statusIndicatorClass = computed(() => ({
  'bg-green-500': props.testResult?.success,
  'bg-red-500': props.testResult && !props.testResult.success,
}))

// Utility functions
const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
}
</script>

<style scoped>
.server-info {
  @apply text-sm;
}
</style> 