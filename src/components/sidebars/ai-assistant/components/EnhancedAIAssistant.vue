<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import { TooltipTrigger, TooltipContent } from 'radix-vue'
import { toast } from '@/components/ui/toast'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import { 
  Loader as LoaderIcon, 
  Settings as SettingsIcon, 
  Copy as CopyIcon, 
  FileText as FileTextIcon,
  X as XIcon,
  StopCircle as StopCircleIcon
} from 'lucide-vue-next'

// Import composables
import { useConversation } from '../composables/useConversation'
import { useAIGeneration } from '../composables/useAIGeneration'
import { useAIProviders } from '../composables/useAIProviders'

// Import components
import ProviderSelector from './ProviderSelector.vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  editor: any
  notaId: string
  hideHeader?: boolean
}>()

const emit = defineEmits(['close'])

// Get AI providers info
const { 
  isLoadingWebLLMModels, 
  webLLMProgress, 
  currentWebLLMModel,
  availableProviders,
  isWebLLMSupported,
  webLLMError
} = useAIProviders()

// AI settings
const aiSettings = useAISettingsStore()

// AI generation
const { 
  isLoading: isGenerating,
  errorMessage, 
  generateText: generateAIText,
  abortGeneration
} = useAIGeneration(props.editor)

// Conversation management
const { 
  activeAIBlock,
  promptInput: prompt, 
  resultInput: result, 
  conversationHistory, 
  formatTimestamp: formatTime, 
  clearActiveBlock: clearPrompt,
  createNewSession: clearConversation,
  isPromptEmpty
} = useConversation(props.editor, props.notaId)

// Model loading state
const isLoadingProvider = computed(() => {
  return isLoadingWebLLMModels.value || isGenerating.value
})

// Is WebLLM model loading
const isLoadingWebLLMModel = computed(() => {
  return isLoadingWebLLMModels.value && 
         aiSettings.settings.preferredProviderId === 'webllm'
})

// Get model loading message
const modelLoadingMessage = computed(() => {
  if (aiSettings.settings.preferredProviderId === 'webllm') {
    if (isLoadingWebLLMModels.value) {
      return `Loading ${currentWebLLMModel.value || 'WebLLM model'}...`
    } else if (currentWebLLMModel.value) {
      return `Using ${currentWebLLMModel.value}`
    }
    return 'Model needs to be loaded'
  }
  return ''
})

// Format result with markdown
const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  typographer: true
})

const formattedResult = computed(() => {
  return activeAIBlock.value?.node.attrs.result ? md.render(activeAIBlock.value.node.attrs.result) : ''
})

// Get provider status message
const getProviderStatus = () => {
  const providerId = aiSettings.settings.preferredProviderId
  const provider = aiSettings.providers.find(p => p.id === providerId)
  
  if (!provider) return 'No provider selected'
  
  if (providerId === 'webllm') {
    // If model is currently loading
    if (isLoadingWebLLMModels.value) {
      return `${provider.name} - Loading model...`
    }
    
    // If we have an error
    if (webLLMError.value) {
      // Truncate very long error messages
      const shortError = webLLMError.value.length > 30 
        ? webLLMError.value.substring(0, 30) + '...' 
        : webLLMError.value
      return `${provider.name} - Error: ${shortError}`
    }
    
    // If a model is loaded
    if (currentWebLLMModel.value) {
      return `${provider.name} - ${currentWebLLMModel.value}`
    }
    
    // Browser not supported
    if (!isWebLLMSupported.value) {
      return `${provider.name} - Browser not supported`
    }
    
    // No model loaded
    return `${provider.name} - No model loaded`
  }
  
  if (providerId === 'gemini' && !aiSettings.getApiKey('gemini')) {
    return `${provider.name} - API key required`
  }
  
  if (providerId === 'ollama' && !availableProviders.value.includes('ollama')) {
    return `${provider.name} - Server not connected`
  }
  
  return provider.name
}

// Generate text
const generateText = async () => {
  if (isPromptEmpty.value || isGenerating.value) return
  
  try {
    await generateAIText(activeAIBlock.value, prompt.value, conversationHistory.value, formatTime)
  } catch (error) {
    logger.error('Error generating text:', error)
  }
}

// Copy result to clipboard
const copyResult = () => {
  if (!activeAIBlock.value?.node.attrs.result) return
  
  navigator.clipboard.writeText(activeAIBlock.value.node.attrs.result).then(() => {
    toast({
      title: 'Copied!',
      description: 'Response copied to clipboard'
    })
  })
}

// Insert result into document
const insertIntoDocument = () => {
  if (!activeAIBlock.value?.node.attrs.result || !props.editor) return
  
  try {
    // Get the current position
    const { view } = props.editor
    const { state, dispatch } = view
    const { selection } = state
    
    // Insert text at current position
    const transaction = state.tr.insertText(activeAIBlock.value.node.attrs.result, selection.from, selection.to)
    dispatch(transaction)
    
    toast({
      title: 'Inserted',
      description: 'AI response inserted into document'
    })
  } catch (error) {
    logger.error('Error inserting into document:', error)
    
    toast({
      title: 'Error',
      description: 'Failed to insert response into document',
      variant: 'destructive'
    })
  }
}

// Open AI settings
const openSettings = () => {
  // Implement opening settings dialog or navigating to settings
  toast({
    title: 'Settings',
    description: 'AI settings dialog would open here'
  })
}
</script>

