<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Check, X, Copy, ArrowRight, AlertTriangle, Settings } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import { useAiCodeFixer } from './composables/useAiCodeFixer'

interface Props {
  originalCode: string
  errorOutput: string
  isOpen: boolean
  language: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'close': []
  'apply-fix': [fixedCode: string]
}>()

const {
  isLoading,
  fixedCode,
  explanation,
  isCopied,
  hasError,
  errorMessage,
  provider,
  generateAiFix,
  copyFixedCode,
  goToAISettings,
  retryGeneration,
  getDiffSummary
} = useAiCodeFixer()

// Initialize
onMounted(() => {
  generateAiFix(props.originalCode, props.errorOutput, props.language)
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
    <div class="container flex items-center justify-center min-h-screen">
      <div class="w-full max-w-3xl bg-background rounded-lg shadow-lg border">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <h3 class="text-lg font-semibold">AI Code Fix</h3>
          <Button variant="ghost" size="icon" @click="$emit('close')">
            <X class="h-4 w-4" />
          </Button>
        </div>
        
        <!-- Loading state -->
        <div v-if="isLoading" class="p-6">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            <h4 class="text-lg font-medium">AI Analysis in Progress</h4>
            <p class="text-sm text-muted-foreground">Analyzing your code and generating a fix...</p>
            <div class="w-full max-w-sm space-y-2">
              <div class="flex items-center space-x-2">
                <div class="h-2 w-2 rounded-full bg-primary"></div>
                <span class="text-sm">Analyzing error</span>
              </div>
              <div class="flex items-center space-x-2 opacity-50">
                <div class="h-2 w-2 rounded-full bg-muted"></div>
                <span class="text-sm">Identifying issues</span>
              </div>
              <div class="flex items-center space-x-2 opacity-50">
                <div class="h-2 w-2 rounded-full bg-muted"></div>
                <span class="text-sm">Generating fix</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Error state -->
        <div v-else-if="hasError" class="p-6">
          <div class="flex flex-col items-center justify-center space-y-4">
            <AlertTriangle class="h-12 w-12 text-destructive" />
            <div class="text-center">
              <h4 class="text-lg font-medium mb-2">Failed to Generate Fix</h4>
              <p class="text-sm text-muted-foreground">{{ errorMessage }}</p>
            </div>
            
            <!-- WebLLM specific guidance -->
            <div v-if="errorMessage.includes('WebLLM is not loaded')" class="w-full max-w-sm space-y-4">
              <div class="space-y-2">
                <div class="flex items-center space-x-2">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span class="text-sm font-medium">1</span>
                  </div>
                  <span class="text-sm">Go to AI Settings</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span class="text-sm font-medium">2</span>
                  </div>
                  <span class="text-sm">Select the WebLLM tab</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span class="text-sm font-medium">3</span>
                  </div>
                  <span class="text-sm">Choose and load a model</span>
                </div>
              </div>
            </div>
            
            <div class="flex space-x-2">
              <Button variant="outline" @click="$emit('close')">
                <X class="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button variant="default" @click="retryGeneration(props.originalCode, props.errorOutput, props.language)">
                <ArrowRight class="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
              <Button 
                v-if="errorMessage.includes('WebLLM is not loaded')" 
                variant="default" 
                @click="goToAISettings"
              >
                <Settings class="h-3.5 w-3.5 mr-1" />
                Open AI Settings
              </Button>
            </div>
          </div>
        </div>
        
        <!-- Results -->
        <div v-else class="divide-y">
          <!-- Explanation -->
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-medium">AI Analysis</h4>
              <div v-if="provider" class="text-xs text-muted-foreground">
                Generated by {{ provider }}
              </div>
            </div>
            <p class="text-sm text-muted-foreground">{{ explanation }}</p>
          </div>
          
          <!-- Code comparison -->
          <div class="p-6 space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">Original Code</h4>
                <div class="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                  Has Errors
                </div>
              </div>
              <div class="rounded-md border">
                <CodeMirror
                  :modelValue="props.originalCode"
                  :language="props.language"
                  :readonly="true"
                  maxHeight="200px"
                />
              </div>
            </div>
            
            <div class="flex items-center justify-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                <ArrowRight class="h-4 w-4" />
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">Fixed Code</h4>
                <div class="flex items-center space-x-2">
                  <div class="text-xs text-muted-foreground">
                    {{ getDiffSummary(props.originalCode) }}
                  </div>
                  <Button variant="ghost" size="sm" @click="copyFixedCode">
                    <Copy v-if="!isCopied" class="h-3.5 w-3.5 mr-1" />
                    <Check v-else class="h-3.5 w-3.5 mr-1" />
                    {{ isCopied ? 'Copied!' : 'Copy' }}
                  </Button>
                </div>
              </div>
              <div class="rounded-md border">
                <CodeMirror
                  :modelValue="fixedCode"
                  :language="props.language"
                  :readonly="true"
                  maxHeight="200px"
                />
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="p-6 bg-muted/50 rounded-b-lg flex justify-end space-x-2">
            <Button variant="outline" @click="$emit('close')">
              Cancel
            </Button>
            <Button variant="default" @click="$emit('apply-fix', fixedCode)">
              Apply Fix
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
</style> 