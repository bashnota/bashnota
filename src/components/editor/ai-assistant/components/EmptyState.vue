<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Bot, Sparkles as SparklesIcon } from 'lucide-vue-next'

const emit = defineEmits(['create-session'])

const createNewSession = () => {
  emit('create-session')
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
    <Bot class="h-12 w-12 mb-4 text-muted-foreground/70" />
    <h3 class="text-base font-medium mb-2">AI Assistant</h3>
    <p class="mb-2">Start a new conversation with the AI assistant.</p>
    <p class="text-sm mb-6">You can use AI to generate content, answer questions, or help with your writing.</p>
    <Button 
      size="default" 
      class="bg-primary hover:bg-primary/90 text-primary-foreground"
      @click="createNewSession"
    >
      <SparklesIcon class="h-4 w-4 mr-2" />
      Create New Session
    </Button>
  </div>
</template>