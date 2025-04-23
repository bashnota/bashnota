<script setup lang="ts">
import { computed } from 'vue'
import AIAssistantSidebarComponent from './ai-assistant/components/AIAssistantSidebar.vue'
import { Cpu } from 'lucide-vue-next'
import { useSidebar } from '@/composables/useSidebar'
import { BaseSidebar, SidebarToggleButton, KeyboardShortcut } from '@/components/ui/sidebar'

const props = defineProps<{
  editor: any
  notaId: string
  isAISidebarOpen?: boolean
}>()

const emit = defineEmits<{
  'update:isAISidebarOpen': [isOpen: boolean]
}>()

// Use our sidebar composable
const { isOpen, toggle: toggleSidebar } = useSidebar({
  initialState: props.isAISidebarOpen || false,
  storageKey: 'ai-sidebar-state',
  keyboard: {
    ctrl: true,
    shift: true,
    alt: true,
    key: 'a'
  },
  onToggle: (value) => {
    emit('update:isAISidebarOpen', value)
  }
})

</script>

<template>
  <div 
    class="fixed top-14 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out"
    :class="[isOpen ? 'translate-x-0' : 'translate-x-full']"
  >
    <!-- Toggle Button -->
    <SidebarToggleButton
      class="absolute -left-10 top-4 z-10 shadow-md"
      :isOpen="isOpen"
      @toggle="toggleSidebar"
    />

    <!-- AI Assistant Sidebar Component -->
    <BaseSidebar 
      title="AI Assistant"
      :icon="Cpu"
      position="right"
      className="h-full"
      :closable="true"
      @close="isOpen = false"
    >
      <AIAssistantSidebarComponent 
        :editor="editor" 
        :notaId="notaId"
        :isOpen="isOpen"
        :hide-header="true"
        @close="isOpen = false"
      />
    </BaseSidebar>

    <!-- Keyboard shortcut info at bottom -->
    <KeyboardShortcut 
      ctrl
      shift
      alt
      keyName="A"
      action="toggle"
    />
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