<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Brain, Loader2, Maximize2, Minimize2, X } from 'lucide-vue-next'
import AIActionPanel from './AIActionPanel.vue'
import AIResultsPanel from './AIResultsPanel.vue'
import AIChatInterface from './AIChatInterface.vue'
import AIErrorAnalyzer from './AIErrorAnalyzer.vue'
import AIProviderStatus from './AIProviderStatus.vue'
import { useAIActions, type ActionExecutionContext } from '../composables/useAIActions'
import { useAIChat } from '../composables/useAIChat'

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

// State
const isVisible = ref(false)
const isExpanded = ref(true)
const activeView = ref<'actions' | 'results' | 'chat' | 'error'>('actions')
const isCompact = ref(false)

// Setup composables
const context = computed<ActionExecutionContext>(() => ({
  code: props.code,
  language: props.language,
  error: props.error,
  blockId: props.blockId,
  sessionInfo: props.sessionInfo
}))

const aiActions = useAIActions(context.value)
const aiChat = useAIChat()

// Computed
const hasError = computed(() => !!props.error)
const hasResults = computed(() => aiActions.actionResults.value.size > 0)
const hasActiveChats = computed(() => aiChat.hasActiveChats.value)

const triggerVariant = computed(() => {
  if (hasError.value) return 'error'
  if (hasResults.value) return 'results'
  if (aiActions.isAnalyzing.value) return 'analyzing'
  return 'default'
})

const statusBadgeCount = computed(() => {
  if (hasError.value) return '!'
  if (hasResults.value) return aiActions.actionResults.value.size
  if (aiActions.isAnalyzing.value) return '...'
  return null
})

// Auto-set view based on context
watch(() => props.error, (newError) => {
  if (newError && isVisible.value) {
    activeView.value = 'error'
  }
}, { immediate: true })

watch(hasResults, (hasResults) => {
  if (hasResults && isVisible.value && activeView.value === 'actions') {
    activeView.value = 'results'
  }
})

// Methods
const toggleVisibility = () => {
  isVisible.value = !isVisible.value
  
  if (isVisible.value) {
    emit('analysis-started')
    checkCompactMode()
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const closePanel = () => {
  isVisible.value = false
}

const checkCompactMode = () => {
  // Use compact mode on smaller screens
  isCompact.value = window.innerWidth < 768
}

const setActiveView = (view: 'actions' | 'results' | 'chat' | 'error') => {
  activeView.value = view
}

const handleActionExecuted = async (actionId: string, result: string) => {
  emit('action-executed', actionId, result)
  
  // Auto-switch to results view after action execution
  if (activeView.value === 'actions') {
    activeView.value = 'results'
  }
}

const handleCodeUpdated = (code: string) => {
  emit('code-updated', code)
}

const handleTriggerExecution = () => {
  emit('trigger-execution')
}

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  if (!isVisible.value) return
  
  // ESC to close
  if (event.key === 'Escape') {
    closePanel()
    event.preventDefault()
  }
  
  // Tab navigation between views
  if (event.key === 'Tab' && event.shiftKey) {
    const views = ['actions', 'results', 'chat', 'error'].filter(v => {
      if (v === 'error') return hasError.value
      if (v === 'results') return hasResults.value
      if (v === 'chat') return hasActiveChats.value
      return true
    })
    
    const currentIndex = views.indexOf(activeView.value)
    const nextIndex = (currentIndex - 1 + views.length) % views.length
    setActiveView(views[nextIndex] as any)
    event.preventDefault()
  } else if (event.key === 'Tab' && !event.shiftKey) {
    const views = ['actions', 'results', 'chat', 'error'].filter(v => {
      if (v === 'error') return hasError.value
      if (v === 'results') return hasResults.value
      if (v === 'chat') return hasActiveChats.value
      return true
    })
    
    const currentIndex = views.indexOf(activeView.value)
    const nextIndex = (currentIndex + 1) % views.length
    setActiveView(views[nextIndex] as any)
    event.preventDefault()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', checkCompactMode)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', checkCompactMode)
})
</script>

