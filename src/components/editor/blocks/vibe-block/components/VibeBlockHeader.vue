<template>
  <div class="vibe-header" @click="$emit('toggle-expand')">
    <div class="vibe-title">
      <Zap class="h-4 w-4 mr-2" :class="{ 'text-primary': isActive }" />
      <span v-if="!isActive">Vibe Assistant</span>
      <span v-else>{{ query }}</span>
    </div>
    <div class="vibe-status">
      <Loader v-if="isLoading" class="h-4 w-4 animate-spin" />
      <CheckCircle v-else-if="hasCompletedTasks" class="h-4 w-4 text-success" />
      <AlertCircle v-else-if="error" class="h-4 w-4 text-destructive" />
      <CircleEllipsis v-else-if="isActive" class="h-4 w-4 text-primary" />
    </div>
    <div class="vibe-expand-icon">
      <ChevronDown v-if="isExpanded" class="h-4 w-4" />
      <ChevronRight v-else class="h-4 w-4" />
    </div>
  </div>
</template>

<script setup>
import { Zap, Loader, CheckCircle, AlertCircle, ChevronDown, ChevronRight, CircleEllipsis } from 'lucide-vue-next'

defineProps({
  isActive: {
    type: Boolean,
    default: false
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  query: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  hasCompletedTasks: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-expand'])
</script>

<style scoped>
.vibe-header {
  @apply flex p-3 cursor-pointer items-center bg-muted/20 border-b;
}

.vibe-title {
  @apply flex-1 font-medium flex items-center;
}

.vibe-status {
  @apply mr-2 flex items-center;
}
</style> 