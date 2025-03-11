<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Copy, Check, Download, Maximize, Minimize, Eye, EyeOff, Wand2, Code2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  content: string
  type?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
  showControls?: boolean
  maxHeight?: string
  isCollapsible?: boolean
  isFullscreenable?: boolean
  originalCode?: string // Original code that produced this output
}>()

const emit = defineEmits<{
  'copy': []
  'fix-with-ai': [originalCode: string, errorOutput: string]
}>()

const formattedContent = ref('')
const jsonTree = ref<any>(null)
const isOutputCopied = ref(false)
const isOutputVisible = ref(true)
const isFullscreen = ref(false)

// Add loading state for AI fix
const isAiFixLoading = ref(false)

// Determine output type based on content if not explicitly provided
const effectiveOutputType = computed(() => {
  if (props.type) return props.type
  
  // Auto-detect output type if not specified
  if (!props.content) return 'text'
  if (props.content.startsWith('<img')) return 'image'
  try {
    JSON.parse(props.content)
    return 'json'
  } catch {
    return props.content.includes('<table') ? 'table' : 'html'
  }
})

// Format JSON for better display
const formatJson = (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    console.error('Error parsing JSON:', e)
    return jsonString
  }
}

// Process content based on type
const processContent = () => {
  if (!props.content) return
  
  switch (effectiveOutputType.value) {
    case 'json':
      try {
        jsonTree.value = JSON.parse(props.content)
        formattedContent.value = formatJson(props.content)
      } catch (e) {
        formattedContent.value = props.content
      }
      break
    case 'table':
      // Keep HTML table as is
      formattedContent.value = props.content
      break
    case 'image':
      // Keep image HTML as is
      formattedContent.value = props.content
      break
    case 'error':
      // Preserve error output
      formattedContent.value = props.content
      break
    case 'html':
      // Sanitize HTML if needed
      formattedContent.value = props.content
      break
    case 'text':
    default:
      // Preserve whitespace for text
      formattedContent.value = props.content
      break
  }
}

