<template>
  <div 
    class="upload-zone" 
    @drop.prevent="handleDrop"
    @dragover.prevent
    @dragenter.prevent
  >
    <input
      type="file"
      class="hidden"
      accept="image/*"
      @change="handleFileSelect"
      ref="fileInput"
    />
    <Button variant="outline" @click="$refs.fileInput.click()">
      Upload Image
    </Button>
    <p class="text-sm text-gray-500">or drag and drop</p>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

const emit = defineEmits<{
  'file-selected': [event: Event]
  'file-dropped': [event: DragEvent]
}>()

const handleFileSelect = (event: Event) => {
  emit('file-selected', event)
}

const handleDrop = (event: DragEvent) => {
  emit('file-dropped', event)
}
</script>

<style scoped>
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
  padding: 2em;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  transition: all 0.2s;
}

.upload-zone.drag-over {
  background: var(--accent);
  border-color: var(--accent-foreground);
}
</style> 