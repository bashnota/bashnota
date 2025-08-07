<template>
  <node-view-wrapper class="confusion-matrix-block">
    <Card class="w-full">
      <!-- Block Header -->
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
            <Grid3x3 class="w-5 h-5" />
          </div>
          <div class="flex-1">
            <Input
              v-if="editingTitle"
              v-model="localTitle"
              @blur="saveTitle"
              @keyup.enter="saveTitle"
              @keyup.escape="cancelTitleEdit"
              class="h-8 text-lg font-semibold bg-transparent border-none p-0 focus:ring-0"
              placeholder="Enter title..."
              ref="titleInput"
            />
            <CardTitle 
              v-else 
              @click="startTitleEdit" 
              class="cursor-pointer hover:text-muted-foreground transition-colors"
            >
              {{ displayTitle }}
            </CardTitle>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- AI Insights Button -->
          <Button
            v-if="hasData && aiInsightsEnabled"
            @click="generateAIInsights"
            variant="outline"
            size="sm"
            :disabled="isGeneratingInsights"
            class="hidden sm:flex"
          >
            <Sparkles class="w-4 h-4 mr-1" />
            {{ isGeneratingInsights ? 'Analyzing...' : 'AI Insights' }}
          </Button>
          
          <!-- Export Options -->
          <DropdownMenu v-if="hasData">
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm">
                <Download class="w-4 h-4 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="exportAsPNG">
                <Image class="w-4 h-4 mr-2" />
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem @click="exportAsCSV">
                <FileText class="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem @click="exportAsJSON">
                <Code class="w-4 h-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem @click="exportReport">
                <BarChart3 class="w-4 h-4 mr-2" />
                Generate Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            @click="showSettings = !showSettings"
            variant="outline"
            size="sm"
            :class="{ 'bg-accent': showSettings }"
          >
            <Settings class="w-4 h-4" />
          </Button>
          
          <Button
            @click="deleteNode"
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <!-- AI Insights Panel -->
      <div v-if="aiInsights && showAIInsights" class="border-b">
        <CardContent class="pt-0">
          <Alert class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <Sparkles class="h-4 w-4 text-blue-600" />
            <AlertTitle class="text-blue-800 dark:text-blue-200">AI Insights</AlertTitle>
            <AlertDescription class="text-blue-700 dark:text-blue-300 mt-2">
              {{ aiInsights }}
            </AlertDescription>
          </Alert>
          <Button
            @click="showAIInsights = false"
            variant="ghost"
            size="sm"
            class="mt-2"
          >
            <X class="w-4 h-4 mr-1" />
            Dismiss
          </Button>
        </CardContent>
      </div>

      <!-- Settings Panel -->
      <Collapsible v-if="showSettings" v-model:open="showSettings">
        <CollapsibleContent>
          <CardContent class="border-b bg-muted/20">
            <div class="grid gap-6 md:grid-cols-2">
              <!-- Data Source -->
              <div class="space-y-3">
                <Label class="text-sm font-medium">Data Source</Label>
                <Select v-model="dataSource">
                  <SelectTrigger>
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">Upload CSV</SelectItem>
                    <SelectItem value="jupyter">Jupyter</SelectItem>
                    <SelectItem value="sample">Sample</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- Visualization Options -->
              <div class="space-y-3">
                <Label class="text-sm font-medium">Visualization Options</Label>
                <div class="flex flex-col space-y-2">
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="showMatrix" id="show-matrix" />
                    <Label for="show-matrix" class="text-sm">Interactive Matrix</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="showStats" id="show-stats" />
                    <Label for="show-stats" class="text-sm">Statistics Dashboard</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="showAdvancedMetrics" id="show-advanced" />
                    <Label for="show-advanced" class="text-sm">Advanced Metrics</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="showComparison" id="show-comparison" />
                    <Label for="show-comparison" class="text-sm">Model Comparison</Label>
                  </div>
                </div>
              </div>
              
              <!-- Advanced Settings -->
              <div class="space-y-3">
                <Label class="text-sm font-medium">Advanced Settings</Label>
                <div class="space-y-2">
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="enableTooltips" id="enable-tooltips" />
                    <Label for="enable-tooltips" class="text-sm">Enhanced Tooltips</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="enableAnimations" id="enable-animations" />
                    <Label for="enable-animations" class="text-sm">Smooth Animations</Label>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Switch v-model:checked="aiInsightsEnabled" id="ai-insights" />
                    <Label for="ai-insights" class="text-sm">AI-Powered Insights</Label>
                  </div>
                </div>
              </div>

              <!-- Color Scheme -->
              <div class="space-y-3">
                <Label class="text-sm font-medium">Color Scheme</Label>
                <Select v-model="colorScheme">
                  <SelectTrigger>
                    <SelectValue placeholder="Select color scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="viridis">Viridis</SelectItem>
                    <SelectItem value="plasma">Plasma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <!-- Content Area -->
      <CardContent class="p-6">
        <!-- Data Loading Section -->
        <div v-if="!hasData" class="space-y-6">
          <Tabs v-model="dataSource" class="w-full">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload CSV</TabsTrigger>
              <TabsTrigger value="jupyter">Jupyter</TabsTrigger>
              <TabsTrigger value="sample">Sample</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <FileUpload
                @file-uploaded="handleFileUpload"
                @error="handleError"
              />
            </TabsContent>

            <TabsContent value="jupyter">
              <JupyterFileBrowser
                @file-selected="handleJupyterFileSelect"
                @error="handleError"
                @open-jupyter-sidebar="handleOpenJupyterSidebar"
              />
            </TabsContent>

            <TabsContent value="sample">
              <Card class="p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-dashed">
                <div class="space-y-4">
                  <div class="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Database class="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 class="text-lg font-semibold">Sample Confusion Matrix</h4>
                    <p class="text-sm text-muted-foreground mt-2">
                      Load a sample 3-class confusion matrix for animal classification (Cat, Dog, Bird)
                    </p>
                  </div>
                  <Button @click="loadSampleData" class="mt-4">
                    <PlayCircle class="w-4 h-4 mr-2" />
                    Load Sample Data
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <!-- Visualization Section -->
        <div v-else class="space-y-6">
          <!-- Data Summary Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary" class="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Target class="w-3 h-3 mr-1" />
                {{ matrixData?.labels.length || 0 }} Classes
              </Badge>
              <Badge variant="secondary" class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Users class="w-3 h-3 mr-1" />
                {{ getTotalSamples() }} Samples
              </Badge>
              <Badge v-if="stats" variant="secondary" class="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                <TrendingUp class="w-3 h-3 mr-1" />
                {{ formatNumber(stats.accuracy * 100, 1) }}% Accuracy
              </Badge>
            </div>
            
            <div class="flex gap-2">
              <Button @click="changeData" variant="outline" size="sm">
                <RefreshCw class="w-4 h-4 mr-1" />
                Change Data
              </Button>
              <Button v-if="filePath" @click="reloadFromSource" variant="outline" size="sm">
                <RotateCcw class="w-4 h-4 mr-1" />
                Reload
              </Button>
            </div>
          </div>

          <!-- Main Visualization Tabs -->
          <Tabs v-model="activeVisualizationTab" class="w-full">
            <TabsList class="grid w-full grid-cols-4">
              <TabsTrigger value="matrix" :disabled="!showMatrix">
                <Grid3x3 class="w-4 h-4 mr-1" />
                Matrix
              </TabsTrigger>
              <TabsTrigger value="stats" :disabled="!showStats">
                <BarChart3 class="w-4 h-4 mr-1" />
                Statistics
              </TabsTrigger>
              <TabsTrigger value="advanced" :disabled="!showAdvancedMetrics">
                <LineChart class="w-4 h-4 mr-1" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="comparison" :disabled="!showComparison">
                <GitCompare class="w-4 h-4 mr-1" />
                Compare
              </TabsTrigger>
            </TabsList>

            <!-- Interactive Matrix Tab -->
            <TabsContent value="matrix" class="mt-6">
              <InteractiveMatrix
                v-if="matrixData"
                :matrix="matrixData.matrix"
                :labels="matrixData.labels"
                :title="matrixData.title"
                :color-scheme="colorScheme"
                :enable-tooltips="enableTooltips"
                :enable-animations="enableAnimations"
              />
            </TabsContent>

            <!-- Statistics Tab -->
            <TabsContent value="stats" class="mt-6">
              <StatsVisualization
                v-if="stats && matrixData"
                :stats="stats"
                :labels="matrixData.labels"
                :matrix="matrixData.matrix"
                :color-scheme="colorScheme"
              />
            </TabsContent>

            <!-- Advanced Metrics Tab -->
            <TabsContent value="advanced" class="mt-6">
              <AdvancedMetricsPanel
                v-if="stats && matrixData"
                :stats="stats"
                :labels="matrixData.labels"
                :matrix="matrixData.matrix"
              />
            </TabsContent>

            <!-- Model Comparison Tab -->
            <TabsContent value="comparison" class="mt-6">
              <ModelComparisonPanel
                v-if="matrixData"
                :matrix="matrixData.matrix"
                :labels="matrixData.labels"
                :stats="stats"
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>

      <!-- Error Display -->
      <div v-if="error">
        <CardContent class="pt-0">
          <Alert variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription class="flex items-center justify-between">
              <span>{{ error }}</span>
              <Button @click="clearError" variant="ghost" size="sm">
                <X class="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </div>
    </Card>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Input
} from '@/components/ui/input'
import {
  Label
} from '@/components/ui/label'
import {
  Switch
} from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Badge
} from '@/components/ui/badge'
import {
  Grid3x3,
  Settings,
  Trash2,
  Download,
  Image,
  FileText,
  Code,
  BarChart3,
  Sparkles,
  X,
  Target,
  Users,
  TrendingUp,
  RefreshCw,
  RotateCcw,
  LineChart,
  GitCompare,
  Database,
  PlayCircle,
  AlertCircle,
  Trophy
} from 'lucide-vue-next'

