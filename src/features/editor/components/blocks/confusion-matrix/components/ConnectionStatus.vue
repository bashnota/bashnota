<template>
  <div class="flex items-center gap-2">
    <div v-if="status === 'connected'" class="flex items-center gap-1 text-green-600">
      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
      <span class="text-xs font-medium">Connected</span>
    </div>
    <div v-else-if="status === 'connecting'" class="flex items-center gap-1 text-yellow-600">
      <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span class="text-xs font-medium">Connecting</span>
    </div>
    <div v-else class="flex items-center gap-1 text-gray-400">
      <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
      <span class="text-xs font-medium">Disconnected</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  status: 'connected' | 'connecting' | 'disconnected'
}

defineProps<Props>()
</script> 








