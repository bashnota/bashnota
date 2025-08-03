<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Box, Brain, Copy, AlertTriangle, Sparkles, ExternalLink } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import OutputRenderer from '../OutputRenderer.vue'
import AICodeAssistantContainer from '../ai/components/AICodeAssistantContainer.vue'

interface Props {
  hasOutput: boolean
  hasError: boolean
  isReadOnly: boolean
  isPublished: boolean
  isExecuting: boolean
  output?: string
  code: string
  language: string
  blockId: string
  notaId: string
  executionTime: number
  selectedSession?: string
  selectedKernel?: string
}

interface Emits {
  'copy-output': []
  'code-updated': [code: string]
  'custom-action-executed': [actionId: string, result: string]
  'trigger-execution': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeOutputView = ref<'output' | 'ai'>('output')

const sessionInfo = computed(() => ({
  sessionId: props.selectedSession,
  kernelName: props.selectedKernel
}))

// Auto-switch to AI view when there's an error
watch(() => props.hasError, (hasError) => {
  if (hasError && !props.isReadOnly && !props.isPublished) {
    activeOutputView.value = 'ai'
  }
}, { immediate: true })

const handleAICodeUpdate = (newCode: string) => {
  emit('code-updated', newCode)
}

const handleCustomActionExecuted = (actionId: string, result: string) => {
  emit('custom-action-executed', actionId, result)
}

// Open output in external tab
const openInExternalTab = () => {
  if (!props.notaId || !props.blockId || !props.hasOutput) return

  const url = `/output/${props.notaId}/${props.blockId}`
  window.open(url, '_blank')
}

const switchToAIForErrorFix = () => {
  activeOutputView.value = 'ai'
}

const switchToAIForAnalysis = () => {
  activeOutputView.value = 'ai'
}
</script>

<template>
  <div v-if="hasOutput || (!isReadOnly && !isPublished)" class="border-t bg-muted/20">
    <!-- Output/AI Toggle Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-background/50">
      <div class="flex items-center gap-2">
        <!-- Toggle Tabs -->
        <div class="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            @click="activeOutputView = 'output'"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              activeOutputView === 'output' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            ]"
            :disabled="!hasOutput"
          >
            <Box class="w-4 h-4" />
            Output
            <div v-if="hasError" class="w-2 h-2 bg-destructive rounded-full"></div>
            <div v-else-if="hasOutput" class="w-2 h-2 bg-green-500 rounded-full"></div>
          </button>
          
          <button
            v-if="!isReadOnly && !isPublished"
            @click="activeOutputView = 'ai'"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              activeOutputView === 'ai' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <Brain class="w-4 h-4" />
            AI Assistant
            <div v-if="hasError" class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </button>
        </div>
        
        <!-- Status Indicator -->
        <div v-if="activeOutputView === 'output' && hasOutput" class="text-xs text-muted-foreground">
          {{ hasError ? 'Error Output' : 'Execution Result' }}
        </div>
        <div v-else-if="activeOutputView === 'ai'" class="text-xs text-muted-foreground">
          AI-powered code analysis and suggestions
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex items-center gap-1">
        <Button
          v-if="activeOutputView === 'output' && hasOutput"
          variant="ghost"
          size="sm"
          @click="emit('copy-output')"
          class="h-8 px-2"
          title="Copy output"
        >
          <Copy class="w-4 h-4" />
        </Button>
        
        <Button
          v-if="activeOutputView === 'output' && hasOutput && !isPublished"
          variant="ghost"
          size="sm"
          @click="openInExternalTab"
          class="h-8 px-2"
          title="Open output in new tab"
        >
          <ExternalLink class="w-4 h-4" />
        </Button>
        
        <!-- AI Quick Actions -->
        <div v-if="activeOutputView === 'ai' && !isReadOnly" class="flex items-center gap-1">
          <Button
            v-if="hasError"
            variant="ghost"
            size="sm"
            @click="switchToAIForErrorFix"
            class="h-8 px-2 text-destructive hover:bg-destructive/10"
          >
            <AlertTriangle class="w-4 h-4 mr-1" />
            Fix Error
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            @click="switchToAIForAnalysis"
            class="h-8 px-2"
          >
            <Sparkles class="w-4 h-4 mr-1" />
            Analyze
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Content Area -->
    <div class="min-h-[200px] max-h-[400px] overflow-hidden">
      <!-- Output Renderer -->
      <div v-if="activeOutputView === 'output'" class="h-full">
        <OutputRenderer
          v-if="hasOutput"
          :content="output || ''"
          :type="hasError ? 'error' : undefined"
          :showControls="true"
          :isCollapsible="false"
          :maxHeight="'400px'"
          :isLoading="isExecuting && !isPublished"
          :originalCode="code"
          :isPublished="isPublished"
          :notaId="notaId"
          :blockId="blockId"
          @copy="emit('copy-output')"
        />
        <div v-else class="flex items-center justify-center h-48 text-muted-foreground">
          <div class="text-center">
            <Box class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p class="text-sm">No output yet</p>
            <p class="text-xs mt-1">Run the code to see results</p>
          </div>
        </div>
      </div>
      
      <!-- AI Assistant -->
      <div v-else-if="activeOutputView === 'ai'" class="h-full">
        <AICodeAssistantContainer
          :code="code"
          :language="language"
          :error="hasError ? output : null"
          :is-read-only="isReadOnly"
          :block-id="blockId"
          :is-executing="isExecuting"
          :execution-time="executionTime"
          :has-output="hasOutput"
          :session-info="sessionInfo"
          :embedded-mode="true"
          @code-updated="handleAICodeUpdate"
          @analysis-started="() => {}"
          @analysis-completed="() => {}"
          @action-executed="handleCustomActionExecuted"
          @trigger-execution="emit('trigger-execution')"
          @request-execution-context="() => {}"
        />
      </div>
    </div>
  </div>
</template>
