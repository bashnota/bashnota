<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Check, X, Copy, ArrowRight, AlertTriangle, Settings } from 'lucide-vue-next'
import CodeMirror from './CodeMirror.vue'
import { CodeFixService } from '@/services/codeFixService'
import { toast } from '@/components/ui/toast'
import { useRouter } from 'vue-router'

const props = defineProps<{
  originalCode: string
  errorOutput: string
  isOpen: boolean
  language: string
}>()

const emit = defineEmits<{
  'close': []
  'apply-fix': [fixedCode: string]
}>()

// State
const isLoading = ref(true)
const fixedCode = ref('')
const explanation = ref('')
const isCopied = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const provider = ref('')
const router = useRouter()

// Create code fix service
const codeFixService = new CodeFixService()

// Generate AI fix using the CodeFixService
const generateAiFix = async () => {
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  
  try {
    // Generate the fix using the code fix service
    const result = await codeFixService.generateFix(
      props.originalCode,
      props.errorOutput,
      props.language
    )
    
    // Update state with the result
    fixedCode.value = result.fixedCode
    explanation.value = result.explanation
    provider.value = result.provider
    isLoading.value = false
  } catch (error) {
    console.error('Failed to generate AI fix:', error)
    hasError.value = true
    
    // Check if the error is related to WebLLM not being loaded
    const errorStr = error instanceof Error ? error.message : 'Unknown error occurred'
    errorMessage.value = errorStr
    isLoading.value = false
    
    toast({
      title: 'AI Fix Failed',
      description: errorMessage.value,
      variant: 'destructive'
    })
  }
}

