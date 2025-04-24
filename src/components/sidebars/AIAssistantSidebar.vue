<script setup lang="ts">
import { computed, ref } from 'vue'
import AIAssistantSidebarComponent from './ai-assistant/components/AIAssistantSidebar.vue'
import { Cpu } from 'lucide-vue-next'
import { useSidebarComposable } from '@/composables/useSidebarComposable'
import { BaseSidebar, SidebarHeader, SidebarToggleButton, KeyboardShortcut } from '@/components/ui/sidebars'

const props = defineProps<{
  editor: any
  notaId: string
  isAISidebarOpen?: boolean
}>()

const emit = defineEmits<{
  'update:isAISidebarOpen': [isOpen: boolean]
}>()

// Use our improved sidebar composable but without width settings
const { 
  isOpen, 
  toggle: toggleSidebar 
} = useSidebarComposable({
  id: 'ai-assistant',
  initialState: props.isAISidebarOpen || false,
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

// Reference to the BaseSidebar component
const sidebarRef = ref(null)
</script>

<template>
  <div 
    class="ai-assistant-wrapper fixed top-14 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out w-full h-full"
    :class="[isOpen ? 'translate-x-0' : 'translate-x-full']"
  >
    <!-- Toggle Button -->
    <SidebarToggleButton
      class="absolute -left-10 top-4 z-10 shadow-md"
      :is-open="isOpen"
      @toggle="toggleSidebar"
    />

    <!-- AI Assistant Sidebar Component -->
    <BaseSidebar 
      ref="sidebarRef"
      title="AI Assistant"
      :icon="Cpu"
      position="right"
      className="h-full w-full overflow-hidden"
      id="ai-assistant"
    >
      <AIAssistantSidebarComponent 
        :editor="editor" 
        :notaId="notaId"
        :hide-header="true"
        @close="toggleSidebar"
      />
    </BaseSidebar>

    <!-- Keyboard shortcut info at bottom -->
    <KeyboardShortcut 
      ctrl
      shift
      alt
      keyName="A"
      action="toggle AI Assistant"
    />
  </div>
</template>

<style scoped>
.ai-assistant-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: visible;
  box-sizing: border-box;
}

/* Make sure resize handle is visible outside of the component boundary */
.ai-assistant-wrapper :deep(.absolute) {
  z-index: 100;
}
</style>