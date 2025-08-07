<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  Lightbulb, 
  Play, 
  Copy, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bug,
  Zap
} from 'lucide-vue-next'
import { useAIActions, type ActionExecutionContext } from '../composables/useAIActions'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'

interface Props {
  error: string
  context: ActionExecutionContext
  aiActions: ReturnType<typeof useAIActions>
  embedded?: boolean
}

interface Emits {
  'action-executed': [actionId: string, result: string]
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
})

const emit = defineEmits<Emits>()

// State
const isAnalyzing = ref(false)
const analysisResult = ref<{
  errorType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggestions: Array<{
    type: 'code' | 'config' | 'dependency' | 'environment'
    title: string
    description: string
    code?: string
    action?: string
  }>
  relatedDocs?: Array<{
    title: string
    url: string
  }>
} | null>(null)

const isExpanded = ref(true)
const selectedSuggestion = ref<number | null>(null)

// Computed
const errorSeverity = computed(() => {
  if (!analysisResult.value) {
    // Quick heuristic based on error content
    const errorLower = props.error.toLowerCase()
    if (errorLower.includes('syntax') || errorLower.includes('indentation')) return 'high'
    if (errorLower.includes('import') || errorLower.includes('module')) return 'medium'
    if (errorLower.includes('warning')) return 'low'
    return 'high'
  }
  return analysisResult.value.severity
})

const errorIcon = computed(() => {
  switch (errorSeverity.value) {
    case 'critical': return AlertTriangle
    case 'high': return Bug
    case 'medium': return AlertTriangle
    case 'low': return Lightbulb
    default: return AlertTriangle
  }
})

const severityColor = computed(() => {
  switch (errorSeverity.value) {
    case 'critical': return 'destructive'
    case 'high': return 'destructive'
    case 'medium': return 'default'
    case 'low': return 'secondary'
    default: return 'destructive'
  }
})

const truncatedError = computed(() => {
  const lines = props.error.split('\n')
  if (lines.length <= 5) return props.error
  return lines.slice(0, 5).join('\n') + '\n...'
})

