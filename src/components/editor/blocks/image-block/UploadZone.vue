<template>
  <div
    class="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg bg-muted transition-colors duration-200 hover:bg-muted/80"
    :class="{ 'bg-accent border-accent-foreground': isDragging }"
    @drop.prevent="handleDrop"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @dragenter.prevent="isDragging = true"
  >
    <input type="file" class="hidden" accept="image/*" @change="handleFileSelect" ref="fileInput" />
    <div class="flex flex-col items-center gap-2">
      <UploadCloud class="w-12 h-12 text-muted-foreground" />
      <div class="flex flex-col items-center gap-1">
        <Button variant="outline" @click="$refs.fileInput.click()" class="relative">
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

const emit = defineEmits<{
  'file-selected': [event: Event]
  'file-dropped': [event: DragEvent]
}>()

const isDragging = ref(false)

const handleFileSelect = (event: Event) => {
  isDragging.value = false
  emit('file-selected', event)
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  emit('file-dropped', event)
}
</script>