// Copy fixed code to clipboard
const copyFixedCode = async () => {
  try {
    await navigator.clipboard.writeText(fixedCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy code:', error)
  }
}

// Apply the fix
const applyFix = () => {
  emit('apply-fix', fixedCode.value)
  emit('close')
}

// Close the dialog
const closeDialog = () => {
  emit('close')
}

// Differences between original and fixed code
const diffSummary = computed(() => {
  if (!fixedCode.value) return ''
  
  const originalLines = props.originalCode.split('\n').length
  const fixedLines = fixedCode.value.split('\n').length
  const lineChange = fixedLines - originalLines
  
  let lineChangeText = ''
  if (lineChange > 0) {
    lineChangeText = `+${lineChange} lines`
  } else if (lineChange < 0) {
    lineChangeText = `${lineChange} lines`
  } else {
    lineChangeText = 'Same number of lines'
  }
  
  return lineChangeText
})

// Retry generation
const retryGeneration = () => {
  generateAiFix()
}

// Navigate to AI settings
const goToAISettings = () => {
  emit('close')
  router.push('/settings?tab=ai')
}

// Initialize
onMounted(() => {
  generateAiFix()
})
</script>

<template>
  <div v-if="isOpen" class="ai-fixer-overlay">
    <div class="ai-fixer-container">
      <!-- Header -->
      <div class="ai-fixer-header">
        <h3 class="ai-fixer-title">AI Code Fix</h3>
        <Button variant="ghost" size="icon" @click="closeDialog" class="ai-fixer-close">
          <X class="h-4 w-4" />
        </Button>
      </div>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="ai-fixer-loading">
        <div class="ai-fixer-loading-container">
          <div class="ai-fixer-spinner"></div>
          <h4 class="ai-fixer-loading-title">AI Analysis in Progress</h4>
          <p class="ai-fixer-loading-text">Analyzing your code and generating a fix...</p>
          <div class="ai-fixer-loading-steps">
            <div class="ai-fixer-loading-step ai-fixer-loading-step-active">
              <div class="ai-fixer-loading-step-dot"></div>
              <div class="ai-fixer-loading-step-label">Analyzing error</div>
            </div>
            <div class="ai-fixer-loading-step">
              <div class="ai-fixer-loading-step-dot"></div>
              <div class="ai-fixer-loading-step-label">Identifying issues</div>
            </div>
            <div class="ai-fixer-loading-step">
              <div class="ai-fixer-loading-step-dot"></div>
              <div class="ai-fixer-loading-step-label">Generating fix</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error state -->
      <div v-else-if="hasError" class="ai-fixer-error">
        <div class="ai-fixer-error-container">
          <div class="ai-fixer-error-icon">
            <AlertTriangle class="h-12 w-12 text-destructive" />
          </div>
          <div class="ai-fixer-error-content">
            <h4 class="ai-fixer-error-title">Failed to Generate Fix</h4>
            <p class="ai-fixer-error-message">{{ errorMessage }}</p>
            
            <!-- WebLLM specific guidance -->
            <div v-if="errorMessage.includes('WebLLM is not loaded')" class="ai-fixer-error-guidance">
              <div class="ai-fixer-error-steps">
                <div class="ai-fixer-error-step">
                  <div class="ai-fixer-error-step-number">1</div>
                  <div class="ai-fixer-error-step-text">Go to AI Settings</div>
                </div>
                <div class="ai-fixer-error-step">
                  <div class="ai-fixer-error-step-number">2</div>
                  <div class="ai-fixer-error-step-text">Select the WebLLM tab</div>
                </div>
                <div class="ai-fixer-error-step">
                  <div class="ai-fixer-error-step-number">3</div>
                  <div class="ai-fixer-error-step-text">Choose and load a model</div>
                </div>
              </div>
            </div>
            
            <div class="ai-fixer-error-actions">
              <Button variant="outline" @click="closeDialog" class="ai-fixer-error-btn">
                <X class="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button variant="default" @click="retryGeneration" class="ai-fixer-error-btn">
                <ArrowRight class="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
              <Button 
                v-if="errorMessage.includes('WebLLM is not loaded')" 
                variant="default" 
                @click="goToAISettings"
                class="ai-fixer-settings-btn"
              >
                <Settings class="h-3.5 w-3.5 mr-1" />
                Open AI Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Results -->
      <div v-else class="ai-fixer-content">
        <!-- Explanation -->
        <div class="ai-fixer-explanation">
          <div class="ai-fixer-explanation-header">
            <h4 class="ai-fixer-section-title">AI Analysis</h4>
            <div v-if="provider" class="ai-fixer-provider">
              Generated by {{ provider }}
            </div>
          </div>
          <div class="ai-fixer-explanation-content">
            <p>{{ explanation }}</p>
          </div>
        </div>
        
        <!-- Code comparison -->
        <div class="ai-fixer-code-comparison">
          <div class="ai-fixer-code-section">
            <div class="ai-fixer-code-header">
              <h4 class="ai-fixer-section-title">Original Code</h4>
              <div class="ai-fixer-code-badge ai-fixer-code-badge-error">Has Errors</div>
            </div>
            <div class="ai-fixer-code-editor">
              <CodeMirror
                :modelValue="props.originalCode"
                :language="language"
                :readonly="true"
                maxHeight="200px"
              />
            </div>
          </div>
          
          <div class="ai-fixer-arrow">
            <ArrowRight class="h-6 w-6" />
            <div class="ai-fixer-diff-summary">{{ diffSummary }}</div>
          </div>
          
          <div class="ai-fixer-code-section">
            <div class="ai-fixer-code-header">
              <h4 class="ai-fixer-section-title">Fixed Code</h4>
              <div class="ai-fixer-code-actions">
                <div class="ai-fixer-code-badge ai-fixer-code-badge-success">Fixed</div>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="copyFixedCode"
                  class="ai-fixer-copy-btn"
                >
                  <Copy v-if="!isCopied" class="h-3.5 w-3.5 mr-1" />
                  <Check v-else class="h-3.5 w-3.5 mr-1" />
                  {{ isCopied ? 'Copied' : 'Copy' }}
                </Button>
              </div>
            </div>
            <div class="ai-fixer-code-editor">
              <CodeMirror
                :modelValue="fixedCode"
                :language="language"
                :readonly="true"
                maxHeight="200px"
              />
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="ai-fixer-actions">
          <Button variant="outline" @click="closeDialog">Cancel</Button>
          <Button variant="default" @click="applyFix" class="ai-fixer-apply-btn">
            <Check class="h-3.5 w-3.5 mr-1" />
            Apply Fix
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Define success color variables if not already in theme */
:root {
  --success: #10b981;
  --success-foreground: #ffffff;
  --success-rgb: 16, 185, 129;
}

:global(.dark) {
  --success: #10b981;
  --success-foreground: #ffffff;
  --success-rgb: 16, 185, 129;
}

/* Define destructive RGB if not already in theme */
:root {
  --destructive-rgb: 239, 68, 68;
}

:global(.dark) {
  --destructive-rgb: 248, 113, 113;
}

/* Define primary RGB if not already in theme */
:root {
  --primary-rgb: 79, 70, 229;
}

:global(.dark) {
  --primary-rgb: 139, 92, 246;
}

.ai-fixer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(3px);
  color: white;
}

:global(.dark) .ai-fixer-overlay {
  background-color: rgba(0, 0, 0, 0.8);
}

.ai-fixer-container {
  background-color: var(--background);
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  color: var(--foreground);
}

/* Light mode specific styling */
@media (prefers-color-scheme: light) {
  .ai-fixer-container {
    background-color: white;
  }
  
  .ai-fixer-loading, 
  .ai-fixer-error {
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 0 0 8px 8px;
  }
}

:global(.dark) .ai-fixer-container {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-fixer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.ai-fixer-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.ai-fixer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.ai-fixer-loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 600px;
}

