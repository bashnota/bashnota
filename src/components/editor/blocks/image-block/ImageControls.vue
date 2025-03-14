<template>
  <div class="flex items-center gap-1 mb-2 p-0.5 bg-muted/50 rounded-md w-fit">
    <!-- Width controls -->
    <div class="flex items-center">
      <Button
        v-for="size in sizes"
        :key="size"
        variant="ghost"
        size="sm"
        class="px-2 h-8"
        :class="{ 'bg-background': modelValue.width === size }"
        @click="updateWidth(size)"
      >
        <ImageIcon :class="sizeIconClasses[size]" />
      </Button>
    </div>

    <Separator orientation="vertical" class="mx-0.5 h-6" />

    <!-- Alignment controls -->
    <div class="flex items-center">
      <Button
        v-for="align in alignments"
        :key="align"
        variant="ghost"
        size="sm"
        class="px-2 h-8"
        :class="{ 'bg-background': modelValue.alignment === align }"
        @click="updateAlignment(align)"
      >
        <component :is="alignmentIcons[align]" class="w-4 h-4" />
      </Button>
    </div>

    <Separator orientation="vertical" class="mx-0.5 h-6" />

    <!-- Lock control -->
    <Button variant="ghost" size="sm" class="px-2 h-8" @click="toggleLock">
      <LockIcon v-if="modelValue.isLocked" class="h-4 w-4" />
      <UnlockIcon v-else class="h-4 w-4" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed, type FunctionalComponent } from 'vue'
import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  LockIcon,
  UnlockIcon,
  ImageIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ImageAttributes {
  width: string
  alignment: string
  isLocked: boolean
  [key: string]: any
}

const props = defineProps<{
  modelValue: ImageAttributes
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ImageAttributes]
}>()

// Constants
const sizes = ['25%', '50%', '75%', '100%']
const alignments = ['left', 'center', 'right']

// UI helpers
const alignmentIcons: Record<string, FunctionalComponent> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
}

const sizeIconClasses = {
  '25%': 'w-3 h-3',
  '50%': 'w-4 h-4',
  '75%': 'w-5 h-5',
  '100%': 'w-6 h-6',
}

// Update methods
const updateWidth = (width: string) => {
  emit('update:modelValue', { ...props.modelValue, width })
}

const updateAlignment = (alignment: string) => {
  emit('update:modelValue', { ...props.modelValue, alignment })
}

const toggleLock = () => {
  emit('update:modelValue', { 
    ...props.modelValue, 
    isLocked: !props.modelValue.isLocked 
  })
}
</script> 