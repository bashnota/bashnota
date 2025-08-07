<template>
  <Card class="w-full">
    <CardHeader>
      <div class="flex items-center justify-between">
        <CardTitle class="flex items-center gap-2">
          <Grid3x3 class="w-5 h-5 text-primary" />
          Confusion Matrix
          <Badge v-if="title" variant="secondary" class="ml-2">{{ title }}</Badge>
        </CardTitle>
        
        <div class="flex items-center gap-2">
          <!-- Matrix Controls -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm">
                <Settings class="w-4 h-4 mr-1" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @click.prevent>
                <div class="flex items-center justify-between w-full">
                  <span>Show Percentages</span>
                  <Switch v-model:checked="showPercentages" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem @click.prevent>
                <div class="flex items-center justify-between w-full">
                  <span>Normalize by Row</span>
                  <Switch v-model:checked="normalizeByRow" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem @click.prevent>
                <div class="flex items-center justify-between w-full">
                  <span>Show Heat Map</span>
                  <Switch v-model:checked="showHeatMap" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem @click.prevent>
                <div class="flex items-center justify-between w-full">
                  <span>Enable Animations</span>
                  <Switch v-model:checked="localEnableAnimations" />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button @click="resetView" variant="outline" size="sm">
            <RotateCcw class="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent>
      <!-- Matrix Container -->
      <div class="space-y-4">
        <!-- Matrix Statistics Summary -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary">{{ matrix.length }}</div>
            <div class="text-xs text-muted-foreground uppercase tracking-wide">Classes</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ totalSamples }}</div>
            <div class="text-xs text-muted-foreground uppercase tracking-wide">Total Samples</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ correctPredictions }}</div>
            <div class="text-xs text-muted-foreground uppercase tracking-wide">Correct</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ formatNumber(accuracy * 100, 1) }}%</div>
            <div class="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</div>
          </div>
        </div>

        <!-- Color Legend -->
        <div v-if="showHeatMap" class="flex items-center justify-center gap-4 p-3 bg-muted/10 rounded-lg">
          <span class="text-sm font-medium">Color Scale:</span>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1">
              <div class="w-4 h-4 rounded" :style="{ backgroundColor: getColorForValue(0, maxValue) }"></div>
              <span class="text-xs">Low</span>
            </div>
            <div class="w-16 h-2 rounded" :style="{ background: `linear-gradient(to right, ${getColorForValue(0, maxValue)}, ${getColorForValue(maxValue, maxValue)})` }"></div>
            <div class="flex items-center gap-1">
              <div class="w-4 h-4 rounded" :style="{ backgroundColor: getColorForValue(maxValue, maxValue) }"></div>
              <span class="text-xs">High</span>
            </div>
          </div>
        </div>

        <!-- Interactive Matrix -->
        <div class="overflow-auto">
          <div class="matrix-grid" :style="{ gridTemplateColumns: `auto repeat(${labels.length}, 1fr)` }">
            <!-- Corner Cell -->
            <div class="matrix-cell matrix-corner">
              <div class="flex flex-col items-center justify-center text-xs">
                <span class="font-medium text-primary">Actual</span>
                <span class="text-muted-foreground">vs</span>
                <span class="font-medium text-secondary">Predicted</span>
              </div>
            </div>

            <!-- Column Headers (Predicted) -->
            <div
              v-for="(label, index) in labels"
              :key="`col-${index}`"
              :class="[
                'matrix-cell matrix-header matrix-col-header',
                {
                  'matrix-highlighted': highlightedColumn === index,
                  'matrix-selected': selectedCell?.col === index
                }
              ]"
              @mouseenter="highlightColumn(index)"
              @mouseleave="clearHighlight"
            >
              <div class="flex flex-col items-center justify-center gap-1">
                <span class="font-medium truncate max-w-full" :title="label">{{ label }}</span>
                <Badge variant="outline" class="text-xs">
                  {{ getColumnTotal(index) }}
                </Badge>
              </div>
            </div>

            <!-- Data Rows -->
            <template v-for="(row, rowIndex) in displayMatrix" :key="`row-${rowIndex}`">
              <!-- Row Header (Actual) -->
              <div
                :class="[
                  'matrix-cell matrix-header matrix-row-header',
                  {
                    'matrix-highlighted': highlightedRow === rowIndex,
                    'matrix-selected': selectedCell?.row === rowIndex
                  }
                ]"
                @mouseenter="highlightRow(rowIndex)"
                @mouseleave="clearHighlight"
              >
                <div class="flex flex-col items-center justify-center gap-1">
                  <span class="font-medium truncate max-w-full" :title="labels[rowIndex]">{{ labels[rowIndex] }}</span>
                  <Badge variant="outline" class="text-xs">
                    {{ getRowTotal(rowIndex) }}
                  </Badge>
                </div>
              </div>

              <!-- Matrix Cells -->
              <div
                v-for="(value, colIndex) in row"
                :key="`cell-${rowIndex}-${colIndex}`"
                :class="[
                  'matrix-cell matrix-data-cell',
                  {
                    'matrix-correct': rowIndex === colIndex,
                    'matrix-incorrect': rowIndex !== colIndex,
                    'matrix-highlighted': highlightedRow === rowIndex || highlightedColumn === colIndex,
                    'matrix-selected': selectedCell?.row === rowIndex && selectedCell?.col === colIndex,
                    'matrix-animated': localEnableAnimations
                  }
                ]"
                :style="getCellStyle(value, rowIndex, colIndex)"
                @mouseenter="onCellHover(rowIndex, colIndex, value)"
                @mouseleave="onCellLeave"
                @click="onCellClick(rowIndex, colIndex, value)"
                :title="getTooltipText(rowIndex, colIndex, value)"
              >
                <div class="cell-content">
                  <div class="text-lg font-bold">{{ formatNumber(value) }}</div>
                  <div v-if="showPercentages" class="text-xs opacity-75">
                    {{ getPercentage(value, rowIndex) }}%
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Analysis Insights -->
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Top Performing Classes -->
          <Card class="p-4">
            <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-green-600" />
              Best Performing Classes
            </h4>
            <div class="space-y-2">
              <div v-for="(classData, index) in topPerformingClasses.slice(0, 3)" :key="index" 
                   class="flex items-center justify-between text-sm">
                <span class="truncate">{{ classData.label }}</span>
                <Badge variant="secondary" class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {{ formatNumber(classData.accuracy * 100, 1) }}%
                </Badge>
              </div>
            </div>
          </Card>

          <!-- Areas for Improvement -->
          <Card class="p-4">
            <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-orange-600" />
              Areas for Improvement
            </h4>
            <div class="space-y-2">
              <div v-for="(classData, index) in topPerformingClasses.slice(-3).reverse()" :key="index" 
                   class="flex items-center justify-between text-sm">
                <span class="truncate">{{ classData.label }}</span>
                <Badge variant="secondary" class="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {{ formatNumber(classData.accuracy * 100, 1) }}%
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
  Badge
} from '@/components/ui/badge'
import {
  Switch
} from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Grid3x3,
  Settings,
  RotateCcw,
  TrendingUp,
  AlertTriangle
} from 'lucide-vue-next'
import {
  formatNumber
} from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'

