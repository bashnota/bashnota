<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  SparklesIcon, 
  SendIcon, 
  LoaderIcon, 
  FileText, 
  AlertTriangleIcon,
  BrainCircuitIcon
} from 'lucide-vue-next'
import { ref, nextTick, watch, onMounted, computed } from 'vue'
import MentionSearch from './MentionSearch.vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  promptInput: string
  followUpPrompt: string
  isPromptEmpty: boolean
  isLoading: boolean
  promptTokenCount: number
  isContinuing: boolean
  hasMentions: boolean
  mentionCount: number
  showMentionSearch: boolean
  mentionSearchResults: any[]
  tokenWarning: { show: boolean; message: string } | null
  maxInputChars: number
}>()

const emit = defineEmits([
  'update:promptInput',
  'update:followUpPrompt',
  'generate',
  'continue',
  'checkMentions',
  'selectMention',
  'updateMentionSearch',
  'closeMentionSearch',
  'changeModel'
])

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localPromptInput = ref(props.promptInput)
const localFollowUpPrompt = ref(props.followUpPrompt)
const mentionPosition = ref<{ top: number; left: number } | null>(null)
const isTyping = ref(false)
const typingTimeout = ref<number | null>(null)

// Access AI Settings store
const aiSettingsStore = useAISettingsStore()
const modelOptions = computed(() => aiSettingsStore.providers)
const selectedModel = ref(aiSettingsStore.settings.preferredProviderId)

// Watch for changes in the AI settings store's preferred provider
watch(() => aiSettingsStore.settings.preferredProviderId, (newProviderId) => {
  selectedModel.value = newProviderId
})

// Function to change AI model
const changeModel = (modelId: string) => {
  selectedModel.value = modelId
  aiSettingsStore.setPreferredProvider(modelId)
  emit('changeModel', modelId)
}

// Watch for changes in props to update local refs
watch(() => props.promptInput, (newVal) => {
  localPromptInput.value = newVal
})

watch(() => props.followUpPrompt, (newVal) => {
  localFollowUpPrompt.value = newVal
})

// Update parent when local values change
watch(localPromptInput, (newVal) => {
  emit('update:promptInput', newVal)
  
  // Update typing status for visual feedback
  if (newVal.trim()) {
    isTyping.value = true
    
    // Clear previous timeout
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
    }
    
    // Set a new timeout to reset typing status after 1 second
    typingTimeout.value = window.setTimeout(() => {
      isTyping.value = false
    }, 1000)
  }
  
  // Emit the checkMentions event with a simple object
  emit('checkMentions', {
    target: {
      value: newVal,
      selectionStart: textareaRef.value?.selectionStart || 0,
      selectionEnd: textareaRef.value?.selectionEnd || 0
    }
  })
})

watch(localFollowUpPrompt, (newVal) => {
  emit('update:followUpPrompt', newVal)
  
  // Emit the checkMentions event with a simple object
  emit('checkMentions', {
    target: {
      value: newVal,
      selectionStart: textareaRef.value?.selectionStart || 0,
      selectionEnd: textareaRef.value?.selectionEnd || 0
    }
  })
})

// Watch for mention search visibility to calculate position
watch(() => props.showMentionSearch, (isVisible) => {
  if (isVisible && textareaRef.value) {
    calculateMentionPosition()
  }
})

// Calculate position for mention search popup
const calculateMentionPosition = () => {
  try {
    // First safety check - verify the textarea ref exists and is an element
    if (!textareaRef.value || !(textareaRef.value instanceof Element)) {
      console.warn('textareaRef is not a valid Element in calculateMentionPosition');
      return;
    }
    
    // Make sure the textarea has all the necessary methods
    if (typeof textareaRef.value.getBoundingClientRect !== 'function') {
      console.warn('textareaRef.value.getBoundingClientRect is not a function');
      return;
    }
    
    const textarea = textareaRef.value;
    
    // Get current value from the local state variables since textarea.value might be null
    const currentValue = props.isContinuing ? localFollowUpPrompt.value : localPromptInput.value;
    
    // Second safety check - verify we have a value to work with
    if (!currentValue) {
      console.warn('No value available to calculate mention position');
      return;
    }
    
    const caretPosition = textarea.selectionStart || 0;
    
    // Make sure the caret position is within bounds
    if (caretPosition > currentValue.length) {
      console.warn('Caret position out of bounds');
      return;
    }
    
    const text = currentValue.substring(0, caretPosition);
    const lines = text.split('\n');
    const lineCount = lines.length;
    const lastLine = lines[lineCount - 1] || '';
    
    // Create temporary element to measure text
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.width = `${textarea.clientWidth}px`;
    
    // Make sure we can get computed style
    const computedStyle = window.getComputedStyle(textarea);
    if (!computedStyle) {
      console.warn('Could not get computed style for textarea');
      return;
    }
    
    div.style.font = computedStyle.font;
    div.style.lineHeight = computedStyle.lineHeight;
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.textContent = lastLine;
    
    document.body.appendChild(div);
    
    const lineHeight = parseInt(computedStyle.lineHeight) || 20;
    const rect = textarea.getBoundingClientRect();
    
    mentionPosition.value = {
      top: rect.top + window.scrollY + (lineCount * lineHeight) + 8,
      left: rect.left + window.scrollX + div.clientWidth
    };
    
    document.body.removeChild(div);
  } catch (error) {
    console.error('Error in calculateMentionPosition:', error);
    
    // Provide a fallback position based on the window
    mentionPosition.value = {
      top: 100,
      left: 100
    };
  }
}

