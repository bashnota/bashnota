<template>
  <Card class="w-full">
    <CardHeader>
      <div class="flex items-center justify-between">
        <CardTitle class="flex items-center gap-2">
          <GitCompare class="w-5 h-5 text-primary" />
          Model Comparison
        </CardTitle>
        
        <div class="flex items-center gap-2">
          <Button @click="showAddModel = !showAddModel" variant="outline" size="sm">
            <Plus class="w-4 h-4 mr-1" />
            Add Model
          </Button>
          <Button @click="clearComparisons" variant="outline" size="sm" :disabled="savedModels.length === 0">
            <Trash2 class="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Add Model Form -->
      <Collapsible v-if="showAddModel" v-model:open="showAddModel">
        <CollapsibleContent>
          <Card class="p-4 bg-muted/20">
            <h3 class="font-semibold mb-4">Save Current Model for Comparison</h3>
            <div class="space-y-4">
              <div>
                <Label for="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  v-model="newModelName"
                  placeholder="e.g., Random Forest v2, XGBoost tuned, etc."
                  class="mt-1"
                />
              </div>
              <div>
                <Label for="model-description">Description (Optional)</Label>
                <Input
                  id="model-description"
                  v-model="newModelDescription"
                  placeholder="Brief description of the model configuration..."
                  class="mt-1"
                />
              </div>
              <div class="flex gap-2">
                <Button @click="saveCurrentModel" :disabled="!newModelName.trim()">
                  <Save class="w-4 h-4 mr-1" />
                  Save Model
                </Button>
                <Button @click="cancelAddModel" variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <!-- No Models State -->
      <div v-if="savedModels.length === 0" class="text-center py-8">
        <div class="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center mb-4">
          <GitCompare class="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 class="text-lg font-semibold mb-2">No Models to Compare</h3>
        <p class="text-muted-foreground mb-4">Save your current model to start comparing performance metrics.</p>
        <Button @click="showAddModel = true">
          <Plus class="w-4 h-4 mr-1" />
          Save Current Model
        </Button>
      </div>

      <!-- Models Comparison -->
      <div v-else class="space-y-6">
        <!-- Performance Overview -->
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-blue-600" />
            Performance Overview
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b">
                  <th class="text-left p-2 font-medium">Model</th>
                  <th class="text-center p-2 font-medium">Accuracy</th>
                  <th class="text-center p-2 font-medium">Precision</th>
                  <th class="text-center p-2 font-medium">Recall</th>
                  <th class="text-center p-2 font-medium">F1-Score</th>
                  <th class="text-center p-2 font-medium">Samples</th>
                  <th class="text-center p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Current Model -->
                <tr class="border-b bg-primary/5">
                  <td class="p-2">
                    <div class="flex items-center gap-2">
                      <Badge variant="default" class="text-xs">Current</Badge>
                      <span class="font-medium">Active Model</span>
                    </div>
                  </td>
                  <td class="p-2 text-center">
                    <Badge :variant="getPerformanceVariant(currentStats.accuracy)" class="text-xs">
                      {{ formatNumber(currentStats.accuracy * 100, 1) }}%
                    </Badge>
                  </td>
                  <td class="p-2 text-center">{{ formatNumber(currentStats.macroAvg.precision, 3) }}</td>
                  <td class="p-2 text-center">{{ formatNumber(currentStats.macroAvg.recall, 3) }}</td>
                  <td class="p-2 text-center">{{ formatNumber(currentStats.macroAvg.f1Score, 3) }}</td>
                  <td class="p-2 text-center">{{ currentStats.totalSamples }}</td>
                  <td class="p-2 text-center">
                    <Button @click="showAddModel = true" variant="outline" size="sm">
                      <Save class="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                
                <!-- Saved Models -->
                <tr v-for="(model, index) in savedModels" :key="index" class="border-b hover:bg-muted/20">
                  <td class="p-2">
                    <div>
                      <div class="font-medium">{{ model.name }}</div>
                      <div v-if="model.description" class="text-xs text-muted-foreground">{{ model.description }}</div>
                      <div class="text-xs text-muted-foreground">{{ formatDate(model.savedAt) }}</div>
                    </div>
                  </td>
                  <td class="p-2 text-center">
                    <Badge :variant="getPerformanceVariant(model.stats.accuracy)" class="text-xs">
                      {{ formatNumber(model.stats.accuracy * 100, 1) }}%
                    </Badge>
                  </td>
                  <td class="p-2 text-center">{{ formatNumber(model.stats.macroAvg.precision, 3) }}</td>
                  <td class="p-2 text-center">{{ formatNumber(model.stats.macroAvg.recall, 3) }}</td>
                  <td class="p-2 text-center">{{ formatNumber(model.stats.macroAvg.f1Score, 3) }}</td>
                  <td class="p-2 text-center">{{ model.stats.totalSamples }}</td>
                  <td class="p-2 text-center">
                    <Button @click="removeModel(index)" variant="outline" size="sm">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <!-- Best Performing Model -->
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <Trophy class="w-4 h-4 text-yellow-600" />
            Best Performing Model
          </h3>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div class="text-lg font-bold text-green-700 dark:text-green-300">{{ bestModel.name }}</div>
              <div class="text-sm text-muted-foreground">Highest Accuracy</div>
              <div class="text-2xl font-bold text-green-600 mt-2">
                {{ formatNumber(bestModel.stats.accuracy * 100, 1) }}%
              </div>
            </div>
            
            <div class="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div class="text-lg font-bold text-blue-700 dark:text-blue-300">{{ bestF1Model.name }}</div>
              <div class="text-sm text-muted-foreground">Highest F1-Score</div>
              <div class="text-2xl font-bold text-blue-600 mt-2">
                {{ formatNumber(bestF1Model.stats.macroAvg.f1Score, 3) }}
              </div>
            </div>
            
            <div class="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div class="text-lg font-bold text-purple-700 dark:text-purple-300">{{ bestPrecisionModel.name }}</div>
              <div class="text-sm text-muted-foreground">Highest Precision</div>
              <div class="text-2xl font-bold text-purple-600 mt-2">
                {{ formatNumber(bestPrecisionModel.stats.macroAvg.precision, 3) }}
              </div>
            </div>
          </div>
        </Card>

        <!-- Performance Trends -->
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-indigo-600" />
            Performance Trends
          </h3>
          <div class="space-y-4">
            <!-- Accuracy Trend -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">Accuracy Progression</span>
                <span class="text-xs text-muted-foreground">
                  {{ getTrendDirection(accuracyTrend) }} {{ formatNumber(Math.abs(accuracyTrend) * 100, 1) }}%
                </span>
              </div>
              <div class="flex items-center gap-1">
                <div 
                  v-for="(model, index) in allModelsChronological" 
                  :key="index"
                  class="flex-1 h-3 rounded transition-all duration-300"
                  :class="getAccuracyBarClass(model.stats.accuracy)"
                  :title="`${model.name}: ${formatNumber(model.stats.accuracy * 100, 1)}%`"
                ></div>
              </div>
            </div>

            <!-- F1-Score Trend -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">F1-Score Progression</span>
                <span class="text-xs text-muted-foreground">
                  {{ getTrendDirection(f1Trend) }} {{ formatNumber(Math.abs(f1Trend), 3) }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <div 
                  v-for="(model, index) in allModelsChronological" 
                  :key="index"
                  class="flex-1 h-3 rounded transition-all duration-300"
                  :class="getF1BarClass(model.stats.macroAvg.f1Score)"
                  :title="`${model.name}: ${formatNumber(model.stats.macroAvg.f1Score, 3)}`"
                ></div>
              </div>
            </div>
          </div>
        </Card>

        <!-- Export Comparison -->
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <Download class="w-4 h-4 text-gray-600" />
            Export Comparison
          </h3>
          <div class="flex gap-2">
            <Button @click="exportComparison('csv')" variant="outline">
              <FileText class="w-4 h-4 mr-1" />
              Export as CSV
            </Button>
            <Button @click="exportComparison('json')" variant="outline">
              <Code class="w-4 h-4 mr-1" />
              Export as JSON
            </Button>
          </div>
        </Card>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/ui/card'
import {
  Button
} from '@/ui/button'
import {
  Input
} from '@/ui/input'
import {
  Label
} from '@/ui/label'
import {
  Badge
} from '@/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
} from '@/ui/collapsible'
import {
  GitCompare,
  Plus,
  Trash2,
  Save,
  BarChart3,
  Trophy,
  TrendingUp,
  Download,
  FileText,
  Code
} from 'lucide-vue-next'
import {
  formatNumber,
  type ConfusionMatrixStats
} from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'

