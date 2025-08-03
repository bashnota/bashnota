<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Maximize2, Minimize2, Download, Copy, Check, Eye, EyeOff, RotateCw, ExternalLink } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ansiToHtml, stripAnsi } from '@/lib/utils'
import IframeOutputRenderer from './IframeOutputRenderer.vue'
import { logger } from '@/services/logger'

export interface InteractiveOutput {
  type: 'text' | 'html' | 'json' | 'image' | 'plotly' | 'matplotlib' | 'widget' | 'dataframe' | 'error'
  content: any
  metadata?: {
    title?: string
    description?: string
    timestamp?: number
    executionTime?: number
    size?: string
  }
}

const props = defineProps<{
  outputs: InteractiveOutput[]
  showControls?: boolean
  maxHeight?: string
  isCollapsible?: boolean
  isFullscreenable?: boolean
  isLoading?: boolean
  isPublished?: boolean
  notaId?: string
  blockId?: string
}>()

const emit = defineEmits<{
  'copy': [content: string]
  'download': [output: InteractiveOutput]
  'toggle-fullscreen': [isFullscreen: boolean]
}>()

// Open output in external tab
const openInExternalTab = () => {
  if (!props.notaId || !props.blockId) return

  const url = `/output/${props.notaId}/${props.blockId}`
  window.open(url, '_blank')
}

// State
const isFullscreen = ref(false)
const isOutputVisible = ref(true)
const isCopied = ref(false)
const selectedTab = ref(0)
const plotlyContainer = ref<HTMLElement | null>(null)

// Computed
const hasMultipleOutputs = computed(() => props.outputs.length > 1)
const currentOutput = computed(() => props.outputs[selectedTab.value] || props.outputs[0])
const outputStats = computed(() => {
  const stats = {
    total: props.outputs.length,
    text: 0,
    images: 0,
    plots: 0,
    widgets: 0,
    errors: 0
  }

  props.outputs.forEach(output => {
    switch (output.type) {
      case 'text':
      case 'json':
        stats.text++
        break
      case 'image':
        stats.images++
        break
      case 'plotly':
      case 'matplotlib':
        stats.plots++
        break
      case 'widget':
        stats.widgets++
        break
      case 'error':
        stats.errors++
        break
    }
  })

  return stats
})

// Methods
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  emit('toggle-fullscreen', isFullscreen.value)
}

const toggleVisibility = () => {
  isOutputVisible.value = !isOutputVisible.value
}

const copyOutput = async () => {
  if (!currentOutput.value) return

  try {
    let textToCopy = ''
    
    switch (currentOutput.value.type) {
      case 'text':
        textToCopy = stripAnsi(currentOutput.value.content)
        break
      case 'json':
        textToCopy = JSON.stringify(currentOutput.value.content, null, 2)
        break
      case 'html':
        // Convert HTML to text
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = currentOutput.value.content
        textToCopy = tempDiv.textContent || tempDiv.innerText || ''
        break
      default:
        textToCopy = stripAnsi(String(currentOutput.value.content))
    }

    await navigator.clipboard.writeText(textToCopy)
    isCopied.value = true
    emit('copy', textToCopy)
    
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy output:', error)
  }
}

const downloadOutput = () => {
  if (currentOutput.value) {
    emit('download', currentOutput.value)
  }
}

