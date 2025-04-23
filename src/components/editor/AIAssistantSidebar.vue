<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import AIAssistantSidebarComponent from './ai-assistant/components/AIAssistantSidebar.vue'
import { ChevronLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { onKeyStroke } from '@vueuse/core'

const props = defineProps<{
  editor: any
  notaId: string
  isAISidebarOpen?: boolean
}>()

const emit = defineEmits<{
  'update:isAISidebarOpen': [isOpen: boolean]
}>()

// Sidebar state
const isOpen = ref(props.isAISidebarOpen || false)

// Watch for props changes to update local state
watch(() => props.isAISidebarOpen, (newValue) => {
  isOpen.value = newValue || false
})

// Watch for local state changes to emit updates
watch(isOpen, (newValue) => {
  emit('update:isAISidebarOpen', newValue)
  localStorage.setItem('ai-sidebar-state', JSON.stringify(newValue))
})

// Load saved state
onMounted(() => {
  const savedState = localStorage.getItem('ai-sidebar-state')
  if (savedState) {
    isOpen.value = JSON.parse(savedState)
    emit('update:isAISidebarOpen', isOpen.value)
  }
})

// Toggle sidebar visibility
const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

// Keyboard shortcut for toggling sidebar - Ctrl+Shift+Alt+A for AI Assistant
onKeyStroke('a', (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey) {
    e.preventDefault()
    toggleSidebar()
  }
})
</script>

<template>
  <div 
    class="fixed top-14 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out"
    :class="[isOpen ? 'translate-x-0' : 'translate-x-full']"
  >
    <!-- Toggle Button -->
    <Button
      class="absolute -left-10 top-4 z-10 shadow-md"
      variant="ghost"
      size="icon"
      @click="toggleSidebar"
      :title="isOpen ? 'Hide AI Assistant' : 'Show AI Assistant'"
      aria-label="Toggle AI Assistant Sidebar"
      tabindex="0"
    >
      <ChevronLeft class="h-4 w-4" />
    </Button>

    <!-- AI Assistant Sidebar Component -->
    <AIAssistantSidebarComponent 
      :editor="editor" 
      :notaId="notaId"
      :isOpen="isOpen"
      @close="isOpen = false"
    />

    <!-- Keyboard shortcut info at bottom -->
    <div class="absolute bottom-0 left-0 right-0 px-3 py-2 text-[10px] text-muted-foreground border-t bg-background">
      Press <kbd class="px-1 py-0.5 rounded bg-muted">Ctrl+Shift+Alt+A</kbd> to toggle
    </div>
  </div>
</template>

<style scoped>
.ai-assistant-wrapper {
  position: relative;
  height: 100%;
  overflow: visible;
}

/* Make sure resize handle is visible outside of the component boundary */
.ai-assistant-wrapper :deep(.absolute) {
  z-index: 100;
}
</style>