<template>
  <div class="mb-4">
    <div class="relative">
      <Input
        :value="props.query"
        placeholder="Enter your query to start the Vibe agent..."
        class="h-14 pl-12 pr-5 text-base transition-all focus:ring-2 focus:ring-primary/30"
        :class="{ 'border-primary border-2 shadow-sm shadow-primary/20': props.isInitialQuery }"
        @input="updateQuery($event)"
        @keyup.enter="handleSubmit"
        aria-label="Vibe query input"
        autofocus
      />
      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70">
        <Bot class="h-5 w-5" :class="{ 'text-primary': props.isInitialQuery || props.query.trim() }" />
      </div>
      <div v-if="props.query.trim()" class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        Press Enter to submit
      </div>
    </div>
    <div v-if="props.isInitialQuery" class="text-xs text-primary mt-1.5 pl-2 flex items-center gap-1.5">
      <Bot class="h-3.5 w-3.5" />
      <span>Enter your question or task to begin working with this agent</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Bot } from 'lucide-vue-next'

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

<style scoped>
/* Add subtle animation to the input icon when typing */
.text-primary {
  transition: all 0.2s ease;
}

.border-primary {
  transition: all 0.3s ease;
}

/* Better focus state */
.input:focus-visible {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsla(var(--primary), 0.2);
}
</style> 