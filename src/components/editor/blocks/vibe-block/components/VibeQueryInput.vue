<template>
  <div class="mb-4">
    <div class="relative">
      <Input
        :value="props.query"
        placeholder="Enter your query to start the Vibe agent..."
        class="h-12 pr-24"
        :class="{ 'border-primary border-2': props.isInitialQuery }"
        @input="updateQuery($event)"
        @keyup.enter="handleSubmit"
        aria-label="Vibe query input"
        autofocus
      />
      <Button 
        @click.stop.prevent="handleSubmit" 
        class="absolute right-1 top-1 h-10 whitespace-nowrap"
        type="button"
        aria-label="Ask Vibe"
        :disabled="!props.query.trim()"
        :class="{ 'bg-primary hover:bg-primary/90': props.isInitialQuery }"
      >
        <Zap class="h-4 w-4 mr-2" />
        {{ props.isInitialQuery ? 'Start Agent' : 'Ask' }}
      </Button>
    </div>
    <div v-if="props.isInitialQuery" class="text-xs text-primary mt-1 pl-1">
      Enter your question or task to begin working with this agent
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap } from 'lucide-vue-next'

const props = defineProps({
  query: {
    type: String,
    required: true,
  },
  isInitialQuery: {
    type: Boolean,
    default: false,
  }
})

const emit = defineEmits<{
  'update:query': [value: string]
  'submit': []
}>()

// Proper shadcn input handling
function updateQuery(event: Event) {
  const input = event.target as HTMLInputElement
  emit('update:query', input.value)
}

function handleSubmit() {
  if (props.query.trim()) {
    emit('submit')
  }
}
</script> 