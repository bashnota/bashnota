<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import type { ExecutableCodeBlock } from '@/features/nota/types/blocks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Copy, Check, Download, RefreshCw, Code, AlertCircle } from 'lucide-vue-next'
import IframeOutputRenderer from '@/features/editor/components/blocks/executable-code-block/IframeOutputRenderer.vue'
import { ansiToHtml, stripAnsi } from '@/lib/utils'
import { logger } from '@/services/logger'

interface Props {
  notaId: string
  blockId: string
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()

// State
const nota = ref<any>(null)
const codeBlock = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const isCopied = ref(false)
const lastUpdated = ref<Date | null>(null)

// Computed
const pageTitle = computed(() => {
  if (!nota.value || !codeBlock.value) return 'Code Block Output'
  return `${nota.value.title} - Code Block Output`
})

const outputType = computed(() => {
  const output = codeBlock.value?.output || codeBlock.value?.attrs?.output
  if (!output) return 'text'
  
  // Check for HTML content
  if (output.includes('<table') || output.includes('<div') || output.includes('<img')) {
    return 'html'
  }
  
  // Check for JSON
  try {
    JSON.parse(output)
    return 'json'
  } catch {
    // Default to text
    return 'text'
  }
})

const shouldUseIframe = computed(() => {
  return outputType.value === 'html' || 
         (outputType.value === 'json' && codeBlock.value?.output && codeBlock.value.output.length > 100)
})

const formattedOutput = computed(() => {
  const output = codeBlock.value?.output || codeBlock.value?.attrs?.output
  if (!output) return ''
  
  if (outputType.value === 'json') {
    try {
      const parsed = JSON.parse(output)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return output
    }
  }
  
  return ansiToHtml(output)
})

const hasError = computed(() => {
  const output = codeBlock.value?.output || codeBlock.value?.attrs?.output
  if (!output) return false
  
  const outputLower = output.toLowerCase()
  return outputLower.includes('error') || 
         outputLower.includes('exception') || 
         outputLower.includes('traceback') ||
         outputLower.includes('failed')
})

// Methods
const loadNotaAndBlock = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // Load the nota first
    const loadedNota = notaStore.getCurrentNota(props.notaId)
    if (!loadedNota) {
      throw new Error('Nota not found')
    }
    
    nota.value = loadedNota
    
    // Load blocks for the nota using the block store
    const blockStore = useBlockStore()
    const blocks = await blockStore.loadNotaBlocks(props.notaId, loadedNota)
    
    // Find the specific code block
    const foundBlock = blocks.find(block => block.id === props.blockId && block.type === 'executableCodeBlock') as ExecutableCodeBlock | undefined
    
    if (!foundBlock) {
      throw new Error('Code block not found in nota')
    }
    
    // Register the code blocks with the execution store to get latest output
    // Convert blocks to the format expected by the execution store
    const content = {
      type: 'doc',
      content: blocks.map(block => {
        if (block.type === 'executableCodeBlock') {
          const execBlock = block as ExecutableCodeBlock
          return {
            type: block.type,
            attrs: { 
              id: block.id, 
              ...execBlock,
              // Ensure required fields are present
              serverID: '', // Will be set by execution store
              kernelName: execBlock.language || 'python3',
              sessionId: execBlock.sessionId || '',
              output: execBlock.output || ''
            },
            content: [
              { type: 'text', text: execBlock.content || '' }
            ]
          }
        } else {
          return {
            type: block.type,
            attrs: { id: block.id, ...block },
            content: []
          }
        }
      })
    }
    codeExecutionStore.registerCodeCells(content, props.notaId, true) // true for isPublished
    
    // Get the cell from the execution store which has the latest output
    const cell = codeExecutionStore.getCellById(props.blockId)
    
    // Debug: Check if cell was found
    logger.debug('Cell lookup result:', {
      blockId: props.blockId,
      cellFound: !!cell,
      cellOutput: cell?.output,
      cellHasError: cell?.hasError
    })
    
    logger.debug('Loading code block output:', {
      blockId: props.blockId,
      notaId: props.notaId,
      foundBlock: !!foundBlock,
      cellFromStore: !!cell,
      cellOutput: cell?.output?.substring(0, 100) || 'No output',
      blockOutput: foundBlock?.output?.substring(0, 100) || 'No output in block'
    })
    
    if (cell && foundBlock) {
      // Merge the block data with the execution store data
      codeBlock.value = {
        type: foundBlock.type,
        attrs: { 
          id: foundBlock.id, 
          ...foundBlock,
          output: cell.output || foundBlock.output
        },
        content: [],
        output: cell.output || foundBlock.output
      }
    } else if (foundBlock) {
      // Fallback to the block data if not in execution store
      codeBlock.value = {
        type: foundBlock.type,
        attrs: { 
          id: foundBlock.id, 
          ...foundBlock,
          output: foundBlock.output
        },
        content: [],
        output: foundBlock.output
      }
    }
    
    lastUpdated.value = new Date()
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load code block'
    logger.error('Error loading code block output:', err)
  } finally {
    isLoading.value = false
  }
}



