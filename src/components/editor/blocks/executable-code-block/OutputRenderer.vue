<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Copy, Check, Download, Maximize, Minimize, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { logger } from '@/services/logger'
import { ansiToHtml, stripAnsi } from '@/lib/utils'

const props = defineProps<{
  content: string
  type?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
  showControls?: boolean
  maxHeight?: string
  isCollapsible?: boolean
  isFullscreenable?: boolean
  isLoading?: boolean
  originalCode?: string
  isPublished?: boolean
}>()

const emit = defineEmits<{
  'copy': []
  'toggle-fullscreen': [isFullscreen: boolean]
  'download': []
}>()

const formattedContent = ref('')
const jsonTree = ref<any>(null)
const isOutputCopied = ref(false)
const isOutputVisible = ref(true)
const isFullscreen = ref(false)

// Determine output type based on content if not explicitly provided
const effectiveOutputType = computed(() => {
  if (props.type) return props.type
  
  // Auto-detect output type if not specified
  if (!props.content) return 'text'
  
  try {
    JSON.parse(props.content)
    return 'json'
  } catch {
    // Check if it's a complete HTML table
    if (props.content.includes('<table') && props.content.includes('</table>')) {
      return 'table'
    }
    
    // For most outputs, including those with image tags, prefer text rendering
    // This prevents double rendering of content
    return 'text'
  }
})

// Format JSON for better display
const formatJson = (jsonString: string) => {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    logger.error('Error parsing JSON:', e)
    return jsonString
  }
}

// Process content based on type - modify the text handling to properly handle image tags
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
    case 'text':
    default:
      // For text content, convert ANSI escape codes to HTML
      formattedContent.value = ansiToHtml(props.content)
      break
  }
}

// Copy output to clipboard
const copyOutput = async () => {
  if (!props.content) return

  try {
    // For JSON, copy the formatted JSON
    if (effectiveOutputType.value === 'json' && formattedContent.value) {
      await navigator.clipboard.writeText(formattedContent.value)
    } else {
      // For text content with ANSI codes, strip them for copying
      if (effectiveOutputType.value === 'text') {
        await navigator.clipboard.writeText(stripAnsi(props.content))
      } else {
        // Convert HTML to plain text for copying
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = props.content
        const textContent = tempDiv.textContent || tempDiv.innerText || ''
        await navigator.clipboard.writeText(textContent)
      }
    }
    
    isOutputCopied.value = true
    emit('copy')
    
    // Reset the copy button after 2s
    setTimeout(() => {
      isOutputCopied.value = false
    }, 2000)
  } catch (error) {
    logger.error('Failed to copy output:', error)
  }
}

// Download output as file
const downloadOutput = () => {
  if (!props.content) return
  
  let content = props.content
  let mimeType = 'text/plain'
  let extension = 'txt'
  let filename = 'output'
  
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
    
    // If it's just a table or fragment, wrap in HTML document
    if (!content.includes('<html')) {
      content = `<!DOCTYPE html>
<html>
<head>
  <title>Output</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${content}
</body>
</html>`
    }
  } else if (effectiveOutputType.value === 'image') {
    // Attempt to extract image source
    const match = content.match(/src="(data:[^"]+)"/)
    if (match && match[1]) {
      // This is a data URL, need special handling
      const dataURL = match[1]
      const byteString = atob(dataURL.split(',')[1])
      const mimeMatch = dataURL.match(/data:([^;]+);/)
      if (mimeMatch) {
        mimeType = mimeMatch[1]
        extension = mimeType.split('/')[1]
      }
      
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      
      const blob = new Blob([ab], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      emit('download')
      return
    }
  }
  
  // Use code language as part of filename if available
  if (props.originalCode) {
    filename = `output_${new Date().toISOString().replace(/[:.]/g, '-')}`
  }
  
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  emit('download')
}

// Toggle output visibility
const toggleVisibility = () => {
  isOutputVisible.value = !isOutputVisible.value
}

// Toggle fullscreen mode
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  emit('toggle-fullscreen', isFullscreen.value)
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
    
    // Highlight error lines (check stripped version for keywords)
    const strippedLine = stripAnsi(line)
    const isErrorLine = strippedLine.toLowerCase().includes('error') || 
                        strippedLine.toLowerCase().includes('exception') ||
                        strippedLine.toLowerCase().includes('warning')
    
    // Convert ANSI codes to HTML for the line content
    const formattedLine = ansiToHtml(line)
    
    result += `<div class="code-line ${isErrorLine ? 'error-line' : ''}">
                <span class="line-number">${paddedNumber}</span>
                <span class="line-content">${formattedLine}</span>
              </div>`
  })
  
  return result
}

// Format error output with better highlighting
const formattedErrorOutput = computed(() => {
  if (!hasError.value || !props.content) return ''
  
  return formatCodeOutput(props.content)
})

// Determine if there's any content to show
const hasContent = computed(() => {
  return !!props.content && props.content.trim() !== ''
})