// Handle input on prompt textarea
const handlePromptInput = (e: Event) => {
  const textarea = e.target as HTMLTextAreaElement
  emit('update:promptInput', textarea.value)
  emit('checkMentions', e)
}

// Handle input on follow-up textarea
const handleFollowUpInput = (e: Event) => {
  const textarea = e.target as HTMLTextAreaElement
  emit('update:followUpPrompt', textarea.value)
  emit('checkMentions', e)
}

// Generate text with the current prompt
const generateText = () => {
  emit('generate')
}

// Continue conversation with current follow-up
const continueConversation = () => {
  emit('continue')
}

// Handle keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+Enter to submit
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    if (props.isContinuing) {
      continueConversation()
    } else {
      generateText()
    }
  }
}

// Select a nota from search results
const selectNotaFromSearch = (nota: any) => {
  emit('selectMention', nota)
}

// Update mention search query
const updateMentionQuery = (query: string) => {
  emit('updateMentionSearch', query)
}

// Close mention search
const closeMentionSearch = () => {
  emit('closeMentionSearch')
}

// Focus textarea after mount
const focusTextarea = () => {
  nextTick(() => {
    try {
      // Add proper checks to ensure the element exists and has a focus method
      if (textareaRef.value && typeof textareaRef.value.focus === 'function') {
        textareaRef.value.focus()
      }
    } catch (error) {
      console.error('Error focusing textarea:', error)
    }
  })
}

// Calculate initial mention position on mount
onMounted(() => {
  focusTextarea()
})
</script>