<template>
  <div class="ai-assistant" :class="{ 'ai-assistant--embedded': embeddedMode }">
    <!-- Floating Trigger Button (non-embedded mode) -->
    <div v-if="!embeddedMode" class="ai-trigger">
      <Button
        @click="toggleVisibility"
        :variant="triggerVariant === 'error' ? 'destructive' : 'default'"
        size="sm"
        class="ai-trigger-btn"
        :class="{
          'ai-trigger-btn--active': isVisible,
          'ai-trigger-btn--error': triggerVariant === 'error',
          'ai-trigger-btn--results': triggerVariant === 'results',
          'ai-trigger-btn--analyzing': triggerVariant === 'analyzing'
        }"
      >
        <div class="ai-trigger-icon">
          <Loader2 v-if="aiActions.isAnalyzing.value" class="w-4 h-4 animate-spin" />
          <Brain v-else class="w-4 h-4" />
        </div>
        
        <!-- Status Badge -->
        <div
          v-if="statusBadgeCount"
          class="ai-status-badge"
          :class="{
            'ai-status-badge--error': hasError,
            'ai-status-badge--success': hasResults && !hasError,
            'ai-status-badge--analyzing': aiActions.isAnalyzing.value
          }"
        >
          {{ statusBadgeCount }}
        </div>
      </Button>
    </div>

    <!-- Floating Panel (non-embedded mode) -->
    <Transition name="ai-panel" appear>
      <div
        v-if="isVisible && !embeddedMode"
        class="ai-panel"
        :class="{
          'ai-panel--compact': isCompact,
          'ai-panel--collapsed': !isExpanded
        }"
      >
        <!-- Panel Header -->
        <div class="ai-header">
          <div class="ai-header-content">
            <div class="ai-header-icon">
              <Brain class="w-5 h-5" />
            </div>
            <div class="ai-header-text">
              <div class="ai-title">AI Assistant</div>
              <div class="ai-subtitle">{{ props.language }} • {{ props.blockId }}</div>
            </div>
          </div>
          
          <div class="ai-header-actions">
            <Button
              @click="toggleExpanded"
              variant="ghost"
              size="sm"
              class="ai-header-btn"
            >
              <Minimize2 v-if="isExpanded" class="w-4 h-4" />
              <Maximize2 v-else class="w-4 h-4" />
            </Button>
            
            <Button
              @click="closePanel"
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
          <AIProviderStatus
            v-if="!aiActions.isProviderConfigured.value"
            :message="aiActions.providerConfigMessage.value || undefined"
          />

          <!-- Navigation Tabs -->
          <div class="ai-nav">
            <div class="ai-nav-tabs">
              <button
                @click="setActiveView('actions')"
                class="ai-nav-tab"
                :class="{ 'ai-nav-tab--active': activeView === 'actions' }"
              >
                <Brain class="w-4 h-4" />
                Actions
              </button>
              
              <button
                v-if="hasResults"
                @click="setActiveView('results')"
                class="ai-nav-tab"
                :class="{ 'ai-nav-tab--active': activeView === 'results' }"
              >
                Results ({{ aiActions.actionResults.value.size }})
              </button>
              
              <button
                v-if="hasActiveChats"
                @click="setActiveView('chat')"
                class="ai-nav-tab"
                :class="{ 'ai-nav-tab--active': activeView === 'chat' }"
              >
                Chat
              </button>
              
              <button
                v-if="hasError"
                @click="setActiveView('error')"
                class="ai-nav-tab ai-nav-tab--error"
                :class="{ 'ai-nav-tab--active': activeView === 'error' }"
              >
                Error
              </button>
            </div>
          </div>

          <!-- View Components -->
          <AIActionPanel
            v-if="activeView === 'actions'"
            :context="context"
            :ai-actions="aiActions"
            @action-executed="handleActionExecuted"
            @code-updated="handleCodeUpdated"
            @trigger-execution="handleTriggerExecution"
          />
          
          <AIResultsPanel
            v-if="activeView === 'results'"
            :ai-actions="aiActions"
            :ai-chat="aiChat"
            @code-updated="handleCodeUpdated"
          />
          
          <AIChatInterface
            v-if="activeView === 'chat'"
            :ai-chat="aiChat"
            :context="context"
          />
          
          <AIErrorAnalyzer
            v-if="activeView === 'error' && hasError"
            :error="props.error!"
            :context="context"
            :ai-actions="aiActions"
            @action-executed="handleActionExecuted"
          />
        </div>
      </div>
    </Transition>

    <!-- Embedded Mode -->
    <div v-if="embeddedMode" class="ai-embedded">
      <!-- Provider Status -->
      <AIProviderStatus
        v-if="!aiActions.isProviderConfigured.value"
        :message="aiActions.providerConfigMessage.value || undefined"
      />

      <!-- Navigation -->
      <div class="ai-nav">
        <div class="ai-nav-tabs">
          <button
            @click="setActiveView('actions')"
            class="ai-nav-tab"
            :class="{ 'ai-nav-tab--active': activeView === 'actions' }"
          >
            Actions
          </button>
          
          <button
            v-if="hasResults"
            @click="setActiveView('results')"
            class="ai-nav-tab"
            :class="{ 'ai-nav-tab--active': activeView === 'results' }"
          >
            Results ({{ aiActions.actionResults.value.size }})
          </button>
          
          <button
            v-if="hasActiveChats"
            @click="setActiveView('chat')"
            class="ai-nav-tab"
            :class="{ 'ai-nav-tab--active': activeView === 'chat' }"
          >
            Chat
          </button>
          
          <button
            v-if="hasError"
            @click="setActiveView('error')"
            class="ai-nav-tab ai-nav-tab--error"
            :class="{ 'ai-nav-tab--active': activeView === 'error' }"
          >
            Error
          </button>
        </div>
      </div>

      <!-- Views -->
      <div class="ai-embedded-content">
        <AIActionPanel
          v-if="activeView === 'actions'"
          :context="context"
          :ai-actions="aiActions"
          :embedded="true"
          @action-executed="handleActionExecuted"
          @code-updated="handleCodeUpdated"
          @trigger-execution="handleTriggerExecution"
        />
        
        <AIResultsPanel
          v-if="activeView === 'results'"
          :ai-actions="aiActions"
          :ai-chat="aiChat"
          :embedded="true"
          @code-updated="handleCodeUpdated"
        />
        
        <AIChatInterface
          v-if="activeView === 'chat'"
          :ai-chat="aiChat"
          :context="context"
          :embedded="true"
        />
        
        <AIErrorAnalyzer
          v-if="activeView === 'error' && hasError"
          :error="props.error!"
          :context="context"
          :ai-actions="aiActions"
          :embedded="true"
          @action-executed="handleActionExecuted"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-assistant {
  --ai-panel-width: 420px;
  --ai-panel-max-height: 650px;
  --ai-trigger-size: 40px;
  position: relative;
}

