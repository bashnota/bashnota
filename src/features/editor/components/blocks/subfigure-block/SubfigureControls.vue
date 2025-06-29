<template>
  <div class="flex items-center justify-between w-full p-2 border-b">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1 bg-muted p-1 rounded-md">
        <Button
          v-for="layout in layouts"
          :key="layout"
          variant="ghost"
          size="sm"
          class="h-8 px-2"
          :class="{ 'bg-background': modelValue.layout === layout }"
          @click="updateLayout(layout)"
        >
          <component :is="layoutIcons[layout]" class="w-4 h-4" />
        </Button>
      </div>

      <!-- Column selector - only visible in grid layout -->
      <div v-if="modelValue.layout === 'grid'" class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Columns:</span>
        <div class="flex items-center gap-1 bg-muted p-1 rounded-md">
          <Button
            v-for="cols in [1, 2, 3, 4]"
            :key="cols"
            variant="ghost"
            size="sm"
            class="h-8 w-8"
            :class="{ 'bg-background': modelValue.gridColumns === cols }"
            @click="updateGridColumns(cols)"
          >
            {{ cols }}
          </Button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Switch 
          :model-value="modelValue.unifiedSize" 
          @update:model-value="updateUnifiedSize" 
        />
        <span class="text-sm text-muted-foreground">Uniform size</span>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Button @click="$emit('add-subfigure')" variant="outline" size="sm">
        <PlusIcon class="w-4 h-4 mr-2" />
        Add Subfigure
      </Button>

      <Button variant="ghost" size="icon" @click="toggleLock">
        <LockIcon v-if="modelValue.isLocked" class="h-4 w-4" />
        <UnlockIcon v-else class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  FlipHorizontalIcon,
  FlipVerticalIcon,
  LayoutGridIcon,
  PlusIcon,
  LockIcon,
  UnlockIcon,
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'

type LayoutType = 'horizontal' | 'vertical' | 'grid'

interface ControlsData {
  layout: LayoutType
  unifiedSize: boolean
  isLocked: boolean
  gridColumns: number
}

const props = defineProps<{
  modelValue: ControlsData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ControlsData]
  'add-subfigure': []
}>()

// Constants
const layouts: LayoutType[] = ['horizontal', 'vertical', 'grid']

// UI helpers
const layoutIcons = {
  horizontal: FlipHorizontalIcon,
  vertical: FlipVerticalIcon,
  grid: LayoutGridIcon,
}

// Update methods
const updateLayout = (layout: LayoutType) => {
  emit('update:modelValue', { 
    ...props.modelValue, 
    layout,
    // Reset grid columns to 2 when switching to grid layout
    gridColumns: layout === 'grid' ? props.modelValue.gridColumns || 2 : 2
  })
}

const updateGridColumns = (columns: number) => {
  emit('update:modelValue', { ...props.modelValue, gridColumns: columns })
}

const updateUnifiedSize = (value: boolean) => {
  emit('update:modelValue', { ...props.modelValue, unifiedSize: value })
}

const toggleLock = () => {
  emit('update:modelValue', { 
    ...props.modelValue, 
    isLocked: !props.modelValue.isLocked 
  })
}
</script> 








