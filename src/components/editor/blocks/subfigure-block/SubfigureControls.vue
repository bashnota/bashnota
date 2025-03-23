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

      <!-- Grid Columns Control - only visible when grid layout is selected -->
      <div v-if="modelValue.layout === 'grid'" class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Columns:</span>
        <Select
          :model-value="modelValue.gridColumns.toString()"
          @update:model-value="updateGridColumns"
          class="w-20"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="n in 4" :key="n" :value="n.toString()">{{ n }}</SelectItem>
          </SelectContent>
        </Select>
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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  emit('update:modelValue', { ...props.modelValue, layout })
}

const updateUnifiedSize = (value: boolean) => {
  emit('update:modelValue', { ...props.modelValue, unifiedSize: value })
}

const updateGridColumns = (value: string) => {
  emit('update:modelValue', { 
    ...props.modelValue, 
    gridColumns: parseInt(value) 
  })
}

const toggleLock = () => {
  emit('update:modelValue', { 
    ...props.modelValue, 
    isLocked: !props.modelValue.isLocked 
  })
}
</script> 