const renderPlotlyChart = async (data: any) => {
  if (!plotlyContainer.value) return
  
  try {
    // Try to dynamically import Plotly (fallback gracefully if not available)
    let Plotly: any
    try {
      // @ts-ignore - Dynamic import may not be available
      Plotly = await import('plotly.js-dist-min')
    } catch (importError) {
      // Fallback if plotly.js-dist-min is not available
      try {
        // @ts-ignore - Dynamic import may not be available
        Plotly = await import('plotly.js')
      } catch (fallbackError) {
        throw new Error('Plotly.js is not installed. Install with: npm install plotly.js-dist-min')
      }
    }
    
    // Clean up any existing plot
    if (plotlyContainer.value && plotlyContainer.value.hasChildNodes()) {
      Plotly.purge(plotlyContainer.value)
    }
    
    // Render the new plot
    await Plotly.newPlot(
      plotlyContainer.value, 
      data.data || [],
      data.layout || {},
      {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['sendDataToCloud'],
        displaylogo: false,
        ...data.config
      }
    )
    
    logger.log('Plotly chart rendered successfully')
  } catch (error) {
    logger.error('Failed to render Plotly chart:', error)
    
    // Fallback to a descriptive placeholder
    if (plotlyContainer.value) {
      plotlyContainer.value.innerHTML = `
        <div class="flex items-center justify-center h-64 bg-muted/20 border-2 border-dashed border-muted rounded-lg">
          <div class="text-center">
            <div class="text-2xl mb-2">⚠️</div>
            <div class="text-sm text-muted-foreground">Failed to load Plotly</div>
            <div class="text-xs text-muted-foreground mt-1">Install plotly.js for interactive charts</div>
            <div class="text-xs text-destructive mt-2">${error instanceof Error ? error.message : 'Unknown error'}</div>
          </div>
        </div>
      `
    }
  }
}

const renderMatplotlibImage = (imageData: string) => {
  return `<img src="data:image/png;base64,${imageData}" alt="Matplotlib plot" class="max-w-full h-auto" />`
}

