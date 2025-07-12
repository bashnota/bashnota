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
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
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
  Rocket,
  Send,
  MessageCircle,
  Plus,
  Minus
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

interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant'
  timestamp: Date
  actionId?: string
  codeBlockIndex?: number
}

interface ActionResult {
  content: string
  chatHistory: ChatMessage[]
  isExpanded: boolean
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
const actionResults = ref<Record<string, ActionResult>>({})
const hoveredAction = ref<string | null>(null)

// Chat state
const chatInputs = ref<Record<string, string>>({})
const chatLoading = ref<Record<string, boolean>>({})
const expandedChats = ref<Record<string, boolean>>({})

// Direct prompt state
const directPrompt = ref<string>('')

// Panel positioning
const panelRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const isCompact = ref(false)

// New panel state
const showPanel = ref(false)
const compactMode = ref(false)

// Panel style computed
const panelStyle = computed(() => ({
  // Add any dynamic positioning styles here if needed
}))

// Panel toggle function
const togglePanel = () => {
  showPanel.value = !showPanel.value
  if (showPanel.value) {
    if (hasError.value) {
      activeView.value = 'error'
    } else if (hasResults.value) {
      activeView.value = 'results'
    } else {
      activeView.value = 'actions'
    }
  }
}

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
    
    // Initialize action result with chat history
    actionResults.value[action.id] = {
      content: result,
      chatHistory: [],
      isExpanded: true
    }
    
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
    actionResults.value[action.id] = {
      content: `❌ Error: ${errorMessage}`,
      chatHistory: [],
      isExpanded: true
    }
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



const clearResults = () => {
  actionResults.value = {}
  chatInputs.value = {}
  chatLoading.value = {}
  expandedChats.value = {}
  activeView.value = 'actions'
}

const executeDirectPrompt = async () => {
  if (!directPrompt.value.trim() || isAnalyzing.value) return

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
      hasOutput: props.hasOutput,
      chatContext: `User question: ${directPrompt.value}\n\nFor the following ${props.language} code:\n\`\`\`${props.language}\n${props.code}\n\`\`\`\n\nPlease provide a helpful response. If your response includes code changes, provide them in a code block.`
    }

    const response = await aiActionsStore.executeCustomAction('chat-followup', context)

    // Create result for direct prompt
    const actionId = 'direct-prompt'
    if (!actionResults.value[actionId]) {
      actionResults.value[actionId] = {
        content: response,
        chatHistory: [],
        isExpanded: true
      }
    } else {
      actionResults.value[actionId].content = response
    }

    emit('action-executed', actionId, response)

    // Switch to results view
    activeView.value = 'results'

    // Clear input
    directPrompt.value = ''

  } catch (error) {
    console.error('Failed to execute direct prompt:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    actionResults.value['direct-prompt'] = {
      content: `❌ Error: ${errorMessage}`,
      chatHistory: [],
      isExpanded: true
    }
  } finally {
    isAnalyzing.value = false
    emit('analysis-completed')
  }
}

const toggleResultExpansion = (actionId: string) => {
  if (actionResults.value[actionId]) {
    actionResults.value[actionId].isExpanded = !actionResults.value[actionId].isExpanded
  }
}

const toggleChatExpansion = (chatKey: string) => {
  expandedChats.value[chatKey] = !expandedChats.value[chatKey]
}

