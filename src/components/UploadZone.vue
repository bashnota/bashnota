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
    <input type="file" class="hidden" accept="image/*" @change="handleFileSelect" :ref="el => fileInput = el as HTMLInputElement" :disabled="disabled" />
    <div class="flex flex-col items-center gap-2">
      <UploadCloud class="w-12 h-12 text-muted-foreground" />
      <div class="flex flex-col items-center gap-1">
        <Button variant="outline" @click="handleButtonClick" class="relative" :disabled="disabled">
          <span>Choose image</span>
          <span class="sr-only">Upload file</span>
        </Button>
        <p class="text-sm text-muted-foreground">or drag and drop</p>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">PNG, JPG or GIF (max. 800x400px)</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { UploadCloud } from 'lucide-vue-next'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  'file-selected': [event: Event]
  'file-dropped': [event: DragEvent]
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
  console.log('File selected event triggered', event, props.disabled)
  if (props.disabled) {
    console.log('Upload disabled, returning')
    return
  }
  
  isDragging.value = false
  emit('file-selected', event)
}

const handleDrop = (event: DragEvent) => {
  console.log('File drop event triggered', event, props.disabled)
  if (props.disabled) {
    console.log('Upload disabled, returning')
    return
  }
  
  isDragging.value = false
  emit('file-dropped', event)
}
</script>