// Methods
const analyzeError = async () => {
  if (isAnalyzing.value) return
  
  isAnalyzing.value = true
  try {
    // Create a custom action for error analysis
    const analyzeAction: CustomAIAction = {
      id: 'analyze_error',
      name: 'Analyze Error',
      description: 'Analyze the error and provide suggestions',
      icon: 'bug',
      category: 'debugging',
      prompt: `Analyze this error and provide structured suggestions: ${props.error}`,
      isBuiltIn: true,
      isEnabled: true,
      outputType: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Use AI actions to analyze the error
    const result = await props.aiActions.executeAction(analyzeAction)
    
    // Parse the analysis result
    try {
      if (result?.content) {
        analysisResult.value = JSON.parse(result.content)
      } else {
        throw new Error('No content in result')
      }
    } catch {
      // Fallback to simple analysis
      analysisResult.value = {
        errorType: 'Unknown Error',
        severity: errorSeverity.value,
        description: 'Error analysis completed. Check suggestions below.',
        suggestions: [
          {
            type: 'code',
            title: 'Review Error Message',
            description: 'Carefully read the error message for specific details about what went wrong.',
          }
        ]
      }
    }
  } catch (error) {
    console.error('Error analysis failed:', error)
  } finally {
    isAnalyzing.value = false
  }
}

const applySuggestion = async (suggestion: any, index: number) => {
  selectedSuggestion.value = index
  
  if (suggestion.action) {
    try {
      // Create a custom action for applying the suggestion
      const applyAction: CustomAIAction = {
        id: suggestion.action,
        name: suggestion.title || 'Apply Suggestion',
        description: suggestion.description || 'Apply the suggested fix',
        icon: 'play',
        category: 'debugging',
        prompt: `Apply this suggestion: ${suggestion.description}. Error context: ${props.error}`,
        isBuiltIn: true,
        isEnabled: true,
        outputType: 'code',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const result = await props.aiActions.executeAction(applyAction)
      
      emit('action-executed', suggestion.action, result?.content || '')
    } catch (error) {
      console.error('Failed to apply suggestion:', error)
    }
  }
  
  selectedSuggestion.value = null
}

const copyError = async () => {
  try {
    await navigator.clipboard.writeText(props.error)
  } catch (error) {
    console.error('Failed to copy error:', error)
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const searchError = () => {
  const query = encodeURIComponent(props.error.split('\n')[0])
  window.open(`https://stackoverflow.com/search?q=${query}`, '_blank')
}

// Auto-analyze on mount and error change
watch(() => props.error, () => {
  if (props.error && props.aiActions.isProviderConfigured.value) {
    analyzeError()
  }
}, { immediate: true })

onMounted(() => {
  if (props.error && props.aiActions.isProviderConfigured.value) {
    analyzeError()
  }
})
</script>

<template>
  <div class="ai-error-analyzer" :class="{ 'ai-error-analyzer--embedded': embedded }">
    <!-- Error Header -->
    <div class="error-header">
      <div class="error-header-content">
        <div class="error-icon">
          <component :is="errorIcon" class="w-5 h-5" />
        </div>
        
        <div class="error-title">
          <div class="error-main-title">
            {{ analysisResult?.errorType || 'Code Error Detected' }}
          </div>
          <div class="error-subtitle">
            Analyzing and providing solutions
          </div>
        </div>
        
        <Badge :variant="severityColor" class="error-severity">
          {{ errorSeverity.toUpperCase() }}
        </Badge>
      </div>
      
      <div class="error-actions">
        <Button
          @click="copyError"
          variant="ghost"
          size="sm"
          class="error-action-btn"
        >
          <Copy class="w-4 h-4" />
        </Button>
        
        <Button
          @click="searchError"
          variant="ghost"
          size="sm"
          class="error-action-btn"
        >
          <ExternalLink class="w-4 h-4" />
        </Button>
        
        <Button
          @click="toggleExpanded"
          variant="ghost"
          size="sm"
          class="error-action-btn"
        >
          <ChevronDown v-if="!isExpanded" class="w-4 h-4" />
          <ChevronUp v-else class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Error Content -->
    <div v-if="isExpanded" class="error-content">
      <!-- Error Message -->
      <div class="error-message">
        <div class="error-message-header">
          <h4 class="error-section-title">Error Details</h4>
        </div>
        
        <div class="error-text">
          <pre>{{ truncatedError }}</pre>
        </div>
        
        <div v-if="props.error.split('\n').length > 5" class="error-expand">
          <Button
            variant="ghost"
            size="sm"
            class="text-xs"
            @click="() => {}"
          >
            Show full error
          </Button>
        </div>
      </div>

      <Separator />

      <!-- Analysis Section -->
      <div class="error-analysis">
        <div class="error-section-header">
          <h4 class="error-section-title">
            <Lightbulb class="w-4 h-4" />
            AI Analysis
          </h4>
          
          <Button
            v-if="!isAnalyzing && !analysisResult"
            @click="analyzeError"
            variant="outline"
            size="sm"
            :disabled="!aiActions.isProviderConfigured"
          >
            <Zap class="w-4 h-4" />
            Analyze
          </Button>
        </div>

        <!-- Loading State -->
        <div v-if="isAnalyzing" class="analysis-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing error patterns...</div>
        </div>

        <!-- Analysis Results -->
        <div v-else-if="analysisResult" class="analysis-results">
          <div class="analysis-description">
            {{ analysisResult.description }}
          </div>

          <!-- Suggestions -->
          <div v-if="analysisResult.suggestions.length > 0" class="suggestions">
            <h5 class="suggestions-title">Suggested Solutions</h5>
            
            <div class="suggestions-list">
              <div
                v-for="(suggestion, index) in analysisResult.suggestions"
                :key="index"
                class="suggestion-item"
                :class="{ 'suggestion-item--selected': selectedSuggestion === index }"
              >
                <div class="suggestion-header">
                  <div class="suggestion-info">
                    <Badge
                      :variant="suggestion.type === 'code' ? 'default' : 'secondary'"
                      class="suggestion-type"
                    >
                      {{ suggestion.type }}
                    </Badge>
                    <div class="suggestion-title">{{ suggestion.title }}</div>
                  </div>
                  
                  <Button
                    v-if="suggestion.action || suggestion.code"
                    @click="applySuggestion(suggestion, index)"
                    variant="outline"
                    size="sm"
                    :disabled="selectedSuggestion === index"
                    class="suggestion-apply"
                  >
                    <Play class="w-4 h-4" />
                    Apply
                  </Button>
                </div>
                
                <div class="suggestion-description">
                  {{ suggestion.description }}
                </div>
                
                <div v-if="suggestion.code" class="suggestion-code">
                  <pre>{{ suggestion.code }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Related Documentation -->
          <div v-if="analysisResult.relatedDocs?.length" class="related-docs">
            <h5 class="docs-title">Related Documentation</h5>
            <div class="docs-list">
              <a
                v-for="doc in analysisResult.relatedDocs"
                :key="doc.url"
                :href="doc.url"
                target="_blank"
                class="doc-link"
              >
                <ExternalLink class="w-4 h-4" />
                {{ doc.title }}
              </a>
            </div>
          </div>
        </div>

        <!-- No Analysis Available -->
        <div v-else class="no-analysis">
          <div class="no-analysis-text">
            Click "Analyze" to get AI-powered suggestions for fixing this error.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-error-analyzer {
  @apply rounded-xl border border-destructive/20 overflow-hidden;
  background: linear-gradient(135deg, hsl(var(--destructive) / 0.05), hsl(var(--destructive) / 0.02));
}

.ai-error-analyzer--embedded {
  @apply rounded-lg;
}

.error-header {
  @apply flex items-center justify-between p-4 bg-destructive/5 border-b border-destructive/10;
}

.error-header-content {
  @apply flex items-center gap-3 flex-1;
}

.error-icon {
  @apply p-2 rounded-lg bg-destructive/10 text-destructive;
}

.error-title {
  @apply flex-1;
}

.error-main-title {
  @apply text-sm font-semibold text-destructive;
}

.error-subtitle {
  @apply text-xs text-muted-foreground;
}

.error-severity {
  @apply text-xs;
}

.error-actions {
  @apply flex items-center gap-1;
}

.error-action-btn {
  @apply p-2 rounded-lg hover:bg-muted/50;
}

.error-content {
  @apply p-4 space-y-4;
}

.error-message {
  @apply space-y-2;
}

.error-message-header {
  @apply flex items-center justify-between;
}

.error-section-title {
  @apply text-sm font-semibold flex items-center gap-2;
}

.error-text {
  @apply p-3 rounded-lg bg-muted/30 border;
  font-family: 'JetBrains Mono', monospace;
}

.error-text pre {
  @apply text-xs text-destructive whitespace-pre-wrap break-words;
}

.error-expand {
  @apply text-center;
}

.error-analysis {
  @apply space-y-3;
}

.error-section-header {
  @apply flex items-center justify-between;
}

.analysis-loading {
  @apply flex items-center gap-3 p-4 rounded-lg bg-muted/30;
}

.loading-spinner {
  @apply w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin;
}

.loading-text {
  @apply text-sm text-muted-foreground;
}

.analysis-results {
  @apply space-y-4;
}

.analysis-description {
  @apply text-sm text-muted-foreground p-3 rounded-lg bg-muted/20;
}

.suggestions {
  @apply space-y-3;
}

.suggestions-title {
  @apply text-sm font-semibold;
}

.suggestions-list {
  @apply space-y-3;
}

.suggestion-item {
  @apply p-3 rounded-lg border bg-background/50 transition-all duration-200;
}

.suggestion-item--selected {
  @apply border-primary/30 bg-primary/5;
}

.suggestion-header {
  @apply flex items-center justify-between gap-3 mb-2;
}

.suggestion-info {
  @apply flex items-center gap-2 flex-1;
}

.suggestion-type {
  @apply text-xs;
}

.suggestion-title {
  @apply text-sm font-medium;
}

.suggestion-apply {
  @apply gap-2 h-8;
}

.suggestion-description {
  @apply text-sm text-muted-foreground mb-2;
}

.suggestion-code {
  @apply p-2 rounded bg-muted/50 border;
  font-family: 'JetBrains Mono', monospace;
}

.suggestion-code pre {
  @apply text-xs whitespace-pre-wrap;
}

.related-docs {
  @apply space-y-2;
}

.docs-title {
  @apply text-sm font-semibold;
}

.docs-list {
  @apply space-y-1;
}

.doc-link {
  @apply flex items-center gap-2 text-sm text-primary hover:text-primary/80;
  @apply p-2 rounded-lg hover:bg-muted/30 transition-colors;
}

.no-analysis {
  @apply p-4 text-center;
}

.no-analysis-text {
  @apply text-sm text-muted-foreground;
}

/* Responsive */
@media (max-width: 640px) {
  .error-header {
    @apply flex-col items-start gap-3;
  }
  
  .error-header-content {
    @apply w-full;
  }
  
  .error-actions {
    @apply w-full justify-end;
  }
  
  .suggestion-header {
    @apply flex-col items-start gap-2;
  }
  
  .suggestion-info {
    @apply w-full;
  }
}
</style>
