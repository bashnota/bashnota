<script setup lang="ts">
// Main entry point for the modular AI Code Assistant
// This component now serves as a lightweight wrapper around the new modular architecture
import AICodeAssistantContainer from './ai/components/AICodeAssistantContainer.vue'

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

// Pass through all events to the modular container
const handleCodeUpdated = (code: string) => emit('code-updated', code)
const handleAnalysisStarted = () => emit('analysis-started')
const handleAnalysisCompleted = () => emit('analysis-completed')
const handleActionExecuted = (actionId: string, result: string) => emit('action-executed', actionId, result)
const handleTriggerExecution = () => emit('trigger-execution')
const handleRequestExecutionContext = () => emit('request-execution-context')
</script>

<template>
  <!-- 
    Modular AI Code Assistant
    
    This component now uses the new modular architecture with:
    - AICodeAssistantContainer: Main orchestrator with smart floating panel
    - AIActionPanel: Context-aware action suggestions
    - AIResultsPanel: Enhanced results display with tabbed interface
    - AIChatInterface: Threaded conversations
    - AIErrorAnalyzer: Intelligent error analysis
    - AIProviderStatus: Provider configuration management
    
    All components are designed for:
    - Better UX with progressive disclosure
    - Enhanced features like smart suggestions and chat
    - Modular architecture for maintainability
    - Responsive design that adapts to screen size
  -->
  <AICodeAssistantContainer
    :code="props.code"
    :language="props.language"
    :error="props.error"
    :is-read-only="props.isReadOnly"
    :block-id="props.blockId"
    :is-executing="props.isExecuting"
    :execution-time="props.executionTime"
    :has-output="props.hasOutput"
    :embedded-mode="props.embeddedMode"
    :session-info="props.sessionInfo"
    @code-updated="handleCodeUpdated"
    @analysis-started="handleAnalysisStarted"
    @analysis-completed="handleAnalysisCompleted"
    @action-executed="handleActionExecuted"
    @trigger-execution="handleTriggerExecution"
    @request-execution-context="handleRequestExecutionContext"
  />
</template>

<style scoped>
/* 
  The modular AI Code Assistant now relies on individual component styles.
  All styling is handled by the child components for better maintainability:
  
  - AICodeAssistantContainer.vue: Main layout and floating panel styles
  - AIActionPanel.vue: Action button and suggestion styles
  - AIResultsPanel.vue: Results display and tabbed interface styles
  - AIChatInterface.vue: Chat interface and message styles
  - AIErrorAnalyzer.vue: Error display and analysis styles
  - AIProviderStatus.vue: Provider configuration styles
  
  This approach ensures:
  - Better style encapsulation
  - Easier maintenance and debugging
  - Reduced CSS conflicts
  - Modular theming capabilities
*/
</style>