// Component imports - using existing components, not "Enhanced" versions
import FileUpload from './components/FileUpload.vue'
import JupyterFileBrowser from './components/JupyterFileBrowser.vue'
import InteractiveMatrix from './components/InteractiveMatrix.vue'
import StatsVisualization from './components/StatsVisualization.vue'
import AdvancedMetricsPanel from './components/AdvancedMetricsPanel.vue'
import ModelComparisonPanel from './components/ModelComparisonPanel.vue'

import { calculateConfusionMatrixStats, formatNumber, generateSampleConfusionMatrix, type ConfusionMatrixData, type ConfusionMatrixStats } from './utils/confusionMatrixUtils'

// Props and emits
const props = defineProps<NodeViewProps>()

// Reactive state
const editingTitle = ref(false)
const localTitle = ref('')
const showSettings = ref(false)
const showAIInsights = ref(false)
const isGeneratingInsights = ref(false)
const aiInsights = ref('')
const error = ref('')

// Settings
const dataSource = ref<'upload' | 'jupyter' | 'sample'>('upload')
const showMatrix = ref(true)
const showStats = ref(true)
const showAdvancedMetrics = ref(false)
const showComparison = ref(false)
const enableTooltips = ref(true)
const enableAnimations = ref(true)
const aiInsightsEnabled = ref(true)
const colorScheme = ref('default')
const activeVisualizationTab = ref('matrix')

