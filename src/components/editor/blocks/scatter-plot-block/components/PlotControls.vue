<template>
  <div class="scatter-plot-controls" :class="{ 'locked': isLocked }">
    <div class="control-group">
      <Input
        v-model="title"
        placeholder="Enter plot title"
        @change="updateTitle"
        class="title-input"
        :disabled="isLocked"
      />
      <div class="api-input-container" v-if="!isLocked">
        <Input
          v-model="apiUrl"
          placeholder="Enter API URL (optional)"
          @change="updateApiUrl"
          class="url-input"
          :disabled="isLocked"
        />
        <Button 
          v-if="apiUrl" 
          variant="outline" 
          size="sm" 
          @click="fetchData" 
          :disabled="isLocked || isLoading"
          class="fetch-button"
        >
          <template v-if="isLoading">
            <span class="loader"></span>
          </template>
          <template v-else>Fetch</template>
        </Button>
      </div>
      <div class="flex gap-2">
        <Tooltip content="Upload CSV">
          <Button variant="ghost" size="icon" @click="triggerFileInput" class="ml-auto" :disabled="isLocked">
            <PlusIcon class="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Export Plot">
          <div class="export-dropdown not-locked">
            <Button 
              variant="ghost" 
              size="icon" 
              @click="toggleExportMenu" 
              :disabled="!hasData || isExporting"
              class="not-locked"
            >
              <template v-if="isExporting">
                <span class="loader"></span>
              </template>
              <template v-else>
                <DownloadIcon class="h-4 w-4" />
              </template>
            </Button>
            <div class="export-menu not-locked" v-if="showExportMenu">
              <div class="export-menu-header">Export as:</div>
              <button @click="exportAs('svg')">SVG</button>
              <button @click="exportAs('png')">PNG</button>
              <button @click="exportAs('jpeg')">JPEG</button>
            </div>
          </div>
        </Tooltip>
        <Tooltip :content="isLocked ? 'Unlock editing' : 'Lock editing'">
          <Button variant="ghost" size="icon" @click="toggleLock">
            <LockIcon v-if="isLocked" class="h-4 w-4" />
            <UnlockIcon v-else class="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
      <!-- Hidden file input for CSV upload -->
      <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleFileChange" />
    </div>
    
    <!-- Column selection for CSV data -->
    <div class="control-group column-selectors" v-if="!isLocked && hasColumns">
      <div class="selector-container">
        <label for="x-axis-select">X Axis:</label>
        <select 
          id="x-axis-select" 
          v-model="selectedXColumn" 
          @change="handleColumnChange"
          class="column-select"
        >
          <option v-for="column in numericColumns" :key="column" :value="column">
            {{ column }}
          </option>
        </select>
      </div>
      
      <div class="selector-container">
        <label for="y-axis-select">Y Axis:</label>
        <select 
          id="y-axis-select" 
          v-model="selectedYColumn" 
          @change="handleColumnChange"
          class="column-select"
        >
          <option v-for="column in numericColumns" :key="column" :value="column">
            {{ column }}
          </option>
        </select>
      </div>
      
      <div class="selector-container">
        <label for="label-select">Color By:</label>
        <select 
          id="label-select" 
          v-model="selectedLabelColumn" 
          @change="handleColumnChange"
          class="column-select"
        >
          <option value="">None</option>
          <option v-for="column in availableColumns" :key="column" :value="column">
            {{ column }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="control-group" v-if="!isLocked">
      <div class="slider-container">
        <label>
          <span>Point Size:</span>
          <Slider
            v-model="pointSizeArray"
            :min="2"
            :max="10"
            :step="1"
            :disabled="isLocked"
          />
        </label>
      </div>
      <div class="slider-container">
        <label>
          <span>Opacity:</span>
          <Slider
            v-model="opacityArray"
            :min="0.1"
            :max="1"
            :step="0.1"
            :disabled="isLocked"
          />
        </label>
      </div>
    </div>
    
    <div class="axis-labels" v-if="!isLocked">
      <Input
        v-model="xAxisLabel"
        placeholder="X-axis label"
        @change="updateAxisLabels"
        class="axis-input"
        :disabled="isLocked"
      />
      <Input
        v-model="yAxisLabel"
        placeholder="Y-axis label"
        @change="updateAxisLabels"
        class="axis-input"
        :disabled="isLocked"
      />
    </div>
    
    <div v-if="apiError" class="error-message">{{ apiError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import { LockIcon, UnlockIcon, PlusIcon, DownloadIcon } from 'lucide-vue-next'
import type { ExportFormat } from '../composables/useExportPlot'
import type { ColumnSelections } from '../types'

interface PlotControlsProps {
  title: string
  apiUrl: string
  xAxisLabel: string
  yAxisLabel: string
  pointSize: number
  opacity: number
  isLocked: boolean
  isLoading: boolean
  apiError: string
  hasData: boolean
  isExporting: boolean
  showExportMenu: boolean
  columnSelections: ColumnSelections
}

const props = withDefaults(defineProps<PlotControlsProps>(), {
  title: 'Scatter Plot',
  apiUrl: '',
  xAxisLabel: 'X Axis',
  yAxisLabel: 'Y Axis',
  pointSize: 5,
  opacity: 0.7,
  isLocked: false,
  isLoading: false,
  apiError: '',
  hasData: false,
  isExporting: false,
  showExportMenu: false
})

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:apiUrl', value: string): void
  (e: 'update:xAxisLabel', value: string): void
  (e: 'update:yAxisLabel', value: string): void
  (e: 'update:pointSize', value: number): void
  (e: 'update:opacity', value: number): void
  (e: 'update:isLocked', value: boolean): void
  (e: 'fetch-data'): void
  (e: 'toggle-export-menu'): void
  (e: 'export', format: ExportFormat): void
  (e: 'upload-csv', file: File): void
  (e: 'column-change', selections: Partial<ColumnSelections>): void
}>()

// Local refs for v-model binding
const title = ref(props.title)
const apiUrl = ref(props.apiUrl)
const xAxisLabel = ref(props.xAxisLabel)
const yAxisLabel = ref(props.yAxisLabel)
const pointSize = ref(props.pointSize)
const opacity = ref(props.opacity)

// Computed properties for Slider component (expects array values)
const pointSizeArray = computed({
  get: () => [pointSize.value],
  set: (val) => {
    if (Array.isArray(val) && val.length > 0) {
      pointSize.value = val[0]
      emit('update:pointSize', val[0])
    }
  }
})

const opacityArray = computed({
  get: () => [opacity.value],
  set: (val) => {
    if (Array.isArray(val) && val.length > 0) {
      opacity.value = val[0]
      emit('update:opacity', val[0])
    }
  }
})

// Column selection computed properties
const availableColumns = computed(() => props.columnSelections.availableColumns)
const numericColumns = computed(() => props.columnSelections.numericColumns)
const selectedXColumn = ref(props.columnSelections.selectedXColumn)
const selectedYColumn = ref(props.columnSelections.selectedYColumn)
const selectedLabelColumn = ref(props.columnSelections.selectedLabelColumn)

// Computed property to check if we have columns
const hasColumns = computed(() => availableColumns.value.length > 0)

// File input ref
const fileInput = ref<HTMLInputElement | null>(null)

// Watch for prop changes
watch(() => props.title, (newValue) => { title.value = newValue })
watch(() => props.apiUrl, (newValue) => { apiUrl.value = newValue })
watch(() => props.xAxisLabel, (newValue) => { xAxisLabel.value = newValue })
watch(() => props.yAxisLabel, (newValue) => { yAxisLabel.value = newValue })
watch(() => props.pointSize, (newValue) => { pointSize.value = newValue })
watch(() => props.opacity, (newValue) => { opacity.value = newValue })
watch(() => props.columnSelections.selectedXColumn, (newValue) => { selectedXColumn.value = newValue })
watch(() => props.columnSelections.selectedYColumn, (newValue) => { selectedYColumn.value = newValue })
watch(() => props.columnSelections.selectedLabelColumn, (newValue) => { selectedLabelColumn.value = newValue })

// Event handlers
const updateTitle = () => {
  emit('update:title', title.value)
}

const updateApiUrl = () => {
  emit('update:apiUrl', apiUrl.value)
}

const updateAxisLabels = () => {
  emit('update:xAxisLabel', xAxisLabel.value)
  emit('update:yAxisLabel', yAxisLabel.value)
}

const toggleLock = () => {
  emit('update:isLocked', !props.isLocked)
}

const fetchData = () => {
  emit('fetch-data')
}

const toggleExportMenu = () => {
  emit('toggle-export-menu')
}

const exportAs = (format: ExportFormat) => {
  emit('export', format)
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    emit('upload-csv', input.files[0])
    // Reset the input
    input.value = ''
  }
}

const handleColumnChange = () => {
  emit('column-change', {
    selectedXColumn: selectedXColumn.value,
    selectedYColumn: selectedYColumn.value,
    selectedLabelColumn: selectedLabelColumn.value
  })
}
</script>

<style scoped>
.scatter-plot-controls {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scatter-plot-controls.locked {
  opacity: 0.5;
  pointer-events: none;
}

.scatter-plot-controls.locked .not-locked {
  opacity: 1 !important;
  pointer-events: auto !important;
}

.control-group {
  display: flex;
  gap: 1rem;
}

.column-selectors {
  display: flex;
  flex-wrap: wrap;
  padding: 0.75rem;
  background: hsl(var(--muted));
  border-radius: 6px;
}

.selector-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 150px;
}

.column-select {
  padding: 0.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-size: 0.9rem;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: hsl(var(--foreground));
}

.slider-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.slider-container label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.title-input,
.url-input,
.axis-input {
  width: 100%;
}

.api-input-container {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.fetch-button {
  flex-shrink: 0;
}

.axis-labels {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.hidden {
  display: none;
}

.flex {
  display: flex;
}

.gap-2 {
  gap: 0.5rem;
}

.ml-auto {
  margin-left: auto;
}

.error-message {
  color: hsl(var(--destructive));
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: hsl(var(--destructive) / 0.1);
}

.loader {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-right-color: transparent;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 0.5rem;
  z-index: 10;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
}

.export-menu-header {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  text-align: left;
  color: hsl(var(--foreground));
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.export-menu button:hover {
  background: hsl(var(--muted));
}
</style> 