<template>
  <div 
    class="flex items-center justify-between space-x-1 bg-muted/20 border-b px-1 py-1 no-scrollbar max-h-12 min-h-[3rem]"
  >
    <!-- Tabs Container -->
    <div class="flex items-center space-x-1 overflow-x-auto no-scrollbar">
      <div
        v-for="tabData in paneTabsData"
        :key="tabData.id"
        :class="[
          'flex items-center py-1 px-3 text-sm rounded-md cursor-pointer transition-colors whitespace-nowrap h-8 min-w-0 max-w-[200px]',
          pane.notaId === tabData.id 
            ? 'bg-background text-foreground font-medium shadow-sm' 
            : 'hover:bg-background/80 text-muted-foreground',
          isDragging && draggedTabId === tabData.id ? 'opacity-50' : '',
          canDrop && tabData.id !== draggedTabId ? 'ring-2 ring-primary/50' : ''
        ]"
        :draggable="true"
        @click="handleTabClick(tabData.id)"
        @dragstart="handleDragStart($event, tabData.id)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, tabData.id)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, tabData.id)"
      >
        <span class="truncate flex-1 min-w-0">{{ tabData.title }}</span>
        <span 
          v-if="tabData.isDirty" 
          class="ml-1 text-primary-foreground text-xs"
        >*</span>
        <button
          class="ml-2 w-5 h-5 rounded-sm flex items-center justify-center hover:bg-muted transition-colors"
          @click.stop="handleCloseTab(tabData.id)"
          aria-label="Close tab"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Pane Actions -->
    <div class="flex items-center gap-1 pr-2">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        @click.stop="$emit('splitHorizontal')"
        title="Split Right"
      >
        <SplitSquareHorizontal class="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        @click.stop="$emit('splitVertical')"
        title="Split Down"
      >
        <SplitSquareVertical class="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-7 w-7 p-0"
        @click.stop="$emit('closePane')"
        title="Close Pane"
      >
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useLayoutStore, type Pane } from '@/stores/layoutStore'
import { logger } from '@/services/logger'
import { Button } from '@/ui/button'

const props = defineProps<{
  pane: Pane
}>()

const emit = defineEmits(['splitHorizontal', 'splitVertical', 'closePane'])

const notaStore = useNotaStore()
const layoutStore = useLayoutStore()

// Drag and drop state
const isDragging = ref(false)
const draggedTabId = ref<string | null>(null)
const canDrop = ref(false)

// Computed properties
const paneTabsData = computed(() => {
  // Handle cases where tabHistory doesn't exist (backwards compatibility)
  const tabHistory = props.pane.tabHistory || []
  return tabHistory.map(notaId => {
    const nota = notaStore.getItem(notaId)
    return {
      id: notaId,
      title: nota?.title || 'Untitled',
      isDirty: false // TODO: Track dirty state per nota
    }
  })
})

// Handlers
const handleTabClick = (notaId: string) => {
  if (!isDragging.value) {
    layoutStore.switchToTabInPane(props.pane.id, notaId)
  }
}

const handleCloseTab = (notaId: string) => {
  layoutStore.closeTabInPane(props.pane.id, notaId)
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
  
  logger.debug('Started dragging pane tab', tabId)
}

const handleDragEnd = () => {
  isDragging.value = false
  draggedTabId.value = null
  canDrop.value = false
  layoutStore.setDraggedTab(null)
  
  logger.debug('Ended dragging pane tab')
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
  
  // Find which pane the source tab is in
  const sourcePaneId = layoutStore.panes.find(p => (p.tabHistory || []).includes(sourceTabId))?.id
  
  if (sourcePaneId && sourcePaneId !== props.pane.id) {
    // Move tab between panes
    layoutStore.closeTabInPane(sourcePaneId, sourceTabId)
    layoutStore.switchToTabInPane(props.pane.id, sourceTabId)
  } else {
    // Reorder tabs within the same pane (TODO: implement tab reordering)
    logger.debug('Tab reordering within same pane not implemented yet')
  }
  
  handleDragEnd()
  logger.debug('Dropped pane tab', { sourceTabId, targetTabId })
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