<script setup lang="ts">
import AIAssistantSidebarComponent from './ai-assistant/components/AIAssistantSidebar.vue'

const props = defineProps<{
  editor: any
  notaId: string
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <div class="ai-assistant-wrapper">
    <AIAssistantSidebarComponent 
      :editor="editor" 
      :notaId="notaId"
      @close="$emit('close')"
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