interface Props {
  matrix: number[][]
  labels: string[]
  title?: string
  colorScheme?: string
  enableTooltips?: boolean
  enableAnimations?: boolean
}

interface SelectedCell {
  row: number
  col: number
  value: number
}

const props = withDefaults(defineProps<Props>(), {
  colorScheme: 'default',
  enableTooltips: true,
  enableAnimations: true
})

// Reactive state
const showPercentages = ref(false)
const normalizeByRow = ref(false)
const showHeatMap = ref(true)
const localEnableAnimations = ref(props.enableAnimations)
const highlightedRow = ref<number | null>(null)
const highlightedColumn = ref<number | null>(null)
const selectedCell = ref<SelectedCell | null>(null)

// Watch for prop changes
watch(() => props.enableAnimations, (newVal) => {
  localEnableAnimations.value = newVal
})

// Computed values
const maxValue = computed(() => {
  return Math.max(...props.matrix.flat())
})

const totalSamples = computed(() => {
  return props.matrix.reduce((total, row) => 
    total + row.reduce((sum, val) => sum + val, 0), 0
  )
})

const correctPredictions = computed(() => {
  return props.matrix.reduce((total, row, i) => total + row[i], 0)
})

const accuracy = computed(() => {
  return totalSamples.value > 0 ? correctPredictions.value / totalSamples.value : 0
})

