<template>
  <div class="empty-state text-center py-4">
    <div v-if="isLoading" class="flex flex-col items-center gap-2">
      <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      <p class="text-xs text-muted-foreground">Loading kernels and sessions...</p>
    </div>
    
    <div v-else class="flex flex-col items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
        <span class="text-muted-foreground text-sm">?</span>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">No kernels or sessions available</p>
        <p class="text-[10px] text-muted-foreground mt-1">
          Try refreshing or check server connection
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})
</script>

<style scoped>
.empty-state {
  @apply min-h-[80px] flex items-center justify-center;
}
</style> 