// Extract and format execution time from output if available
const executionTime = computed(() => {
  if (!props.content) return null
  
  // Look for common execution time patterns in output
  const timePatterns = [
    /execution time: (\d+\.?\d*)\s*(?:s|sec|seconds)/i,
    /completed in (\d+\.?\d*)\s*(?:s|sec|seconds)/i,
    /time: (\d+\.?\d*)\s*(?:s|sec|seconds)/i,
    /\[(\d+\.?\d*)\s*(?:s|sec|seconds)\]/i,
    /took (\d+\.?\d*)\s*(?:s|sec|seconds)/i
  ]
  
  for (const pattern of timePatterns) {
    const match = props.content.match(pattern)
    if (match && match[1]) {
      return `${match[1]}s`
    }
  }
  
  return null
})
</script>

<template>
  <div class="output-container" :class="{ 
    'fullscreen': isFullscreen, 
    'published-output': isPublished,
    'output-has-error': hasError
  }">
    <!-- Output header with controls -->
    <div v-if="props.showControls" class="output-header">
      <div class="flex items-center gap-2">
        <span class="output-type">
          Output
          <span v-if="effectiveOutputType !== 'text'" class="output-type-label">
            ({{ effectiveOutputType }})
          </span>
        </span>
        <!-- Display execution time if available -->
        <span v-if="executionTime" class="execution-time">
          {{ executionTime }}
        </span>
        <span v-if="hasError" class="error-badge">Error</span>
      </div>
      
      <div class="output-controls">
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
          :disabled="!hasContent || props.isLoading"
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
          :disabled="!hasContent || props.isLoading"
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
    
    <!-- Loading state - never show in published mode -->
    <div v-if="props.isLoading && !props.isPublished" class="output-loading">
      <Loader2 class="loading-icon animate-spin" />
      <div class="loading-text">Executing code...</div>
    </div>
    
    <!-- Output content - Ensure only one type is rendered -->
    <div 
      v-else-if="isOutputVisible && hasContent" 
      class="output-content"
      :class="[
        `output-${effectiveOutputType}`, 
        { 'error': effectiveOutputType === 'error' || hasError },
        { 'with-line-numbers': hasError && detectedLanguage }
      ]"
      :style="{ maxHeight: !isFullscreen && props.maxHeight ? props.maxHeight : 'none' }"
    >
      <!-- Only one of these should render based on the effectiveOutputType -->
      <template v-if="effectiveOutputType === 'text'">
        <!-- Text output with ANSI escape codes converted to HTML -->
        <div class="text-output" v-html="formattedContent"></div>
      </template>
      
      <template v-else-if="effectiveOutputType === 'json'">
        <!-- JSON output -->
        <div class="json-viewer">
          <pre v-if="formattedContent" v-html="highlightJson(formattedContent)"></pre>
          <pre v-else>{{ content }}</pre>
        </div>
      </template>
      
      <template v-else-if="effectiveOutputType === 'table'">
        <!-- Table output -->
        <div class="table-viewer" v-html="content"></div>
      </template>
      
      <template v-else-if="effectiveOutputType === 'image'">
        <!-- Image output -->
        <div class="image-viewer" v-html="content"></div>
      </template>
      
      <!-- Enhanced error output with line numbers and highlighting -->
      <div 
        v-if="effectiveOutputType === 'error' || hasError" 
        class="error-output-container"
        v-html="formattedErrorOutput"
      ></div>
    </div>
    
    <!-- Empty state (no output yet) -->
    <div v-else-if="isOutputVisible && !hasContent" class="output-empty-state">
      <div class="empty-text">No output to display</div>
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
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
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
  border-radius: 0;
  border: none;
}

.output-container.published-output {
  box-shadow: var(--shadow);
  border-color: var(--border);
}

.output-container.output-has-error {
  border-color: rgb(220, 38, 38, 0.5);
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--muted);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.output-type {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.output-type-label {
  text-transform: none;
  margin-left: 0.25rem;
  font-weight: normal;
  opacity: 0.8;
}

.execution-time {
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  background-color: var(--accent);
  color: var(--accent-foreground);
  border-radius: 4px;
}

.output-controls {
  display: flex;
  gap: 0.25rem;
}

.control-button {
  height: 1.5rem;
  width: 1.5rem;
  padding: 0;
  opacity: 0.75;
  transition: opacity 0.2s;
}

.control-button:hover {
  opacity: 1;
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
  transition: all 0.2s ease;
  position: relative; /* For positioning the loading spinner */
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
  background-color: var(--background);
  border-top: 1px dashed var(--border);
}

.output-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background-color: var(--muted);
  min-height: 80px;
}

.empty-text {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.output-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--muted-background);
  min-height: 100px;
  text-align: center;
}

.loading-icon {
  height: 1.5rem;
  width: 1.5rem;
  color: var(--primary);
  margin-bottom: 0.75rem;
}

.loading-text {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.text-output {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-output :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.5rem 0;
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

/* Published mode styles */
.published-output .output-header {
  background-color: var(--card);
}

.published-output .output-content {
  border-top: 1px solid var(--border);
}

.published-output.output-has-error {
  border-color: rgb(220, 38, 38, 0.3);
}

/* Animation for the loading state */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-text {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Preventing overflow issues */
.output-container {
  max-width: 100%;
}
</style>