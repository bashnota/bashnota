<template>
  <div class="interactive-matrix">
    <div class="matrix-container">
      <!-- Column headers (Predicted) -->
      <div class="header-row">
        <div class="header-cell corner-cell">
          <div class="corner-text">
            <span class="actual-label">Actual</span>
            <span class="predicted-label">Predicted</span>
          </div>
        </div>
        <div
          v-for="(label, index) in labels"
          :key="`col-${index}`"
          class="header-cell column-header"
          :class="{ 'highlighted': highlightedColumn === index }"
        >
          {{ label }}
        </div>
      </div>

      <!-- Data rows -->
      <div
        v-for="(row, rowIndex) in matrix"
        :key="`row-${rowIndex}`"
        class="matrix-row"
      >
        <!-- Row header (Actual) -->
        <div
          class="header-cell row-header"
          :class="{ 'highlighted': highlightedRow === rowIndex }"
        >
          {{ labels[rowIndex] }}
        </div>

        <!-- Matrix cells -->
        <div
          v-for="(value, colIndex) in row"
          :key="`cell-${rowIndex}-${colIndex}`"
          class="matrix-cell"
          :class="{
            'correct-prediction': rowIndex === colIndex,
            'incorrect-prediction': rowIndex !== colIndex,
            'highlighted': highlightedRow === rowIndex || highlightedColumn === colIndex,
            'selected': selectedCell?.row === rowIndex && selectedCell?.col === colIndex
          }"
          :style="{
            backgroundColor: getCellColor(value, maxValue, rowIndex === colIndex),
            color: getCellTextColor(value, maxValue, rowIndex === colIndex)
          }"
          @mouseenter="onCellHover(rowIndex, colIndex, value)"
          @mouseleave="onCellLeave"
          @click="onCellClick(rowIndex, colIndex, value)"
        >
          <div class="cell-content">
            <div class="cell-value">{{ formatNumber(value) }}</div>
            <div v-if="showPercentages" class="cell-percentage">
              {{ getPercentage(value, rowIndex) }}%
            </div>
          </div>

          <!-- Tooltip -->
          <div
            v-if="tooltip.visible && tooltip.row === rowIndex && tooltip.col === colIndex"
            class="cell-tooltip"
            :style="{ 
              left: tooltip.x + 'px', 
              top: tooltip.y + 'px' 
            }"
          >
            <div class="tooltip-content">
              <div class="tooltip-header">
                <strong>{{ labels[rowIndex] }} → {{ labels[colIndex] }}</strong>
              </div>
              <div class="tooltip-body">
                <div>Count: {{ value }}</div>
                <div>Percentage: {{ getPercentage(value, rowIndex) }}%</div>
                <div v-if="rowIndex === colIndex" class="correct-pred">✓ Correct Prediction</div>
                <div v-else class="incorrect-pred">✗ Incorrect Prediction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Matrix controls -->
    <div class="matrix-controls">
      <div class="control-group">
        <label class="control-label">
          <input
            v-model="showPercentages"
            type="checkbox"
            class="control-checkbox"
          />
          Show percentages
        </label>
      </div>
      <div class="control-group">
        <label class="control-label">
          <input
            v-model="normalizeByRow"
            type="checkbox"
            class="control-checkbox"
          />
          Normalize by row
        </label>
      </div>
      <div class="control-group">
        <button
          @click="resetView"
          class="control-button"
        >
          Reset View
        </button>
      </div>
    </div>

    <!-- Legend -->
    <div class="matrix-legend">
      <div class="legend-item">
        <div class="legend-color correct-color"></div>
        <span>Correct Predictions</span>
      </div>
      <div class="legend-item">
        <div class="legend-color incorrect-color"></div>
        <span>Incorrect Predictions</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formatNumber, getCellColor } from '../utils/confusionMatrixUtils'

interface Props {
  matrix: number[][]
  labels: string[]
  title?: string
}

interface SelectedCell {
  row: number
  col: number
  value: number
}

interface Tooltip {
  visible: boolean
  x: number
  y: number
  row: number
  col: number
}

const props = defineProps<Props>()

// Reactive state
const showPercentages = ref(false)
const normalizeByRow = ref(false)
const highlightedRow = ref<number | null>(null)
const highlightedColumn = ref<number | null>(null)
const selectedCell = ref<SelectedCell | null>(null)
const tooltip = ref<Tooltip>({
  visible: false,
  x: 0,
  y: 0,
  row: -1,
  col: -1
})

