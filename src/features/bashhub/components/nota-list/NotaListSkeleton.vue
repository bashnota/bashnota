<script setup lang="ts">
interface Props {
  viewType?: 'grid' | 'list' | 'compact'
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  viewType: 'list',
  count: 6
})
</script>

<template>
  <!-- Grid View Skeleton -->
  <div v-if="viewType === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="n in count"
      :key="n"
      class="border border-border/50 rounded-lg p-4 animate-pulse"
    >
      <div class="flex items-start gap-3 mb-3">
        <div class="w-8 h-8 bg-muted rounded-md flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="h-5 bg-muted rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div class="flex gap-1">
          <div class="w-8 h-8 bg-muted rounded"></div>
          <div class="w-8 h-8 bg-muted rounded"></div>
        </div>
      </div>
      <div class="flex gap-2">
        <div class="h-6 bg-muted rounded-full w-16"></div>
        <div class="h-6 bg-muted rounded-full w-12"></div>
        <div class="h-6 bg-muted rounded-full w-20"></div>
      </div>
    </div>
  </div>

  <!-- List View Skeleton -->
  <div v-else-if="viewType === 'list'" class="space-y-3">
    <div
      v-for="n in count"
      :key="n"
      class="flex items-center gap-4 p-4 rounded-lg border border-border/50 animate-pulse"
    >
      <div class="w-8 h-8 bg-muted rounded-md flex-shrink-0"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-2">
          <div class="h-5 bg-muted rounded w-1/3"></div>
          <div class="flex gap-1">
            <div class="w-8 h-8 bg-muted rounded"></div>
            <div class="w-8 h-8 bg-muted rounded"></div>
          </div>
        </div>
        <div class="h-4 bg-muted rounded w-1/4 mb-2"></div>
        <div class="flex gap-2">
          <div class="h-5 bg-muted rounded-full w-12"></div>
          <div class="h-5 bg-muted rounded-full w-16"></div>
          <div class="h-5 bg-muted rounded-full w-14"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Compact View Skeleton -->
  <div v-else class="space-y-2">
    <div
      v-for="n in count"
      :key="n"
      class="flex items-center gap-3 py-2.5 px-3 animate-pulse border-b border-border/30 last:border-b-0"
    >
      <div class="w-4 h-4 bg-muted rounded flex-shrink-0"></div>
      <div class="h-4 bg-muted rounded flex-1"></div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-muted rounded"></div>
        <div class="h-3 bg-muted rounded w-16"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style> 