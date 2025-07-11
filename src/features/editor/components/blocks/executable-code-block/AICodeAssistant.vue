<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Alert, AlertDescription } from '@/ui/alert'
import { Separator } from '@/ui/separator'
import { ScrollArea } from '@/ui/scroll-area'
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
  Wrench,
  TestTube,
  Edit,
  Maximize2,
  Minimize2,
  ExternalLink,
  ArrowRight,
  Lightbulb,
  Target,
  Rocket
} from 'lucide-vue-next'

interface Props {
  code: string
  language: string
  error?: string | null
  isReadOnly?: boolean
  blockId: string
  isExecuting?: boolean
  executionTime?: number
  hasOutput?: boolean
  embeddedMode?: boolean
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
  'trigger-execution': []
  'request-execution-context': []
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  isReadOnly: false,
  isExecuting: false,
  executionTime: 0,
  hasOutput: false,
  embeddedMode: false
})

const emit = defineEmits<Emits>()

// AI Actions Store
const aiActionsStore = useAIActionsStore()

// Local state
const isVisible = ref(false)
const isExpanded = ref(true)
const activeView = ref<'actions' | 'results' | 'error'>('actions')
const isAnalyzing = ref(false)
const copiedStates = ref<Record<string, boolean>>({})
const executingActions = ref<Set<string>>(new Set())
const actionResults = ref<Record<string, string>>({})
const hoveredAction = ref<string | null>(null)

// Panel positioning
const panelRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const isCompact = ref(false)

// Computed
const hasError = computed(() => !!props.error)
const hasResults = computed(() => Object.keys(actionResults.value).length > 0)
const isProviderConfigured = computed(() => aiActionsStore.isProviderConfigured())
const providerConfigMessage = computed(() => aiActionsStore.getProviderConfigurationMessage())

// Smart action suggestions
const suggestedActions = computed(() => {
  const actions = aiActionsStore.codeActions.filter(action => action.isBuiltIn)
  
  if (hasError.value) {
    return actions.filter(a => ['explain-code', 'security-review', 'refactor-code'].includes(a.id))
  }
  
  if (props.language === 'python') {
    return actions.filter(a => ['optimize-performance', 'generate-tests', 'add-documentation'].includes(a.id))
  }
  
  return actions.filter(a => ['explain-code', 'code-review', 'optimize-performance'].includes(a.id))
})

const quickActions = computed(() => {
  const actions = aiActionsStore.codeActions.filter(action => action.isBuiltIn)
  return {
    analysis: actions.filter(a => ['explain-code', 'code-review', 'security-review'].includes(a.id)),
    improvement: actions.filter(a => ['optimize-performance', 'refactor-code', 'add-comments'].includes(a.id)),
    generation: actions.filter(a => ['generate-tests', 'add-documentation'].includes(a.id))
  }
})

// Auto-set view based on context
watch(() => props.error, (newError) => {
  if (newError) {
    if (props.embeddedMode || isVisible.value) {
      activeView.value = 'error'
      nextTick(() => analyzeError())
    }
  }
}, { immediate: true })

watch(hasResults, (hasResults) => {
  if (hasResults && isVisible.value && activeView.value === 'actions') {
    activeView.value = 'results'
  }
})