// Copy output to clipboard
const copyOutput = async () => {
  if (!props.content) return

  try {
    // Convert HTML to plain text for copying
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = props.content
    const textContent = tempDiv.textContent || tempDiv.innerText || ''

    await navigator.clipboard.writeText(textContent)
    isOutputCopied.value = true
    emit('copy')
    setTimeout(() => {
      isOutputCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy output:', error)
  }
}

// Download output as file
const downloadOutput = () => {
  if (!props.content) return
  
  let content = props.content
  let mimeType = 'text/plain'
  let extension = 'txt'
  
  // Adjust based on output type
  if (effectiveOutputType.value === 'json') {
    mimeType = 'application/json'
    extension = 'json'
    try {
      // Format JSON for download
      const parsed = JSON.parse(content)
      content = JSON.stringify(parsed, null, 2)
    } catch (e) {
      // Use original content if parsing fails
    }
  } else if (effectiveOutputType.value === 'html' || effectiveOutputType.value === 'table') {
    mimeType = 'text/html'
    extension = 'html'
  }
  
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `output.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Toggle output visibility
const toggleVisibility = () => {
  isOutputVisible.value = !isOutputVisible.value
}

// Toggle fullscreen mode
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// Watch for content changes
watch(
  () => props.content,
  () => {
    processContent()
  }
)

// Watch for type changes
watch(
  () => props.type,
  () => {
    processContent()
  }
)

onMounted(() => {
  processContent()
})

// Syntax highlighting for JSON
const highlightJson = (json: string) => {
  // Simple highlighting - replace with a proper syntax highlighter if needed
  return json
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
    .replace(/"([^"]+)"/g, '<span class="json-string">"$1"</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="json-literal">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>')
}

// Error detection
const hasError = computed(() => {
  return effectiveOutputType.value === 'error' || 
    (props.content && (
      props.content.toLowerCase().includes('error') ||
      props.content.toLowerCase().includes('exception') ||
      props.content.toLowerCase().includes('traceback') ||
      props.content.toLowerCase().includes('failed')
    ))
})

// Function to handle AI fix request with loading state
const requestAiFix = () => {
  if (props.originalCode) {
    isAiFixLoading.value = true
    emit('fix-with-ai', props.originalCode, props.content)
    
    // We'll reset this when the parent component tells us it's done
    // But add a timeout just in case
    setTimeout(() => {
      isAiFixLoading.value = false
    }, 30000) // 30 seconds max
  }
}

// New method to reset loading state (to be called by parent)
const resetAiFixLoading = () => {
  isAiFixLoading.value = false
}

// Expose methods to parent components
defineExpose({
  resetAiFixLoading
})

// Add language detection for better syntax highlighting
const detectedLanguage = computed(() => {
  if (!props.content) return null
  
  // Check for common language patterns in the output
  if (props.content.includes('Traceback (most recent call last):')) return 'python'
  if (props.content.includes('SyntaxError:') && props.content.includes('at ')) return 'javascript'
  if (props.content.includes('Exception in thread')) return 'java'
  if (props.content.includes('Fatal error:') && props.content.includes('PHP')) return 'php'
  if (props.content.includes('Uncaught exception')) return 'php'
  
  return null
})

// Improved code formatting for better readability
const formatCodeOutput = (content: string) => {
  if (!content) return ''
  
  // Add line numbers
  const lines = content.split('\n')
  let result = ''
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const paddedNumber = lineNumber.toString().padStart(3, ' ')
    
    // Highlight error lines
    const isErrorLine = line.toLowerCase().includes('error') || 
                        line.toLowerCase().includes('exception') ||
                        line.toLowerCase().includes('warning')
    
    result += `<div class="code-line ${isErrorLine ? 'error-line' : ''}">
                <span class="line-number">${paddedNumber}</span>
                <span class="line-content">${line}</span>
              </div>`
  })
  
  return result
}

// Format error output with better highlighting
const formattedErrorOutput = computed(() => {
  if (!hasError.value || !props.content) return ''
  
  return formatCodeOutput(props.content)
})
</script>

<template>
  <div class="output-container" :class="{ 'fullscreen': isFullscreen }">
    <!-- Output header with controls -->
    <div v-if="props.showControls" class="output-header">
      <span class="output-type">
        Output
        <span v-if="effectiveOutputType !== 'text'" class="output-type-label">
          ({{ effectiveOutputType }})
        </span>
        <span v-if="hasError" class="error-badge">Error Detected</span>
      </span>
      
      <div class="output-controls">
        <!-- Fix with AI button (only shown when error is detected and originalCode is provided) -->
        <Button
          v-if="hasError && props.originalCode"
          variant="outline"
          size="sm"
          @click="requestAiFix"
          class="fix-ai-button"
          :disabled="isAiFixLoading"
          title="Fix this error with AI"
        >
          <div v-if="isAiFixLoading" class="ai-loading-indicator">
            <div class="ai-loading-dot"></div>
            <div class="ai-loading-dot"></div>
            <div class="ai-loading-dot"></div>
          </div>
          <Wand2 v-else class="control-icon mr-1" />
          {{ isAiFixLoading ? 'Fixing...' : 'Fix with AI' }}
        </Button>
        
        <!-- Toggle visibility button -->
        <Button
          v-if="props.isCollapsible"
          variant="ghost"
          size="icon"
          @click="toggleVisibility"
          class="control-button"
          :title="isOutputVisible ? 'Hide Output' : 'Show Output'"
        >
          <Eye v-if="!isOutputVisible" class="control-icon" />
          <EyeOff v-else class="control-icon" />
          <span class="sr-only">{{ isOutputVisible ? 'Hide' : 'Show' }}</span>
        </Button>
        
        <!-- Copy button -->
        <Button
          variant="ghost"
          size="icon"
          @click="copyOutput"
          class="control-button"
          title="Copy output to clipboard"
        >
          <Copy v-if="!isOutputCopied" class="control-icon" />
          <Check v-else class="control-icon" />
          <span class="sr-only">Copy</span>
        </Button>
        
        <!-- Download button -->
        <Button
          variant="ghost"
          size="icon"
          @click="downloadOutput"
          class="control-button"
          title="Download output as file"
        >
          <Download class="control-icon" />
          <span class="sr-only">Download</span>
        </Button>
        
        <!-- Fullscreen toggle -->
        <Button
          v-if="props.isFullscreenable"
          variant="ghost"
          size="icon"
          @click="toggleFullscreen"
          class="control-button"
          :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen output'"
        >
          <Maximize v-if="!isFullscreen" class="control-icon" />
          <Minimize v-else class="control-icon" />
          <span class="sr-only">{{ isFullscreen ? 'Exit fullscreen' : 'Fullscreen' }}</span>
        </Button>
      </div>
    </div>
    
    <!-- AI Fix Loading Overlay (shown when AI is fixing) -->
    <div v-if="isAiFixLoading" class="ai-fix-overlay">
      <div class="ai-fix-message">
        <div class="ai-fix-loading-spinner"></div>
        <div class="ai-fix-text">AI is analyzing and fixing your code...</div>
      </div>
    </div>
    
    <!-- Output content -->
    <div 
      v-if="isOutputVisible" 
      class="output-content"
      :class="[
        `output-${effectiveOutputType}`, 
        { 'error': effectiveOutputType === 'error' || hasError },
        { 'with-line-numbers': hasError && detectedLanguage }
      ]"
      :style="{ maxHeight: !isFullscreen && props.maxHeight ? props.maxHeight : 'none' }"
    >
      <!-- Text output -->
      <pre v-if="effectiveOutputType === 'text'" class="text-output">{{ content }}</pre>
      
      <!-- JSON output -->
      <div v-else-if="effectiveOutputType === 'json'" class="json-viewer">
        <pre v-if="formattedContent" v-html="highlightJson(formattedContent)"></pre>
        <pre v-else>{{ content }}</pre>
      </div>
      
      <!-- Table output -->
      <div v-else-if="effectiveOutputType === 'table'" class="table-viewer" v-html="content"></div>
      
      <!-- Image output -->
      <div v-else-if="effectiveOutputType === 'image'" class="image-viewer" v-html="content"></div>
      
      <!-- Enhanced error output with line numbers and highlighting -->
      <div 
        v-if="effectiveOutputType === 'error' || hasError" 
        class="error-output-container"
        v-html="formattedErrorOutput"
      ></div>
      
      <!-- HTML output (default) -->
      <div v-else class="html-viewer" v-html="content"></div>
    </div>
    
    <!-- Collapsed message -->
    <div v-else-if="props.isCollapsible" class="output-collapsed">
      Output hidden (click <Eye class="inline-icon" /> to show)
    </div>
  </div>
</template>

<style scoped>
.output-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}

.output-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background-color: var(--background);
  padding: 1rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.output-type {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.output-type-label {
  text-transform: none;
  margin-left: 0.5rem;
}

.output-controls {
  display: flex;
  gap: 0.25rem;
}

.control-button {
  height: 1.5rem;
  width: 1.5rem;
  padding: 0;
}

.control-icon {
  height: 0.875rem;
  width: 0.875rem;
}

.inline-icon {
  height: 0.875rem;
  width: 0.875rem;
  vertical-align: middle;
}

.output-content {
  overflow: auto;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  background-color: var(--background);
}

.output-content.error {
  background-color: rgb(254, 242, 242);
  color: rgb(185, 28, 28);
}

.output-collapsed {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-align: center;
}

.text-output, .json-viewer pre, .error-output {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.json-viewer {
  overflow-x: auto;
}

.json-key {
  color: #9b2c2c;
}

.json-string {
  color: #2b6cb0;
}

.json-number {
  color: #805ad5;
}

.json-literal {
  color: #dd6b20;
}

.table-viewer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1rem;
}

.table-viewer :deep(th),
.table-viewer :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem;
  text-align: left;
}

.table-viewer :deep(th) {
  background-color: var(--muted);
  font-weight: 600;
}

.table-viewer :deep(tr:nth-child(even)) {
  background-color: var(--muted);
}

.image-viewer :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* Dark mode adjustments */
:global(.dark) .output-content.error {
  background-color: rgb(127, 29, 29, 0.2);
  color: rgb(248, 180, 180);
}

/* Scrollbar styling */
.output-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

.output-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.output-content::-webkit-scrollbar-track {
  background: transparent;
}

.output-content::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

.error-badge {
  display: inline-block;
  background-color: rgb(220, 38, 38);
  color: white;
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  margin-left: 0.5rem;
  font-weight: 500;
  text-transform: none;
}

.fix-ai-button {
  display: flex;
  align-items: center;
  height: 1.75rem;
  padding: 0 0.5rem;
  margin-right: 0.5rem;
  background-color: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
  color: rgb(79, 70, 229);
}

.fix-ai-button:hover {
  background-color: rgba(79, 70, 229, 0.15);
  border-color: rgba(79, 70, 229, 0.3);
}

:global(.dark) .fix-ai-button {
  background-color: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
  color: rgb(139, 92, 246);
}

:global(.dark) .fix-ai-button:hover {
  background-color: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.3);
}

/* Enhanced code output styling */
.with-line-numbers {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

.code-line {
  display: flex;
  white-space: pre;
}

.line-number {
  user-select: none;
  text-align: right;
  color: var(--muted-foreground);
  padding-right: 1rem;
  min-width: 3rem;
  border-right: 1px solid var(--border);
  margin-right: 0.75rem;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
}

.error-line {
  background-color: rgba(220, 38, 38, 0.1);
  font-weight: 500;
}

.error-line .line-content {
  color: rgb(220, 38, 38);
}

:global(.dark) .error-line {
  background-color: rgba(248, 113, 113, 0.1);
}

:global(.dark) .error-line .line-content {
  color: rgb(248, 113, 113);
}

.error-output-container {
  overflow-x: auto;
}

/* AI Fix Loading Animation */
.ai-loading-indicator {
  display: flex;
  align-items: center;
  margin-right: 0.5rem;
}

.ai-loading-dot {
  width: 4px;
  height: 4px;
  margin: 0 1px;
  background-color: currentColor;
  border-radius: 50%;
  animation: ai-loading-dot 1.4s infinite ease-in-out both;
}

.ai-loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.ai-loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes ai-loading-dot {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.ai-fix-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(2px);
}

.ai-fix-message {
  background-color: var(--background);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 80%;
}

.ai-fix-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(79, 70, 229, 0.2);
  border-radius: 50%;
  border-top-color: rgb(79, 70, 229);
  animation: ai-fix-spin 1s linear infinite;
  margin-bottom: 1rem;
}

.ai-fix-text {
  font-size: 0.875rem;
  color: var(--foreground);
  text-align: center;
}

@keyframes ai-fix-spin {
  to {
    transform: rotate(360deg);
  }
}
</style> 