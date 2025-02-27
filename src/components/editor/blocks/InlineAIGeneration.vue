<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  SparklesIcon, 
  LoaderIcon, 
  RefreshCwIcon, 
  XIcon, 
  CopyIcon, 
  CheckIcon, 
  EditIcon, 
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/lib/utils'

const props = defineProps(nodeViewProps)

const aiSettings = useAISettingsStore()
const promptInput = ref(props.node.attrs.prompt || '')
const resultInput = ref(props.node.attrs.result || '')
const isExpanded = ref(!props.node.attrs.result)
const isEditing = ref(false)
const isContinuing = ref(false)
const followUpPrompt = ref('')
const copied = ref(false)
const conversationHistory = ref([
  { role: 'user', content: props.node.attrs.prompt || '' },
  { role: 'assistant', content: props.node.attrs.result || '' }
])

const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

const generateText = () => {
  if (!promptInput.value.trim()) return
  
  // Update the prompt attribute
  props.updateAttributes({
    prompt: promptInput.value
  })
  
  // Reset conversation history
  conversationHistory.value = [
    { role: 'user', content: promptInput.value }
  ]
  
  // Call the generate command
  props.editor.commands.generateInlineAI(props.getPos(), promptInput.value)
  
  // Collapse the input after generating
  isExpanded.value = false
}

const regenerateText = () => {
  // Reset conversation to just the initial prompt
  conversationHistory.value = [
    { role: 'user', content: props.node.attrs.prompt }
  ]
  
  props.editor.commands.generateInlineAI(props.getPos(), props.node.attrs.prompt)
}

const continueConversation = () => {
  if (!followUpPrompt.value.trim() || props.node.attrs.isLoading) return
  
  // Add the follow-up prompt to conversation history
  conversationHistory.value.push(
    { role: 'user', content: followUpPrompt.value }
  )
  
  // Create a full conversation context for the AI
  const fullPrompt = conversationHistory.value
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n') + '\n\nAssistant:'
  
  // Set loading state directly
  props.updateAttributes({
    isLoading: true
  })
  
  // Generate continuation
  props.editor.commands.generateInlineAI(props.getPos(), fullPrompt, true)
  
  // Clear the follow-up input
  followUpPrompt.value = ''
}

