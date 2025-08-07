<script setup lang="ts">
import { computed } from 'vue'
import { 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Info, 
  WrapText,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useOutputManagement } from '@/features/editor/composables/useOutputManagement'
import { toast } from 'vue-sonner'
import OutputRenderer from '../OutputRenderer.vue'
import ErrorRenderer from './ErrorRenderer.vue'
import { isJupyterError } from '@/features/editor/utils/jupyterErrorParser'

interface Props {
  cellId: string
  isReadOnly?: boolean
  isPublished?: boolean
  isExecuting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReadOnly: false,
  isPublished: false,
  isExecuting: false
})

// Use output management composable
const {
  outputInfo,
  formatOutput,
  outputStats,
  preferences,
  isLoading,
  error,
  toggleCollapse,
  toggleMetadata,
  toggleWordWrap,
  clearOutput,
  copyOutput
} = useOutputManagement({ 
  cellId: props.cellId,
  autoSave: true,
  persistOutput: true
})

// Computed properties for UI state
const shouldShowOutput = computed(() => {
  return outputInfo.value.hasOutput || outputInfo.value.hasError
})

const outputTypeDisplay = computed(() => {
  const type = outputInfo.value.type
  switch (type) {
    case 'error': return { label: 'Error', class: 'bg-destructive/10 text-destructive' }
    case 'json': return { label: 'JSON', class: 'bg-blue-500/10 text-blue-700' }
    case 'html': return { label: 'HTML', class: 'bg-orange-500/10 text-orange-700' }
    case 'table': return { label: 'Table', class: 'bg-green-500/10 text-green-700' }
    default: return { label: 'Text', class: 'bg-muted text-muted-foreground' }
  }
})

const statusIcon = computed(() => {
  if (props.isExecuting) return { icon: 'loading', class: 'text-blue-500' }
  if (outputInfo.value.hasError) return { icon: AlertCircle, class: 'text-destructive' }
  if (outputInfo.value.hasOutput) return { icon: CheckCircle, class: 'text-green-600' }
  return { icon: FileText, class: 'text-muted-foreground' }
})

// Action handlers
const handleCopyOutput = async () => {
  try {
    const success = await copyOutput()
    if (success) {
      toast.success('Output copied to clipboard')
    } else {
      toast.error('Nothing to copy')
    }
  } catch (error) {
    toast.error('Failed to copy output')
  }
}

const handleClearOutput = async () => {
  try {
    await clearOutput()
    toast.success('Output cleared')
  } catch (error) {
    toast.error('Failed to clear output')
  }
}
</script>

