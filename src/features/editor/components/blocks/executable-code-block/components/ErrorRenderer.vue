<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, Info, Lightbulb, Copy, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { parseJupyterError, formatErrorForDisplay, isJupyterError } from '@/features/editor/utils/jupyterErrorParser'
import { toast } from 'vue-sonner'
import { ref } from 'vue'

interface Props {
  error: string
  showFullError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFullError: false
})

const isDetailsOpen = ref(false)

// Parse the error
const parsedError = computed(() => {
  if (!props.error) return null
  return parseJupyterError(props.error)
})

// Format for display
const formattedError = computed(() => {
  if (!parsedError.value) return null
  return formatErrorForDisplay(parsedError.value)
})

// Check if this is a Jupyter error
const isJupyterErr = computed(() => isJupyterError(props.error))

// Error type styling
const errorTypeStyle = computed(() => {
  if (!parsedError.value) return { class: 'bg-destructive/10 text-destructive', icon: AlertCircle }
  
  switch (parsedError.value.type) {
    case 'syntax':
      return { class: 'bg-red-500/10 text-red-700', icon: AlertCircle }
    case 'runtime':
      return { class: 'bg-orange-500/10 text-orange-700', icon: AlertCircle }
    case 'import':
      return { class: 'bg-yellow-500/10 text-yellow-700', icon: AlertCircle }
    case 'timeout':
      return { class: 'bg-purple-500/10 text-purple-700', icon: AlertCircle }
    case 'kernel':
      return { class: 'bg-gray-500/10 text-gray-700', icon: AlertCircle }
    default:
      return { class: 'bg-destructive/10 text-destructive', icon: AlertCircle }
  }
})

// Copy error to clipboard
const copyError = async () => {
  try {
    await navigator.clipboard.writeText(props.error)
    toast.success('Error copied to clipboard')
  } catch (err) {
    toast.error('Failed to copy error')
  }
}
</script>

<template>
  <div v-if="error" class="border-l-4 border-destructive bg-destructive/5 p-4 space-y-3">
    <!-- Error Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0 flex-1">
        <!-- Error Icon -->
        <component 
          :is="errorTypeStyle.icon" 
          class="w-5 h-5 mt-0.5 flex-shrink-0 text-destructive" 
        />
        
        <!-- Error Content -->
        <div class="min-w-0 flex-1">
          <!-- Error Title and Type -->
          <div class="flex items-center gap-2 mb-2">
            <h4 class="font-medium text-destructive">
              {{ formattedError?.title || 'Execution Error' }}
            </h4>
            <Badge 
              v-if="parsedError" 
              variant="secondary" 
              :class="errorTypeStyle.class"
              class="text-xs"
            >
              {{ parsedError.type }}
            </Badge>
          </div>
          
          <!-- Main Error Message -->
          <div class="text-sm text-destructive/90 mb-2">
            {{ formattedError?.message || error }}
          </div>
          
          <!-- Suggestion -->
          <div 
            v-if="formattedError?.suggestion" 
            class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md"
          >
            <Lightbulb class="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <strong class="font-medium">Suggestion:</strong>
              {{ formattedError.suggestion }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Copy Button -->
      <Button
        variant="ghost"
        size="sm"
        @click="copyError"
        class="h-8 w-8 p-0 flex-shrink-0"
        title="Copy error to clipboard"
      >
        <Copy class="h-4 w-4" />
      </Button>
    </div>
    
    <!-- Error Details (Collapsible) -->
    <div v-if="formattedError?.details || showFullError">
      <Collapsible v-model:open="isDetailsOpen">
        <CollapsibleTrigger as-child>
          <Button variant="ghost" size="sm" class="h-auto p-2 justify-start gap-2 text-muted-foreground hover:text-foreground">
            <component 
              :is="isDetailsOpen ? ChevronDown : ChevronRight" 
              class="h-4 w-4" 
            />
            <span class="text-xs">
              {{ isDetailsOpen ? 'Hide' : 'Show' }} full error details
            </span>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent class="pt-2">
          <div class="bg-muted/50 rounded-md p-3 border">
            <div class="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Info class="w-3 h-3" />
              Full Error Details
            </div>
            <pre class="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">{{
              formattedError?.details || error
            }}</pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
    
    <!-- Raw Error for Non-Jupyter Errors -->
    <div v-else-if="!isJupyterErr && showFullError">
      <div class="bg-muted/50 rounded-md p-3 border">
        <div class="text-xs text-muted-foreground mb-2">Raw Error Output:</div>
        <pre class="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{{ error }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced code formatting */
pre {
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

pre::-webkit-scrollbar {
  width: 6px;
}

pre::-webkit-scrollbar-track {
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 3px;
}
</style>