const normalizedMatrix = computed(() => {
  if (!normalizeByRow.value) return props.matrix
  
  return props.matrix.map(row => {
    const rowSum = row.reduce((sum, val) => sum + val, 0)
    return rowSum > 0 ? row.map(val => (val / rowSum) * 100) : row
  })
})

const displayMatrix = computed(() => {
  return normalizeByRow.value ? normalizedMatrix.value : props.matrix
})

const topPerformingClasses = computed(() => {
  return props.labels.map((label, index) => {
    const totalForClass = props.matrix[index].reduce((sum, val) => sum + val, 0)
    const correctForClass = props.matrix[index][index]
    const accuracy = totalForClass > 0 ? correctForClass / totalForClass : 0
    
    return {
      label,
      index,
      accuracy,
      total: totalForClass,
      correct: correctForClass
    }
  }).sort((a, b) => b.accuracy - a.accuracy)
})

// Color schemes
const colorSchemes = {
  default: {
    correct: 'hsl(142, 76%, 36%)',
    incorrect: 'hsl(0, 84%, 60%)',
    gradient: ['hsl(210, 100%, 90%)', 'hsl(210, 100%, 50%)']
  },
  blue: {
    correct: 'hsl(210, 100%, 50%)',
    incorrect: 'hsl(210, 100%, 80%)',
    gradient: ['hsl(210, 100%, 95%)', 'hsl(210, 100%, 40%)']
  },
  green: {
    correct: 'hsl(120, 60%, 50%)',
    incorrect: 'hsl(120, 60%, 80%)',
    gradient: ['hsl(120, 60%, 95%)', 'hsl(120, 60%, 40%)']
  },
  purple: {
    correct: 'hsl(270, 60%, 50%)',
    incorrect: 'hsl(270, 60%, 80%)',
    gradient: ['hsl(270, 60%, 95%)', 'hsl(270, 60%, 40%)']
  },
  viridis: {
    correct: 'hsl(300, 100%, 25%)',
    incorrect: 'hsl(60, 100%, 85%)',
    gradient: ['hsl(60, 100%, 90%)', 'hsl(300, 100%, 25%)']
  },
  plasma: {
    correct: 'hsl(300, 100%, 40%)',
    incorrect: 'hsl(15, 100%, 70%)',
    gradient: ['hsl(15, 100%, 85%)', 'hsl(300, 100%, 40%)']
  }
}

// Methods
function getColorForValue(value: number, max: number): string {
  if (!showHeatMap.value) return 'transparent'
  
  const scheme = colorSchemes[props.colorScheme as keyof typeof colorSchemes] || colorSchemes.default
  const intensity = max > 0 ? value / max : 0
  
  // Interpolate between the gradient colors
  const startColor = scheme.gradient[0]
  const endColor = scheme.gradient[1]
  
  // Simple HSL interpolation
  const startHsl = parseHSL(startColor)
  const endHsl = parseHSL(endColor)
  
  const h = startHsl.h + (endHsl.h - startHsl.h) * intensity
  const s = startHsl.s + (endHsl.s - startHsl.s) * intensity
  const l = startHsl.l + (endHsl.l - startHsl.l) * intensity
  
  return `hsl(${h}, ${s}%, ${l}%)`
}

function parseHSL(hslString: string) {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return { h: 0, s: 0, l: 50 }
  
  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3])
  }
}

