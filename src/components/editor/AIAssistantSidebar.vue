<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import AIAssistantSidebar from './ai-assistant/components/AIAssistantSidebar.vue'

const props = defineProps<{
  editor: any
  notaId: string
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <AIAssistantSidebar 
    :editor="editor" 
    :nota-id="notaId"
    @close="$emit('close')"
  />
</template>