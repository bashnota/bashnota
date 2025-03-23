<template>
  <div
    class="grid gap-6"
    :class="{
      'grid-cols-1': layout === 'vertical',
      'horizontal-layout': layout === 'horizontal'
    }"
    :style="layout === 'grid' ? { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` } : {}"
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
  gridColumns?: number
}>()

const emit = defineEmits<{
  'update:subfigures': [value: SubfigureData[]]
  'unlock': []
}>()

// Generate the appropriate class for grid columns
const gridColumns = computed(() => {
  return props.gridColumns || 2
})

// Helper methods
const getSubfigureLabel = (index: number) => {
  // Handle null or undefined mainLabel
  if (!props.mainLabel) {
    return `Figure X${String.fromCharCode(97 + index)}`;
  }
  
  // Extract the figure number from the main label if it exists and matches the pattern
  const mainFigureMatch = props.mainLabel.match(/^Figure (\d+)$/);
  const mainFigureNumber = mainFigureMatch?.[1];
  
  if (mainFigureNumber) {
    // If we have a main figure number, create subfigure label with the letter suffix
    // Example: "Figure 1a", "Figure 1b", etc.
    return `Figure ${mainFigureNumber}${String.fromCharCode(97 + index)}`;
  } else {
    // If there's a custom main label but no extractable number, append the letter
    return `${props.mainLabel}${String.fromCharCode(97 + index)}`;
  }
}

// Update methods
const updateSubfigure = (index: number, updatedSubfig: SubfigureData) => {
  const newSubfigures = [...props.subfigures]
  newSubfigures[index] = updatedSubfig
  emit('update:subfigures', newSubfigures)
}

const removeSubfigure = (index: number) => {
  const newSubfigures = [...props.subfigures]
  newSubfigures.splice(index, 1)
  emit('update:subfigures', newSubfigures)
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

@media (min-width: 768px) {
  .horizontal-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style> 