<template>
  <div v-if="shouldShowOutput" class="border-t bg-card">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
      <div class="flex items-center gap-3">
        <!-- Status and Type -->
        <div class="flex items-center gap-2">
          <component 
            :is="statusIcon.icon === 'loading' ? 'div' : statusIcon.icon" 
            :class="[
              'w-4 h-4',
              statusIcon.class,
              statusIcon.icon === 'loading' ? 'animate-spin border-2 border-current border-t-transparent rounded-full' : ''
            ]"
          />
          <Badge 
            variant="secondary" 
            :class="outputTypeDisplay.class"
            class="text-xs"
          >
            {{ outputTypeDisplay.label }}
          </Badge>
        </div>
        
        <!-- Metadata -->
        <div 
          v-if="preferences.showMetadata && outputInfo.hasOutput" 
          class="hidden sm:flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>{{ outputStats.lines }} lines</span>
          <Separator orientation="vertical" class="h-3" />
          <span>{{ outputStats.size }}</span>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex items-center gap-1">
        <!-- Metadata Toggle -->
        <Button
          v-if="outputInfo.hasOutput"
          variant="ghost"
          size="sm"
          @click="toggleMetadata"
          class="h-8 w-8 p-0"
          :title="preferences.showMetadata ? 'Hide metadata' : 'Show metadata'"
        >
          <component 
            :is="preferences.showMetadata ? EyeOff : Eye" 
            class="h-4 w-4" 
          />
        </Button>
        
        <!-- Word Wrap Toggle -->
        <Button
          v-if="outputInfo.hasOutput && outputInfo.type === 'text'"
          variant="ghost"
          size="sm"
          @click="toggleWordWrap"
          class="h-8 w-8 p-0"
          :title="preferences.wordWrap ? 'Disable word wrap' : 'Enable word wrap'"
        >
          <WrapText 
            class="h-4 w-4" 
            :class="{ 'text-primary': preferences.wordWrap }"
          />
        </Button>
        
        <!-- Copy Output -->
        <Button
          v-if="outputInfo.hasOutput && !isReadOnly"
          variant="ghost"
          size="sm"
          @click="handleCopyOutput"
          class="h-8 w-8 p-0"
          title="Copy output"
          :disabled="isLoading"
        >
          <Copy class="h-4 w-4" />
        </Button>
        
        <!-- Clear Output -->
        <Button
          v-if="outputInfo.hasOutput && !isReadOnly && !isPublished"
          variant="ghost"
          size="sm"
          @click="handleClearOutput"
          class="h-8 w-8 p-0"
          title="Clear output"
          :disabled="isLoading"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
        
        <!-- Collapse Toggle -->
        <Button
          variant="ghost"
          size="sm"
          @click="toggleCollapse"
          class="h-8 w-8 p-0"
          :title="preferences.isCollapsed ? 'Expand output' : 'Collapse output'"
        >
          <component 
            :is="preferences.isCollapsed ? ChevronDown : ChevronUp" 
            class="h-4 w-4" 
          />
        </Button>
      </div>
    </div>
    
    <!-- Metadata Bar (Mobile) -->
    <div 
      v-if="preferences.showMetadata && outputInfo.hasOutput" 
      class="sm:hidden px-4 py-2 bg-muted/10 border-b text-xs text-muted-foreground"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span>{{ outputStats.lines }} lines</span>
          <span>{{ outputStats.characters }} characters</span>
          <span>{{ outputStats.size }}</span>
        </div>
        <div v-if="outputStats.words > 0">
          {{ outputStats.words }} words
        </div>
      </div>
    </div>
    
    <!-- Output Content -->
    <div 
      v-if="!preferences.isCollapsed" 
      class="relative"
    >
      <!-- Loading State -->
      <div 
        v-if="isLoading" 
        class="flex items-center justify-center py-8 text-muted-foreground"
      >
        <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
        Processing...
      </div>
      
      <!-- Error State -->
      <div 
        v-else-if="error" 
        class="p-4 bg-destructive/5 text-destructive border-l-4 border-destructive"
      >
        <div class="flex items-center gap-2 font-medium mb-1">
          <AlertCircle class="w-4 h-4" />
          Error
        </div>
        <div class="text-sm">{{ error }}</div>
      </div>
      
      <!-- Output Content -->
      <div 
        v-else-if="outputInfo.hasOutput" 
        class="relative"
      >
        <!-- Enhanced Error Display for Jupyter Errors -->
        <ErrorRenderer 
          v-if="outputInfo.hasError && isJupyterError(formatOutput)"
          :error="formatOutput"
          :show-full-error="true"
        />
        
        <!-- Regular Output Display -->
        <div 
          v-else
          :class="{ 'font-mono': outputInfo.type === 'text' || outputInfo.type === 'error' }"
        >
          <OutputRenderer
            :content="formatOutput"
            :type="outputInfo.hasError ? 'error' : undefined"
            :show-controls="false"
            :is-collapsible="false"
            :class="{
              'whitespace-pre-wrap': preferences.wordWrap && (outputInfo.type === 'text' || outputInfo.type === 'error'),
              'whitespace-pre': !preferences.wordWrap && (outputInfo.type === 'text' || outputInfo.type === 'error')
            }"
          />
        </div>
      </div>
      
      <!-- Empty State -->
      <div 
        v-else 
        class="flex items-center justify-center py-8 text-muted-foreground"
      >
        <FileText class="w-4 h-4 mr-2" />
        No output to display
      </div>
    </div>
    
    <!-- Collapsed State Info -->
    <div 
      v-if="preferences.isCollapsed && outputInfo.hasOutput" 
      class="px-4 py-2 text-xs text-muted-foreground bg-muted/10"
    >
      Output collapsed ({{ outputStats.lines }} lines, {{ outputStats.size }})
    </div>
  </div>
</template>

<style scoped>
/* Ensure proper scrolling for long outputs */
.output-content {
  max-height: none; /* Remove max height restrictions */
  overflow: visible; /* Allow natural overflow */
}

/* Custom scrollbar for code output */
.font-mono {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.font-mono::-webkit-scrollbar {
  width: 6px;
}

.font-mono::-webkit-scrollbar-track {
  background: transparent;
}

.font-mono::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 3px;
}

/* Responsive text sizing */
@media (max-width: 640px) {
  .font-mono {
    font-size: 0.8rem;
  }
}
</style>