const saveEditedText = () => {
  // Update the result in the node
  props.updateAttributes({
    result: resultInput.value
  })
  
  // Update in conversation history
  if (conversationHistory.value.length > 0) {
    const lastIndex = conversationHistory.value.findIndex(msg => msg.role === 'assistant')
    if (lastIndex !== -1) {
      conversationHistory.value[lastIndex].content = resultInput.value
    } else {
      conversationHistory.value.push({ role: 'assistant', content: resultInput.value })
    }
  }
  
  isEditing.value = false
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const toggleEditing = () => {
  if (!isEditing.value) {
    resultInput.value = props.node.attrs.result || ''
  }
  isEditing.value = !isEditing.value
}

const toggleContinuing = () => {
  isContinuing.value = !isContinuing.value
}

const removeBlock = () => {
  props.editor.commands.deleteNode(props.node.type.name)
}

const copyToClipboard = () => {
  if (!props.node.attrs.result) return
  
  navigator.clipboard.writeText(props.node.attrs.result)
    .then(() => {
      copied.value = true
      toast({
        title: 'Copied to clipboard',
        description: 'AI-generated text has been copied to clipboard'
      })
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
    .catch(err => {
      console.error('Failed to copy text: ', err)
      toast({
        title: 'Copy failed',
        description: 'Could not copy text to clipboard',
        variant: 'destructive'
      })
    })
}

const insertToDocument = () => {
  if (!props.node.attrs.result) return
  
  try {
    // Get the position after the current node
    const pos = props.getPos() + props.node.nodeSize
    
    // Check if the position is valid
    if (pos <= props.editor.state.doc.content.size) {
      // Insert the text at the position
      props.editor.commands.insertContentAt(pos, props.node.attrs.result)
      
      toast({
        title: 'Text Inserted',
        description: 'AI-generated text has been inserted into the document'
      })
    } else {
      // Fallback: insert at the end of the document
      const endPos = props.editor.state.doc.content.size
      props.editor.commands.insertContentAt(endPos, props.node.attrs.result)
      
      toast({
        title: 'Text Inserted',
        description: 'AI-generated text has been inserted at the end of the document'
      })
    }
  } catch (error) {
    console.error('Error inserting content:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(props.node.attrs.result)
    
    toast({
      title: 'Text Inserted',
      description: 'AI-generated text has been inserted at the current position'
    })
  }
}

// Update conversation history when result changes
watch(() => props.node.attrs.result, (newResult) => {
  if (newResult && !isEditing.value) {
    // Find the last assistant message or add a new one
    const lastAssistantIndex = conversationHistory.value.findIndex(msg => msg.role === 'assistant')
    if (lastAssistantIndex !== -1) {
      conversationHistory.value[lastAssistantIndex].content = newResult
    } else {
      conversationHistory.value.push({ role: 'assistant', content: newResult })
    }
  }
}, { immediate: true })
</script>

<template>
  <NodeViewWrapper class="inline-ai-block">
    <div class="border rounded-md p-4 bg-muted/30">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center">
          <SparklesIcon class="h-4 w-4 mr-2" />
          <span class="text-sm font-medium">AI Generation</span>
        </div>
        <div class="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            @click="toggleExpanded"
          >
            <ChevronDownIcon v-if="!isExpanded" class="h-4 w-4" />
            <ChevronUpIcon v-else class="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            @click="removeBlock"
          >
            <XIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <!-- Prompt input -->
      <div v-if="isExpanded" class="space-y-2">
        <Label for="ai-prompt">Prompt</Label>
        <Textarea
          id="ai-prompt"
          v-model="promptInput"
          placeholder="Enter your prompt here..."
          class="resize-y min-h-[100px]"
          :disabled="node.attrs.isLoading"
        />
        <div class="flex justify-between items-center">
          <div class="text-xs text-muted-foreground">
            Using {{ selectedProvider?.name || 'AI' }}
          </div>
          <Button 
            size="sm" 
            @click="generateText" 
            :disabled="!promptInput.trim() || node.attrs.isLoading"
          >
            <LoaderIcon v-if="node.attrs.isLoading" class="mr-2 h-4 w-4 animate-spin" />
            <SparklesIcon v-else class="mr-2 h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
      
      <!-- Result display -->
      <div v-if="node.attrs.result && !isExpanded">
        <!-- Error message -->
        <div v-if="node.attrs.error" class="text-sm text-destructive mb-2">
          {{ node.attrs.error }}
        </div>
        
        <!-- Editable result -->
        <div v-if="isEditing" class="space-y-2">
          <Textarea
            v-model="resultInput"
            class="resize-y min-h-[100px] w-full"
          />
          <div class="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              @click="toggleEditing"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              @click="saveEditedText"
            >
              Save
            </Button>
          </div>
        </div>
        
        <!-- Display result -->
        <div v-else class="prose prose-sm max-w-none p-3 bg-background rounded border">
          <div class="whitespace-pre-wrap">{{ node.attrs.result }}</div>
        </div>
        
        <!-- Result actions -->
        <div v-if="!isEditing" class="flex justify-end mt-2 space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            @click="copyToClipboard"
          >
            <CheckIcon v-if="copied" class="mr-2 h-4 w-4" />
            <CopyIcon v-else class="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            @click="toggleEditing"
          >
            <EditIcon class="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            @click="insertToDocument"
          >
            Insert to Document
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8" 
            @click="regenerateText"
            :disabled="node.attrs.isLoading"
          >
            <LoaderIcon v-if="node.attrs.isLoading" class="h-4 w-4 animate-spin" />
            <RefreshCwIcon v-else class="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <!-- Continue conversation -->
      <div v-if="node.attrs.result && !isExpanded && !isEditing" class="mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full"
          @click="toggleContinuing"
        >
          {{ isContinuing ? 'Hide' : 'Continue Conversation' }}
        </Button>
        
        <div v-if="isContinuing" class="mt-2 space-y-2">
          <Textarea
            v-model="followUpPrompt"
            placeholder="Ask a follow-up question..."
            class="resize-y min-h-[60px]"
            :disabled="node.attrs.isLoading"
            @keydown.enter.ctrl.prevent="continueConversation"
          />
          <div class="flex justify-between">
            <span class="text-xs text-muted-foreground">
              Press Ctrl+Enter to send
            </span>
            <Button 
              size="sm" 
              @click="continueConversation" 
              :disabled="!followUpPrompt.trim() || node.attrs.isLoading"
            >
              <LoaderIcon v-if="node.attrs.isLoading" class="mr-2 h-4 w-4 animate-spin" />
              <SendIcon v-else class="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
.inline-ai-block {
  margin: 1rem 0;
}
</style> 