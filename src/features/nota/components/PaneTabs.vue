<template>
  <div class="flex min-h-11 items-center border-b bg-muted/15 px-2">
    <!-- Tabs Container -->
    <div class="flex min-w-0 flex-1 items-stretch overflow-x-auto no-scrollbar" role="tablist" aria-label="Open notas">
      <div
        v-for="tabData in paneTabsData"
        :key="tabData.id"
        :class="[
          'group relative flex h-10 min-w-[8rem] max-w-[13rem] cursor-pointer items-center border-b-2 px-3 text-sm transition-colors whitespace-nowrap',
          pane.notaId === tabData.id 
            ? 'border-primary bg-background/70 text-foreground font-medium'
            : 'border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground',
          isDragging && draggedTabId === tabData.id ? 'opacity-50' : '',
          canDrop && tabData.id !== draggedTabId ? 'ring-2 ring-primary/50' : ''
        ]"
        :draggable="true"
        @dragstart="handleDragStart($event, tabData.id)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, tabData.id)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, tabData.id)"
      >
        <button
          type="button"
          role="tab"
          class="flex min-w-0 flex-1 items-center self-stretch text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          :aria-selected="pane.notaId === tabData.id"
          :tabindex="pane.notaId === tabData.id ? 0 : -1"
          @click="handleTabClick(tabData.id)"
        >
          <span class="min-w-0 flex-1 truncate">{{ tabData.title }}</span>
        </button>
        <span 
          v-if="tabData.isDirty" 
          class="ml-1 text-primary-foreground text-xs"
        >*</span>
        <button
          class="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-60 transition-colors hover:bg-muted hover:opacity-100 focus-visible:opacity-100"
          @click.stop="handleCloseTab(tabData.id)"
          :aria-label="`Close ${tabData.title}`"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Document and pane management stay available without dominating the bar. -->
    <div class="ml-2 flex shrink-0 items-center gap-1 border-l pl-2">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="h-8 gap-1.5 px-2" aria-label="Open notas menu">
            <Files class="h-4 w-4" />
            <span class="text-xs tabular-nums">{{ paneTabsData.length }}</span>
            <ChevronDown class="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-72">
          <DropdownMenuLabel class="flex items-center justify-between">
            <span>Open notas</span>
            <span class="font-normal text-muted-foreground">{{ paneTabsData.length }}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="tabData in paneTabsData"
            :key="tabData.id"
            class="min-w-0"
            @select="handleTabClick(tabData.id)"
          >
            <Check :class="['h-4 w-4', pane.notaId === tabData.id ? 'opacity-100' : 'opacity-0']" />
            <span class="truncate">{{ tabData.title }}</span>
          </DropdownMenuItem>
          <template v-if="paneTabsData.length > 1">
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="handleCloseOtherTabs">
              <PanelTopClose class="h-4 w-4" />
              Close other notas
            </DropdownMenuItem>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8" aria-label="Pane options">
            <Ellipsis class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel>Pane layout</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="emit('splitHorizontal')">
            <SplitSquareHorizontal class="h-4 w-4" />
            Split right
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('splitVertical')">
            <SplitSquareVertical class="h-4 w-4" />
            Split down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem :disabled="layoutStore.panes.length === 1" @select="emit('closePane')">
            <X class="h-4 w-4" />
            Close pane
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronDown, Ellipsis, Files, PanelTopClose, SplitSquareHorizontal, SplitSquareVertical, X } from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useLayoutStore, type Pane } from '@/stores/layoutStore'
import { logger } from '@/services/logger'
import { useNotaNavigation } from '@/features/nota/composables/useNotaNavigation'
import { toast } from '@/services/toast'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  pane: Pane
}>()

const emit = defineEmits(['splitHorizontal', 'splitVertical', 'closePane'])

const notaStore = useNotaStore()
const layoutStore = useLayoutStore()
const { openNota } = useNotaNavigation()

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
const handleTabClick = async (notaId: string) => {
  if (!isDragging.value) {
    try {
      await openNota(notaId, props.pane.id)
    } catch (error) {
      toast.error('Unable to switch nota', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }
}

const handleCloseTab = (notaId: string) => {
  layoutStore.closeTabInPane(props.pane.id, notaId)
}

const handleCloseOtherTabs = () => {
  const activeNotaId = props.pane.notaId
  if (!activeNotaId) return

  for (const tab of paneTabsData.value) {
    if (tab.id !== activeNotaId) {
      layoutStore.closeTabInPane(props.pane.id, tab.id)
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
