// Core Components - Modular Design
export { default as CodeBlockWithExecution } from './CodeBlockWithExecution.vue'

// Sub Components
export { default as CodeBlockToolbar } from './components/CodeBlockToolbar.vue'
export { default as StatusIndicator } from './components/StatusIndicator.vue'
export { default as WarningBanners } from './components/WarningBanners.vue'
export { default as CodeEditor } from './components/CodeEditor.vue'
export { default as OutputSection } from './components/OutputSection.vue'
export { default as ServerKernelSelector } from './components/ServerKernelSelector.vue'
export { default as SessionSelector } from './components/SessionSelector.vue'

// Existing Components
export { default as AICodeAssistantContainer } from './ai/components/AICodeAssistantContainer.vue'
export { default as CodeMirror } from './CodeMirror.vue'
export { default as ExecutionStatus } from './ExecutionStatus.vue'
export { default as ErrorDisplay } from './ErrorDisplay.vue'
export { default as FullScreenCodeBlock } from './FullScreenCodeBlock.vue'
export { default as OutputRenderer } from './OutputRenderer.vue'
export { default as TemplateSelector } from './TemplateSelector.vue'

// Composables  
export { useCodeBlockState } from './composables/core/useCodeBlockState'
export { useSessionManagement } from './composables/core/useSessionManagement'
export { useCodeExecution } from './composables/core/useCodeExecution'
export { usePreferencesManagement } from './composables/core/usePreferencesManagement'
export { useCodeBlockExecution } from './composables/useCodeBlockExecution'
export { useCodeBlockToolbar } from './composables/ui/useCodeBlockToolbar'
export { useCodeBlockShortcuts } from './composables/ui/useCodeBlockShortcuts'
export { useFullscreenCode } from './composables/ui/useFullscreenCode'
export { useOutputStreaming } from './composables/features/useOutputStreaming'
export { useAICodeAssistant } from './composables/features/useAICodeAssistant'
export { useCodeTemplates } from './composables/features/useCodeTemplates'
export { useCodeFormatting } from './composables/features/useCodeFormatting'

// Types
export type * from './types'
