<template>
  <div
    class="grid gap-6"
    :class="{
      'grid-cols-1': layout === 'vertical',
      'grid-cols-2 md:grid-cols-3': layout === 'grid',
      'grid-cols-1 md:grid-cols-2': layout === 'horizontal',
    }"
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
}>()

const emit = defineEmits<{
  'update:subfigures': [value: SubfigureData[]]
  'unlock': []
}>()

// Helper methods
const getSubfigureLabel = (index: number) => {
  return `${props.mainLabel || 'Figure X'}${String.fromCharCode(97 + index)}`
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
</script> 