const sendChatMessage = async (actionId: string, codeBlockIndex?: number) => {
  const chatKey = codeBlockIndex !== undefined ? `${actionId}-${codeBlockIndex}` : actionId
  const message = chatInputs.value[chatKey]?.trim()
  
  if (!message || chatLoading.value[chatKey]) return

  chatLoading.value[chatKey] = true
  
  try {
    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      content: message,
      type: 'user',
      timestamp: new Date(),
      actionId,
      codeBlockIndex
    }
    
    if (!actionResults.value[actionId]) {
      actionResults.value[actionId] = {
        content: '',
        chatHistory: [],
        isExpanded: true
      }
    }
    
    actionResults.value[actionId].chatHistory.push(userMessage)
    
    // Clear input
    chatInputs.value[chatKey] = ''
    
    // Build context for the chat
    let contextPrompt = `Previous conversation about ${actionId}:\n`
    contextPrompt += `Original code (${props.language}):\n\`\`\`${props.language}\n${props.code}\n\`\`\`\n\n`
    
    if (actionResults.value[actionId].content) {
      contextPrompt += `Previous AI response:\n${actionResults.value[actionId].content}\n\n`
    }
    
    // Add recent chat history for context
    const recentHistory = actionResults.value[actionId].chatHistory.slice(-6) // Last 6 messages
    if (recentHistory.length > 1) {
      contextPrompt += `Recent conversation:\n`
      recentHistory.slice(0, -1).forEach(msg => {
        contextPrompt += `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
      })
    }
    
    contextPrompt += `\nUser's new question: ${message}\n\nPlease provide a helpful response:`
    
    // Send to AI
    const context = {
      code: props.code,
      language: props.language,
      error: props.error || undefined,
      executionTime: props.executionTime,
      sessionId: props.sessionInfo?.sessionId,
      kernelName: props.sessionInfo?.kernelName,
      hasOutput: props.hasOutput,
      chatContext: contextPrompt
    }
    
    const response = await aiActionsStore.executeCustomAction('chat-followup', context)
    
    // Add assistant response to chat history
    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      content: response,
      type: 'assistant',
      timestamp: new Date(),
      actionId,
      codeBlockIndex
    }
    
    actionResults.value[actionId].chatHistory.push(assistantMessage)
    
  } catch (error) {
    console.error('Failed to send chat message:', error)
    const errorMessage: ChatMessage = {
      id: `${Date.now()}-error`,
      content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'assistant',
      timestamp: new Date(),
      actionId,
      codeBlockIndex
    }
    actionResults.value[actionId].chatHistory.push(errorMessage)
  } finally {
    chatLoading.value[chatKey] = false
  }
}

const applyCodeFromResult = (resultContent: string) => {
  if (props.isReadOnly) return
  
  // Extract code from markdown code blocks
  const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g
  let match
  let extractedCode = ''
  
  while ((match = codeBlockRegex.exec(resultContent)) !== null) {
    const [, language, code] = match
    if (!language || language.toLowerCase() === props.language.toLowerCase()) {
      extractedCode += code.trim() + '\n'
    }
  }
  
  if (extractedCode.trim()) {
    // Apply the extracted code
    emit('code-updated', extractedCode.trim())
  } else {
    // If no code blocks found, try to extract code from the content
    const lines = resultContent.split('\n')
    const codeLines = lines.filter(line => 
      !line.startsWith('Here') && 
      !line.startsWith('This') && 
      !line.includes('```') &&
      line.trim().length > 0
    )
    
    if (codeLines.length > 0) {
      emit('code-updated', codeLines.join('\n'))
    }
  }
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

// Input event handlers with proper typing
const updateDirectPrompt = (event: any) => {
  directPrompt.value = event.target.value
}

const updateChatInput = (chatKey: string) => (event: any) => {
  chatInputs.value[chatKey] = event.target.value
}

// Simple wrapper to avoid inline typing
const handleChatInput = (event: any) => {
  const input = event.target
  const chatKey = input.dataset.chatKey
  if (chatKey) {
    chatInputs.value[chatKey] = input.value
  }
}
</script>

<template>
  <div class="ai-code-assistant" :class="{ 'ai-code-assistant--embedded': embeddedMode }">
    <!-- Floating Action Button (non-embedded mode) -->
    <Transition name="ai-fab" appear>
      <Button
        v-if="!props.embeddedMode"
        @click="togglePanel"
        :class="[
          'ai-fab',
          {
            'ai-fab--error': hasError,
            'ai-fab--compact': compactMode
          }
        ]"
        :size="compactMode ? 'sm' : 'default'"
        :variant="hasError ? 'destructive' : 'outline'"
      >
        <AlertTriangle v-if="hasError" class="w-4 h-4" />
        <Brain v-else class="w-4 h-4" />
        <span v-if="!compactMode" class="ml-2">AI Assistant</span>
      </Button>
    </Transition>

    <!-- Floating Panel (non-embedded mode) -->
    <Transition name="ai-panel" appear>
      <div
        v-if="!props.embeddedMode && showPanel"
        ref="panelRef"
        class="ai-panel"
        :style="panelStyle"
      >
        <div class="ai-panel-header">
          <div class="ai-panel-title">
            <Brain class="w-4 h-4" />
            <span>AI Code Assistant</span>
            <Badge v-if="hasError" variant="destructive" class="ml-2 text-xs">Error</Badge>
          </div>
          <Button @click="showPanel = false" variant="ghost" size="sm" class="ai-panel-close">
            <X class="w-3 h-3" />
          </Button>
        </div>

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
            <Settings class="w-3 h-3 mr-1" />
            Configure
          </Button>
        </Alert>

        <!-- Panel Navigation -->
        <div class="ai-nav">
          <div class="ai-nav-tabs">
            <button
              @click="activeView = 'actions'"
              class="ai-nav-tab"
              :class="{ 'ai-nav-tab--active': activeView === 'actions' }"
            >
              <Sparkles class="w-4 h-4" />
              <span>Actions</span>
              <Badge v-if="suggestedActions.length > 0" variant="secondary" class="ml-1 text-xs">
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
              <Badge variant="secondary" class="ml-1 text-xs">{{ Object.keys(actionResults).length }}</Badge>
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

        <!-- Views for Panel Mode -->
        <div class="flex-1 overflow-hidden">
          <!-- Direct Prompt Input -->
          <div class="ai-direct-prompt mb-4">
            <div class="ai-prompt-header mb-2">
              <MessageSquare class="w-4 h-4 text-primary" />
              <span class="text-sm font-medium">Ask AI about your code</span>
            </div>
            <div class="ai-prompt-input">
              <Input
                :value="directPrompt"
                @input="updateDirectPrompt"
                placeholder="Ask anything about your code or request specific changes..."
                class="text-sm"
                @keydown.enter.prevent="executeDirectPrompt"
                :disabled="isAnalyzing || !isProviderConfigured"
              />
              <Button
                @click="executeDirectPrompt"
                variant="default"
                size="sm"
                class="ml-2"
                :disabled="!directPrompt.trim() || isAnalyzing || !isProviderConfigured"
              >
                <Loader2 v-if="isAnalyzing" class="w-4 h-4 animate-spin mr-1" />
                <Send v-else class="w-4 h-4 mr-1" />
                {{ isAnalyzing ? 'Thinking...' : 'Ask' }}
              </Button>
            </div>
          </div>

          <!-- Actions View -->
          <div v-if="activeView === 'actions'" class="ai-view h-full">
            <ScrollArea class="h-full max-h-64">
              <!-- Suggested Actions - Compact -->
              <div v-if="suggestedActions.length > 0" class="ai-section mb-4">
                <div class="ai-section-header mb-2">
                  <Lightbulb class="w-3 h-3 text-yellow-500" />
                  <h4 class="ai-section-title text-xs">Suggested</h4>
                </div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="action in suggestedActions.slice(0, 4)"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-chip"
                    :class="{ 'ai-action-chip--loading': executingActions.has(action.id) }"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="w-3 h-3 animate-spin mr-1" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-3 h-3 mr-1" />
                    {{ action.name }}
                  </button>
                </div>
              </div>

              <!-- Quick Actions - Very Compact Grid -->
              <div class="ai-section">
                <div class="ai-section-header mb-2">
                  <Target class="w-3 h-3 text-blue-500" />
                  <h4 class="ai-section-title text-xs">Quick Actions</h4>
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    v-for="action in [...quickActions.analysis.slice(0, 3), ...quickActions.improvement.slice(0, 3)]"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-mini"
                    :class="{ 'ai-action-mini--loading': executingActions.has(action.id) }"
                    :title="action.description"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="w-3 h-3 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-3 h-3" />
                    <span class="text-xs">{{ action.name.split(' ')[0] }}</span>
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
                        :variant="actionId === 'direct-prompt' ? 'default' : getActionCategory(actionId) === 'analysis' ? 'secondary' : 'outline'" 
                        class="ai-result-badge text-xs"
                      >
                        {{ actionId === 'direct-prompt' ? 'Custom Prompt' : 
                           quickActions.analysis.find(a => a.id === actionId)?.name || 
                           quickActions.improvement.find(a => a.id === actionId)?.name || 
                           quickActions.generation.find(a => a.id === actionId)?.name || actionId }}
                      </Badge>
                    </div>
                    <div class="ai-result-actions">
                      <Button
                        @click="toggleResultExpansion(actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small"
                        :title="result.isExpanded ? 'Collapse' : 'Expand'"
                      >
                        <ChevronDown v-if="result.isExpanded" class="w-3 h-3" />
                        <ChevronRight v-else class="w-3 h-3" />
                      </Button>
                      <Button
                        @click="copyToClipboard(result.content, actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small"
                        title="Copy result"
                      >
                        <Copy v-if="!copiedStates[actionId]" class="w-3 h-3" />
                        <Check v-else class="w-3 h-3 text-green-500" />
                      </Button>
                      <Button
                        v-if="result.content.includes('```') && !props.isReadOnly"
                        @click="applyCodeFromResult(result.content)"
                        variant="default"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small ai-apply-btn"
                        title="Apply code changes"
                      >
                        <Wand2 class="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  
                  <div v-if="result.isExpanded" class="ai-result-content">
                    <template v-for="(part, index) in formatResult(result.content)" :key="index">
                      <div v-if="part.type === 'code'" class="ai-code-section">
                        <div class="ai-code-header">
                          <div class="flex items-center gap-2">
                            <Code2 class="w-3 h-3" />
                            <span class="ai-code-lang text-xs">{{ part.language || props.language }}</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <Button
                              @click="copyToClipboard(part.content, `${actionId}-code-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small"
                            >
                              <Copy v-if="!copiedStates[`${actionId}-code-${index}`]" class="w-3 h-3" />
                              <Check v-else class="w-3 h-3 text-green-500" />
                            </Button>
                            <Button
                              v-if="!props.isReadOnly"
                              @click="applyCodeFromResult(`\`\`\`${part.language || props.language}\n${part.content}\n\`\`\``)"
                              variant="default"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small ai-apply-btn"
                              title="Apply this code"
                            >
                              <Wand2 class="w-3 h-3 mr-1" />
                              Apply
                            </Button>
                            <Button
                              @click="toggleChatExpansion(`${actionId}-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small"
                              :title="expandedChats[`${actionId}-${index}`] ? 'Hide chat' : 'Chat about this code'"
                            >
                              <MessageCircle class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <pre class="ai-code-block text-xs"><code>{{ part.content }}</code></pre>
                        
                        <!-- Per-Code-Block Chat -->
                        <div v-if="expandedChats[`${actionId}-${index}`]" class="ai-code-chat">
                          <div class="ai-chat-header">
                            <MessageCircle class="w-3 h-3" />
                            <span class="text-xs font-medium">Chat about this code</span>
                          </div>
                          
                          <!-- Chat messages for this code block -->
                          <div v-if="result.chatHistory.filter(msg => msg.codeBlockIndex === index).length > 0" class="ai-chat-messages">
                            <div
                              v-for="message in result.chatHistory.filter(msg => msg.codeBlockIndex === index)"
                              :key="message.id"
                              class="ai-chat-message"
                              :class="{ 'ai-chat-message--user': message.type === 'user' }"
                            >
                              <div class="ai-chat-avatar">
                                <MessageSquare v-if="message.type === 'user'" class="w-3 h-3" />
                                <Brain v-else class="w-3 h-3" />
                              </div>
                              <div class="ai-chat-content">
                                <p class="text-xs">{{ message.content }}</p>
                              </div>
                            </div>
                          </div>
                          
                          <!-- Chat input for this code block -->
                          <div class="ai-chat-input">
                            <Input
                              :value="chatInputs[`${actionId}-${index}`] || ''"
                              @input="handleChatInput"
                              :data-chat-key="`${actionId}-${index}`"
                              placeholder="Ask about this code..."
                              class="ai-chat-field text-xs"
                              @keydown.enter.prevent="sendChatMessage(actionId, index)"
                              :disabled="chatLoading[`${actionId}-${index}`]"
                            />
                            <Button
                              @click="sendChatMessage(actionId, index)"
                              variant="ghost"
                              size="sm"
                              class="ai-chat-send"
                              :disabled="!chatInputs[`${actionId}-${index}`]?.trim() || chatLoading[`${actionId}-${index}`]"
                            >
                              <Loader2 v-if="chatLoading[`${actionId}-${index}`]" class="w-3 h-3 animate-spin" />
                              <Send v-else class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div v-else class="ai-text-content">
                        <p v-for="(line, lineIndex) in part.content.split('\n')" :key="lineIndex" class="ai-text-line text-sm">
                          {{ line }}
                        </p>
                      </div>
                    </template>
                    
                    <!-- General Chat for the entire result -->
                    <div class="ai-general-chat">
                      <div class="ai-chat-header">
                        <MessageCircle class="w-3 h-3" />
                        <span class="text-xs font-medium">Continue conversation</span>
                      </div>
                      
                      <!-- General chat messages -->
                      <div v-if="result.chatHistory.filter(msg => msg.codeBlockIndex === undefined).length > 0" class="ai-chat-messages">
                        <div
                          v-for="message in result.chatHistory.filter(msg => msg.codeBlockIndex === undefined)"
                          :key="message.id"
                          class="ai-chat-message"
                          :class="{ 'ai-chat-message--user': message.type === 'user' }"
                        >
                          <div class="ai-chat-avatar">
                            <MessageSquare v-if="message.type === 'user'" class="w-3 h-3" />
                            <Brain v-else class="w-3 h-3" />
                          </div>
                          <div class="ai-chat-content">
                            <p class="text-xs">{{ message.content }}</p>
                          </div>
                        </div>
                      </div>
                      
                      <!-- General chat input -->
                      <div class="ai-chat-input">
                        <Input
                          :value="chatInputs[actionId] || ''"
                          @input="handleChatInput"
                          :data-chat-key="actionId"
                          placeholder="Ask a follow-up question..."
                          class="ai-chat-field text-xs"
                          @keydown.enter.prevent="sendChatMessage(actionId)"
                          :disabled="chatLoading[actionId]"
                        />
                        <Button
                          @click="sendChatMessage(actionId)"
                          variant="ghost"
                          size="sm"
                          class="ai-chat-send"
                          :disabled="!chatInputs[actionId]?.trim() || chatLoading[actionId]"
                        >
                          <Loader2 v-if="chatLoading[actionId]" class="w-3 h-3 animate-spin" />
                          <Send v-else class="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
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
            <Settings class="w-3 h-3 mr-1" />
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
              <Badge v-if="suggestedActions.length > 0" variant="secondary" class="ml-1 text-xs">
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
              <Badge variant="secondary" class="ml-1 text-xs">{{ Object.keys(actionResults).length }}</Badge>
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
          <!-- Direct Prompt Input -->
          <div class="ai-direct-prompt mb-4">
            <div class="ai-prompt-header mb-2">
              <MessageSquare class="w-4 h-4 text-primary" />
              <span class="text-sm font-medium">Ask AI about your code</span>
            </div>
            <div class="ai-prompt-input">
              <Input
                :value="directPrompt"
                @input="updateDirectPrompt"
                placeholder="Ask anything about your code or request specific changes..."
                class="text-sm"
                @keydown.enter.prevent="executeDirectPrompt"
                :disabled="isAnalyzing || !isProviderConfigured"
              />
              <Button
                @click="executeDirectPrompt"
                variant="default"
                size="sm"
                class="ml-2"
                :disabled="!directPrompt.trim() || isAnalyzing || !isProviderConfigured"
              >
                <Loader2 v-if="isAnalyzing" class="w-4 h-4 animate-spin mr-1" />
                <Send v-else class="w-4 h-4 mr-1" />
                {{ isAnalyzing ? 'Thinking...' : 'Ask' }}
              </Button>
            </div>
          </div>

          <!-- Actions View -->
          <div v-if="activeView === 'actions'" class="ai-view h-full">
            <ScrollArea class="h-full max-h-64">
              <!-- Suggested Actions - Compact -->
              <div v-if="suggestedActions.length > 0" class="ai-section mb-4">
                <div class="ai-section-header mb-2">
                  <Lightbulb class="w-3 h-3 text-yellow-500" />
                  <h4 class="ai-section-title text-xs">Suggested</h4>
                </div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="action in suggestedActions.slice(0, 4)"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-chip"
                    :class="{ 'ai-action-chip--loading': executingActions.has(action.id) }"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="w-3 h-3 animate-spin mr-1" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-3 h-3 mr-1" />
                    {{ action.name }}
                  </button>
                </div>
              </div>

              <!-- Quick Actions - Very Compact Grid -->
              <div class="ai-section">
                <div class="ai-section-header mb-2">
                  <Target class="w-3 h-3 text-blue-500" />
                  <h4 class="ai-section-title text-xs">Quick Actions</h4>
                </div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    v-for="action in [...quickActions.analysis.slice(0, 3), ...quickActions.improvement.slice(0, 3)]"
                    :key="action.id"
                    @click="executeAction(action)"
                    :disabled="!props.code.trim() || executingActions.has(action.id) || !isProviderConfigured"
                    class="ai-action-mini"
                    :class="{ 'ai-action-mini--loading': executingActions.has(action.id) }"
                    :title="action.description"
                  >
                    <Loader2 v-if="executingActions.has(action.id)" class="w-3 h-3 animate-spin" />
                    <component v-else :is="getIconComponent(action.icon)" class="w-3 h-3" />
                    <span class="text-xs">{{ action.name.split(' ')[0] }}</span>
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
                        :variant="actionId === 'direct-prompt' ? 'default' : getActionCategory(actionId) === 'analysis' ? 'secondary' : 'outline'" 
                        class="ai-result-badge text-xs"
                      >
                        {{ actionId === 'direct-prompt' ? 'Custom Prompt' : 
                           quickActions.analysis.find(a => a.id === actionId)?.name || 
                           quickActions.improvement.find(a => a.id === actionId)?.name || 
                           quickActions.generation.find(a => a.id === actionId)?.name || actionId }}
                      </Badge>
                    </div>
                    <div class="ai-result-actions">
                      <Button
                        @click="toggleResultExpansion(actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small"
                        :title="result.isExpanded ? 'Collapse' : 'Expand'"
                      >
                        <ChevronDown v-if="result.isExpanded" class="w-3 h-3" />
                        <ChevronRight v-else class="w-3 h-3" />
                      </Button>
                      <Button
                        @click="copyToClipboard(result.content, actionId)"
                        variant="ghost"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small"
                        title="Copy result"
                      >
                        <Copy v-if="!copiedStates[actionId]" class="w-3 h-3" />
                        <Check v-else class="w-3 h-3 text-green-500" />
                      </Button>
                      <Button
                        v-if="result.content.includes('```') && !props.isReadOnly"
                        @click="applyCodeFromResult(result.content)"
                        variant="default"
                        size="sm"
                        class="ai-result-btn ai-result-btn--small ai-apply-btn"
                        title="Apply code changes"
                      >
                        <Wand2 class="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                  
                  <div v-if="result.isExpanded" class="ai-result-content">
                    <template v-for="(part, index) in formatResult(result.content)" :key="index">
                      <div v-if="part.type === 'code'" class="ai-code-section">
                        <div class="ai-code-header">
                          <div class="flex items-center gap-2">
                            <Code2 class="w-3 h-3" />
                            <span class="ai-code-lang text-xs">{{ part.language || props.language }}</span>
                          </div>
                          <div class="flex items-center gap-1">
                            <Button
                              @click="copyToClipboard(part.content, `${actionId}-code-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small"
                            >
                              <Copy v-if="!copiedStates[`${actionId}-code-${index}`]" class="w-3 h-3" />
                              <Check v-else class="w-3 h-3 text-green-500" />
                            </Button>
                            <Button
                              v-if="!props.isReadOnly"
                              @click="applyCodeFromResult(`\`\`\`${part.language || props.language}\n${part.content}\n\`\`\``)"
                              variant="default"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small ai-apply-btn"
                              title="Apply this code"
                            >
                              <Wand2 class="w-3 h-3 mr-1" />
                              Apply
                            </Button>
                            <Button
                              @click="toggleChatExpansion(`${actionId}-${index}`)"
                              variant="ghost"
                              size="sm"
                              class="ai-code-copy ai-code-copy--small"
                              :title="expandedChats[`${actionId}-${index}`] ? 'Hide chat' : 'Chat about this code'"
                            >
                              <MessageCircle class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <pre class="ai-code-block text-xs"><code>{{ part.content }}</code></pre>
                        
                        <!-- Per-Code-Block Chat -->
                        <div v-if="expandedChats[`${actionId}-${index}`]" class="ai-code-chat">
                          <div class="ai-chat-header">
                            <MessageCircle class="w-3 h-3" />
                            <span class="text-xs font-medium">Chat about this code</span>
                          </div>
                          
                          <!-- Chat messages for this code block -->
                          <div v-if="result.chatHistory.filter(msg => msg.codeBlockIndex === index).length > 0" class="ai-chat-messages">
                            <div
                              v-for="message in result.chatHistory.filter(msg => msg.codeBlockIndex === index)"
                              :key="message.id"
                              class="ai-chat-message"
                              :class="{ 'ai-chat-message--user': message.type === 'user' }"
                            >
                              <div class="ai-chat-avatar">
                                <MessageSquare v-if="message.type === 'user'" class="w-3 h-3" />
                                <Brain v-else class="w-3 h-3" />
                              </div>
                              <div class="ai-chat-content">
                                <p class="text-xs">{{ message.content }}</p>
                              </div>
                            </div>
                          </div>
                          
                          <!-- Chat input for this code block -->
                          <div class="ai-chat-input">
                            <Input
                              :value="chatInputs[`${actionId}-${index}`] || ''"
                              @input="handleChatInput"
                              :data-chat-key="`${actionId}-${index}`"
                              placeholder="Ask about this code..."
                              class="ai-chat-field text-xs"
                              @keydown.enter.prevent="sendChatMessage(actionId, index)"
                              :disabled="chatLoading[`${actionId}-${index}`]"
                            />
                            <Button
                              @click="sendChatMessage(actionId, index)"
                              variant="ghost"
                              size="sm"
                              class="ai-chat-send"
                              :disabled="!chatInputs[`${actionId}-${index}`]?.trim() || chatLoading[`${actionId}-${index}`]"
                            >
                              <Loader2 v-if="chatLoading[`${actionId}-${index}`]" class="w-3 h-3 animate-spin" />
                              <Send v-else class="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div v-else class="ai-text-content">
                        <p v-for="(line, lineIndex) in part.content.split('\n')" :key="lineIndex" class="ai-text-line text-sm">
                          {{ line }}
                        </p>
                      </div>
                    </template>
                    
                    <!-- General Chat for the entire result -->
                    <div class="ai-general-chat">
                      <div class="ai-chat-header">
                        <MessageCircle class="w-3 h-3" />
                        <span class="text-xs font-medium">Continue conversation</span>
                      </div>
                      
                      <!-- General chat messages -->
                      <div v-if="result.chatHistory.filter(msg => msg.codeBlockIndex === undefined).length > 0" class="ai-chat-messages">
                        <div
                          v-for="message in result.chatHistory.filter(msg => msg.codeBlockIndex === undefined)"
                          :key="message.id"
                          class="ai-chat-message"
                          :class="{ 'ai-chat-message--user': message.type === 'user' }"
                        >
                          <div class="ai-chat-avatar">
                            <MessageSquare v-if="message.type === 'user'" class="w-3 h-3" />
                            <Brain v-else class="w-3 h-3" />
                          </div>
                          <div class="ai-chat-content">
                            <p class="text-xs">{{ message.content }}</p>
                          </div>
                        </div>
                      </div>
                      
                      <!-- General chat input -->
                      <div class="ai-chat-input">
                        <Input
                          :value="chatInputs[actionId] || ''"
                          @input="handleChatInput"
                          :data-chat-key="actionId"
                          placeholder="Ask a follow-up question..."
                          class="ai-chat-field text-xs"
                          @keydown.enter.prevent="sendChatMessage(actionId)"
                          :disabled="chatLoading[actionId]"
                        />
                        <Button
                          @click="sendChatMessage(actionId)"
                          variant="ghost"
                          size="sm"
                          class="ai-chat-send"
                          :disabled="!chatInputs[actionId]?.trim() || chatLoading[actionId]"
                        >
                          <Loader2 v-if="chatLoading[actionId]" class="w-3 h-3 animate-spin" />
                          <Send v-else class="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
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
  @apply absolute bg-background border-0 rounded-2xl overflow-hidden flex flex-col;
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
  @apply space-y-3 overflow-y-auto;
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
  @apply p-3 rounded-md bg-muted/30 border;
  @apply font-mono leading-relaxed overflow-x-auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
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
  @apply space-y-4 overflow-y-auto;
  max-height: inherit;
}

