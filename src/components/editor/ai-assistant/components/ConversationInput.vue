<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SparklesIcon, SendIcon, LoaderIcon, FileText, Search } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ref, computed, nextTick, watch } from 'vue'

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
}>()

const emit = defineEmits([
  'update:promptInput',
  'update:followUpPrompt',
  'generate',
  'continue',
  'checkMentions',
  'selectMention'
])

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localPromptInput = ref(props.promptInput)
const localFollowUpPrompt = ref(props.followUpPrompt)

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
  
  // Simply emit the checkMentions event with a simple object instead of trying to dispatch a DOM event
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
  
  // Simply emit the checkMentions event with a simple object instead of trying to dispatch a DOM event
  emit('checkMentions', {
    target: {
      value: newVal,
      selectionStart: textareaRef.value?.selectionStart || 0,
      selectionEnd: textareaRef.value?.selectionEnd || 0
    }
  })
})

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

// Focus textarea after mount
const focusTextarea = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
    }
  })
}
</script>

<template>
  <div>
    <!-- New Prompt Input -->
    <div v-if="!isContinuing">
      <Textarea
        v-model="localPromptInput"
        placeholder="Enter your prompt here..."
        class="min-h-[80px] resize-none w-full"
        @keydown="handleKeyDown"
        ref="textareaRef"
      />
      <div class="flex justify-between items-center text-xs text-muted-foreground mt-2">
        <span>{{ promptTokenCount }} tokens (approx)</span>
        <div class="flex items-center gap-2">
          <div v-if="hasMentions" class="flex items-center gap-1">
            <Badge variant="outline" class="bg-primary/10 border-primary/20 px-2 text-xs flex items-center gap-1">
              <FileText class="h-3 w-3" />
              {{ mentionCount }} nota{{ mentionCount > 1 ? 's' : '' }} referenced
            </Badge>
          </div>
          <Button 
            size="sm" 
            class="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            @click="generateText" 
            :disabled="isPromptEmpty"
          >
            <LoaderIcon v-if="isLoading" class="h-3.5 w-3.5 mr-1.5 animate-spin" />
            <SparklesIcon v-else class="h-3.5 w-3.5 mr-1.5" />
            Generate
          </Button>
        </div>
      </div>
    </div>

    <!-- Continue Conversation Input -->
    <div v-else>
      <Textarea
        v-model="localFollowUpPrompt"
        placeholder="Continue the conversation..."
        class="min-h-[80px] resize-none w-full"
        :disabled="isLoading"
        @keydown="handleKeyDown"
        ref="textareaRef"
      />
      <div class="flex justify-between items-center text-xs text-muted-foreground mt-2">
        <span>Ctrl+Enter to send</span>
        <Button 
          size="sm" 
          class="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
          @click="continueConversation" 
          :disabled="!localFollowUpPrompt.trim() || isLoading"
        >
          <SendIcon class="h-3.5 w-3.5 mr-1.5" />
          Send
        </Button>
      </div>
    </div>

    <!-- Mention Search Results Popup -->
    <div 
      v-if="showMentionSearch" 
      class="border border-border rounded-md shadow-md overflow-hidden mt-2 w-full bg-background"
    >
      <div class="p-2 sticky top-0 bg-background border-b flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Search class="w-4 h-4 text-muted-foreground" />
          <span class="text-xs font-medium">
            Search Notas
          </span>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ mentionSearchResults.length > 0 ? 
            `${mentionSearchResults.length} result${mentionSearchResults.length > 1 ? 's' : ''}` : 
            'No results' }}
        </span>
      </div>
      
      <ScrollArea class="max-h-[200px]">
        <div v-if="mentionSearchResults.length === 0" class="p-4 text-center text-muted-foreground text-sm">
          No matching notas found
        </div>
        
        <div v-else>
          <div 
            v-for="result in mentionSearchResults" 
            :key="result.id" 
            class="p-2 cursor-pointer hover:bg-muted transition-colors border-b border-border/40 last:border-b-0"
            @click="selectNotaFromSearch(result)"
          >
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div class="overflow-hidden flex-1">
                <div class="truncate text-sm font-medium">{{ result.title }}</div>
                <div class="text-xs text-muted-foreground truncate">
                  {{ new Date(result.updatedAt).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>