// Methods
const toggleVisibility = async () => {
  isVisible.value = !isVisible.value
  
  if (isVisible.value) {
    if (hasError.value) {
      activeView.value = 'error'
    } else if (hasResults.value) {
      activeView.value = 'results'
    } else {
      activeView.value = 'actions'
    }
    
    await nextTick()
    checkCompactMode()
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const checkCompactMode = () => {
  if (!triggerRef.value) return
  
  const rect = triggerRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  
  // Use compact mode on smaller screens
  isCompact.value = viewportWidth < 768 || rect.left < 200
}

const executeAction = async (action: CustomAIAction) => {
  if (executingActions.value.has(action.id) || !props.code.trim()) return

  executingActions.value.add(action.id)
  isAnalyzing.value = true
  
  try {
    emit('analysis-started')
    
    const context = {
      code: props.code,
      language: props.language,
      error: props.error || undefined,
      executionTime: props.executionTime,
      sessionId: props.sessionInfo?.sessionId,
      kernelName: props.sessionInfo?.kernelName,
      hasOutput: props.hasOutput
    }
    
    const result = await aiActionsStore.executeCustomAction(action.id, context)
    actionResults.value[action.id] = result
    emit('action-executed', action.id, result)
    
    // Switch to results view with animation
    activeView.value = 'results'
    
    // Auto-apply code if it's a transformation action
    if (['refactor-code', 'optimize-performance', 'add-comments'].includes(action.id) && 
        !props.isReadOnly && result.includes('```')) {
      const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/)
      if (codeMatch && codeMatch[1]) {
        emit('code-updated', codeMatch[1].trim())
      }
    }
    
  } catch (error) {
    console.error(`Failed to execute action ${action.id}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    actionResults.value[action.id] = `❌ Error: ${errorMessage}`
  } finally {
    executingActions.value.delete(action.id)
    isAnalyzing.value = false
    emit('analysis-completed')
  }
}

const analyzeError = async () => {
  if (!props.error || !props.code.trim()) return
  
  const errorAction = quickActions.value.analysis.find(action => action.id === 'explain-code')
  if (errorAction) {
    await executeAction(errorAction)
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
  
  // Enhanced code extraction that handles multiple formats
  const codeMatch = result.match(/```[\w]*\n([\s\S]*?)\n```/)
  if (codeMatch && codeMatch[1]) {
    const extractedCode = codeMatch[1].trim()
    console.log('Applying code:', extractedCode) // Debug log
    emit('code-updated', extractedCode)
  } else {
    console.warn('No code found in result:', result) // Debug log
  }
}

const clearResults = () => {
  actionResults.value = {}
  activeView.value = 'actions'
}

const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Brain, RefreshCw, TrendingUp, MessageSquare, Wrench, Zap, FileText, Shield, TestTube, Code2, Edit, Play, Lightbulb, Target, Rocket
  }
  return iconMap[iconName] || Brain
}

const getActionCategory = (actionId: string) => {
  if (quickActions.value.analysis.some(a => a.id === actionId)) return 'analysis'
  if (quickActions.value.improvement.some(a => a.id === actionId)) return 'improvement'
  if (quickActions.value.generation.some(a => a.id === actionId)) return 'generation'
  return 'other'
}

const formatResult = (result: string) => {
  // Enhanced result formatting with better structure
  const parts = result.split(/(```[\w]*\n[\s\S]*?\n```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```([\w]*)\n([\s\S]*?)\n```/)
      const language = match?.[1] || ''
      const codeContent = match?.[2] || part
      return { type: 'code' as const, content: codeContent.trim(), language }
    } else if (part.trim()) {
      // Split by lines for better formatting
      const lines = part.trim().split('\n').filter(line => line.trim())
      return { type: 'text' as const, content: lines.join('\n') }
    }
    return null
  }).filter((part): part is NonNullable<typeof part> => part !== null)
}

// Close on outside click
const handleOutsideClick = (event: MouseEvent) => {
  if (!isVisible.value) return
  
  const target = event.target as Node
  if (panelRef.value && !panelRef.value.contains(target) && 
      triggerRef.value && !triggerRef.value.contains(target)) {
    isVisible.value = false
  }
}

// Close on escape key
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isVisible.value) {
    isVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleEscapeKey)
  window.addEventListener('resize', checkCompactMode)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleEscapeKey)
  window.removeEventListener('resize', checkCompactMode)
})
</script>

<template>
  <div class="ai-assistant">
    <!-- Compact Trigger Button (when not embedded) -->
    <div v-if="!props.embeddedMode" ref="triggerRef" class="ai-trigger">
      <Button
        @click="toggleVisibility"
        variant="ghost"
        size="sm"
        class="ai-trigger-btn"
        :class="{ 
          'ai-trigger-btn--active': isVisible,
          'ai-trigger-btn--error': hasError,
          'ai-trigger-btn--results': hasResults && !hasError,
          'ai-trigger-btn--analyzing': isAnalyzing
        }"
      >
        <div class="ai-trigger-icon">
          <Brain class="w-4 h-4" />
          <div v-if="isAnalyzing" class="ai-trigger-pulse"></div>
        </div>
        
        <!-- Enhanced Status Indicators -->
        <div v-if="hasError" class="ai-status-badge ai-status-badge--error" title="Error detected">
          <AlertTriangle class="w-3 h-3" />
        </div>
        <div v-else-if="hasResults" class="ai-status-badge ai-status-badge--success" title="Results available">
          <CheckCircle class="w-3 h-3" />
          <span class="ai-status-count">{{ Object.keys(actionResults).length }}</span>
        </div>
        <div v-else-if="isAnalyzing" class="ai-status-badge ai-status-badge--analyzing" title="Analyzing...">
          <Loader2 class="w-3 h-3 animate-spin" />
        </div>
      </Button>
    </div>

    <!-- Floating Panel (when not embedded) -->
    <Transition name="ai-panel" appear>
      <div
        v-if="!props.embeddedMode && isVisible"
        ref="panelRef"
        class="ai-panel"
        :class="{ 
          'ai-panel--compact': isCompact,
          'ai-panel--collapsed': !isExpanded
        }"
      >
        <!-- Modern Header -->
        <div class="ai-header">
          <div class="ai-header-content">
            <div class="ai-header-icon">
              <div class="ai-icon-wrapper">
                <Brain class="w-5 h-5" />
                <div v-if="isAnalyzing" class="ai-icon-pulse"></div>
              </div>
            </div>
            <div class="ai-header-text">
              <h3 class="ai-title">AI Assistant</h3>
              <p class="ai-subtitle">{{ props.language }} • {{ props.code.length }} chars</p>
            </div>
          </div>
          
          <div class="ai-header-actions">
            <Button
              @click="toggleExpanded"
              variant="ghost"
              size="sm"
              class="ai-header-btn"
              :title="isExpanded ? 'Collapse' : 'Expand'"
            >
              <ChevronDown v-if="isExpanded" class="w-4 h-4" />
              <ChevronRight v-else class="w-4 h-4" />
            </Button>
            <Button
              @click="isVisible = false"
              variant="ghost"
              size="sm"
              class="ai-header-btn"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- Panel Content -->
        <div v-if="isExpanded" class="ai-content">
          <!-- Provider Status -->
          <Alert v-if="!isProviderConfigured" variant="destructive" class="ai-provider-alert">
            <AlertTriangle class="w-4 h-4" />
            <div class="flex-1">
              <AlertDescription class="text-sm">
                {{ providerConfigMessage }}
              </AlertDescription>
            </div>
            <Button 
              @click="$router.push('/settings?section=ai-providers')"
              variant="outline" 
              size="sm"
              class="ml-3"
            >
              <Settings class="w-4 h-4 mr-1" />
              Configure
            </Button>
          </Alert>

          <!-- Smart Navigation -->
          <div class="ai-nav">
            <div class="ai-nav-tabs">
              <button
                @click="activeView = 'actions'"
                class="ai-nav-tab"
                :class="{ 'ai-nav-tab--active': activeView === 'actions' }"
              >
                <Sparkles class="w-4 h-4" />
                <span>Actions</span>
                <Badge v-if="suggestedActions.length > 0" variant="secondary" class="ml-1">
                  {{ suggestedActions.length }}
                </Badge>
              </button>
              
              <button
                v-if="hasResults"
                @click="activeView = 'results'"
                class="ai-nav-tab"
                :class="{ 'ai-nav-tab--active': activeView === 'results' }"
              >
                <FileText class="w-4 h-4" />
                <span>Results</span>
                <Badge variant="secondary" class="ml-1">{{ Object.keys(actionResults).length }}</Badge>
              </button>
              
              <button
                v-if="hasError"
                @click="activeView = 'error'"
                class="ai-nav-tab ai-nav-tab--error"
                :class="{ 'ai-nav-tab--active': activeView === 'error' }"
              >
                <AlertTriangle class="w-4 h-4" />
                <span>Fix Error</span>
              </button>
            </div>

            <Button
              v-if="hasResults"
              @click="clearResults"
              variant="ghost"
              size="sm"
              class="ai-clear-btn"
            >
              <X class="w-3 h-3" />
            </Button>
          </div>

          <!-- Enhanced Actions View -->
          <div v-if="activeView === 'actions'" class="ai-view">
            <!-- Suggested Actions (Smart recommendations) -->
            <div v-if="suggestedActions.length > 0" class="ai-section">
              <div class="ai-section-header">
                <Lightbulb class="w-4 h-4 text-yellow-500" />
                <h4 class="ai-section-title">Suggested for {{ props.language }}</h4>
              </div>
              <div class="ai-action-grid ai-action-grid--featured">
                <button
                  v-for="action in suggestedActions.slice(0, 3)"
                  :key="action.id"
                  @click="executeAction(action)"
                  @mouseenter="hoveredAction = action.id"
                  @mouseleave="hoveredAction = null"
                  :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                  class="ai-action-card ai-action-card--featured"
                  :class="{ 'ai-action-card--loading': executingActions.has(action.id) }"
                >
                  <div class="ai-action-icon">
                    <Loader2 v-if="executingActions.has(action.id)" class="w-5 h-5 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-5 h-5" />
                  </div>
                  <div class="ai-action-content">
                    <h5 class="ai-action-title">{{ action.name }}</h5>
                    <p class="ai-action-desc">{{ action.description || 'Enhance your code' }}</p>
                  </div>
                  <ArrowRight 
                    class="ai-action-arrow" 
                    :class="{ 'ai-action-arrow--visible': hoveredAction === action.id }"
                  />
                </button>
              </div>
            </div>

            <Separator class="my-4" />

            <!-- All Actions by Category -->
            <div class="ai-section">
              <div class="ai-section-header">
                <Target class="w-4 h-4 text-blue-500" />
                <h4 class="ai-section-title">Analysis & Review</h4>
              </div>
              <div class="ai-action-grid">
                <button
                  v-for="action in quickActions.analysis"
                  :key="action.id"
                  @click="executeAction(action)"
                  :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                  class="ai-action-card"
                  :class="{ 'ai-action-card--loading': executingActions.has(action.id) }"
                >
                  <div class="ai-action-icon">
                    <Loader2 v-if="executingActions.has(action.id)" class="w-4 h-4 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                  </div>
                  <span class="ai-action-name">{{ action.name }}</span>
                </button>
              </div>
            </div>

            <div class="ai-section">
              <div class="ai-section-header">
                <Rocket class="w-4 h-4 text-green-500" />
                <h4 class="ai-section-title">Improve & Optimize</h4>
              </div>
              <div class="ai-action-grid">
                <button
                  v-for="action in quickActions.improvement"
                  :key="action.id"
                  @click="executeAction(action)"
                  :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                  class="ai-action-card"
                  :class="{ 'ai-action-card--loading': executingActions.has(action.id) }"
                >
                  <div class="ai-action-icon">
                    <Loader2 v-if="executingActions.has(action.id)" class="w-4 h-4 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                  </div>
                  <span class="ai-action-name">{{ action.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Enhanced Results View -->
          <div v-if="activeView === 'results'" class="ai-view">
            <ScrollArea class="ai-results-area">
              <div class="ai-results-list">
                <div
                  v-for="(result, actionId) in actionResults"
                  :key="actionId"
                  class="ai-result-card"
                >
                  <div class="ai-result-header">
                    <div class="ai-result-meta">
                      <Badge 
                        :variant="getActionCategory(actionId) === 'analysis' ? 'secondary' : 'outline'" 
                        class="ai-result-badge"
                      >
                        {{ quickActions.analysis.find(a => a.id === actionId)?.name || 
                           quickActions.improvement.find(a => a.id === actionId)?.name || 
                           quickActions.generation.find(a => a.id === actionId)?.name || actionId }}
                      </Badge>
                      <span class="ai-result-category">{{ getActionCategory(actionId) }}</span>
                    </div>
                    <div class="ai-result-actions">
                      <Button
                        @click="copyToClipboard(result, actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--compact"
                        title="Copy result"
                      >
                        <Copy v-if="!copiedStates[actionId]" class="w-3 h-3" />
                        <Check v-else class="w-3 h-3 text-green-500" />
                      </Button>
                      <Button
                        v-if="result.includes('```') && !props.isReadOnly"
                        @click="applyCodeFromResult(result)"
                        variant="outline"
                        size="sm"
                        class="ai-result-btn ai-result-btn--compact"
                        title="Apply code changes"
                      >
                        <Wand2 class="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  
                  <div class="ai-result-content">
                    <template v-for="(part, index) in formatResult(result)" :key="index">
                      <div v-if="part.type === 'code'" class="ai-code-section">
                        <div class="ai-code-header">
                          <Code2 class="w-4 h-4" />
                          <span class="ai-code-lang">{{ part.language || props.language }}</span>
                          <div class="flex items-center gap-1">
                            <Button
                              @click="copyToClipboard(part.content, `${actionId}-code-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy"
                            >
                              <Copy v-if="!copiedStates[`${actionId}-code-${index}`]" class="w-3 h-3" />
                              <Check v-else class="w-3 h-3 text-green-500" />
                            </Button>
                            <Button
                              v-if="!props.isReadOnly"
                              @click="applyCodeFromResult(`\`\`\`${part.language || props.language}\n${part.content}\n\`\`\``)"
                              variant="outline"
                              size="sm"
                              class="ai-code-copy"
                              title="Apply this code"
                            >
                              <Wand2 class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <pre class="ai-code-block"><code>{{ part.content }}</code></pre>
                      </div>
                      <div v-else class="ai-text-content">
                        <p v-for="(line, lineIndex) in part.content.split('\n')" :key="lineIndex" class="ai-text-line">
                          {{ line }}
                        </p>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <!-- Enhanced Error View -->
          <div v-if="activeView === 'error' && hasError" class="ai-view">
            <div class="ai-error-section">
              <Alert variant="destructive" class="ai-error-alert">
                <AlertTriangle class="w-5 h-5" />
                <div class="flex-1">
                  <h4 class="ai-error-title">Error Detected</h4>
                  <AlertDescription class="ai-error-message">{{ props.error }}</AlertDescription>
                </div>
              </Alert>

              <div class="ai-error-actions">
                <Button
                  @click="analyzeError"
                  :disabled="executingActions.has('explain-code') || !isProviderConfigured"
                  class="ai-error-btn"
                  size="lg"
                >
                  <Loader2 v-if="executingActions.has('explain-code')" class="w-5 h-5 animate-spin mr-2" />
                  <Wrench v-else class="w-5 h-5 mr-2" />
                  Analyze & Suggest Fix
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Embedded Mode (full interface) -->
    <div v-if="props.embeddedMode" class="ai-embedded">
      <div class="ai-embedded-content p-4 space-y-4 h-full">
        <!-- Provider Status -->
        <Alert v-if="!isProviderConfigured" variant="destructive" class="ai-provider-alert">
          <AlertTriangle class="w-4 h-4" />
          <div class="flex-1">
            <AlertDescription class="text-sm">
              {{ providerConfigMessage }}
            </AlertDescription>
          </div>
          <Button 
            @click="$router.push('/settings?section=ai-providers')"
            variant="outline" 
            size="sm"
            class="ml-3"
          >
            <Settings class="w-4 h-4 mr-1" />
            Configure
          </Button>
        </Alert>

        <!-- Embedded Navigation -->
        <div class="ai-nav">
          <div class="ai-nav-tabs">
            <button
              @click="activeView = 'actions'"
              class="ai-nav-tab"
              :class="{ 'ai-nav-tab--active': activeView === 'actions' }"
            >
              <Sparkles class="w-4 h-4" />
              <span>Actions</span>
              <Badge v-if="suggestedActions.length > 0" variant="secondary" class="ml-1">
                {{ suggestedActions.length }}
              </Badge>
            </button>
            
            <button
              v-if="hasResults"
              @click="activeView = 'results'"
              class="ai-nav-tab"
              :class="{ 'ai-nav-tab--active': activeView === 'results' }"
            >
              <FileText class="w-4 h-4" />
              <span>Results</span>
              <Badge variant="secondary" class="ml-1">{{ Object.keys(actionResults).length }}</Badge>
            </button>
            
            <button
              v-if="hasError"
              @click="activeView = 'error'"
              class="ai-nav-tab ai-nav-tab--error"
              :class="{ 'ai-nav-tab--active': activeView === 'error' }"
            >
              <AlertTriangle class="w-4 h-4" />
              <span>Fix Error</span>
            </button>
          </div>

          <Button
            v-if="hasResults"
            @click="clearResults"
            variant="ghost"
            size="sm"
            class="ai-clear-btn"
          >
            <X class="w-3 h-3" />
          </Button>
        </div>

        <!-- Views for Embedded Mode -->
        <div class="flex-1 overflow-hidden">
          <!-- Actions View -->
          <div v-if="activeView === 'actions'" class="ai-view h-full">
            <ScrollArea class="h-full max-h-80">
              <!-- Suggested Actions -->
              <div v-if="suggestedActions.length > 0" class="ai-section">
                <div class="ai-section-header">
                  <Lightbulb class="w-4 h-4 text-yellow-500" />
                  <h4 class="ai-section-title">Suggested for {{ props.language }}</h4>
                </div>
                <div class="ai-action-grid ai-action-grid--featured">
                  <button
                    v-for="action in suggestedActions.slice(0, 3)"
                    :key="action.id"
                    @click="executeAction(action)"
                    @mouseenter="hoveredAction = action.id"
                    @mouseleave="hoveredAction = null"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-card ai-action-card--featured ai-action-card--compact"
                    :class="{ 'ai-action-card--loading': executingActions.has(action.id) }"
                  >
                    <div class="ai-action-icon ai-action-icon--compact">
                      <Loader2 v-if="executingActions.has(action.id)" class="w-4 h-4 animate-spin" />
                      <component v-else :is="getIconComponent(action.icon)" class="w-4 h-4" />
                    </div>
                    <div class="ai-action-content">
                      <h5 class="ai-action-title">{{ action.name }}</h5>
                      <p class="ai-action-desc">{{ action.description || 'Enhance your code' }}</p>
                    </div>
                    <ArrowRight 
                      class="ai-action-arrow" 
                      :class="{ 'ai-action-arrow--visible': hoveredAction === action.id }"
                    />
                  </button>
                </div>
              </div>

              <Separator v-if="suggestedActions.length > 0" class="my-4" />

              <!-- Quick Actions -->
              <div class="ai-section">
                <div class="ai-section-header">
                  <Target class="w-4 h-4 text-blue-500" />
                  <h4 class="ai-section-title">Quick Actions</h4>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="action in [...quickActions.analysis.slice(0, 2), ...quickActions.improvement.slice(0, 2)]"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-card ai-action-card--compact"
                    :class="{ 'ai-action-card--loading': executingActions.has(action.id) }"
                  >
                    <div class="ai-action-icon ai-action-icon--compact">
                      <Loader2 v-if="executingActions.has(action.id)" class="w-3 h-3 animate-spin" />
                      <component v-else :is="getIconComponent(action.icon)" class="w-3 h-3" />
                    </div>
                    <span class="ai-action-name ai-action-name--compact">{{ action.name }}</span>
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>

          <!-- Results View -->
          <div v-if="activeView === 'results'" class="ai-view h-full">
            <ScrollArea class="h-full max-h-80">
              <div class="ai-results-list">
                <div
                  v-for="(result, actionId) in actionResults"
                  :key="actionId"
                  class="ai-result-card"
                >
                  <div class="ai-result-header">
                    <div class="ai-result-meta">
                      <Badge 
                        :variant="getActionCategory(actionId) === 'analysis' ? 'secondary' : 'outline'" 
                        class="ai-result-badge"
                      >
                        {{ quickActions.analysis.find(a => a.id === actionId)?.name || 
                           quickActions.improvement.find(a => a.id === actionId)?.name || 
                           quickActions.generation.find(a => a.id === actionId)?.name || actionId }}
                      </Badge>
                      <span class="ai-result-category">{{ getActionCategory(actionId) }}</span>
                    </div>
                    <div class="ai-result-actions">
                      <Button
                        @click="copyToClipboard(result, actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--compact"
                        title="Copy result"
                      >
                        <Copy v-if="!copiedStates[actionId]" class="w-3 h-3" />
                        <Check v-else class="w-3 h-3 text-green-500" />
                      </Button>
                      <Button
                        v-if="result.includes('```') && !props.isReadOnly"
                        @click="applyCodeFromResult(result)"
                        variant="outline"
                        size="sm"
                        class="ai-result-btn ai-result-btn--compact"
                        title="Apply code changes"
                      >
                        <Wand2 class="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  
                  <div class="ai-result-content">
                    <template v-for="(part, index) in formatResult(result)" :key="index">
                      <div v-if="part.type === 'code'" class="ai-code-section">
                        <div class="ai-code-header">
                          <Code2 class="w-4 h-4" />
                          <span class="ai-code-lang">{{ part.language || props.language }}</span>
                          <div class="flex items-center gap-1">
                            <Button
                              @click="copyToClipboard(part.content, `${actionId}-code-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy"
                            >
                              <Copy v-if="!copiedStates[`${actionId}-code-${index}`]" class="w-3 h-3" />
                              <Check v-else class="w-3 h-3 text-green-500" />
                            </Button>
                            <Button
                              v-if="!props.isReadOnly"
                              @click="applyCodeFromResult(`\`\`\`${part.language || props.language}\n${part.content}\n\`\`\``)"
                              variant="outline"
                              size="sm"
                              class="ai-code-copy"
                              title="Apply this code"
                            >
                              <Wand2 class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <pre class="ai-code-block"><code>{{ part.content }}</code></pre>
                      </div>
                      <div v-else class="ai-text-content">
                        <p v-for="(line, lineIndex) in part.content.split('\n')" :key="lineIndex" class="ai-text-line">
                          {{ line }}
                        </p>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <!-- Error View -->
          <div v-if="activeView === 'error' && hasError" class="ai-view h-full">
            <ScrollArea class="h-full max-h-80">
              <div class="ai-error-section">
                <Alert variant="destructive" class="ai-error-alert">
                  <AlertTriangle class="w-5 h-5" />
                  <div class="flex-1">
                    <h4 class="ai-error-title">Error Detected</h4>
                    <AlertDescription class="ai-error-message">{{ props.error }}</AlertDescription>
                  </div>
                </Alert>

                <div class="ai-error-actions">
                  <Button
                    @click="analyzeError"
                    :disabled="executingActions.has('explain-code') || !isProviderConfigured"
                    class="ai-error-btn"
                    size="default"
                  >
                    <Loader2 v-if="executingActions.has('explain-code')" class="w-4 h-4 animate-spin mr-2" />
                    <Wrench v-else class="w-4 h-4 mr-2" />
                    Analyze & Suggest Fix
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern AI Assistant Design System */
.ai-assistant {
  --ai-panel-width: 420px;
  --ai-panel-max-height: 650px;
  --ai-trigger-size: 36px;
  --ai-radius: 12px;
  --ai-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --ai-shadow-md: 0 8px 25px rgba(0, 0, 0, 0.15);
  --ai-shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.2);
  --ai-gradient: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
}

/* Enhanced Trigger Button */
.ai-trigger {
  @apply relative inline-flex;
}

.ai-trigger-btn {
  @apply relative p-2 rounded-xl transition-all duration-300 ease-out;
  width: var(--ai-trigger-size);
  height: var(--ai-trigger-size);
  background: var(--ai-gradient);
  border: 1px solid hsl(var(--border) / 0.5);
  
  &:hover {
    @apply scale-110;
    box-shadow: var(--ai-shadow-md);
    border-color: hsl(var(--primary) / 0.3);
  }
  
  &--active {
    @apply scale-105;
    background: hsl(var(--primary) / 0.15);
    border-color: hsl(var(--primary) / 0.4);
    box-shadow: var(--ai-shadow-md), 0 0 0 3px hsl(var(--primary) / 0.1);
  }
  
  &--error {
    @apply text-destructive;
    background: hsl(var(--destructive) / 0.1);
    border-color: hsl(var(--destructive) / 0.3);
  }
  
  &--results {
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.1);
    border-color: hsl(var(--primary) / 0.3);
  }
  
  &--analyzing {
    animation: ai-analyzing 2s ease-in-out infinite;
  }
}

.ai-trigger-icon {
  @apply relative flex items-center justify-center;
}

.ai-trigger-pulse {
  @apply absolute inset-0 rounded-full;
  background: hsl(var(--primary) / 0.3);
  animation: ai-pulse 1.5s ease-in-out infinite;
}

.ai-status-badge {
  @apply absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium;
  min-width: 18px;
  height: 18px;
  
  &--error {
    @apply bg-destructive text-destructive-foreground;
    box-shadow: 0 0 0 2px hsl(var(--background));
  }
  
  &--success {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    box-shadow: 0 0 0 2px hsl(var(--background));
  }
  
  &--analyzing {
    @apply bg-blue-500 text-white;
    box-shadow: 0 0 0 2px hsl(var(--background));
  }
}

.ai-status-count {
  @apply text-xs font-bold;
}

/* Enhanced AI Panel */
.ai-panel {
  @apply absolute bg-background border-0 rounded-2xl overflow-hidden;
  width: var(--ai-panel-width);
  max-height: var(--ai-panel-max-height);
  top: calc(100% + 8px);
  left: 0;
  z-index: 9999;
  box-shadow: var(--ai-shadow-lg);
  border-radius: var(--ai-radius);
  backdrop-filter: blur(20px);
  background: hsl(var(--background) / 0.95);
  border: 1px solid hsl(var(--border) / 0.3);
  
  &--compact {
    width: min(var(--ai-panel-width), calc(100vw - 2rem));
    left: 50%;
    transform: translateX(-50%);
  }
  
  &--collapsed {
    max-height: auto;
  }
}

/* Modern Header */
.ai-header {
  @apply flex items-center justify-between p-4 border-b bg-gradient-to-r;
  background: linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.2));
  border-bottom: 1px solid hsl(var(--border) / 0.5);
}