<template>
  <div class="relative conversation-input">

    <!-- New Prompt Input -->
    <div v-if="!isContinuing" class="relative prompt-container">
      <div class="textarea-wrapper">
        <Textarea
          v-model="localPromptInput"
          placeholder="Enter your prompt here... (Use #[ to mention a nota)"
          class="min-h-[90px] resize-none w-full pr-2 transition-all rounded-md input-area"
          :class="{ 'typing': isTyping, 'focus-visible': isTyping }"
          @keydown="handleKeyDown"
          @input="handlePromptInput"
          ref="textareaRef"
        />
        <!-- Shortcut hint -->
        <div class="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to generate
        </div>
      </div>
      
      <div class="flex justify-between items-center text-xs text-muted-foreground mt-2 px-0.5">
        <span class="flex gap-2 items-center">
          <!-- Token count with warning indicator -->
          <span 
            class="text-xs font-medium flex items-center gap-1 token-count"
            :class="{'warning': tokenWarning && tokenWarning.show}"
            :title="tokenWarning && tokenWarning.show ? tokenWarning.message : ''"
          >
            {{ promptTokenCount }} tokens
            <AlertTriangleIcon 
              v-if="tokenWarning && tokenWarning.show" 
              class="h-3 w-3 text-amber-500" 
            />
          </span>
          <!-- Show character count when approaching limit -->
          <span 
            v-if="promptInput.length > 10000" 
            class="text-xs opacity-75 char-count"
            :class="{'warning': promptInput.length > 18000}"
          >
            {{ promptInput.length }}/{{ maxInputChars }} chars
          </span>
        </span>
        <div class="flex items-center gap-2">
          <div v-if="hasMentions" class="flex items-center gap-1">
            <Badge variant="outline" class="bg-primary/10 border-primary/20 px-2 text-xs flex items-center gap-1 shadow-sm badge-mentions">
              <FileText class="h-3 w-3" />
              {{ mentionCount }} nota{{ mentionCount > 1 ? 's' : '' }} referenced
            </Badge>
          </div>
          <Button 
            size="icon" 
            class="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm send-button"
            @click="generateText" 
            :disabled="isPromptEmpty || isLoading"
            aria-label="Send message"
          >
            <LoaderIcon v-if="isLoading" class="h-4 w-4 animate-spin" />
            <SendIcon v-else class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Continue Conversation Input -->
    <div v-else class="relative continue-container">
      <div class="textarea-wrapper">
        <Textarea
          v-model="localFollowUpPrompt"
          placeholder="Continue the conversation... (Use #[ to mention a nota)"
          class="min-h-[90px] resize-none w-full pr-2 transition-all rounded-md input-area"
          :class="{ 'typing': isTyping }"
          :disabled="isLoading"
          @keydown="handleKeyDown"
          @input="handleFollowUpInput"
          ref="textareaRef"
        />
        <!-- Shortcut hint -->
        <div class="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send
        </div>
      </div>
      
      <div class="flex justify-between items-center text-xs text-muted-foreground mt-2 px-0.5">
        <span class="flex gap-2 items-center">
          <!-- Add token count for follow-up -->
          <span v-if="followUpPrompt.length > 0" class="text-xs opacity-75">
            {{ Math.round(followUpPrompt.length / 4) }} tokens
          </span>
        </span>
        <Button 
          size="icon" 
          class="w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm send-button"
          @click="continueConversation" 
          :disabled="!localFollowUpPrompt.trim() || isLoading"
          aria-label="Send message"
        >
          <LoaderIcon v-if="isLoading" class="h-4 w-4 animate-spin" />
          <SendIcon v-else class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-indicator">
      <div class="flex items-center gap-2">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <div class="flex flex-col">
          <p class="text-sm font-medium">
            {{ 
              selectedModel === 'webllm' ? 'WebLLM' : 
              selectedModel === 'ollama' ? 'Ollama' : 
              selectedModel === 'gemini' ? 'Gemini' : 'AI'
            }} is generating...
          </p>
          <p class="text-xs text-muted-foreground">This may take a moment</p>
        </div>
      </div>
      
      <!-- Show additional context for WebLLM -->
      <div v-if="selectedModel === 'webllm'" class="mt-1 text-xs text-muted-foreground">
        Processing locally in your browser
      </div>
    </div>

    <!-- New Mention Search using the MentionSearch component -->
    <MentionSearch
      :is-visible="showMentionSearch"
      :query="props.mentionSearchResults.length > 0 ? props.mentionSearchResults[0]?.searchQuery || '' : ''"
      :search-results="mentionSearchResults"
      :position="mentionPosition"
      @select="selectNotaFromSearch"
      @close="closeMentionSearch"
      @update-query="updateMentionQuery"
    />
  </div>
</template>

<style scoped>
.conversation-input {
  transition: all 0.3s ease;
}

.textarea-wrapper {
  position: relative;
}

.input-area {
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  border: 1px solid hsl(var(--border));
}

.input-area:focus-visible {
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 0 4px hsl(var(--primary) / 0.1);
  outline: none;
}

.input-area.typing {
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--background) / 0.8);
}

.shortcut-hint {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground) / 0.6);
  pointer-events: none;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.textarea-wrapper:hover .shortcut-hint,
.input-area:focus + .shortcut-hint {
  opacity: 1;
}

kbd {
  background-color: hsl(var(--muted) / 0.8);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.7rem;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.token-count,
.char-count {
  transition: color 0.3s ease;
}

.token-count.warning,
.char-count.warning {
  color: hsl(var(--warning) / 0.9);
  font-weight: 500;
}

.badge-mentions {
  animation: fadeIn 0.3s ease-in-out;
}

.send-button {
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  position: relative;
  overflow: hidden;
}

.send-button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
}

.send-button:not(:disabled):active {
  transform: translateY(1px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.send-button svg {
  transition: all 0.3s ease;
}

.send-button:disabled {
  opacity: 0.7;
}

.send-button::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.send-button:not(:disabled):hover::after {
  opacity: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading indicator styling */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  padding: 12px;
  background-color: hsl(var(--primary) / 0.08);
  border: 1px solid hsl(var(--primary) / 0.15);
  border-radius: 8px;
  animation: pulseBackground 2s infinite ease-in-out;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@keyframes pulseBackground {
  0%, 100% {
    background-color: hsl(var(--primary) / 0.08);
    border-color: hsl(var(--primary) / 0.15);
  }
  50% {
    background-color: hsl(var(--primary) / 0.12);
    border-color: hsl(var(--primary) / 0.25);
  }
}

.typing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.typing-indicator span {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: hsl(var(--primary));
  animation: typingDots 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingDots {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
</style>