.ai-fixer-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(var(--primary-rgb), 0.2);
  border-radius: 50%;
  border-top-color: rgb(var(--primary-rgb));
  animation: ai-fixer-spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

:global(.dark) .ai-fixer-spinner {
  border-color: rgba(var(--primary-rgb), 0.15);
  border-top-color: rgb(var(--primary-rgb));
}

.ai-fixer-loading-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: white;
}

:global(.dark) .ai-fixer-loading-title {
  color: rgba(255, 255, 255, 0.95);
}

.ai-fixer-loading-text {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.5rem;
}

:global(.dark) .ai-fixer-loading-text {
  color: rgba(255, 255, 255, 0.7);
}

.ai-fixer-loading-steps {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 500px;
  margin-top: 1rem;
  position: relative;
}

.ai-fixer-loading-steps::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  left: 2rem;
  right: 2rem;
  height: 2px;
  background-color: var(--border);
  z-index: 0;
}

:global(.dark) .ai-fixer-loading-steps::before {
  background-color: rgba(255, 255, 255, 0.1);
}

.ai-fixer-loading-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
  padding: 0 0.5rem;
}

.ai-fixer-loading-step-dot {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: var(--muted);
  margin-bottom: 0.5rem;
  border: 2px solid var(--background);
  box-shadow: 0 0 0 2px var(--border);
  transition: all 0.3s ease;
}

:global(.dark) .ai-fixer-loading-step-dot {
  background-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.ai-fixer-loading-step-active .ai-fixer-loading-step-dot {
  background-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary);
  transform: scale(1.1);
}

:global(.dark) .ai-fixer-loading-step-active .ai-fixer-loading-step-dot {
  background-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.6);
}

.ai-fixer-loading-step-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  white-space: nowrap;
  transition: all 0.3s ease;
}

:global(.dark) .ai-fixer-loading-step-label {
  color: rgba(255, 255, 255, 0.5);
}

.ai-fixer-loading-step-active .ai-fixer-loading-step-label {
  color: white;
  font-weight: 500;
}

.ai-fixer-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.ai-fixer-error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 600px;
}

.ai-fixer-error-icon {
  margin-bottom: 1.5rem;
  animation: pulse 2s infinite;
}

:global(.dark) .ai-fixer-error-icon svg {
  color: rgb(248, 113, 113) !important;
  filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.5));
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.ai-fixer-error-content {
  text-align: center;
}

.ai-fixer-error-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: rgb(239, 68, 68);
}

:global(.dark) .ai-fixer-error-title {
  color: rgb(248, 113, 113);
}

.ai-fixer-error-message {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.5rem;
  max-width: 80%;
}

:global(.dark) .ai-fixer-error-message {
  color: rgba(255, 255, 255, 0.7);
}

.ai-fixer-error-guidance {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background-color: rgba(var(--primary-rgb), 0.1);
  border-radius: 8px;
  width: 100%;
  border: 1px solid rgba(var(--primary-rgb), 0.2);
}

:global(.dark) .ai-fixer-error-guidance {
  background-color: rgba(var(--primary-rgb), 0.15);
  border: 1px solid rgba(var(--primary-rgb), 0.3);
}

.ai-fixer-error-steps {
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.ai-fixer-error-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0.5rem;
}

.ai-fixer-error-step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 5px rgba(var(--primary-rgb), 0.3);
}

:global(.dark) .ai-fixer-error-step-number {
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.5);
}

.ai-fixer-error-step-text {
  font-size: 0.875rem;
  color: white;
  text-align: center;
}

:global(.dark) .ai-fixer-error-step-text {
  color: rgba(255, 255, 255, 0.9);
}

.ai-fixer-error-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.ai-fixer-error-btn {
  display: flex;
  align-items: center;
  min-width: 90px;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--foreground);
}

.ai-fixer-error-btn:hover {
  transform: translateY(-1px);
}

/* Light mode specific button styling */
@media (prefers-color-scheme: light) {
  .ai-fixer-error-btn {
    color: white;
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .ai-fixer-error-btn:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
}

.ai-fixer-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--foreground);
}

.ai-fixer-explanation {
  background-color: var(--muted);
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid rgb(var(--primary-rgb));
  color: var(--foreground);
}

:global(.dark) .ai-fixer-explanation {
  background-color: rgba(255, 255, 255, 0.05);
  border-left: 4px solid rgba(var(--primary-rgb), 0.8);
}

.ai-fixer-explanation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.ai-fixer-explanation-content {
  font-size: 0.9rem;
  line-height: 1.5;
}

:global(.dark) .ai-fixer-explanation-content {
  color: rgba(255, 255, 255, 0.9);
}