.ai-trigger {
  display: inline-flex;
  position: relative;
}

.ai-trigger-btn {
  @apply relative p-2 rounded-xl transition-all duration-300;
  width: var(--ai-trigger-size);
  height: var(--ai-trigger-size);
  background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
  border: 1px solid hsl(var(--border) / 0.5);
}

.ai-trigger-btn:hover {
  @apply scale-110 shadow-lg;
  border-color: hsl(var(--primary) / 0.3);
}

.ai-trigger-btn--active {
  @apply scale-105 shadow-md;
  background: hsl(var(--primary) / 0.15);
  border-color: hsl(var(--primary) / 0.4);
}

.ai-trigger-btn--error {
  @apply text-destructive;
  background: hsl(var(--destructive) / 0.1);
  border-color: hsl(var(--destructive) / 0.3);
}

.ai-trigger-btn--results {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.3);
}

.ai-trigger-btn--analyzing {
  animation: ai-analyzing 2s ease-in-out infinite;
}

.ai-trigger-icon {
  @apply relative flex items-center justify-center;
}

.ai-status-badge {
  @apply absolute -top-1 -right-1 flex items-center justify-center;
  @apply px-1.5 py-0.5 rounded-full text-xs font-bold;
  min-width: 18px;
  height: 18px;
  box-shadow: 0 0 0 2px hsl(var(--background));
}

.ai-status-badge--error {
  @apply bg-destructive text-destructive-foreground;
}

.ai-status-badge--success {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.ai-status-badge--analyzing {
  @apply bg-blue-500 text-white;
}

.ai-panel {
  @apply absolute bg-background rounded-2xl overflow-hidden flex flex-col;
  @apply border shadow-2xl backdrop-blur-sm;
  width: var(--ai-panel-width);
  max-height: var(--ai-panel-max-height);
  top: calc(100% + 8px);
  left: 0;
  z-index: 9999;
  background: hsl(var(--background) / 0.95);
}

.ai-panel--compact {
  width: min(var(--ai-panel-width), calc(100vw - 2rem));
  left: 50%;
  transform: translateX(-50%);
}

.ai-panel--collapsed {
  max-height: auto;
}

.ai-header {
  @apply flex items-center justify-between p-4 border-b;
  background: linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.2));
}

.ai-header-content {
  @apply flex items-center gap-3;
}

.ai-header-icon {
  @apply p-2 rounded-xl;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1));
}

.ai-header-text {
  @apply flex-1;
}

.ai-title {
  @apply text-sm font-semibold;
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

.ai-content {
  @apply p-4 space-y-4 flex-1 overflow-hidden;
}

.ai-nav {
  @apply flex items-center justify-between gap-2;
}

.ai-nav-tabs {
  @apply flex gap-1 p-1 bg-muted/30 rounded-xl;
}

.ai-nav-tab {
  @apply flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium;
  @apply transition-all duration-200 hover:bg-background/80 text-muted-foreground;
}

.ai-nav-tab--active {
  @apply bg-background text-foreground shadow-sm;
}

.ai-nav-tab--error {
  @apply text-destructive hover:text-destructive;
}

.ai-nav-tab--error.ai-nav-tab--active {
  @apply bg-destructive/10 text-destructive;
}

.ai-embedded {
  @apply w-full h-full overflow-hidden flex flex-col;
  min-height: 400px;
}

.ai-embedded-content {
  @apply flex-1 overflow-hidden;
}

/* Animations */
@keyframes ai-analyzing {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

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

/* Responsive */
@media (max-width: 768px) {
  .ai-panel {
    --ai-panel-width: calc(100vw - 2rem);
    max-height: calc(100vh - 8rem);
  }
}
</style>