function getCellStyle(value: number, row: number, col: number) {
  const isCorrect = row === col
  const scheme = colorSchemes[props.colorScheme as keyof typeof colorSchemes] || colorSchemes.default
  
  let backgroundColor = 'transparent'
  let color = 'inherit'
  
  if (showHeatMap.value) {
    backgroundColor = getColorForValue(value, maxValue.value)
    // Adjust text color based on background
    const intensity = maxValue.value > 0 ? value / maxValue.value : 0
    color = intensity > 0.5 ? 'white' : 'inherit'
  } else if (isCorrect) {
    backgroundColor = scheme.correct + '20'
    color = scheme.correct
  } else if (value > 0) {
    backgroundColor = scheme.incorrect + '20'
    color = scheme.incorrect
  }
  
  return {
    backgroundColor,
    color,
    transition: localEnableAnimations.value ? 'all 0.3s ease' : 'none'
  }
}

function getPercentage(value: number, rowIndex: number): string {
  if (normalizeByRow.value) {
    return formatNumber(value, 1)
  }
  
  const rowTotal = props.matrix[rowIndex].reduce((sum, val) => sum + val, 0)
  return rowTotal > 0 ? formatNumber((value / rowTotal) * 100, 1) : '0'
}

function getRowTotal(rowIndex: number): number {
  return props.matrix[rowIndex].reduce((sum, val) => sum + val, 0)
}

function getColumnTotal(colIndex: number): number {
  return props.matrix.reduce((sum, row) => sum + row[colIndex], 0)
}

function getTooltipText(row: number, col: number, value: number): string {
  if (!props.enableTooltips) return ''
  
  const percentage = getPercentage(value, row)
  const type = row === col ? 'Correct' : 'Incorrect'
  return `${props.labels[row]} → ${props.labels[col]}\nCount: ${formatNumber(value)}\nPercentage: ${percentage}%\nType: ${type}`
}

function highlightRow(index: number) {
  highlightedRow.value = index
}

function highlightColumn(index: number) {
  highlightedColumn.value = index
}

function clearHighlight() {
  highlightedRow.value = null
  highlightedColumn.value = null
}

function onCellHover(row: number, col: number, value: number) {
  highlightedRow.value = row
  highlightedColumn.value = col
}

function onCellLeave() {
  clearHighlight()
}

function onCellClick(row: number, col: number, value: number) {
  selectedCell.value = selectedCell.value?.row === row && selectedCell.value?.col === col 
    ? null 
    : { row, col, value }
}

function resetView() {
  showPercentages.value = false
  normalizeByRow.value = false
  showHeatMap.value = true
  selectedCell.value = null
  clearHighlight()
}
</script>

<style scoped>
.matrix-grid {
  display: grid;
  gap: 2px;
  min-width: max-content;
}

.matrix-cell {
  @apply relative flex items-center justify-center p-3 min-h-[60px] min-w-[80px] border border-border rounded-md text-center transition-all duration-200;
}

.matrix-corner {
  @apply bg-muted/50 text-muted-foreground font-medium;
}

.matrix-header {
  @apply bg-muted/30 font-semibold text-sm;
}

.matrix-row-header {
  @apply border-r-2 border-primary/20;
}

.matrix-col-header {
  @apply border-b-2 border-primary/20;
}

.matrix-data-cell {
  @apply cursor-pointer hover:shadow-md;
}

.matrix-correct {
  @apply ring-2 ring-green-200 dark:ring-green-800;
}

.matrix-incorrect {
  @apply ring-1 ring-orange-200 dark:ring-orange-800;
}

.matrix-highlighted {
  @apply ring-2 ring-primary scale-105 z-10 shadow-lg;
}

.matrix-selected {
  @apply ring-2 ring-primary bg-primary/10 scale-105 z-20 shadow-xl;
}

.matrix-animated {
  @apply transition-all duration-300 ease-in-out;
}

.matrix-animated:hover {
  @apply scale-110 z-30;
}

.cell-content {
  @apply relative z-10 pointer-events-none;
}
</style> 