interface Props {
  matrix: number[][]
  labels: string[]
  stats: ConfusionMatrixStats | null
}

interface SavedModel {
  name: string
  description: string
  matrix: number[][]
  labels: string[]
  stats: ConfusionMatrixStats
  savedAt: string
}

const props = defineProps<Props>()

// Reactive state
const showAddModel = ref(false)
const newModelName = ref('')
const newModelDescription = ref('')
const savedModels = ref<SavedModel[]>([])

// Computed values
const currentStats = computed(() => props.stats!)

const allModelsChronological = computed(() => {
  return [...savedModels.value].sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
})

const bestModel = computed(() => {
  const allModels = [...savedModels.value, { 
    name: 'Current Model', 
    stats: currentStats.value,
    savedAt: new Date().toISOString(),
    description: '',
    matrix: props.matrix,
    labels: props.labels
  }]
  return allModels.reduce((best, current) => 
    current.stats.accuracy > best.stats.accuracy ? current : best
  )
})

const bestF1Model = computed(() => {
  const allModels = [...savedModels.value, { 
    name: 'Current Model', 
    stats: currentStats.value,
    savedAt: new Date().toISOString(),
    description: '',
    matrix: props.matrix,
    labels: props.labels
  }]
  return allModels.reduce((best, current) => 
    current.stats.macroAvg.f1Score > best.stats.macroAvg.f1Score ? current : best
  )
})