// Computed values
const maxValue = computed(() => {
  return Math.max(...props.matrix.flat())
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

// Methods
function onCellHover(row: number, col: number, value: number, event?: MouseEvent) {
  highlightedRow.value = row
  highlightedColumn.value = col
  
  if (event) {
    tooltip.value = {
      visible: true,
      x: event.clientX + 10,
      y: event.clientY - 10,
      row,
      col
    }
  }
}

function onCellLeave() {
  highlightedRow.value = null
  highlightedColumn.value = null
  tooltip.value.visible = false
}

function onCellClick(row: number, col: number, value: number) {
  selectedCell.value = { row, col, value }
}

function resetView() {
  showPercentages.value = false
  normalizeByRow.value = false
  highlightedRow.value = null
  highlightedColumn.value = null
  selectedCell.value = null
  tooltip.value.visible = false
}

function getPercentage(value: number, rowIndex: number): string {
  const rowSum = props.matrix[rowIndex].reduce((sum, val) => sum + val, 0)
  return rowSum > 0 ? ((value / rowSum) * 100).toFixed(1) : '0.0'
}

function getCellTextColor(value: number, max: number, isCorrect: boolean): string {
  const intensity = max > 0 ? value / max : 0
  // Use white text for high intensity, dark text for low intensity
  return intensity > 0.5 ? '#ffffff' : '#000000'
}

// Watch for matrix changes
watch(() => props.matrix, () => {
  resetView()
})
</script>

<style scoped>
.interactive-matrix {
  @apply space-y-4;
}

.matrix-container {
  @apply relative overflow-auto bg-white rounded-lg border border-gray-200 shadow-sm;
  max-height: 600px;
}

.header-row {
  @apply flex sticky top-0 bg-gray-50 border-b border-gray-200 z-10;
}

.matrix-row {
  @apply flex border-b border-gray-100 last:border-b-0;
}

.header-cell {
  @apply px-3 py-2 font-medium text-sm text-gray-700 border-r border-gray-200 last:border-r-0;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.corner-cell {
  @apply bg-gray-100;
  position: relative;
}

.corner-text {
  @apply text-xs leading-tight;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actual-label {
  @apply text-gray-600;
}

.predicted-label {
  @apply text-gray-600 mt-1;
}

.column-header {
  @apply bg-blue-50 text-blue-800;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.row-header {
  @apply bg-green-50 text-green-800 sticky left-0 z-20;
}

.header-cell.highlighted {
  @apply bg-yellow-100 text-yellow-800;
}

.matrix-cell {
  @apply px-3 py-2 text-center cursor-pointer transition-all duration-200 relative;
  min-width: 80px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.matrix-cell:hover {
  @apply transform scale-105 z-30;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.matrix-cell.highlighted {
  @apply ring-2 ring-yellow-400 ring-opacity-50;
}

.matrix-cell.selected {
  @apply ring-2 ring-blue-500 ring-opacity-75;
}

.cell-content {
  @apply text-center;
}

.cell-value {
  @apply text-sm font-semibold;
}

.cell-percentage {
  @apply text-xs opacity-75 mt-1;
}

.cell-tooltip {
  @apply fixed z-50 pointer-events-none;
}

.tooltip-content {
  @apply bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm;
}

.tooltip-header {
  @apply border-b border-gray-700 pb-1 mb-1;
}

.tooltip-body {
  @apply space-y-1;
}

.correct-pred {
  @apply text-green-400;
}

.incorrect-pred {
  @apply text-red-400;
}

.matrix-controls {
  @apply flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200;
}

.control-group {
  @apply flex items-center;
}

.control-label {
  @apply flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer;
}

.control-checkbox {
  @apply rounded border-gray-300 text-blue-600 focus:ring-blue-500;
}

.control-button {
  @apply px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium;
}

.matrix-legend {
  @apply flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200;
}

.legend-item {
  @apply flex items-center gap-2 text-sm;
}

.legend-color {
  @apply w-4 h-4 rounded;
}

.correct-color {
  @apply bg-green-500;
}

.incorrect-color {
  @apply bg-red-500;
}

/* Animation for cell transitions */
.matrix-cell {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-cell {
    min-width: 60px;
    @apply px-2 py-1 text-xs;
  }
  
  .matrix-cell {
    min-width: 60px;
    min-height: 50px;
    @apply px-2 py-1;
  }
  
  .cell-value {
    @apply text-xs;
  }
  
  .cell-percentage {
    @apply text-xs;
  }
}
</style> 