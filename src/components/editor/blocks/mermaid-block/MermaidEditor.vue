<template>
  <div class="w-full space-y-3">
    <div class="flex justify-between items-center">
      <span class="text-sm font-medium">Mermaid Diagram Editor</span>
      <Button variant="ghost" size="sm" @click="showHelp = !showHelp">
        <HelpCircle v-if="!showHelp" class="h-4 w-4 mr-1" />
        <X v-else class="h-4 w-4 mr-1" />
        {{ showHelp ? 'Hide Help' : 'Show Help' }}
      </Button>
    </div>
    
    <div v-if="showHelp" class="bg-muted/50 p-3 rounded-md text-xs">
      <p class="font-medium mb-2">Common Diagram Types:</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-1">
          <p class="font-medium text-primary">Flowchart:</p>
          <pre class="bg-background p-2 rounded">graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[OK]
  B -->|No| D[Error]</pre>
        </div>
        <div class="space-y-1">
          <p class="font-medium text-primary">Sequence:</p>
          <pre class="bg-background p-2 rounded">sequenceDiagram
  Alice->>John: Hello John
  John-->>Alice: Hi Alice</pre>
        </div>
      </div>
      <p class="mt-3 text-muted-foreground">Visit <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" class="text-primary underline">Mermaid Docs</a> for more examples.</p>
    </div>
    
    <Textarea
      v-model="localValue"
      class="font-mono min-h-[150px] resize-y"
      placeholder="Enter mermaid diagram code..."
      @input="onInput"
    />
    
    <div v-if="error" class="text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
      <p class="text-destructive font-medium mb-1">Syntax Error</p>
      <pre class="whitespace-pre-wrap text-xs overflow-x-auto">{{ formatError(error) }}</pre>
      <div v-if="errorLine > 0" class="mt-2 text-xs">
        <p class="text-muted-foreground mb-1">Try these common fixes:</p>
        <ul class="list-disc pl-5 text-muted-foreground">
          <li>Check for missing closing brackets or parentheses</li>
          <li>Ensure node IDs are properly defined</li>
          <li>Remove any special characters from labels</li>
          <li>Make sure your arrows have proper start and end nodes</li>
        </ul>
      </div>
    </div>
    
    <div v-if="isValid" class="text-sm text-green-600 dark:text-green-500 flex items-center gap-2">
      <CheckCircle class="h-4 w-4" />
      <span>Diagram syntax is valid</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useMermaid } from './useMermaid'
import { useDebounce } from '@vueuse/core'
import { CheckCircle, HelpCircle, X } from 'lucide-vue-next'

type MermaidValue = string | { diagram: string } | any;

const props = defineProps<{
  modelValue: MermaidValue
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Convert potential object value to string
const actualModelValue = computed((): string => {
  if (typeof props.modelValue === 'object' && props.modelValue !== null) {
    if ('diagram' in props.modelValue) {
      return props.modelValue.diagram || '';
    }
    return '';
  }
  return props.modelValue || '';
});

const localValue = ref(actualModelValue.value)
const isValid = ref(false)
const error = ref('')
const errorLine = ref(0)
const isValidating = ref(false)
const showHelp = ref(false)

// Use debounced value for validation
const debouncedValue = useDebounce(localValue, 500)

const { validateContent } = useMermaid(debouncedValue)

// Format error message to make it more readable
const formatError = (errorMessage: string) => {
  if (!errorMessage) return '';
  
  // Extract line number if present
  const lineMatch = errorMessage.match(/line\s+(\d+)/i);
  if (lineMatch && lineMatch[1]) {
    errorLine.value = parseInt(lineMatch[1], 10);
  } else {
    errorLine.value = 0;
  }
  
  // Remove common error prefixes
  return errorMessage
    .replace(/^Parse error on /i, '')
    .replace(/^Error: Parse error on /i, '')
    .replace(/\n-+\^/, '')
    .replace(/Expecting '.+', got '[^']+'$/, 'Syntax error in diagram structure');
}

const onInput = async () => {
  emit('update:modelValue', localValue.value)
}

// Watch for changes in the debounced value to validate
watch(debouncedValue, async (newValue) => {
  if (!newValue) {
    isValid.value = false
    error.value = ''
    return
  }
  
  isValidating.value = true
  try {
    const [valid, errorMsg] = await validateContent(newValue)
    isValid.value = valid
    error.value = valid ? '' : (errorMsg || 'Invalid mermaid syntax')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Validation error'
    isValid.value = false
  } finally {
    isValidating.value = false
  }
})

// Watch for prop changes
watch(actualModelValue, (newValue) => {
  if (newValue !== localValue.value) {
    localValue.value = newValue
  }
})

onMounted(() => {
  // Validate on initial mount
  if (localValue.value) {
    validateContent(localValue.value).then(([valid, errorMsg]) => {
      isValid.value = valid
      error.value = valid ? '' : (errorMsg || 'Invalid mermaid syntax')
    })
  }
})
</script> 