<template>
  <div class="plot-visualization">
    <h3 v-if="title" class="scatter-plot-title">{{ title }}</h3>
    
    <div class="plot-container-wrapper">
      <div ref="plotContainerRef" class="plot-container" @dblclick="handleDoubleClick"></div>
      <div v-if="isZoomed" class="zoom-indicator">
        <span>Zoomed In</span>
        <Button variant="ghost" size="sm" @click="resetZoom" class="reset-zoom-btn">
          <RefreshCwIcon class="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
    
    <div v-if="uniqueLabels.length > 0" class="legend">
      <div v-for="label in uniqueLabels" :key="label" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: getColorForLabel(label) }"></span>
        <span class="legend-label">{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { RefreshCwIcon } from 'lucide-vue-next'
import type { DataPoint, PlotOptions } from '../types'

interface PlotVisualizationProps {
  data: DataPoint[]
  title: string
  xAxisLabel: string
  yAxisLabel: string
  pointSize: number
  opacity: number
  isLocked: boolean
  colorMapping: Record<string, string>
  plotContainer: HTMLElement | null
  isZoomed: boolean
  getColorForLabel: (label: string) => string
  resetZoom: () => void
}

const props = withDefaults(defineProps<PlotVisualizationProps>(), {
  data: () => [],
  title: 'Scatter Plot',
  xAxisLabel: 'X Axis',
  yAxisLabel: 'Y Axis',
  pointSize: 5,
  opacity: 0.7,
  isLocked: false,
  colorMapping: () => ({})
})

const emit = defineEmits<{
  (e: 'double-click'): void
}>()

// Computed property to get unique labels
const uniqueLabels = computed(() => {
  const labels = new Set(props.data.map((d) => d.label || 'default'))
  return Array.from(labels)
})

// Local ref for the plot container
const plotContainerRef = ref<HTMLElement | null>(null)

// Expose the plot container to the parent
defineExpose({
  plotContainerRef
})

// Handle double click event
const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  emit('double-click')
}
</script>

<style scoped>
.plot-visualization {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.scatter-plot-title {
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: hsl(var(--foreground));
}

.plot-container-wrapper {
  position: relative;
}

.plot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  cursor: default;
  background: hsl(var(--muted));
  border-radius: 8px;
  padding: 1rem;
  min-height: 450px;
}

.plot-container:hover {
  cursor: pointer;
}

.zoom-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.reset-zoom-btn {
  padding: 2px 6px;
  height: auto;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
}

.legend {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  padding: 0.5rem;
  background: hsl(var(--muted));
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: hsl(var(--background));
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
}

.legend-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.mr-1 {
  margin-right: 0.25rem;
}
</style> 