.ai-fixer-code-comparison {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.ai-fixer-code-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.3s ease;
}

:global(.dark) .ai-fixer-code-section {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
}

.ai-fixer-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
}

:global(.dark) .ai-fixer-code-header {
  background-color: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-fixer-code-editor {
  flex: 1;
  overflow: hidden;
  background-color: var(--background);
}

:global(.dark) .ai-fixer-code-editor {
  background-color: rgba(0, 0, 0, 0.3);
}

/* CodeMirror styling in dark mode */
:global(.dark) .ai-fixer-code-editor :deep(.cm-editor) {
  background-color: rgba(0, 0, 0, 0.3);
}

:global(.dark) .ai-fixer-code-editor :deep(.cm-gutters) {
  background-color: rgba(0, 0, 0, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

:global(.dark) .ai-fixer-code-editor :deep(.cm-activeLineGutter) {
  background-color: rgba(255, 255, 255, 0.05);
}

:global(.dark) .ai-fixer-code-editor :deep(.cm-activeLine) {
  background-color: rgba(255, 255, 255, 0.05);
}

:global(.dark) .ai-fixer-code-editor :deep(.cm-line) {
  color: rgba(255, 255, 255, 0.9);
}

.ai-fixer-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  padding: 0 0.5rem;
}

:global(.dark) .ai-fixer-arrow {
  color: rgba(255, 255, 255, 0.5);
}

.ai-fixer-arrow svg {
  transition: all 0.3s ease;
}

:global(.dark) .ai-fixer-arrow svg {
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.2));
}

.ai-fixer-diff-summary {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--muted);
  border-radius: 4px;
}

:global(.dark) .ai-fixer-diff-summary {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.ai-fixer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
}

.ai-fixer-copy-btn {
  display: flex;
  align-items: center;
  height: 1.75rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.ai-fixer-copy-btn:hover {
  background-color: rgba(var(--primary-rgb), 0.1);
}

:global(.dark) .ai-fixer-copy-btn:hover {
  background-color: rgba(var(--primary-rgb), 0.2);
}

.ai-fixer-apply-btn {
  background-color: var(--primary);
  color: var(--primary-foreground);
  min-width: 120px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(var(--primary-rgb), 0.3);
}

.ai-fixer-apply-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(var(--primary-rgb), 0.4);
}

:global(.dark) .ai-fixer-apply-btn {
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.5);
}

:global(.dark) .ai-fixer-apply-btn:hover {
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.6);
}

@keyframes ai-fixer-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .ai-fixer-code-comparison {
    flex-direction: column;
  }
  
  .ai-fixer-arrow {
    flex-direction: row;
    padding: 0.5rem 0;
  }
  
  .ai-fixer-diff-summary {
    margin-top: 0;
    margin-left: 0.5rem;
  }
  
  .ai-fixer-error-steps {
    flex-direction: column;
    gap: 1rem;
  }
  
  .ai-fixer-loading-steps {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .ai-fixer-loading-steps::before {
    display: none;
  }
  
  .ai-fixer-loading-step {
    flex-direction: row;
    width: 100%;
    justify-content: flex-start;
    gap: 1rem;
  }
  
  .ai-fixer-loading-step-label {
    text-align: left;
  }
}

.ai-fixer-provider {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 0.5rem;
  text-align: right;
  font-style: italic;
}

:global(.dark) .ai-fixer-provider {
  color: rgba(255, 255, 255, 0.5);
}

.ai-fixer-settings-btn {
  background-color: var(--primary);
  color: var(--primary-foreground);
  min-width: 140px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(var(--primary-rgb), 0.3);
}

.ai-fixer-settings-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(var(--primary-rgb), 0.4);
}

:global(.dark) .ai-fixer-settings-btn {
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.5);
}

:global(.dark) .ai-fixer-settings-btn:hover {
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.6);
}

/* Ensure primary button is visible in both modes */
@media (prefers-color-scheme: light) {
  .ai-fixer-settings-btn,
  .ai-fixer-apply-btn {
    color: white;
  }
}

.ai-fixer-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--foreground);
}

.ai-fixer-code-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 9999px;
  font-weight: 500;
  text-transform: uppercase;
}

.ai-fixer-code-badge-error {
  background-color: rgba(var(--destructive-rgb), 0.1);
  color: var(--destructive);
}

:global(.dark) .ai-fixer-code-badge-error {
  background-color: rgba(248, 113, 113, 0.2);
  color: rgb(248, 113, 113);
}

.ai-fixer-code-badge-success {
  background-color: rgba(var(--success-rgb), 0.1);
  color: var(--success);
}

:global(.dark) .ai-fixer-code-badge-success {
  background-color: rgba(16, 185, 129, 0.2);
  color: rgb(16, 185, 129);
}

.ai-fixer-code-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style> 