.ai-header-content {
  @apply flex items-center gap-3;
}

.ai-header-icon {
  @apply p-2 rounded-xl bg-gradient-to-br;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1));
}

.ai-icon-wrapper {
  @apply relative flex items-center justify-center;
}

.ai-icon-pulse {
  @apply absolute inset-0 rounded-xl;
  background: hsl(var(--primary) / 0.3);
  animation: ai-pulse 1.5s ease-in-out infinite;
}

.ai-header-text {
  @apply flex-1;
}

.ai-title {
  @apply text-sm font-semibold text-foreground;
}

.ai-subtitle {
  @apply text-xs text-muted-foreground;
}

.ai-header-actions {
  @apply flex items-center gap-1;
}

.ai-header-btn {
  @apply p-2 rounded-lg hover:bg-muted/50 transition-colors;
}

/* Content Area */
.ai-content {
  @apply p-4 space-y-4 max-h-96 overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
    
    &:hover {
      background-color: hsl(var(--muted-foreground) / 0.5);
    }
  }
}

/* Provider Alert */
.ai-provider-alert {
  @apply rounded-xl border-destructive/30 bg-destructive/5;
}

/* Navigation */
.ai-nav {
  @apply flex items-center justify-between gap-2;
}

.ai-nav-tabs {
  @apply flex gap-1 p-1 bg-muted/30 rounded-xl;
}

