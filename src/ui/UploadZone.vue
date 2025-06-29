<template>
  <div
    class="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg bg-muted transition-colors duration-200 hover:bg-muted/80"
    :class="{ 
      'bg-accent border-accent-foreground': isDragging,
      'opacity-50 cursor-not-allowed': disabled
    }"
    @drop.prevent="handleDrop"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @dragenter.prevent="handleDragEnter"
  >
    <input type="file" class="hidden" accept="image/*" multiple @change="handleFileSelect" :ref="el => fileInput = el as HTMLInputElement" :disabled="disabled" />
    <div class="flex flex-col items-center gap-2">
      <UploadCloud class="w-12 h-12 text-muted-foreground" />
      <div class="flex flex-col items-center gap-1">
        <Button variant="outline" @click="handleButtonClick" class="relative" :disabled="disabled">
          <span>{{ allowMultiple ? 'Choose images' : 'Choose image' }}</span>
          <span class="sr-only">Upload file{{ allowMultiple ? 's' : '' }}</span>
        </Button>
        <p class="text-sm text-muted-foreground">or drag and drop</p>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">PNG, JPG or GIF (max. 800x400px)</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/ui/button'
import { UploadCloud } from 'lucide-vue-next'
import { logger } from '@/services/logger'

const props = defineProps<{
  disabled?: boolean
  allowMultiple?: boolean
}>()

const emit = defineEmits<{
  'file-selected': [event: Event]
  'file-dropped': [event: DragEvent]
  'files-selected': [files: File[]]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const handleButtonClick = () => {
  if (!props.disabled && fileInput.value) {
    fileInput.value.click()
  }
}

const handleDragOver = () => {
  if (!props.disabled) {
    isDragging.value = true
  }
}

const handleDragEnter = () => {
  if (!props.disabled) {
    isDragging.value = true
  }
}

const handleDragLeave = () => {
  if (!props.disabled) {
    isDragging.value = false
  }
}

const handleFileSelect = (event: Event) => {
  logger.log('File selected event triggered', event, props.disabled)
  if (props.disabled) {
    logger.log('Upload disabled, returning')
    return
  }
  
  isDragging.value = false
  
  // Legacy event emission for backward compatibility
  emit('file-selected', event)
  
  // New multi-file handling
  const fileList = (event.target as HTMLInputElement).files
  if (fileList && fileList.length > 0) {
    const files = Array.from(fileList)
    emit('files-selected', files)
  }
}

const handleDrop = (event: DragEvent) => {
  logger.log('File drop event triggered', event, props.disabled)
  if (props.disabled) {
    logger.log('Upload disabled, returning')
    return
  }
  
  isDragging.value = false
  
  // Legacy event emission for backward compatibility
  emit('file-dropped', event)
  
  // New multi-file handling for drag and drop
  const fileList = event.dataTransfer?.files
  if (fileList && fileList.length > 0) {
    const files = Array.from(fileList)
    emit('files-selected', files)
  }
}
</script>