/* Embedded Mode Styles */
.ai-embedded {
  @apply w-full h-full bg-background overflow-hidden;
}

.ai-embedded-content {
  @apply flex flex-col h-full overflow-hidden;
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

/* Smaller Action Buttons */
.ai-action-card--compact {
  @apply gap-2 p-2 text-sm;
}

.ai-action-icon--small {
  @apply p-1 rounded;
}

.ai-action-name--small {
  @apply text-xs font-medium;
}

.ai-result-btn--small {
  @apply p-1 rounded;
}

.ai-code-copy--small {
  @apply p-1 rounded;
}

/* Chat Styles */
.ai-code-chat {
  @apply mt-3 border-t bg-muted/10 rounded-b-lg overflow-hidden;
}

.ai-general-chat {
  @apply mt-4 border-t pt-3;
}

.ai-chat-header {
  @apply flex items-center gap-2 px-3 py-2 bg-muted/20 text-muted-foreground;
}

.ai-chat-messages {
  @apply p-3 space-y-2 max-h-32 overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 2px;
  }
}

.ai-chat-message {
  @apply flex gap-2 items-start;
  
  &--user {
    @apply flex-row-reverse;
    
    .ai-chat-content {
      @apply bg-primary/10 ml-auto text-right;
    }
  }
}

