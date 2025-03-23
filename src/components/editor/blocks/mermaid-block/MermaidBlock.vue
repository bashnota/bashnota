<template>
  <node-view-wrapper 
    class="relative w-full" 
    :class="{ 'p-4 border rounded-md shadow-sm': !isReadOnly, 'my-4': isReadOnly }"
  >
    <!-- Controls -->
    <div 
      v-if="!isReadOnly" 
      class="flex items-center justify-between mb-3 gap-2"
    >
      <div class="flex items-center gap-2">
        <Select v-if="isEditing" v-model="mermaidTheme" class="w-32">
          <SelectTrigger>
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="forest">Forest</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex gap-2">
        <Button
          v-if="isEditing"
          variant="outline"
          size="sm"
          @click="cancelEdit"
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="toggleEditMode"
          :disabled="isRendering"
        >
          {{ isEditing ? 'Save & Preview' : 'Edit' }}
        </Button>
      </div>
    </div>

    <!-- Editor -->
    <div v-if="isEditing && !isReadOnly">
      <MermaidEditor
        v-model="localContent"
        @update:modelValue="onContentChange"
      />
    </div>

    <!-- Display -->
    <div v-else class="w-full overflow-x-auto">
      <div v-if="isRendering" class="py-6 flex justify-center items-center">
        <Spinner class="size-6 text-muted-foreground" />
      </div>
      <div v-else-if="renderError" class="p-4 text-sm bg-destructive/10 rounded-md border border-destructive/20">
        <div class="flex items-start gap-2">
          <AlertTriangle class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div class="w-full">
            <p class="font-medium text-destructive">Error rendering diagram</p>
            <div v-if="errorDetails.errorLine > 0" class="mt-2 bg-background/50 p-2 rounded text-xs font-mono">
              <div class="flex items-start gap-1">
                <div class="text-muted-foreground">{{ errorDetails.errorLine }}:</div>
                <pre class="whitespace-pre-wrap break-all">{{ errorDetails.errorLineContent }}</pre>
              </div>
              <div v-if="errorDetails.errorPosition > 0" class="pl-5 text-destructive">
                {{ '~'.repeat(Math.max(0, errorDetails.errorPosition - 1)) }}^
              </div>
            </div>
            <pre v-if="renderError" class="mt-2 text-xs whitespace-pre-wrap bg-background/50 p-2 rounded">{{ formatErrorMessage(renderError) }}</pre>
            <div class="mt-3 space-y-1">
              <Button 
                v-if="!isReadOnly" 
                variant="secondary" 
                size="sm" 
                class="h-8 w-full" 
                @click="toggleEditMode"
              >
                <Pencil class="mr-1 h-3 w-3" />
                Edit diagram
              </Button>
              <Button 
                v-if="!isReadOnly" 
                variant="outline" 
                size="sm" 
                class="h-8 w-full" 
                @click="resetToDefaultExample"
              >
                <RefreshCw class="mr-1 h-3 w-3" />
                Reset to example
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="nodeContent" ref="mermaidRef" class="mermaid">
        {{ nodeContent }}
      </div>
      <p v-else class="text-sm text-muted-foreground p-4 text-center">
        No diagram content. Click "Edit" to add one.
      </p>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import MermaidEditor from './MermaidEditor.vue'
import { useMermaid, type UseMermaidOptions } from './useMermaid'
import type { MermaidBlockProps, MermaidTheme } from './types'
import { Loader2 as Spinner, AlertTriangle, Pencil, RefreshCw } from 'lucide-vue-next'

// Default example for a valid diagram
const DEFAULT_EXAMPLE = `graph TD
    A[Start] --> B{Is it valid?}
    B -->|Yes| C[OK]
    B -->|No| D[Error]
    C --> E[End]
    D --> E`;

const props = defineProps<MermaidBlockProps>()

const isEditing = ref(false)
const localContent = ref('')
const mermaidTheme = ref<MermaidTheme>('default')
const hasContentChanged = ref(false)

