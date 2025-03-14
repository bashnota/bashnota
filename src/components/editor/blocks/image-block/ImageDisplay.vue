<template>
  <div class="relative" :style="{ width: width }">
    <img
      v-if="src"
      :src="src"
      :style="imageStyle"
      class="w-full h-auto rounded-md"
      @dblclick="handleDoubleClick"
    />
    <UploadZone
      v-else-if="!isReadOnly"
      @file-selected="handleImageUpload"
      @file-dropped="handleDrop"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'
import UploadZone from '@/components/UploadZone.vue'

type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

const props = defineProps<{
  src: string
  width: string
  objectFit?: ObjectFitType
  isLocked: boolean
  isReadOnly: boolean
}>()

const emit = defineEmits<{
  'update:src': [src: string]
  'unlock': []
}>()

// Computed properties
const imageStyle = computed(() => ({
  objectFit: props.objectFit || 'contain' as ObjectFitType
}))

// File handling methods
const handleDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    await handleFileUpload(file)
  }
}

const handleFileUpload = async (file: File) => {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      emit('update:src', e.target?.result as string)
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('Error uploading image:', error)
  }
}

const handleImageUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await handleFileUpload(file)
  }
}

// Event handlers
const handleDoubleClick = (event: MouseEvent) => {
  if (props.isReadOnly) return

  event.preventDefault()
  event.stopPropagation()

  if (props.isLocked) {
    emit('unlock')
  }
}
</script> 