.ai-nav-tab {
  @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200;
  @apply hover:bg-background/80 text-muted-foreground;
  
  &--active {
    @apply bg-background text-foreground shadow-sm;
  }
  
  &--error {
    @apply text-destructive hover:text-destructive;
    
    &.ai-nav-tab--active {
      @apply bg-destructive/10 text-destructive;
    }
  }
}

.ai-clear-btn {
  @apply p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive;
}

/* Sections */
.ai-section {
  @apply space-y-3;
}

.ai-section-header {
  @apply flex items-center gap-2 mb-3;
}

.ai-section-title {
  @apply text-sm font-medium text-foreground;
}

/* Action Grids */
.ai-action-grid {
  @apply grid gap-2;
  
  &--featured {
    @apply grid-cols-1 gap-3;
  }
}

.ai-action-card {
  @apply flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all duration-200;
  @apply hover:shadow-sm hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed;
  
  &--featured {
    @apply p-4 hover:scale-[1.02] hover:shadow-md;
    
    &.ai-action-card--compact {
      @apply p-3;
    }
  }
  
  &--compact {
    @apply gap-2 p-2;
  }
  
  &--loading {
    @apply opacity-75 cursor-wait;
  }
}

.ai-action-icon {
  @apply p-2 rounded-lg bg-muted/50;
  
  &--compact {
    @apply p-1.5;
  }
}

