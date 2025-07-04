<template>
  <div
    class="flex items-center space-x-1 overflow-x-auto overflow-y-hidden bg-muted/20 border-b px-1 py-1 no-scrollbar max-h-12 min-h-[3rem]"
    v-if="tabsStore.tabs.length > 0"
  >
    <div
      v-for="tab in tabsStore.tabs"
      :key="tab.id"
      :class="[
        'flex items-center py-1 px-3 text-sm rounded-md cursor-pointer transition-colors whitespace-nowrap h-8 min-w-0 max-w-[200px]',
        tabsStore.activeTabId === tab.id 
          ? 'bg-background text-foreground font-medium shadow-sm' 
          : 'hover:bg-background/80 text-muted-foreground',
        isDragging && draggedTabId === tab.id ? 'opacity-50' : '',
        canDrop && tab.id !== draggedTabId ? 'ring-2 ring-primary/50' : ''
      ]"
      :draggable="true"
      @click="handleTabClick(tab.id)"
      @dragstart="handleDragStart($event, tab.id)"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver($event, tab.id)"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop($event, tab.id)"
    >
      <span class="truncate flex-1 min-w-0">{{ tab.title }}</span>
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
    
    <!-- Drop zone for creating new splits -->
    <div
      v-if="isDragging"
      class="flex items-center gap-1 px-2"
    >
      <div
        class="h-8 w-16 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary/70 hover:border-primary hover:bg-primary/10 transition-colors"
        @dragover.prevent="handleSplitDragOver"
        @dragleave="handleSplitDragLeave"
        @drop.prevent="handleSplitDrop('horizontal')"
        :class="{ 'bg-primary/10 border-primary': splitDropZone === 'horizontal' }"
        title="Drop to split horizontally"
      >
        Split →
      </div>
      <div
        class="h-8 w-16 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center text-xs text-primary/70 hover:border-primary hover:bg-primary/10 transition-colors"
        @dragover.prevent="handleSplitDragOver"
        @dragleave="handleSplitDragLeave"
        @drop.prevent="handleSplitDrop('vertical')"
        :class="{ 'bg-primary/10 border-primary': splitDropZone === 'vertical' }"
        title="Drop to split vertically"
      >
        Split ↓
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabsStore'
import { useLayoutStore } from '@/stores/layoutStore'
import { onBeforeUnmount, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { logger } from '@/services/logger'

const tabsStore = useTabsStore()
const layoutStore = useLayoutStore()
const route = useRoute()

// Drag and drop state
const isDragging = ref(false)
const draggedTabId = ref<string | null>(null)
const canDrop = ref(false)
const splitDropZone = ref<'horizontal' | 'vertical' | null>(null)

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

// Tab click handler
const handleTabClick = (tabId: string) => {
  if (!isDragging.value) {
    tabsStore.setActiveTab(tabId)
    
    // Also focus the pane that contains this nota
    const pane = layoutStore.getPaneByNotaId(tabId)
    if (pane) {
      layoutStore.setActivePane(pane.id)
    } else {
      // If nota is not in any pane, open it in the active pane
      layoutStore.openNotaInPane(tabId)
    }
  }
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent, tabId: string) => {
  isDragging.value = true
  draggedTabId.value = tabId
  layoutStore.setDraggedTab(tabId)
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tabId)
  }
  
  logger.debug('Started dragging tab', tabId)
}

const handleDragEnd = () => {
  isDragging.value = false
  draggedTabId.value = null
  canDrop.value = false
  splitDropZone.value = null
  layoutStore.setDraggedTab(null)
  
  logger.debug('Ended dragging tab')
}

const handleDragOver = (event: DragEvent, tabId: string) => {
  if (draggedTabId.value && draggedTabId.value !== tabId) {
    canDrop.value = true
  }
}

const handleDragLeave = () => {
  canDrop.value = false
}

const handleDrop = (event: DragEvent, targetTabId: string) => {
  const sourceTabId = draggedTabId.value
  if (!sourceTabId || sourceTabId === targetTabId) return
  
  // Find existing panes for both tabs
  const sourcePaneId = layoutStore.getPaneByNotaId(sourceTabId)?.id
  const targetPaneId = layoutStore.getPaneByNotaId(targetTabId)?.id
  
  if (sourcePaneId && targetPaneId && sourcePaneId !== targetPaneId) {
    // Move nota between existing panes
    layoutStore.moveNotaBetweenPanes(sourceTabId, sourcePaneId, targetPaneId)
  } else if (targetPaneId) {
    // Open source nota in the same pane as target (replacing target)
    layoutStore.openNotaInPane(sourceTabId, targetPaneId)
  }
  
  handleDragEnd()
  logger.debug('Dropped tab on another tab', { sourceTabId, targetTabId })
}

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
  const sourceTabId = draggedTabId.value
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
  
  handleDragEnd()
}

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








