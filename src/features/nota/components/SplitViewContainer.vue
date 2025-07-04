<template>
  <div 
    class="h-full w-full overflow-hidden"
    :style="gridStyles"
  >
    <NotaPane
      v-for="pane in layoutStore.panes"
      :key="pane.id"
      :pane="pane"
      :style="getPaneStyles(pane)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLayoutStore } from '@/stores/layoutStore'
import NotaPane from './NotaPane.vue'

const layoutStore = useLayoutStore()

// Calculate grid layout based on panes
const gridStyles = computed(() => {
  const paneCount = layoutStore.panes.length
  
  if (paneCount <= 1) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
      gap: '1px'
    }
  }
  
  // For 2 panes, create a horizontal split
  if (paneCount === 2) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr',
      gap: '1px'
    }
  }
  
  // For 3 panes, create a layout with one on left, two stacked on right
  if (paneCount === 3) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '1px'
    }
  }
  
  // For 4 panes, create a 2x2 grid
  if (paneCount === 4) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      gap: '1px'
    }
  }
  
  // For more than 4 panes, create a flexible grid
  const columns = Math.ceil(Math.sqrt(paneCount))
  const rows = Math.ceil(paneCount / columns)
  
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: '1px'
  }
})

// Get styles for individual panes
const getPaneStyles = (pane: any) => {
  const paneIndex = layoutStore.panes.findIndex(p => p.id === pane.id)
  const paneCount = layoutStore.panes.length
  
  // Special positioning for 3-pane layout
  if (paneCount === 3) {
    if (paneIndex === 0) {
      return {
        gridColumn: '1',
        gridRow: '1 / -1'
      }
    } else if (paneIndex === 1) {
      return {
        gridColumn: '2',
        gridRow: '1'
      }
    } else {
      return {
        gridColumn: '2',
        gridRow: '2'
      }
    }
  }
  
  // Default positioning for other layouts
  return {}
}
</script>

<style scoped>
/* Add resize handles between panes */
.grid-pane {
  position: relative;
}

.grid-pane:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border);
  cursor: col-resize;
  z-index: 10;
}

/* Add hover effect for resize handles */
.grid-pane:not(:last-child)::after:hover {
  background: var(--primary);
}
</style> 