.ai-action-content {
  @apply flex-1 text-left;
}

.ai-action-title {
  @apply text-sm font-medium text-foreground;
}

.ai-action-desc {
  @apply text-xs text-muted-foreground mt-1;
}

.ai-action-name {
  @apply text-sm font-medium;
  
  &--compact {
    @apply text-xs;
  }
}

.ai-action-arrow {
  @apply w-4 h-4 text-muted-foreground transition-all duration-200 opacity-0;
  
  &--visible {
    @apply opacity-100 translate-x-1;
  }
}

/* Results */
.ai-results-area {
  @apply max-h-80;
}

.ai-results-list {
  @apply space-y-3;
}

.ai-result-card {
  @apply border rounded-xl p-4 space-y-3 bg-card;
}

.ai-result-header {
  @apply flex items-center justify-between;
}

.ai-result-meta {
  @apply flex items-center gap-2;
}

.ai-result-badge {
  @apply text-xs;
}

.ai-result-category {
  @apply text-xs text-muted-foreground capitalize;
}

.ai-result-actions {
  @apply flex items-center gap-1;
}

.ai-result-btn {
  @apply p-2 rounded-lg hover:bg-muted/50;
  
  &--compact {
    @apply p-1.5;
  }
}

/* Code Display */
.ai-code-section {
  @apply border rounded-lg overflow-hidden bg-muted/20;
}

