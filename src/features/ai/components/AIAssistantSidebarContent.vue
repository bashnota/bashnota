<script setup lang="ts">
import AIAssistantSidebarComponent from './components/AIAssistantSidebar.vue'

const props = defineProps<{
  editor: any
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <AIAssistantSidebarComponent 
    :editor="editor" 
    :notaId="notaId"
    :hide-header="true"
    @close="$emit('close')"
  />
</template>
