<script setup lang="ts">
import { ref } from 'vue'
import EnhancedAIAssistant from './ai-assistant/components/EnhancedAIAssistant.vue'
import { BrainIcon } from 'lucide-vue-next'
import { BaseSidebar, KeyboardShortcut } from '@/components/ui/sidebars'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

const props = defineProps<{
  editor: any
  notaId: string
  hideHeader?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// Get the AI settings store to access provider name
const aiSettings = useAISettingsStore()
const providerName = ref(aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)?.name || 'AI')
</script>

<template>
  <BaseSidebar 
    id="ai-assistant"
    title="AI Assistant"
    :icon="BrainIcon"
    position="right" 
    @close="$emit('close')"
  >
    <EnhancedAIAssistant 
      :editor="editor" 
      :notaId="notaId"
      :hide-header="true"
      @close="$emit('close')"
    />
    
    <!-- Keyboard Shortcut -->
    <template #footer>
      <KeyboardShortcut 
        :ctrl="true"
        :shift="true"
        :alt="true"
        keyName="I"
        action="toggle AI Assistant"
      />
    </template>
  </BaseSidebar>
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