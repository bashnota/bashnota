<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog'
import { Alert, AlertDescription } from '@/ui/alert'
import { Separator } from '@/ui/separator'
import { ScrollArea } from '@/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible'
import { 
  Brain, 
  Sparkles, 
  Shield, 
  Zap, 
  MessageSquare, 
  Code2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Wand2,
  FileText,
  Settings,
  TrendingUp,
  Play,
  X,
  MoreHorizontal,
  Wrench,
  TestTube,
  Edit
} from 'lucide-vue-next'

interface Props {
  code: string
  language: string
  error?: string | null
  isReadOnly?: boolean
  blockId: string
  // 🔥 NEW: Execution context props
  isExecuting?: boolean
  executionTime?: number
  hasOutput?: boolean
  sessionInfo?: {
    sessionId?: string
    kernelName?: string
  }
}

interface Emits {
  'code-updated': [code: string]
  'analysis-started': []
  'analysis-completed': []
  'action-executed': [actionId: string, result: string]
  // 🔥 NEW: Enhanced execution integration
  'trigger-execution': []
  'request-execution-context': []
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  isReadOnly: false,
  isExecuting: false,
  executionTime: 0,
  hasOutput: false
})

const emit = defineEmits<Emits>()

// AI Actions Store
const aiActionsStore = useAIActionsStore()

// Local state
const isVisible = ref(false)
const activeTab = ref<'quick-actions' | 'custom-actions' | 'error-assistance'>('quick-actions')
const isAnalyzing = ref(false)
const analysisResults = ref<Record<string, any>>({})
const copiedStates = ref<Record<string, boolean>>({})
const expandedSections = ref<Record<string, boolean>>({})
const executingActions = ref<Set<string>>(new Set())
const actionResults = ref<Record<string, string>>({})

// Computed
const hasError = computed(() => !!props.error)
const hasAnalysisResults = computed(() => Object.keys(analysisResults.value).length > 0)
// 🔥 UPDATED: Use only code-focused actions
const enabledBuiltInActions = computed(() => 
  aiActionsStore.codeActions.filter(action => action.isBuiltIn)
)
const enabledCustomActions = computed(() => 
  aiActionsStore.codeActions.filter(action => !action.isBuiltIn)
)
const categorizedActions = computed(() => aiActionsStore.codeActionsByCategory)
const isProviderConfigured = computed(() => aiActionsStore.isProviderConfigured())
const providerConfigMessage = computed(() => aiActionsStore.getProviderConfigurationMessage())

// 🔥 NEW: WebLLM loading state awareness
const isWebLLMLoading = computed(() => {
  return aiActionsStore.state.providerSettings.provider === 'webllm' && 
         aiActionsStore.state.isLoading &&
         Object.values(actionResults.value).some(result => 
           typeof result === 'string' && result.includes('Auto-selecting')
         )
})

// 🔥 NEW: Execution-aware computed properties
const executionStatus = computed(() => {
  if (props.isExecuting) return 'executing'
  if (props.error) return 'error'
  if (props.hasOutput) return 'completed'
  return 'idle'
})

const executionContextSummary = computed(() => {
  if (!props.sessionInfo?.sessionId) return null
  return {
    session: props.sessionInfo.sessionId,
    kernel: props.sessionInfo.kernelName || 'Unknown',
    executionTime: props.executionTime || 0,
    hasOutput: props.hasOutput
  }
})

// Auto-set active tab based on context
watch(() => props.error, (newError) => {
  if (newError && isVisible.value) {
    activeTab.value = 'error-assistance'
    analyzeError()
  }
}, { immediate: true })

// Methods
const toggleVisibility = () => {
  isVisible.value = !isVisible.value
  if (isVisible.value && hasError.value) {
    activeTab.value = 'error-assistance'
  }
}

