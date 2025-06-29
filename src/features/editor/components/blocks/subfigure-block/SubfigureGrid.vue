<template>
  <div
    class="grid gap-6"
    :class="{
      'grid-cols-1': layout === 'vertical',
      'horizontal-layout': layout === 'horizontal',
      'grid-layout': layout === 'grid'
    }"
    :style="gridStyle"
  >
    <SubfigureItem
      v-for="(subfig, index) in subfigures"
      :key="index"
      :subfigure="subfig"
      :index="index"
      :default-label="getSubfigureLabel(index)"
      :object-fit="objectFit"
      :unified-size="unifiedSize"
      :is-locked="isLocked"
      :is-read-only="isReadOnly"
      :total-subfigures="subfigures.length"
      @update:subfigure="(updatedSubfig) => updateSubfigure(index, updatedSubfig)"
      @remove="() => removeSubfigure(index)"
      @unlock="$emit('unlock')"
      @add-multiple-subfigures="addMultipleSubfigures"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubfigureItem from './SubfigureItem.vue'

type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
type LayoutType = 'horizontal' | 'vertical' | 'grid'

interface SubfigureData {
  src: string
  caption: string
}

const props = defineProps<{
  subfigures: SubfigureData[]
  layout: LayoutType
  objectFit: ObjectFitType
  unifiedSize: boolean
  isLocked: boolean
  isReadOnly: boolean
  mainLabel: string
  gridColumns: number
}>()

const emit = defineEmits<{
  'update:subfigures': [value: SubfigureData[]]
  'unlock': []
}>()

// Memoize subfigure labels to prevent recalculation
const subfigureLabels = new Map<number, string>()

// Compute grid style based on layout and columns
const gridStyle = computed(() => {
  if (props.layout === 'grid') {
    return {
      gridTemplateColumns: `repeat(${props.gridColumns}, 1fr)`
    }
  }
  return {}
})

// Helper methods
const getSubfigureLabel = (index: number) => {
  // Return cached label if available
  if (subfigureLabels.has(index)) {
    return subfigureLabels.get(index)!
  }
  
  // Handle null or undefined mainLabel
  if (!props.mainLabel) {
    const label = `Figure X${String.fromCharCode(97 + index)}`
    subfigureLabels.set(index, label)
    return label
  }
  
  // Extract the figure number from the main label if it exists and matches the pattern
  const mainFigureMatch = props.mainLabel.match(/^Figure (\d+)$/)
  const mainFigureNumber = mainFigureMatch?.[1]
  
  const label = mainFigureNumber
    ? `Figure ${mainFigureNumber}${String.fromCharCode(97 + index)}`
    : `${props.mainLabel}${String.fromCharCode(97 + index)}`
  
  // Cache the label
  subfigureLabels.set(index, label)
  return label
}

// Update methods
const updateSubfigure = (index: number, updatedSubfig: SubfigureData) => {
  // Only emit if the subfigure actually changed
  if (JSON.stringify(props.subfigures[index]) !== JSON.stringify(updatedSubfig)) {
    const newSubfigures = [...props.subfigures]
    newSubfigures[index] = updatedSubfig
    emit('update:subfigures', newSubfigures)
  }
}

const removeSubfigure = (index: number) => {
  const newSubfigures = [...props.subfigures]
  newSubfigures.splice(index, 1)
  emit('update:subfigures', newSubfigures)
  // Clear cached labels for all subfigures after the removed one
  for (let i = index; i < subfigureLabels.size; i++) {
    subfigureLabels.delete(i)
  }
}

// Handle multiple files uploaded at once
const addMultipleSubfigures = async (files: File[]) => {
  if (files.length === 0) return
  
  // Create a queue of files to process
  const newSubfigures: SubfigureData[] = await Promise.all(
    files.map(async (file) => {
      return new Promise<SubfigureData>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            src: e.target?.result as string,
            caption: ''
          })
        }
        reader.readAsDataURL(file)
      })
    })
  )
  
  // Add all new subfigures to the existing ones
  const updatedSubfigures = [...props.subfigures, ...newSubfigures]
  emit('update:subfigures', updatedSubfigures)
}
</script>

<style scoped>
.horizontal-layout {
  grid-template-columns: 1fr;
}

.grid-layout {
  grid-auto-rows: minmax(200px, auto);
  grid-gap: 1.5rem;
}

@media (min-width: 768px) {
  .horizontal-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .grid-layout {
    grid-template-columns: 1fr !important;
  }
}
</style> 








