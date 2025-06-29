<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  isFullscreen: boolean
}>()

const emit = defineEmits(['exitFullscreen'])

// Function to properly exit fullscreen
const exitFullscreen = () => {
  emit('exitFullscreen')
}

// Handle keyboard events for fullscreen
const handleKeyDown = (e: KeyboardEvent) => {
  // Exit fullscreen on Escape key press
  if (e.key === 'Escape' && props.isFullscreen) {
    e.preventDefault()
    exitFullscreen()
  }
}

// Set up and clean up event listeners
onMounted(() => {
  // Add keyboard listener for fullscreen mode
  window.addEventListener('keydown', handleKeyDown)
  
  // Control body scroll when entering fullscreen
  if (props.isFullscreen) {
    document.body.style.overflow = 'hidden'
  }
})

// Watch for props changes to update body scroll accordingly
watch(() => props.isFullscreen, (isFullscreen) => {
  document.body.style.overflow = isFullscreen ? 'hidden' : ''
})

// Clean up event listeners
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  
  // Ensure body scroll is restored when component is unmounted
  document.body.style.overflow = ''
})
</script>

<template>
  <div 
    class="flex flex-col relative overflow-hidden transition-all duration-300"
    :class="{
      'fixed inset-0 z-[100] bg-background': isFullscreen
    }"
  >
    <slot></slot>
  </div>
</template>








