<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Bot, Sparkles as SparklesIcon } from 'lucide-vue-next'
import ProviderSelector from './ProviderSelector.vue'

const emit = defineEmits(['create-session'])

const createNewSession = () => {
  emit('create-session')
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-muted/10">
    <Bot class="h-14 w-14 mb-6 text-primary/30" />
    <h3 class="text-base font-medium mb-3 text-foreground">AI Assistant</h3>
    <p class="mb-2">Start a new conversation with the AI assistant.</p>
    <p class="text-sm mb-8 max-w-md">You can use AI to generate content, answer questions, or help with your writing.</p>
    <Button 
      size="default" 
      class="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
      @click="createNewSession"
    >
      <SparklesIcon class="h-4 w-4 mr-2" />
      Create New Session
    </Button>
  </div>
</template>