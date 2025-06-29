<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  columnId: string
  initialWidth?: number
}>()

const emit = defineEmits<{
  (e: 'update:width', width: number): void
}>()

const resizingColumn = ref<{ startX: number; startWidth: number } | null>(null)

const startResizing = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  
  const th = (event.target as HTMLElement).closest('th')
  if (!th) return

  const currentWidth = props.initialWidth || th.offsetWidth

  resizingColumn.value = {
    startX: event.clientX,
    startWidth: currentWidth
  }

  document.body.classList.add('resizing-column')
  document.addEventListener('mousemove', handleResizing)
  document.addEventListener('mouseup', stopResizing)
}

const handleResizing = (event: MouseEvent) => {
  if (!resizingColumn.value) return

  const { startX, startWidth } = resizingColumn.value
  const diff = event.clientX - startX
  const newWidth = Math.max(100, startWidth + diff) // Minimum width of 100px

  emit('update:width', newWidth)
}

const stopResizing = () => {
  if (!resizingColumn.value) return
  
  document.body.classList.remove('resizing-column')
  resizingColumn.value = null
  document.removeEventListener('mousemove', handleResizing)
  document.removeEventListener('mouseup', stopResizing)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResizing)
  document.removeEventListener('mouseup', stopResizing)
  document.body.classList.remove('resizing-column')
})

defineExpose({
  startResizing
})
</script>

<template>
  <div
    class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
    :class="{ 'bg-primary/50': resizingColumn !== null }"
    @mousedown="startResizing"
  ></div>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}

.resizing-column {
  cursor: col-resize;
  user-select: none;
}
</style> 