const executeAction = async (action: CustomAIAction) => {
  if (executingActions.value.has(action.id) || !props.code.trim()) return

  executingActions.value.add(action.id)
  
  try {
    emit('analysis-started')
    
    // 🔥 NEW: Enhanced context with execution metadata
    const context = {
      code: props.code,
      language: props.language,
      error: props.error || undefined,
      // Include execution context when available
      executionTime: props.executionTime,
      sessionId: props.sessionInfo?.sessionId,
      kernelName: props.sessionInfo?.kernelName,
      hasOutput: props.hasOutput
    }
    
    const result = await aiActionsStore.executeCustomAction(action.id, context)
    
    actionResults.value[action.id] = result
    emit('action-executed', action.id, result)
    
    // Auto-apply code if the action outputs code and we're not readonly
    if (action.outputType === 'code' && !props.isReadOnly && result.includes('```')) {
      const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/)
      if (codeMatch && codeMatch[1]) {
        emit('code-updated', codeMatch[1].trim())
      }
    }
    
  } catch (error) {
    console.error(`Failed to execute action ${action.id}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    actionResults.value[action.id] = `Error: ${errorMessage}`
    
    // 🔥 NEW: Enhanced error handling for WebLLM
    if (errorMessage.includes('WebLLM') || errorMessage.includes('not initialized')) {
      // Show WebLLM-specific error with helpful actions
      showWebLLMError(errorMessage)
    }
  } finally {
    executingActions.value.delete(action.id)
    emit('analysis-completed')
  }
}

const analyzeError = async () => {
  if (!props.error || !props.code.trim()) return
  
  const errorAction = enabledBuiltInActions.value.find(action => action.id === 'fix-error')
  if (errorAction) {
    await executeAction(errorAction)
  }
}

const runComprehensiveAnalysis = async () => {
  if (!props.code.trim()) return
  
  isAnalyzing.value = true
  emit('analysis-started')
  
  try {
    // 🔥 UPDATED: Execute key code analysis actions
    const keyAnalysisActions = [
      categorizedActions.value.analysis.find(a => a.id === 'explain-code'),
      categorizedActions.value.analysis.find(a => a.id === 'code-review'),
      categorizedActions.value.analysis.find(a => a.id === 'security-review'),
      categorizedActions.value.analysis.find(a => a.id === 'analyze-complexity')
    ].filter(Boolean) as CustomAIAction[]
    
    await Promise.all(keyAnalysisActions.map(action => executeAction(action)))
  } finally {
    isAnalyzing.value = false
    emit('analysis-completed')
  }
}

const copyToClipboard = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedStates.value[key] = true
    setTimeout(() => {
      copiedStates.value[key] = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const applyCodeFromResult = (result: string) => {
  if (props.isReadOnly) return
  
  // Extract code from markdown code blocks
  const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/)
  if (codeMatch && codeMatch[1]) {
    emit('code-updated', codeMatch[1].trim())
  }
}

const clearResults = () => {
  actionResults.value = {}
  analysisResults.value = {}
}

// 🔥 NEW: WebLLM-specific error handling
const showWebLLMError = (errorMessage: string) => {
  // You can expand this to show toast notifications or modals
  console.warn('WebLLM Error:', errorMessage)
  
  // For now, just log helpful guidance
  if (errorMessage.includes('not initialized')) {
    console.info('💡 WebLLM Fix: Go to Settings > AI Assistant > AI Providers to load a model or enable auto-loading')
  }
  
  if (errorMessage.includes('auto-loading is disabled')) {
    console.info('💡 WebLLM Fix: Enable auto-loading in AI Provider settings or manually select a model')
  }
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Brain,
    // 🔥 NEW: Add missing icons for new actions
    RefreshCw,
    TrendingUp,
    Eye,
    ArrowLeftRight: RefreshCw, // Fallback since ArrowLeftRight might not be imported
    MessageSquare,
    Wrench,
    Zap,
    FileText,
    Shield,
    TestTube,
    Code2,
    Edit,
    Play
  }
  return iconMap[iconName] || Brain
}

const formatResult = (result: string) => {
  // Split by code blocks and format appropriately
  const parts = result.split(/(```[\w]*\n[\s\S]*?\n```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      // This is a code block
      const codeContent = part.match(/```[\w]*\n([\s\S]*?)\n```/)?.[1] || part
      return {
        type: 'code' as const,
        content: codeContent.trim()
      }
    } else if (part.trim()) {
      // This is regular text
      return {
        type: 'text' as const,
        content: part.trim()
      }
    }
    return null
  }).filter((part): part is { type: 'code' | 'text'; content: string } => part !== null)
}

const getPriorityBadgeClass = (actionId: string) => {
  if (actionId === 'fix-error') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  if (actionId === 'security-review') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  if (actionId === 'optimize-performance') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

// Initialize on mount
onMounted(() => {
  if (hasError.value) {
    activeTab.value = 'error-assistance'
  }
})
</script>

<template>
  <div class="ai-code-assistant">
    <!-- Toggle Button -->
    <Button
      @click="toggleVisibility"
      variant="outline"
      size="sm"
      class="gap-2"
      :class="{ 'bg-primary/10 border-primary': isVisible }"
    >
      <Brain class="h-4 w-4" />
      AI Assistant
      <Badge v-if="hasError" variant="destructive" class="ml-1">Error</Badge>
      <Badge v-else-if="hasAnalysisResults" variant="secondary" class="ml-1">Results</Badge>
    </Button>

    <!-- AI Assistant Panel -->
    <Collapsible v-model:open="isVisible">
      <CollapsibleContent>
        <Card class="mt-4 border-l-4 border-l-primary">
          <CardHeader class="pb-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary/10">
                  <Brain class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle class="text-lg">AI Code Assistant</CardTitle>
                  <CardDescription>
                    AI-powered code analysis, error fixing, and enhancement
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" @click="isVisible = false">
                <X class="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Provider Configuration Alert -->
            <Alert v-if="!isProviderConfigured" variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertDescription>
                {{ providerConfigMessage }}
                <Button 
                  @click="$router.push('/settings?section=ai-providers')"
                  variant="link" 
                  size="sm" 
                  class="p-0 h-auto ml-2"
                >
                  Configure Now
                </Button>
              </AlertDescription>
            </Alert>

            <!-- 🔥 NEW: WebLLM-specific error guidance -->
            <Alert v-if="aiActionsStore.state.providerSettings.provider === 'webllm' && Object.values(actionResults).some(result => typeof result === 'string' && (result.includes('WebLLM') || result.includes('not initialized')))" class="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <Brain class="h-4 w-4" />
              <AlertDescription>
                <strong>WebLLM Model Required:</strong> WebLLM needs a model to be loaded before it can assist with code analysis.
                <div class="flex gap-2 mt-2">
                  <Button 
                    @click="$router.push('/settings?section=ai-providers')"
                    variant="outline" 
                    size="sm"
                  >
                    Load WebLLM Model
                  </Button>
                  <Button 
                    @click="$router.push('/settings?section=ai-providers')"
                    variant="outline" 
                    size="sm"
                  >
                    Switch AI Provider
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <!-- 🔥 NEW: WebLLM Auto-Loading Indicator -->
            <Alert v-if="isWebLLMLoading" class="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <Loader2 class="h-4 w-4 animate-spin" />
              <AlertDescription>
                <strong>Loading WebLLM Model:</strong> Auto-selecting and loading a suitable AI model for code assistance. This may take a moment...
              </AlertDescription>
            </Alert>

            <!-- 🔥 NEW: Execution Status Indicator -->
            <div v-if="executionContextSummary || isExecuting" class="p-3 bg-muted/50 rounded-lg border">
              <div class="flex items-center gap-2 text-sm">
                <div class="flex items-center gap-1">
                  <div class="w-2 h-2 rounded-full" :class="{
                    'bg-green-500': executionStatus === 'completed',
                    'bg-red-500': executionStatus === 'error',
                    'bg-yellow-500 animate-pulse': executionStatus === 'executing',
                    'bg-gray-400': executionStatus === 'idle'
                  }"></div>
                  <span class="font-medium">{{ 
                    executionStatus === 'executing' ? 'Executing...' :
                    executionStatus === 'error' ? 'Error Detected' :
                    executionStatus === 'completed' ? 'Execution Complete' : 'Ready'
                  }}</span>
                </div>
                <div v-if="executionContextSummary" class="text-muted-foreground">
                  • {{ executionContextSummary.kernel }} 
                  <span v-if="executionContextSummary.executionTime > 0">
                    • {{ executionContextSummary.executionTime }}ms
                  </span>
                  <span v-if="executionContextSummary.hasOutput">
                    • Has Output
                  </span>
                </div>
              </div>
            </div>

            <!-- Tab Navigation -->
            <div class="flex flex-wrap gap-2 border-b">
              <Button
                @click="activeTab = 'quick-actions'"
                variant="ghost"
                size="sm"
                :class="{ 'border-b-2 border-primary': activeTab === 'quick-actions' }"
              >
                <Sparkles class="h-4 w-4 mr-2" />
                Quick Actions
              </Button>
              
              <Button
                @click="activeTab = 'custom-actions'"
                variant="ghost"
                size="sm"
                :class="{ 'border-b-2 border-primary': activeTab === 'custom-actions' }"
              >
                <Settings class="h-4 w-4 mr-2" />
                Custom Actions
              </Button>
              
              <Button
                v-if="hasError"
                @click="activeTab = 'error-assistance'"
                variant="ghost"
                size="sm"
                :class="{ 'border-b-2 border-primary': activeTab === 'error-assistance' }"
              >
                <AlertTriangle class="h-4 w-4 mr-2" />
                Error Fix
                <Badge variant="destructive" class="ml-2">!</Badge>
              </Button>
            </div>

            <!-- Quick Actions Tab -->
            <div v-if="activeTab === 'quick-actions'" class="space-y-4">
              <!-- 🔥 UPDATED: Code-focused quick actions -->
              <div class="space-y-3">
                <h4 class="text-sm font-medium text-muted-foreground">Analysis & Review</h4>
                <div class="flex flex-wrap gap-2">
                  <Button
                    @click="runComprehensiveAnalysis"
                    :disabled="!code.trim() || isAnalyzing || !isProviderConfigured"
                    size="sm"
                    class="gap-2"
                  >
                    <Brain v-if="!isAnalyzing" class="h-4 w-4" />
                    <Loader2 v-else class="h-4 w-4 animate-spin" />
                    Full Analysis
                  </Button>

                  <Button
                    v-for="action in categorizedActions.analysis.slice(0, 3)"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    variant="outline"
                    size="sm"
                    class="gap-2"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="h-4 w-4 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="h-4 w-4" />
                    {{ action.name }}
                  </Button>
                </div>

                <h4 class="text-sm font-medium text-muted-foreground">Code Transformation</h4>
                <div class="flex flex-wrap gap-2">
                  <Button
                    v-for="action in categorizedActions.transformation.slice(0, 4)"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    variant="outline"
                    size="sm"
                    class="gap-2"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="h-4 w-4 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="h-4 w-4" />
                    {{ action.name }}
                  </Button>
                </div>

                <h4 class="text-sm font-medium text-muted-foreground">Code Generation</h4>
                <div class="flex flex-wrap gap-2">
                  <Button
                    v-for="action in categorizedActions.generation"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    variant="outline"
                    size="sm"
                    class="gap-2"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="h-4 w-4 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="h-4 w-4" />
                    {{ action.name }}
                  </Button>
                </div>
              </div>

              <!-- Analysis Results -->
              <div v-if="Object.keys(actionResults).length > 0" class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="font-medium">Analysis Results</h4>
                  <Button variant="ghost" size="sm" @click="clearResults">
                    <X class="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <div
                  v-for="(result, actionId) in actionResults"
                  :key="actionId"
                  class="border rounded-lg p-4 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Badge :class="getPriorityBadgeClass(actionId)">
                        {{ enabledBuiltInActions.find(a => a.id === actionId)?.name || actionId }}
                      </Badge>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button
                        @click="copyToClipboard(result, actionId)"
                        variant="ghost"
                        size="sm"
                      >
                        <Copy v-if="!copiedStates[actionId]" class="h-4 w-4" />
                        <Check v-else class="h-4 w-4" />
                      </Button>
                      <Button
                        v-if="result.includes('```')"
                        @click="applyCodeFromResult(result)"
                        :disabled="isReadOnly"
                        variant="outline"
                        size="sm"
                      >
                        <Wand2 class="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea class="max-h-64">
                    <div class="space-y-2">
                      <template v-for="(part, index) in formatResult(result)" :key="index">
                        <pre v-if="part.type === 'code'" 
                             class="bg-muted p-3 rounded text-sm overflow-x-auto">
                          <code>{{ part.content }}</code>
                        </pre>
                        <p v-else class="text-sm text-muted-foreground">{{ part.content }}</p>
                      </template>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <!-- Custom Actions Tab -->
            <div v-if="activeTab === 'custom-actions'" class="space-y-4">
              <div class="text-center py-4">
                <p class="text-sm text-muted-foreground mb-4">
                  Create and manage custom AI actions in settings
                </p>
                <Button variant="outline" @click="$router.push('/settings?section=ai-code-actions')">
                  <Settings class="h-4 w-4 mr-2" />
                  Open AI Settings
                </Button>
              </div>

              <!-- User Custom Actions -->
              <div v-if="enabledCustomActions.length > 0" class="space-y-2">
                <h4 class="font-medium">Your Custom Actions</h4>
                <Button
                  v-for="action in enabledCustomActions"
                  :key="action.id"
                  @click="executeAction(action)"
                  :disabled="!code.trim() || executingActions.has(action.id)"
                  variant="outline"
                  size="sm"
                  class="w-full justify-start gap-2"
                >
                  <Loader2 v-if="executingActions.has(action.id)" class="h-4 w-4 animate-spin" />
                  <component v-else :is="getIconComponent(action.icon)" class="h-4 w-4" />
                  {{ action.name }}
                </Button>
              </div>
            </div>

            <!-- Error Assistance Tab -->
            <div v-if="activeTab === 'error-assistance' && hasError" class="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle class="h-4 w-4" />
                <AlertDescription class="font-mono text-sm">
                  {{ error }}
                </AlertDescription>
              </Alert>

              <div class="space-y-2">
                <Button
                  @click="analyzeError"
                  :disabled="executingActions.has('fix-error') || !isProviderConfigured"
                  class="w-full gap-2"
                >
                  <Loader2 v-if="executingActions.has('fix-error')" class="h-4 w-4 animate-spin" />
                  <Wrench v-else class="h-4 w-4" />
                  Analyze & Fix Error
                </Button>

                <!-- Error Fix Result -->
                <div v-if="actionResults['fix-error']" class="border rounded-lg p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <Badge class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      AI Generated Fix
                    </Badge>
                    <div class="flex items-center gap-2">
                      <Button
                        @click="copyToClipboard(actionResults['fix-error'], 'error-fix')"
                        variant="ghost"
                        size="sm"
                      >
                        <Copy v-if="!copiedStates['error-fix']" class="h-4 w-4" />
                        <Check v-else class="h-4 w-4" />
                      </Button>
                      <Button
                        @click="applyCodeFromResult(actionResults['fix-error'])"
                        :disabled="isReadOnly"
                        variant="outline"
                        size="sm"
                      >
                        <Wand2 class="h-4 w-4 mr-2" />
                        Apply Fix
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea class="max-h-64">
                    <div class="space-y-2">
                      <template v-for="(part, index) in formatResult(actionResults['fix-error'])" :key="index">
                        <pre v-if="part.type === 'code'" 
                             class="bg-muted p-3 rounded text-sm overflow-x-auto">
                          <code>{{ part.content }}</code>
                        </pre>
                        <p v-else class="text-sm text-muted-foreground">{{ part.content }}</p>
                      </template>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>

<style scoped>
.ai-code-assistant {
  @apply relative;
}

.executing-animation {
  @apply animate-pulse;
}
</style> 