.ai-chat-avatar {
  @apply p-1 rounded-full bg-muted/50 flex-shrink-0;
}

.ai-chat-content {
  @apply flex-1 p-2 rounded-lg bg-muted/30;
}

.ai-chat-input {
  @apply flex gap-1 p-2 border-t bg-background/50;
}

.ai-chat-field {
  @apply flex-1 h-7 text-xs;
}

.ai-chat-send {
  @apply p-1.5 rounded;
}

/* Enhanced responsive design */
@media (max-width: 768px) {
  .ai-action-grid {
    @apply grid-cols-1;
  }
  
  .ai-action-card {
    @apply text-xs;
  }
  
  .ai-result-actions {
    @apply flex-wrap gap-1;
  }
  
  .ai-chat-messages {
    @apply max-h-24;
  }
}

/* Modern animations for chat */
.ai-chat-message {
  animation: slideInChat 0.3s ease-out;
}

@keyframes slideInChat {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Enhanced button sizing */
.ai-result-badge {
  @apply px-1.5 py-0.5 text-xs;
}

.ai-nav-tab {
  @apply px-2 py-1.5 text-xs;
}

/* Code block improvements */
.ai-code-header {
  @apply px-2 py-1.5 text-xs;
}

.ai-code-block {
  @apply p-2 text-xs;
}

/* Action buttons and suggestions - compact styles */
.ai-action-chip {
  @apply inline-flex items-center px-2 py-1 rounded-md text-xs font-medium;
  @apply bg-muted hover:bg-muted/80 border border-border;
  @apply transition-all duration-200 ease-in-out;
  @apply cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
  @apply max-w-[120px] truncate;
}

.ai-action-chip:hover:not(:disabled) {
  @apply bg-primary/10 border-primary/20;
}

.ai-action-chip--loading {
  @apply bg-primary/5 border-primary/10;
}

.ai-action-mini {
  @apply flex flex-col items-center justify-center p-2 rounded-md;
  @apply bg-muted hover:bg-muted/80 border border-border;
  @apply transition-all duration-200 ease-in-out;
  @apply cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
  @apply min-h-[60px] gap-1;
}

.ai-action-mini:hover:not(:disabled) {
  @apply bg-primary/10 border-primary/20;
}

.ai-action-mini--loading {
  @apply bg-primary/5 border-primary/10;
}

/* Direct prompt styles */
.ai-direct-prompt {
  @apply border border-border rounded-lg p-3 bg-card;
}

.ai-prompt-header {
  @apply flex items-center gap-2 text-muted-foreground;
}

.ai-prompt-input {
  @apply flex items-center gap-2;
}

/* Apply button styling */
.ai-apply-btn {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
  @apply border-primary/20;
}

/* Enhanced result styling */
.ai-result-btn--small {
  @apply px-2 py-1 h-auto min-h-0;
}

.ai-code-copy--small {
  @apply px-2 py-1 h-auto min-h-0;
}

/* Section headers compact */
.ai-section-header {
  @apply flex items-center gap-2;
}

.ai-section-title {
  @apply font-medium text-muted-foreground;
}

/* Improved spacing */
.ai-section {
  @apply space-y-2;
}

.ai-chat-field {
  @apply h-8 text-xs;
}

.ai-chat-send {
  @apply px-2 py-1 h-8 min-h-0;
}

.ai-code-block {
  @apply p-3 rounded-md bg-muted/30 border;
  @apply font-mono leading-relaxed;
}

.ai-code-header {
  @apply flex items-center justify-between mb-2 p-2 bg-muted/50 rounded-t-md border-b;
}

.ai-code-lang {
  @apply font-medium text-muted-foreground;
}

/* Chat improvements */
.ai-chat-message {
  @apply flex gap-2 mb-2 p-2 rounded-md;
}

.ai-chat-message--user {
  @apply bg-primary/5 border border-primary/10;
}

.ai-chat-message:not(.ai-chat-message--user) {
  @apply bg-muted/30;
}

.ai-chat-avatar {
  @apply flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center;
}

.ai-chat-message--user .ai-chat-avatar {
  @apply bg-primary/10;
}

.ai-chat-content {
  @apply flex-1 min-w-0;
}

/* Mobile responsive improvements */
@media (max-width: 640px) {
  .ai-action-chip {
    @apply text-xs px-1.5 py-0.5 max-w-[100px];
  }
  
  .ai-action-mini {
    @apply min-h-[50px] p-1.5;
  }
  
  .ai-prompt-input {
    @apply flex-col gap-2;
  }
  
  .ai-result-actions {
    @apply flex-wrap gap-1;
  }
}

/* Enhanced ScrollArea styling */
.ai-view .scroll-area {
  @apply h-full;
}

.ai-view .scroll-area > div {
  @apply h-full;
}

/* Panel views with proper height and overflow */
.ai-panel .ai-view {
  @apply flex-1 overflow-hidden;
}

.ai-embedded .ai-view {
  @apply flex-1 overflow-hidden;
}

/* Ensure ScrollArea components work properly */
[data-radix-scroll-area-viewport] {
  height: 100% !important;
  overflow-y: auto !important;
}

/* Fix for all scrollable content */
.ai-view h-full {
  display: flex;
  flex-direction: column;
}

.ai-view h-full > * {
  flex-shrink: 0;
}

.ai-view h-full > [data-radix-scroll-area-root] {
  flex: 1;
  min-height: 0;
}

/* Direct prompt area should not scroll */
.ai-direct-prompt {
  flex-shrink: 0;
}

/* Results and actions content should scroll */
.ai-results-list,
.ai-section {
  flex: 1;
  min-height: 0;
}
</style> 