// Data
const matrixData = ref<ConfusionMatrixData | null>(null)
const filePath = ref<string>('')

// Computed properties
const displayTitle = computed(() => {
  return props.node.attrs.title || 'Confusion Matrix Analysis'
})

const hasData = computed(() => {
  return matrixData.value !== null
})

const stats = computed(() => {
  if (!matrixData.value) return null
  return calculateConfusionMatrixStats(matrixData.value.matrix, matrixData.value.labels)
})

const titleInput = ref<HTMLInputElement>()

// Watch for attribute changes
watch(() => props.node.attrs, (newAttrs) => {
  if (newAttrs.matrixData) {
    matrixData.value = newAttrs.matrixData
  }
  if (newAttrs.filePath) {
    filePath.value = newAttrs.filePath
  }
}, { immediate: true })

// Methods
function startTitleEdit() {
  editingTitle.value = true
  localTitle.value = displayTitle.value
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function saveTitle() {
  props.updateAttributes({ title: localTitle.value })
  editingTitle.value = false
}

function cancelTitleEdit() {
  editingTitle.value = false
  localTitle.value = ''
}

function getTotalSamples(): number {
  if (!matrixData.value) return 0
  return matrixData.value.matrix.reduce((total, row) => 
    total + row.reduce((sum, val) => sum + val, 0), 0
  )
}

function handleFileUpload(data: ConfusionMatrixData & { filePath?: string }) {
  matrixData.value = data
  filePath.value = data.filePath || ''
  props.updateAttributes({ 
    matrixData: data,
    filePath: data.filePath 
  })
  clearError()
}

function handleJupyterFileSelect(data: ConfusionMatrixData & { filePath: string }) {
  matrixData.value = data
  filePath.value = data.filePath
  props.updateAttributes({ 
    matrixData: data,
    filePath: data.filePath 
  })
  clearError()
}

function handleOpenJupyterSidebar() {
  // Emit event to parent to open Jupyter sidebar
}

function loadSampleData() {
  const sampleData = generateSampleConfusionMatrix()
  matrixData.value = sampleData
  props.updateAttributes({ matrixData: sampleData })
  clearError()
}

function changeData() {
  matrixData.value = null
  filePath.value = ''
  props.updateAttributes({ 
    matrixData: null,
    filePath: '' 
  })
  clearError()
}

function reloadFromSource() {
  // Implementation depends on the data source
  // For now, just show a message
  handleError('Reload functionality coming soon')
}

async function generateAIInsights() {
  if (!stats.value) return
  
  isGeneratingInsights.value = true
  try {
    // Simulated AI analysis - in real implementation, this would call an AI service
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const accuracy = stats.value.accuracy
    const bestClass = stats.value.classMetrics.reduce((best, current) => 
      current.f1Score > best.f1Score ? current : best
    )
    const worstClass = stats.value.classMetrics.reduce((worst, current) => 
      current.f1Score < worst.f1Score ? current : worst
    )
    
    let insight = `Your model shows ${accuracy > 0.9 ? 'excellent' : accuracy > 0.8 ? 'good' : accuracy > 0.7 ? 'moderate' : 'poor'} performance with ${formatNumber(accuracy * 100, 1)}% accuracy. `
    insight += `The "${bestClass.className}" class performs best (F1: ${formatNumber(bestClass.f1Score, 3)}), while "${worstClass.className}" needs improvement (F1: ${formatNumber(worstClass.f1Score, 3)}). `
    
    if (accuracy < 0.8) {
      insight += 'Consider collecting more training data, feature engineering, or trying different algorithms.'
    } else {
      insight += 'Great job! Your model is performing well across most classes.'
    }
    
    aiInsights.value = insight
    showAIInsights.value = true
  } catch (error) {
    handleError('Failed to generate AI insights')
  } finally {
    isGeneratingInsights.value = false
  }
}

function exportAsPNG() {
  // Implementation for PNG export
  handleError('PNG export functionality coming soon')
}

function exportAsCSV() {
  // Implementation for CSV export
  if (!matrixData.value) return
  
  const csv = [
    ['', ...matrixData.value.labels].join(','),
    ...matrixData.value.matrix.map((row, i) => 
      [matrixData.value!.labels[i], ...row].join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'confusion_matrix.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function exportAsJSON() {
  // Implementation for JSON export
  if (!matrixData.value || !stats.value) return
  
  const data = {
    matrix: matrixData.value.matrix,
    labels: matrixData.value.labels,
    title: matrixData.value.title,
    stats: stats.value,
    exportedAt: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'confusion_matrix_analysis.json'
  a.click()
  URL.revokeObjectURL(url)
}

function exportReport() {
  // Implementation for report generation
  handleError('Report generation functionality coming soon')
}

function handleError(message: string) {
  error.value = message
}

function clearError() {
  error.value = ''
}

// Lifecycle
onMounted(() => {
  // Initialize any required services or state
})
</script> 








