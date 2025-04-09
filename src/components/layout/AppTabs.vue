<template>
  <div
    class="flex items-center space-x-1 overflow-x-auto bg-muted/20 border-b px-1 py-1 no-scrollbar"
    v-if="tabsStore.tabs.length > 0"
  >
    <div
      v-for="tab in tabsStore.tabs"
      :key="tab.id"
      :class="[
        'flex items-center py-1 px-3 text-sm rounded-md cursor-pointer transition-colors whitespace-nowrap',
        tabsStore.activeTabId === tab.id 
          ? 'bg-background text-foreground font-medium shadow-sm' 
          : 'hover:bg-background/80 text-muted-foreground'
      ]"
      @click="tabsStore.setActiveTab(tab.id)"
    >
      <span class="truncate max-w-[150px]">{{ tab.title }}</span>
      <span 
        v-if="tab.isDirty" 
        class="ml-1 text-primary-foreground text-xs"
      >*</span>
      <button
        class="ml-2 w-5 h-5 rounded-sm flex items-center justify-center hover:bg-muted transition-colors"
        @click.stop="tabsStore.closeTab(tab.id)"
        aria-label="Close tab"
      >
        <X class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabsStore'
import { onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { logger } from '@/services/logger'

const tabsStore = useTabsStore()
const route = useRoute()

// Sync route changes with tabs
watch(
  () => route,
  (newRoute) => {
    // We only want to track nota routes in tabs
    if (newRoute.name === 'nota') {
      const notaId = newRoute.params.id as string
      
      logger.debug('Route changed to nota', notaId)
      
      // Open or switch to tab without closing others
      tabsStore.openTab({
        id: notaId,
        route: {
          name: 'nota',
          params: { id: notaId }
        }
      })
    }
  },
  { immediate: true, deep: true }
)

// Clean up when component is unmounted
onBeforeUnmount(() => {
  logger.debug('AppTabs component unmounting')
})
</script>

<style scoped>
/* Hide scrollbar */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}

.no-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style> 