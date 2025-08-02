<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible'

const props = defineProps<{
  error: string
  code?: string
  lineNumber?: number
}>()

const emit = defineEmits<{
  'retry': []
}>()

const isExpanded = ref(false)

// Parse error message to extract useful information
const errorInfo = computed(() => {
  const error = props.error.toLowerCase()
  
  // Common error patterns and their suggestions
  const patterns = [
    {
      pattern: /syntax error/i,
      suggestion: 'Check for missing parentheses, brackets, or semicolons',
      category: 'Syntax'
    },
    {
      pattern: /name.*is not defined/i,
      suggestion: 'Make sure the variable is defined before using it',
      category: 'Reference'
    },
    {
      pattern: /module.*not found/i,
      suggestion: 'Install the required package using pip or your package manager',
      category: 'Import'
    },
    {
      pattern: /indentation error/i,
      suggestion: 'Check your code indentation. Make sure it\'s consistent',
      category: 'Syntax'
    },
    {
      pattern: /type error/i,
      suggestion: 'Check the types of your variables and function arguments',
      category: 'Type'
    }
  ]
  
  // Find matching pattern
  const match = patterns.find(p => p.pattern.test(error))
  
  return {
    category: match?.category || 'Error',
    suggestion: match?.suggestion || 'Review your code for potential issues',
    hasStack: error.includes('traceback') || error.includes('stack')
  }
})

// Format error message for display
const formattedError = computed(() => {
  if (!props.error) return ''
  
  // Split error into lines and format
  return props.error
    .split('\n')
    .map(line => {
      // Highlight error lines
      if (line.includes('Error:') || line.includes('Exception:')) {
        return `<span class="text-red-500 font-medium">${line}</span>`
      }
      // Dim stack trace lines
      if (line.includes('File "') || line.includes('line ')) {
        return `<span class="text-muted-foreground">${line}</span>`
      }
      return line
    })
    .join('\n')
})
</script>

<template>
  <div class="error-display rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
    <div class="p-3">
      <div class="flex items-start gap-2">
        <AlertCircle class="w-5 h-5 text-red-500 mt-0.5" />
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-red-700 dark:text-red-400">
              {{ errorInfo.category }} Error
            </h4>
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                class="h-7 px-2 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                @click="emit('retry')"
              >
                <RefreshCw class="w-4 h-4 mr-1" />
                Retry
              </Button>
              <Collapsible v-model:open="isExpanded">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    <component
                      :is="isExpanded ? ChevronUp : ChevronDown"
                      class="w-4 h-4"
                    />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div class="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <pre
                      class="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono"
                      v-html="formattedError"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          
          <p class="mt-1 text-sm text-red-600 dark:text-red-300">
            {{ errorInfo.suggestion }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-display {
  transition: all 0.2s ease-in-out;
}
</style> 








