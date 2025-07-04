<template>
  <!-- Global split creation zone - only shows when dragging -->
  <div
    v-if="layoutStore.draggedTab"
    class="flex items-center justify-center gap-4 bg-muted/20 border-b px-4 py-2"
  >
    <p class="text-sm text-muted-foreground">Create new split:</p>
    
    <div
      class="h-8 w-24 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary/70 hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer"
      @dragover.prevent="handleSplitDragOver"
      @dragleave="handleSplitDragLeave"
      @drop.prevent="handleSplitDrop('horizontal')"
      :class="{ 'bg-primary/10 border-primary': splitDropZone === 'horizontal' }"
      title="Drop to split horizontally"
    >
      Split Right →
    </div>
    
    <div
      class="h-8 w-24 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary/70 hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer"
      @dragover.prevent="handleSplitDragOver"
      @dragleave="handleSplitDragLeave"
      @drop.prevent="handleSplitDrop('vertical')"
      :class="{ 'bg-primary/10 border-primary': splitDropZone === 'vertical' }"
      title="Drop to split vertically"
    >
      Split Down ↓
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/layoutStore'
import { ref } from 'vue'
import { logger } from '@/services/logger'

const layoutStore = useLayoutStore()

// Drag and drop state
const splitDropZone = ref<'horizontal' | 'vertical' | null>(null)



// Split drop zone handlers
const handleSplitDragOver = (event: DragEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  
  splitDropZone.value = event.clientX < centerX ? 'horizontal' : 'vertical'
}

const handleSplitDragLeave = () => {
  splitDropZone.value = null
}

const handleSplitDrop = (direction: 'horizontal' | 'vertical') => {
  const sourceTabId = layoutStore.draggedTab
  if (!sourceTabId) return
  
  // Find or create a pane for the split
  const activePaneId = layoutStore.activePane
  if (activePaneId) {
    const newPaneId = layoutStore.splitPane(activePaneId, direction, sourceTabId)
    if (newPaneId) {
      logger.debug('Created split pane', { direction, sourceTabId, newPaneId })
    }
  } else {
    // No active pane, just open in the first pane
    layoutStore.openNotaInPane(sourceTabId)
  }
  
  // Clear drag state
  layoutStore.setDraggedTab(null)
  splitDropZone.value = null
}


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