const renderDataFrame = (data: any) => {
  if (!data || !data.columns || !data.data) {
    return '<div class="text-muted-foreground">Invalid DataFrame data</div>'
  }

  const { columns, data: rows, index } = data
  
  let html = '<div class="overflow-auto max-h-96"><table class="w-full border-collapse border border-border text-sm">'
  
  // Header
  html += '<thead><tr class="bg-muted">'
  if (index) html += '<th class="border border-border p-2 font-medium">Index</th>'
  columns.forEach((col: string) => {
    html += `<th class="border border-border p-2 font-medium">${col}</th>`
  })
  html += '</tr></thead>'
  
  // Body
  html += '<tbody>'
  rows.forEach((row: any[], i: number) => {
    html += '<tr class="hover:bg-muted/50">'
    if (index) html += `<td class="border border-border p-2 font-mono text-xs">${index[i]}</td>`
    row.forEach((cell: any) => {
      const cellValue = cell === null || cell === undefined ? '' : String(cell)
      html += `<td class="border border-border p-2">${cellValue}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody></table></div>'
  
  return html
}

const renderWidget = (widgetData: any) => {
  // Enhanced widget rendering with better support for common widget types
  if (!widgetData || !widgetData.model_name) {
    return `
      <div class="border rounded-lg p-4 bg-muted/10">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span class="text-sm font-medium">Unknown Widget</span>
        </div>
        <div class="text-xs text-muted-foreground mt-2">
          Widget data not available or invalid format
        </div>
      </div>
    `
  }

  const { model_name, model_module, state = {} } = widgetData
  
  // Handle common Jupyter widget types
  switch (model_name) {
    case 'ButtonModel':
      return `
        <div class="border rounded-lg p-4 bg-muted/10">
          <button class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90" disabled>
            ${state.description || 'Button'}
          </button>
          <div class="text-xs text-muted-foreground mt-2">
            Interactive button (disabled in output view)
          </div>
        </div>
      `
    
    case 'TextModel':
    case 'TextareaModel':
      return `
        <div class="border rounded-lg p-4 bg-muted/10">
          <div class="mb-2">
            <label class="text-sm font-medium">${state.description || 'Text Input'}</label>
          </div>
          <input 
            type="text" 
            class="w-full px-3 py-2 border rounded bg-background"
            value="${state.value || ''}"
            placeholder="${state.placeholder || ''}"
            disabled
          />
          <div class="text-xs text-muted-foreground mt-2">
            Text input (disabled in output view)
          </div>
        </div>
      `
    
    case 'SliderModel':
    case 'IntSliderModel':
    case 'FloatSliderModel':
      return `
        <div class="border rounded-lg p-4 bg-muted/10">
          <div class="mb-2">
            <label class="text-sm font-medium">${state.description || 'Slider'}</label>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm">${state.min || 0}</span>
            <div class="flex-1 bg-muted rounded h-2 relative">
              <div class="bg-primary h-2 rounded" style="width: 50%"></div>
            </div>
            <span class="text-sm">${state.max || 100}</span>
          </div>
          <div class="text-center mt-2">
            <span class="text-sm font-mono">${state.value || 50}</span>
          </div>
          <div class="text-xs text-muted-foreground mt-2">
            Slider control (disabled in output view)
          </div>
        </div>
      `
    
    case 'SelectModel':
    case 'DropdownModel':
      return `
        <div class="border rounded-lg p-4 bg-muted/10">
          <div class="mb-2">
            <label class="text-sm font-medium">${state.description || 'Select'}</label>
          </div>
          <select class="w-full px-3 py-2 border rounded bg-background" disabled>
            <option>${state.value || 'Selected option'}</option>
          </select>
          <div class="text-xs text-muted-foreground mt-2">
            Dropdown menu (disabled in output view)
          </div>
        </div>
      `
    
    default:
      return `
        <div class="border rounded-lg p-4 bg-muted/10">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span class="text-sm font-medium">${model_name}</span>
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            Module: ${model_module || 'Unknown'}
          </div>
          <div class="text-xs text-muted-foreground mt-2">
            Interactive widget (view-only in output)
          </div>
        </div>
      `
  }
}

const formatJson = (data: any) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    return String(data)
  }
}

const getOutputIcon = (type: string) => {
  const icons = {
    text: '📝',
    html: '🌐',
    json: '📋',
    image: '🖼️',
    plotly: '📊',
    matplotlib: '📈',
    widget: '🔧',
    dataframe: '📊',
    error: '❌'
  }
  return icons[type as keyof typeof icons] || '📄'
}

const getOutputTypeLabel = (type: string) => {
  const labels = {
    text: 'Text',
    html: 'HTML',
    json: 'JSON',
    image: 'Image',
    plotly: 'Plotly Chart',
    matplotlib: 'Matplotlib',
    widget: 'Widget',
    dataframe: 'DataFrame',
    error: 'Error'
  }
  return labels[type as keyof typeof labels] || type
}

// Watch for Plotly charts
watch(() => currentOutput.value, async (output) => {
  if (output?.type === 'plotly') {
    await nextTick()
    renderPlotlyChart(output.content)
  }
}, { immediate: true })

onMounted(() => {
  if (currentOutput.value?.type === 'plotly') {
    nextTick(() => renderPlotlyChart(currentOutput.value.content))
  }
})
</script>

<template>
  <Card class="interactive-output-renderer" :class="{ 'fullscreen': isFullscreen }">
    <CardHeader v-if="showControls" class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Output</span>
          <Badge v-if="hasMultipleOutputs" variant="secondary" class="text-xs">
            {{ props.outputs.length }} items
          </Badge>
          <Badge v-if="currentOutput" variant="outline" class="text-xs">
            {{ getOutputTypeLabel(currentOutput.type) }}
          </Badge>
        </div>
        
        <div class="flex items-center gap-1">
          <Button
            v-if="isCollapsible"
            variant="ghost"
            size="sm"
            @click="toggleVisibility"
            class="h-7 px-2"
            :title="isOutputVisible ? 'Hide output' : 'Show output'"
          >
            <component :is="isOutputVisible ? EyeOff : Eye" class="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            @click="copyOutput"
            class="h-7 px-2"
            title="Copy output"
          >
            <component :is="isCopied ? Check : Copy" class="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            @click="downloadOutput"
            class="h-7 px-2"
            title="Download output"
          >
            <Download class="w-3 h-3" />
          </Button>
          
          <Button
            v-if="isFullscreenable"
            variant="ghost"
            size="sm"
            @click="toggleFullscreen"
            class="h-7 px-2"
            :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          >
            <component :is="isFullscreen ? Minimize2 : Maximize2" class="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <!-- Output Stats -->
      <div v-if="outputStats.total > 1" class="flex gap-2 text-xs">
        <Badge v-if="outputStats.text > 0" variant="outline">{{ outputStats.text }} text</Badge>
        <Badge v-if="outputStats.images > 0" variant="outline">{{ outputStats.images }} images</Badge>
        <Badge v-if="outputStats.plots > 0" variant="outline">{{ outputStats.plots }} plots</Badge>
        <Badge v-if="outputStats.widgets > 0" variant="outline">{{ outputStats.widgets }} widgets</Badge>
        <Badge v-if="outputStats.errors > 0" variant="destructive">{{ outputStats.errors }} errors</Badge>
      </div>
    </CardHeader>

    <CardContent v-if="isOutputVisible" class="pt-0" :style="{ maxHeight }">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <RotateCw class="w-6 h-6 animate-spin text-muted-foreground" />
        <span class="ml-2 text-sm text-muted-foreground">Generating output...</span>
      </div>

      <!-- Multiple Outputs Tabs -->
      <Tabs v-else-if="hasMultipleOutputs" v-model="selectedTab" class="w-full">
        <TabsList class="grid w-full" :style="{ gridTemplateColumns: `repeat(${Math.min(props.outputs.length, 4)}, 1fr)` }">
          <TabsTrigger
            v-for="(output, index) in props.outputs.slice(0, 4)"
            :key="index"
            :value="index"
            class="text-xs"
          >
            <span class="mr-1">{{ getOutputIcon(output.type) }}</span>
            {{ getOutputTypeLabel(output.type) }}
          </TabsTrigger>
          <TabsTrigger v-if="props.outputs.length > 4" :value="4" class="text-xs">
            +{{ props.outputs.length - 4 }} more
          </TabsTrigger>
        </TabsList>

        <TabsContent
          v-for="(output, index) in props.outputs"
          :key="index"
          :value="index"
          class="mt-4"
        >
          <div class="output-content">
            <!-- Text Output -->
            <div v-if="output.type === 'text'" class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono" v-html="ansiToHtml(output.content)"></div>
            
            <!-- JSON Output -->
            <pre v-else-if="output.type === 'json'" class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono">{{ formatJson(output.content) }}</pre>
            
            <!-- HTML Output -->
            <IframeOutputRenderer
              v-if="output.type === 'html'"
              :content="output.content"
              type="html"
              :height="props.maxHeight || '400px'"
            />
            
            <!-- Image Output -->
            <div v-else-if="output.type === 'image'" class="text-center">
              <img :src="output.content" alt="Output image" class="max-w-full h-auto rounded border" />
            </div>
            
            <!-- Matplotlib Output -->
            <IframeOutputRenderer
              v-else-if="output.type === 'matplotlib'"
              :content="renderMatplotlibImage(output.content)"
              type="matplotlib"
              :height="props.maxHeight || '400px'"
            />
            
            <!-- Plotly Output -->
            <div v-else-if="output.type === 'plotly'" ref="plotlyContainer" class="plotly-container"></div>
            
            <!-- DataFrame Output -->
            <IframeOutputRenderer
              v-else-if="output.type === 'dataframe'"
              :content="renderDataFrame(output.content)"
              type="dataframe"
              :height="props.maxHeight || '400px'"
            />
            
            <!-- Widget Output -->
            <IframeOutputRenderer
              v-else-if="output.type === 'widget'"
              :content="renderWidget(output.content)"
              type="widget"
              :height="props.maxHeight || '400px'"
            />
            
            <!-- Error Output -->
            <div v-else-if="output.type === 'error'" class="p-3 bg-destructive/10 border border-destructive/20 rounded">
              <div class="text-sm text-destructive whitespace-pre-wrap font-mono" v-html="ansiToHtml(output.content)"></div>
            </div>
            
            <!-- Fallback -->
            <div v-else class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono" v-html="ansiToHtml(String(output.content))"></div>
          </div>
          
          <!-- Output Metadata -->
          <div v-if="output.metadata" class="mt-2 text-xs text-muted-foreground border-t pt-2">
            <div v-if="output.metadata.title" class="font-medium">{{ output.metadata.title }}</div>
            <div v-if="output.metadata.description">{{ output.metadata.description }}</div>
            <div class="flex gap-4 mt-1">
              <span v-if="output.metadata.executionTime">Execution: {{ output.metadata.executionTime }}ms</span>
              <span v-if="output.metadata.size">Size: {{ output.metadata.size }}</span>
              <span v-if="output.metadata.timestamp">{{ new Date(output.metadata.timestamp).toLocaleTimeString() }}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <!-- Single Output -->
      <div v-else-if="currentOutput" class="output-content">
        <!-- Text Output -->
        <div v-if="currentOutput.type === 'text'" class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono" v-html="ansiToHtml(currentOutput.content)"></div>
        
        <!-- JSON Output -->
        <pre v-else-if="currentOutput.type === 'json'" class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono">{{ formatJson(currentOutput.content) }}</pre>
        
        <!-- HTML Output -->
        <IframeOutputRenderer
          v-if="currentOutput.type === 'html'"
          :content="currentOutput.content"
          type="html"
          :height="props.maxHeight || '400px'"
        />
        
        <!-- Image Output -->
        <div v-else-if="currentOutput.type === 'image'" class="text-center">
          <img :src="currentOutput.content" alt="Output image" class="max-w-full h-auto rounded border" />
        </div>
        
        <!-- Matplotlib Output -->
        <IframeOutputRenderer
          v-else-if="currentOutput.type === 'matplotlib'"
          :content="renderMatplotlibImage(currentOutput.content)"
          type="matplotlib"
          :height="props.maxHeight || '400px'"
        />
        
        <!-- Plotly Output -->
        <div v-else-if="currentOutput.type === 'plotly'" ref="plotlyContainer" class="plotly-container"></div>
        
        <!-- DataFrame Output -->
        <IframeOutputRenderer
          v-else-if="currentOutput.type === 'dataframe'"
          :content="renderDataFrame(currentOutput.content)"
          type="dataframe"
          :height="props.maxHeight || '400px'"
        />
        
        <!-- Widget Output -->
        <IframeOutputRenderer
          v-else-if="currentOutput.type === 'widget'"
          :content="renderWidget(currentOutput.content)"
          type="widget"
          :height="props.maxHeight || '400px'"
        />
        
        <!-- Error Output -->
        <div v-else-if="currentOutput.type === 'error'" class="p-3 bg-destructive/10 border border-destructive/20 rounded">
          <div class="text-sm text-destructive whitespace-pre-wrap font-mono" v-html="ansiToHtml(currentOutput.content)"></div>
        </div>
        
        <!-- Fallback -->
        <div v-else class="whitespace-pre-wrap text-sm p-3 bg-muted/20 rounded border overflow-auto font-mono" v-html="ansiToHtml(String(currentOutput.content))"></div>
        
        <!-- Output Metadata -->
        <div v-if="currentOutput.metadata" class="mt-2 text-xs text-muted-foreground border-t pt-2">
          <div v-if="currentOutput.metadata.title" class="font-medium">{{ currentOutput.metadata.title }}</div>
          <div v-if="currentOutput.metadata.description">{{ currentOutput.metadata.description }}</div>
          <div class="flex gap-4 mt-1">
            <span v-if="currentOutput.metadata.executionTime">Execution: {{ currentOutput.metadata.executionTime }}ms</span>
            <span v-if="currentOutput.metadata.size">Size: {{ currentOutput.metadata.size }}</span>
            <span v-if="currentOutput.metadata.timestamp">{{ new Date(currentOutput.metadata.timestamp).toLocaleTimeString() }}</span>
          </div>
        </div>
      </div>

      <!-- No Output -->
      <div v-else class="text-center py-8 text-muted-foreground">
        <div class="text-2xl mb-2">📄</div>
        <div class="text-sm">No output to display</div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.interactive-output-renderer {
  transition: all 0.3s ease;
}

.interactive-output-renderer.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  border-radius: 0;
}

.output-content {
  max-height: inherit;
  overflow: auto;
}

.plotly-container {
  min-height: 300px;
}

/* Custom scrollbar for output areas */
.output-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.output-content::-webkit-scrollbar-track {
  background: var(--muted);
  border-radius: 4px;
}

.output-content::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
  border-radius: 4px;
}

.output-content::-webkit-scrollbar-thumb:hover {
  background: var(--foreground);
}

/* Ensure tables in DataFrames are responsive */
.output-content table {
  font-size: 0.875rem;
}

.output-content table th,
.output-content table td {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 