.ai-code-header {
  @apply flex items-center justify-between px-3 py-2 bg-muted/50 border-b;
}

.ai-code-lang {
  @apply text-xs font-mono text-muted-foreground;
}

.ai-code-copy {
  @apply p-1.5 rounded hover:bg-muted/50;
}

.ai-code-block {
  @apply p-3 text-xs font-mono overflow-x-auto bg-muted/10;
}

.ai-text-content {
  @apply space-y-2;
}

.ai-text-line {
  @apply text-sm leading-relaxed text-foreground;
}

/* Error Section */
.ai-error-section {
  @apply space-y-4;
}

.ai-error-alert {
  @apply rounded-xl border-destructive/30 bg-destructive/5;
}

.ai-error-title {
  @apply text-sm font-medium;
}

.ai-error-message {
  @apply text-sm font-mono break-all mt-1;
}

.ai-error-actions {
  @apply flex justify-center;
}

.ai-error-btn {
  @apply rounded-xl shadow-sm hover:shadow-md transition-all duration-200;
}

/* Animations */
@keyframes ai-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

@keyframes ai-analyzing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Panel Transitions */
.ai-panel-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ai-panel-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.ai-panel-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .ai-panel {
    --ai-panel-width: calc(100vw - 2rem);
    max-height: calc(100vh - 8rem);
  }
  
  .ai-action-grid--featured {
    @apply grid-cols-1;
  }
  
  .ai-content {
    @apply max-h-80;
  }
}

/* Views */
.ai-view {
  @apply space-y-4;
}

/* Embedded Mode Styles */
.ai-embedded {
  @apply w-full h-full bg-background;
}

.ai-embedded-content {
  @apply flex flex-col h-full;
  min-height: 320px;
}

.ai-embedded .ai-nav-tabs {
  @apply bg-muted/20;
}

.ai-embedded .ai-action-grid--featured {
  @apply grid-cols-1;
}

.ai-embedded .ai-action-card {
  @apply hover:scale-100;
}

.ai-embedded .ai-action-card--featured {
  @apply p-3 hover:scale-100;
}

.ai-embedded .ai-results-area {
  @apply max-h-full;
}

/* Auto-switch to error view when embedded and error occurs */
.ai-embedded .ai-nav-tab--error.ai-nav-tab--active {
  @apply bg-destructive/15 text-destructive;
}
</style> 