const bestPrecisionModel = computed(() => {
  const allModels = [...savedModels.value, { 
    name: 'Current Model', 
    stats: currentStats.value,
    savedAt: new Date().toISOString(),
    description: '',
    matrix: props.matrix,
    labels: props.labels
  }]
  return allModels.reduce((best, current) => 
    current.stats.macroAvg.precision > best.stats.macroAvg.precision ? current : best
  )
})

const accuracyTrend = computed(() => {
  if (allModelsChronological.value.length < 2) return 0
  const first = allModelsChronological.value[0].stats.accuracy
  const last = allModelsChronological.value[allModelsChronological.value.length - 1].stats.accuracy
  return last - first
})

const f1Trend = computed(() => {
  if (allModelsChronological.value.length < 2) return 0
  const first = allModelsChronological.value[0].stats.macroAvg.f1Score
  const last = allModelsChronological.value[allModelsChronological.value.length - 1].stats.macroAvg.f1Score
  return last - first
})

// Methods
function saveCurrentModel() {
  if (!newModelName.value.trim() || !props.stats) return
  
  const model: SavedModel = {
    name: newModelName.value.trim(),
    description: newModelDescription.value.trim(),
    matrix: JSON.parse(JSON.stringify(props.matrix)),
    labels: [...props.labels],
    stats: JSON.parse(JSON.stringify(props.stats)),
    savedAt: new Date().toISOString()
  }
  
  savedModels.value.push(model)
  saveToLocalStorage()
  
  // Reset form
  newModelName.value = ''
  newModelDescription.value = ''
  showAddModel.value = false
}

function cancelAddModel() {
  newModelName.value = ''
  newModelDescription.value = ''
  showAddModel.value = false
}

function removeModel(index: number) {
  savedModels.value.splice(index, 1)
  saveToLocalStorage()
}

function clearComparisons() {
  savedModels.value = []
  saveToLocalStorage()
}

function saveToLocalStorage() {
  localStorage.setItem('confusionMatrixModels', JSON.stringify(savedModels.value))
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem('confusionMatrixModels')
  if (stored) {
    try {
      savedModels.value = JSON.parse(stored)
    } catch (error) {
      console.error('Error loading saved models:', error)
    }
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPerformanceVariant(accuracy: number): "default" | "secondary" | "destructive" | "outline" {
  if (accuracy >= 0.9) return "default"
  if (accuracy >= 0.8) return "secondary"
  if (accuracy >= 0.7) return "outline"
  return "destructive"
}

function getTrendDirection(trend: number): string {
  if (trend > 0) return "↗"
  if (trend < 0) return "↘"
  return "→"
}

function getAccuracyBarClass(accuracy: number): string {
  if (accuracy >= 0.9) return "bg-green-500"
  if (accuracy >= 0.8) return "bg-blue-500"
  if (accuracy >= 0.7) return "bg-yellow-500"
  return "bg-red-500"
}

function getF1BarClass(f1Score: number): string {
  if (f1Score >= 0.8) return "bg-green-500"
  if (f1Score >= 0.6) return "bg-blue-500"
  if (f1Score >= 0.4) return "bg-yellow-500"
  return "bg-red-500"
}

function exportComparison(format: 'csv' | 'json') {
  const allModels = [...savedModels.value, {
    name: 'Current Model',
    description: 'Currently active model',
    matrix: props.matrix,
    labels: props.labels,
    stats: currentStats.value,
    savedAt: new Date().toISOString()
  }]
  
  if (format === 'csv') {
    const headers = ['Model', 'Description', 'Accuracy', 'Precision', 'Recall', 'F1-Score', 'Samples', 'Date']
    const rows = allModels.map(model => [
      model.name,
      model.description,
      formatNumber(model.stats.accuracy, 4),
      formatNumber(model.stats.macroAvg.precision, 4),
      formatNumber(model.stats.macroAvg.recall, 4),
      formatNumber(model.stats.macroAvg.f1Score, 4),
      model.stats.totalSamples.toString(),
      model.savedAt
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    downloadFile(csvContent, 'model_comparison.csv', 'text/csv')
  } else {
    const jsonContent = JSON.stringify(allModels, null, 2)
    downloadFile(jsonContent, 'model_comparison.json', 'application/json')
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(() => {
  loadFromLocalStorage()
})
</script> 








