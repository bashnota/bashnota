<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LoaderIcon, 
  BrainCircuit
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'

const props = defineProps(nodeViewProps)

const aiSettings = useAISettingsStore()

// Store the conversation history in this component so it can be passed to the sidebar
const conversationHistory = ref<{ role: 'user' | 'assistant', content: string, timestamp?: Date, id?: string }[]>([
  { role: 'user', content: props.node.attrs.prompt || '', timestamp: new Date(), id: generateUniqueId() },
  { role: 'assistant', content: props.node.attrs.result || '', timestamp: new Date(), id: generateUniqueId() }
])

// Generate a unique ID for each message
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Reset loading state on mount to ensure it's not stuck
onMounted(() => {
  if (props.node.attrs.isLoading) {
    props.updateAttributes({
      isLoading: false,
      error: ''
    })
  }
})

// Trigger the global AI Assistant sidebar when this component is clicked
const activateAIAssistant = () => {
  // Create a custom event with this component instance and properly structured data
  window.dispatchEvent(
    new CustomEvent('activate-ai-assistant', {
      detail: {
        block: {
          node: props.node,
          type: 'inlineAIGeneration'
        }, // Structure the block data correctly
        conversationHistory: conversationHistory.value
      }
    })
  )
  
  // Also log a message to confirm event was dispatched
  console.log('AI Assistant activation event dispatched with conversation history:', conversationHistory.value)
}

// Add to conversation history when result changes
watch(() => props.node.attrs.result, (newResult) => {
  if (newResult) {
    // Check if this result is already in the conversation
    const hasResult = conversationHistory.value.some(
      msg => msg.role === 'assistant' && msg.content === newResult
    )
    
    if (!hasResult) {
      // Add the new result to the conversation history
      conversationHistory.value.push({ 
        role: 'assistant', 
        content: newResult, 
        timestamp: new Date(),
        id: generateUniqueId()
      })
    }
  }
}, { immediate: true })

// Compute loading state
const isLoading = computed(() => props.node.attrs.isLoading)
</script>

<template>
  <NodeViewWrapper class="inline-ai-block relative">
    <div class="ai-assistant-container flex">
      <!-- AI Robot Icon Button -->
      <div class="ai-robot-toggle z-10" :class="{ 'active': isLoading }">
        <Button 
          size="icon" 
          variant="ghost" 
          class="robot-icon-btn relative"
          @click="activateAIAssistant"
        >
          <BrainCircuit class="h-5 w-5" />
          <span v-if="isLoading" class="absolute -top-1 -right-1">
            <Badge variant="outline" class="flex h-4 w-4 items-center justify-center rounded-full bg-primary p-0">
              <LoaderIcon class="h-3 w-3 animate-spin text-white" />
            </Badge>
          </span>
        </Button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
.inline-ai-block {
  margin: 0.5rem 0;
  position: relative;
}

.ai-assistant-container {
  position: relative;
}

/* AI Robot Icon Button */
.ai-robot-toggle {
  position: relative;
  margin-right: 0.25rem;
}

.robot-icon-btn {
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.robot-icon-btn:hover {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.1);
}
</style>