// Computed properties
const nodeContent = computed(() => {
  const content = props.node.attrs.content
  // Handle both string and object formats
  if (typeof content === 'object' && content !== null && content && 'diagram' in (content as any)) {
    return (content as any).diagram
  }
  return content || ''
})

// Initialize local content from node content
onMounted(() => {
  localContent.value = nodeContent.value
})

const isReadOnly = computed(() => !props.editor.isEditable)

// Setup mermaid renderer
const mermaidOptions = computed<UseMermaidOptions>(() => ({
  theme: mermaidTheme.value,
  securityLevel: 'loose'
}))

const { 
  mermaidRef, 
  renderMermaid, 
  renderError, 
  isRendering 
} = useMermaid(nodeContent, mermaidOptions.value)

// Extract error details from the error message
const errorDetails = computed(() => {
  const result = {
    errorLine: 0,
    errorLineContent: '',
    errorPosition: 0
  }
  
  if (!renderError.value) return result
  
  // Try to extract line number from error
  const lineMatch = renderError.value.match(/line\s+(\d+)/i)
  if (lineMatch && lineMatch[1]) {
    result.errorLine = parseInt(lineMatch[1], 10)
  }
  
  // Try to find the problematic line in the content
  if (result.errorLine > 0 && nodeContent.value) {
    const lines = nodeContent.value.split('\n')
    if (lines.length >= result.errorLine) {
      result.errorLineContent = lines[result.errorLine - 1]
      
      // Try to extract the position of the error from the caret indication
      const positionMatch = renderError.value.match(/\n(-+)\^/)
      if (positionMatch && positionMatch[1]) {
        result.errorPosition = positionMatch[1].length + 1
      }
    }
  }
  
  return result
})

// Format error message for display
const formatErrorMessage = (error: string | null): string => {
  if (!error) return 'Unknown error';
  
  // Simplify common error messages
  return error
    .replace(/^Error: /, '')
    .replace(/Parse error on line \d+:\n/, 'Syntax error: ')
    .replace(/\n-+\^/, '')
    .replace(/Expecting .+$/, 'Invalid syntax')
    .substring(0, 150) + (error.length > 150 ? '...' : '');
};

// Save the content back to the node
const saveContent = () => {
  if (hasContentChanged.value) {
    // Ensure we're saving a string, not an object
    props.updateAttributes({ content: localContent.value })
    hasContentChanged.value = false
  }
}

// Handle content changes
const onContentChange = (newContent: string) => {
  localContent.value = newContent
  hasContentChanged.value = true
}

// Toggle edit mode
const toggleEditMode = () => {
  if (isEditing.value) {
    saveContent()
  }
  isEditing.value = !isEditing.value
}

// Cancel edit
const cancelEdit = () => {
  localContent.value = nodeContent.value
  hasContentChanged.value = false
  isEditing.value = false
}

// Reset to default example
const resetToDefaultExample = () => {
  localContent.value = DEFAULT_EXAMPLE
  hasContentChanged.value = true
  saveContent()
  nextTick(() => renderMermaid())
}

// Watch for edit mode changes
watch(isEditing, (newValue) => {
  if (!newValue && hasContentChanged.value) {
    saveContent()
  }
  
  if (!newValue) {
    nextTick(() => renderMermaid())
  }
})

// Watch for theme changes to re-render
watch(mermaidTheme, () => {
  if (!isEditing.value) {
    nextTick(() => renderMermaid())
  }
})

// Watch for read-only mode changes
watch(isReadOnly, (newValue) => {
  if (newValue && isEditing.value) {
    isEditing.value = false
  }
  nextTick(() => renderMermaid())
})

// Watch for selected state
watch(() => props.selected, (newValue) => {
  if (newValue && !isEditing.value && !isReadOnly.value) {
    renderMermaid()
  }
})

onMounted(() => {
  nextTick(() => renderMermaid())
})
</script>
