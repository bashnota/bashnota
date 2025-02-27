<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SparklesIcon, LoaderIcon, RefreshCwIcon, XIcon, CopyIcon, CheckIcon } from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/lib/utils'

const props = defineProps(nodeViewProps)

const aiSettings = useAISettingsStore()
const promptInput = ref(props.node.attrs.prompt || '')
const isExpanded = ref(!props.node.attrs.result)
const copied = ref(false)

const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

const generateText = () => {
  if (!promptInput.value.trim()) return
  
  // Update the prompt attribute
  props.updateAttributes({
    prompt: promptInput.value
  })
  
  // Call the generate command
  props.editor.commands.generateInlineAI(props.getPos(), promptInput.value)
  
  // Collapse the input after generating
  isExpanded.value = false
}

const regenerateText = () => {
  props.editor.commands.generateInlineAI(props.getPos(), props.node.attrs.prompt)
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
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
  
  // Insert the text at the current position
  const pos = props.getPos() + props.node.nodeSize
  props.editor.commands.insertContentAt(pos, props.node.attrs.result)
  
  // Optionally, remove the AI block after inserting
  // props.editor.commands.deleteNode(props.node.type.name)
  
  toast({
    title: 'Text inserted',
    description: 'AI-generated text has been inserted into the document'
  })
}
</script>

<template>
  <NodeViewWrapper class="inline-ai-block">
    <div class="border rounded-md p-3 my-2 bg-muted/30">
      <!-- Header with controls -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center text-sm font-medium text-muted-foreground">
          <SparklesIcon class="h-4 w-4 mr-1" />
          <span>AI Generation</span>
          <span v-if="selectedProvider" class="ml-2 text-xs opacity-70">
            ({{ selectedProvider.name }})
          </span>
        </div>
        <div class="flex space-x-1">
          <Button 
            v-if="node.attrs.result" 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            @click="toggleExpanded"
          >
            <span v-if="isExpanded">−</span>
            <span v-else>+</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6 text-destructive" 
            @click="removeBlock"
          >
            <XIcon class="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <!-- Prompt input -->
      <div v-if="isExpanded || !node.attrs.result" class="mb-2">
        <Textarea
          v-model="promptInput"
          placeholder="Enter your prompt here..."
          class="resize-y min-h-[60px]"
          :disabled="node.attrs.isLoading"
          @keydown.enter.ctrl.prevent="generateText"
        />
        <div class="flex justify-between mt-2">
          <span class="text-xs text-muted-foreground">
            Press Ctrl+Enter to generate
          </span>
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
      
      <!-- Error message -->
      <div v-if="node.attrs.error" class="text-sm text-destructive mb-2">
        {{ node.attrs.error }}
      </div>
      
      <!-- Result -->
      <div v-if="node.attrs.result && !isExpanded" class="relative">
        <div class="prose prose-sm max-w-none p-3 bg-background rounded border">
          <div class="whitespace-pre-wrap">{{ node.attrs.result }}</div>
        </div>
        <div class="flex justify-end mt-2 space-x-2">
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
    </div>
  </NodeViewWrapper>
</template>

<style>
.inline-ai-block {
  margin: 1rem 0;
}
</style> 