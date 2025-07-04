<template>
  <div class="split-view-container w-full h-full" ref="gridRef" :style="gridStyle">
    <!-- 1 Pane Layout -->
    <template v-if="layoutStore.panes.length === 1">
      <NotaPane :pane="layoutStore.panes[0]" />
    </template>

    <!-- 2 Panes Layout (Horizontal Split) -->
    <template v-if="layoutStore.panes.length === 2">
      <NotaPane :pane="layoutStore.panes[0]" style="grid-column: 1; grid-row: 1" />
      <div class="gutter-col" data-track="1" style="grid-column: 2; grid-row: 1"></div>
      <NotaPane :pane="layoutStore.panes[1]" style="grid-column: 3; grid-row: 1" />
    </template>

    <!-- 3 Panes Layout (1 Left, 2 Right) -->
    <template v-if="layoutStore.panes.length === 3">
      <NotaPane :pane="layoutStore.panes[0]" style="grid-column: 1; grid-row: 1 / span 3" />
      <div class="gutter-col" data-track="1" style="grid-column: 2; grid-row: 1 / span 3"></div>
      <NotaPane :pane="layoutStore.panes[1]" style="grid-column: 3; grid-row: 1" />
      <div class="gutter-row" data-track="1" style="grid-column: 3; grid-row: 2"></div>
      <NotaPane :pane="layoutStore.panes[2]" style="grid-column: 3; grid-row: 3" />
    </template>
    
    <!-- 4+ Panes Layout (Grid) -->
    <template v-if="layoutStore.panes.length >= 4">
      <!-- Panes -->
      <template v-for="(pane, index) in layoutStore.panes" :key="pane.id">
        <NotaPane :pane="pane" :style="getPaneStyle(index)" />
      </template>
      
      <!-- Gutters -->
      <template v-for="i in Math.ceil(Math.sqrt(layoutStore.panes.length)) - 1" :key="`col-gutter-${i}`">
        <div class="gutter-col" :data-track="i * 2 - 1" :style="{ 'grid-column': i * 2, 'grid-row': '1 / -1' }"></div>
      </template>
      <template v-for="i in Math.ceil(layoutStore.panes.length / Math.ceil(Math.sqrt(layoutStore.panes.length))) - 1" :key="`row-gutter-${i}`">
        <div class="gutter-row" :data-track="i * 2 - 1" :style="{ 'grid-row': i * 2, 'grid-column': '1 / -1' }"></div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useLayoutStore } from '@/stores/layoutStore'
import NotaPane from './NotaPane.vue'
import Split from 'split-grid'
import { logger } from '@/services/logger'

// Manually define types if they are not exported correctly
type SplitInstance = ReturnType<typeof Split>
interface Gutter {
    track: number;
    element: HTMLElement;
}

const layoutStore = useLayoutStore()
const gridRef = ref<HTMLElement | null>(null)
let splitInstance: SplitInstance | null = null

const GutterSize = '7px'

// Computed property to define the grid layout based on pane count
const gridStyle = computed(() => {
  const count = layoutStore.panes.length
  if (count <= 1) return { display: 'grid', 'grid-template-columns': '1fr', 'grid-template-rows': '1fr' }
  
  // For 2 panes, it's a simple horizontal split
  if (count === 2) {
    return {
      display: 'grid',
      'grid-template-columns': `1fr ${GutterSize} 1fr`,
      'grid-template-rows': '1fr',
    }
  }
  
  // For 3 panes, special layout: 1 on left, 2 stacked on right
  if (count === 3) {
    return {
      display: 'grid',
      'grid-template-columns': `1fr ${GutterSize} 1fr`,
      'grid-template-rows': `1fr ${GutterSize} 1fr`,
    }
  }
  
  // For 4 or more panes, create a square-ish grid
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const colDef = Array(cols).fill('1fr').join(` ${GutterSize} `)
  const rowDef = Array(rows).fill('1fr').join(` ${GutterSize} `)
  
  return {
    display: 'grid',
    'grid-template-columns': colDef,
    'grid-template-rows': rowDef,
  }
})

// Function to calculate grid position for a pane (for 4+ panes layout)
const getPaneStyle = (index: number) => {
  const count = layoutStore.panes.length
  if (count < 4) return {}
  
  const cols = Math.ceil(Math.sqrt(count))
  const rowIndex = Math.floor(index / cols)
  const colIndex = index % cols
  
  return {
    'grid-row': rowIndex * 2 + 1,
    'grid-column': colIndex * 2 + 1,
  }
}

// Re-initialize split grid when layout changes
const initSplit = () => {
  if (splitInstance) {
    splitInstance.destroy()
    splitInstance = null
  }

  if (!gridRef.value || layoutStore.panes.length <= 1) return

  const columnGutters: Gutter[] = []
  const rowGutters: Gutter[] = []

  // Query all gutter elements from the DOM
  const colGutterElements = gridRef.value.querySelectorAll<HTMLElement>('.gutter-col')
  const rowGutterElements = gridRef.value.querySelectorAll<HTMLElement>('.gutter-row')

  colGutterElements.forEach(el => {
    const track = parseInt(el.dataset.track || '0', 10)
    if (track > 0) columnGutters.push({ track, element: el })
  })

  rowGutterElements.forEach(el => {
    const track = parseInt(el.dataset.track || '0', 10)
    if (track > 0) rowGutters.push({ track, element: el })
  })

  if (columnGutters.length > 0 || rowGutters.length > 0) {
    logger.debug('Initializing split-grid', { columnGutters, rowGutters })
    splitInstance = Split({
      columnGutters,
      rowGutters,
      minSize: 150, // Minimum pane size in pixels
    })
  }
}

// Lifecycle hooks
onMounted(() => {
  nextTick(initSplit)
})

onUnmounted(() => {
  if (splitInstance) {
    splitInstance.destroy()
  }
})

// Watch for changes in pane count to re-initialize the grid
watch(() => layoutStore.panes.length, () => {
  // Wait for DOM to update
  nextTick(initSplit)
})
</script>

<style>
.gutter-col {
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s ease;
}
.gutter-row {
  cursor: row-resize;
  background-color: transparent;
  transition: background-color 0.2s ease;
}
.gutter-col:hover, .gutter-row:hover, .dragger {
  background-color: hsl(var(--primary));
  opacity: 0.8;
}
</style> 