<template>
  <div class="ai-assistant-sidebar">
    <!-- Provider Selection Panel -->
    <div class="provider-panel mb-3 p-3 bg-secondary/20 rounded-md">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium">AI Provider</h3>
          <div class="text-xs text-muted-foreground">
            {{ getProviderStatus() }}
          </div>
        </div>
        
        <Tooltip v-if="isLoadingProvider" :content="modelLoadingMessage">
          <span class="provider-loading flex items-center">
            <LoaderIcon :size="16" class="animate-spin mr-1" />
            <span class="text-xs">Loading...</span>
          </span>
        </Tooltip>
      </div>
      
      <div class="mt-2">
        <ProviderSelector />
      </div>
      
      <!-- Model Loading Progress (for WebLLM) -->
      <div v-if="isLoadingWebLLMModel" class="mt-3">
        <div class="text-xs mb-1 flex justify-between">
          <span>Loading model...</span>
          <span>{{ Math.round(webLLMProgress * 100) }}%</span>
        </div>
        <Progress :value="Number(webLLMProgress * 100)" class="h-1" />
        <p class="text-xs text-muted-foreground mt-1">
          {{ modelLoadingMessage || 'Please wait, this may take a few minutes' }}
        </p>
      </div>
    </div>
    
    <!-- Message Generation Area -->
    <div class="ai-message-area mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium">Generate AI Response</h3>
        
        <div class="flex gap-1 items-center">
          <Button 
            v-if="isGenerating" 
            variant="destructive" 
            size="icon"
            @click="abortGeneration"
            class="h-7 w-7 rounded-full"
          >
            <StopCircleIcon :size="14" />
          </Button>
          
          <Tooltip content="Configure AI Settings">
            <Button 
              variant="ghost" 
              size="icon"
              @click="openSettings"
              class="h-7 w-7"
            >
              <SettingsIcon :size="14" />
            </Button>
          </Tooltip>
        </div>
      </div>
      
      <!-- Input Area -->
      <div class="relative">
        <Textarea 
          v-model="prompt" 
          placeholder="Ask the AI assistant..." 
          class="resize-none min-h-[80px]"
          :disabled="isGenerating || isLoadingProvider"
          @keydown.ctrl.enter="generateText"
        />
        
        <div class="absolute bottom-2 right-2 flex gap-1">
          <Button 
            @click="clearPrompt" 
            variant="ghost" 
            size="icon"
            class="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
            :disabled="isPromptEmpty || isGenerating"
          >
            <XIcon :size="14" />
          </Button>
          
          <Button 
            @click="generateText" 
            :disabled="isPromptEmpty || isGenerating || isLoadingProvider"
            size="sm"
            class="relative group h-7"
          >
            <span v-if="isGenerating" class="animate-pulse">Generating...</span>
            <span v-else>Generate</span>
            <kbd class="absolute top-[-18px] right-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-muted px-1 rounded text-muted-foreground pointer-events-none">
              Ctrl+Enter
            </kbd>
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Response Display -->
    <div v-if="activeAIBlock?.node.attrs.result || isGenerating" class="ai-result border rounded-md p-3 relative min-h-[100px]">
      <div class="absolute top-2 right-2 flex gap-1">
        <Tooltip content="Copy response">
          <Button 
            @click="copyResult" 
            variant="ghost" 
            size="icon"
            class="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
            :disabled="!activeAIBlock?.node.attrs.result || isGenerating"
          >
            <CopyIcon :size="14" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Insert into document">
          <Button 
            @click="insertIntoDocument" 
            variant="ghost" 
            size="icon"
            class="h-7 w-7 rounded-full opacity-70 hover:opacity-100"
            :disabled="!activeAIBlock?.node.attrs.result || isGenerating"
          >
            <FileTextIcon :size="14" />
          </Button>
        </Tooltip>
      </div>
      
      <div v-if="isGenerating" class="text-muted-foreground text-sm flex items-center">
        <LoaderIcon :size="14" class="animate-spin mr-2" />
        <span>AI is thinking...</span>
      </div>
      
      <div v-else-if="activeAIBlock?.node.attrs.result" class="prose prose-sm dark:prose-invert max-w-none overflow-auto">
        <div v-html="formattedResult"></div>
      </div>
      
      <div v-if="errorMessage" class="mt-2 text-destructive text-xs border border-destructive/30 bg-destructive/10 p-2 rounded">
        {{ errorMessage }}
      </div>
    </div>
    
    <!-- Conversation History -->
    <div v-if="conversationHistory.length > 1" class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium">Conversation History</h3>
        <Button 
          @click="clearConversation" 
          variant="ghost" 
          size="sm"
          class="text-xs h-7"
        >
          Clear
        </Button>
      </div>
      
      <div class="conversation-history space-y-3 max-h-[300px] overflow-y-auto pr-1">
        <div 
          v-for="(message, index) in conversationHistory" 
          :key="message.id"
          class="message p-2 rounded-md text-sm"
          :class="{
            'bg-primary/10': message.role === 'user',
            'bg-secondary/20': message.role === 'assistant'
          }"
        >
          <div class="flex justify-between items-start mb-1">
            <span class="font-medium text-xs">
              {{ message.role === 'user' ? 'You' : 'AI Assistant' }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          <div>{{ message.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-assistant-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  overflow-y: auto;
}

.conversation-history {
  scrollbar-width: thin;
}

.conversation-history::-webkit-scrollbar {
  width: 5px;
}

.conversation-history::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-history::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
}
</style> 