const copyOutput = async () => {
  const output = codeBlock.value?.output || codeBlock.value?.attrs?.output
  if (!output) return
  
  try {
    const textToCopy = outputType.value === 'json' ? 
      formattedOutput.value : 
      stripAnsi(output)
    
    await navigator.clipboard.writeText(textToCopy)
    isCopied.value = true
    
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    logger.error('Failed to copy output:', err)
  }
}

const downloadOutput = () => {
  const output = codeBlock.value?.output || codeBlock.value?.attrs?.output
  if (!output) return
  
  const content = outputType.value === 'json' ? 
    formattedOutput.value : 
    stripAnsi(output)
  
  const fileExtension = outputType.value === 'json' ? 'json' : 'txt'
  const fileName = `${nota.value?.title || 'output'}-${props.blockId}.${fileExtension}`
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  
  URL.revokeObjectURL(url)
}

const openSourceNota = () => {
  const url = `/nota/${props.notaId}`
  window.open(url, '_blank')
}

const refreshOutput = async () => {
  await loadNotaAndBlock()
}

// Lifecycle
onMounted(() => {
  loadNotaAndBlock()
  
  // Set document title
  document.title = pageTitle.value
})

// Watch for route changes
watch([() => props.notaId, () => props.blockId], () => {
  loadNotaAndBlock()
})

// Clean up on unmount
onUnmounted(() => {
  document.title = 'BashNota'
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <Code class="w-6 h-6 text-primary" />
              <h1 class="text-xl font-semibold">Code Block Output</h1>
            </div>
            
            <div v-if="nota" class="flex items-center gap-2 text-muted-foreground">
              <span>from</span>
              <Badge variant="secondary">{{ nota.title }}</Badge>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="openSourceNota"
              class="gap-2"
            >
              <ExternalLink class="w-4 h-4" />
              View Source
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              @click="refreshOutput"
              :disabled="isLoading"
              class="gap-2"
            >
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3">
          <RefreshCw class="w-5 h-5 animate-spin" />
          <span>Loading code block output...</span>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center py-12">
        <Card class="max-w-md">
          <CardContent class="pt-6">
            <div class="flex items-center gap-3 text-destructive">
              <AlertCircle class="w-5 h-5" />
              <div>
                <h3 class="font-medium">Error Loading Output</h3>
                <p class="text-sm text-muted-foreground mt-1">{{ error }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Output Content -->
      <div v-else-if="codeBlock">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <h2 class="text-lg font-medium">Output</h2>
                
                <div class="flex items-center gap-2">
                  <Badge :variant="hasError ? 'destructive' : 'secondary'">
                    {{ outputType.toUpperCase() }}
                  </Badge>
                  
                  <Badge v-if="hasError" variant="destructive">
                    Error
                  </Badge>
                  
                  <Badge v-if="codeBlock.attrs?.language" variant="outline">
                    {{ codeBlock.attrs.language }}
                  </Badge>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="copyOutput"
                  :disabled="!codeBlock.output && !codeBlock.attrs?.output"
                  class="gap-2"
                >
                  <Copy v-if="!isCopied" class="w-4 h-4" />
                  <Check v-else class="w-4 h-4" />
                  {{ isCopied ? 'Copied' : 'Copy' }}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  @click="downloadOutput"
                  :disabled="!codeBlock.output && !codeBlock.attrs?.output"
                  class="gap-2"
                >
                  <Download class="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
            
            <div v-if="lastUpdated" class="text-sm text-muted-foreground">
              Last updated: {{ lastUpdated.toLocaleString() }}
            </div>
          </CardHeader>
          
          <CardContent>
            <!-- No Output -->
            <div v-if="!codeBlock.output && !codeBlock.attrs?.output" class="text-center py-12 text-muted-foreground">
              <Code class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 class="text-lg font-medium mb-2">No Output</h3>
              <p class="text-sm">This code block hasn't been executed yet or produced no output.</p>
            </div>
            
            <!-- Iframe Output (for HTML/complex content) -->
            <IframeOutputRenderer
              v-else-if="shouldUseIframe"
              :content="formattedOutput"
              :type="outputType === 'json' ? 'dataframe' : 'html'"
              height="600px"
            />
            
            <!-- Text Output -->
            <div v-else-if="codeBlock.output || codeBlock.attrs?.output" class="output-container">
              <pre 
                class="whitespace-pre-wrap text-sm bg-muted/20 rounded border p-4 overflow-auto font-mono max-h-96"
                :class="{ 'text-destructive': hasError }"
                v-html="formattedOutput"
              ></pre>
            </div>
          </CardContent>
        </Card>

        <!-- Code Source -->
        <Card class="mt-6">
          <CardHeader>
            <h3 class="text-lg font-medium">Source Code</h3>
          </CardHeader>
          <CardContent>
            <pre class="whitespace-pre-wrap text-sm bg-muted/20 rounded border p-4 overflow-auto font-mono">{{ codeBlock.content?.map((c: any) => c.text).join('\n') || 'No code content' }}</pre>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>

<style scoped>
.output-container {
  width: 100%;
}

/* Custom scrollbar for output areas */
.output-container pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.output-container pre::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 4px;
}

.output-container pre::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground));
  border-radius: 4px;
}

.output-container pre::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--foreground));
}
</style> 