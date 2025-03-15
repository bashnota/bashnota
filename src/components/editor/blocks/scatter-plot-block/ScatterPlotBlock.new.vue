<template>
  <node-view-wrapper class="scatter-plot-block">
    <PlotControls
      v-if="editor.isEditable"
      v-model:title="plotTitle"
      v-model:apiUrl="apiUrl"
      v-model:xAxisLabel="xAxisLabel"
      v-model:yAxisLabel="yAxisLabel"
      v-model:pointSize="pointSize"
      v-model:opacity="opacity"
      v-model:isLocked="isLocked"
      :isLoading="isLoading"
      :apiError="apiError"
      :hasData="currentData.length > 0"
      :isExporting="isExporting"
      :showExportMenu="showExportMenu"
      :columnSelections="columnSelections"
      @fetch-data="fetchData"
      @toggle-export-menu="toggleExportMenu"
      @export="exportPlot"
      @upload-csv="handleCsvUpload"
      @column-change="handleColumnSelectionChange"
    />
    
    <PlotVisualization
      ref="plotVisualizationRef"
      :data="currentData"
      :title="plotTitle"
      :xAxisLabel="xAxisLabel"
      :yAxisLabel="yAxisLabel"
      :pointSize="pointSize"
      :opacity="opacity"
      :isLocked="isLocked"
      :colorMapping="colorMapping"
      :plotContainer="plotContainer"
      :isZoomed="zoomState.isZoomed"
      :getColorForLabel="getColorForLabel"
      :resetZoom="resetZoom"
      @double-click="handleDoubleClick"
    />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import type { DataPoint, PlotState, ColumnSelections } from './types'
import { useScatterPlot } from './composables/useScatterPlot'
import { useCsvData } from './composables/useCsvData'
import { useApiData } from './composables/useApiData'
import { useExportPlot, type ExportFormat } from './composables/useExportPlot'
import PlotControls from './components/PlotControls.vue'
import PlotVisualization from './components/PlotVisualization.vue'

const props = defineProps<NodeViewProps>()

// Initialize composables
const { 
  plotContainer, 
  zoomState, 
  colorMapping, 
  getColorForLabel, 
  initializeColorScale, 
  createScatterPlot, 
  resetZoom, 
  generateRandomData 
} = useScatterPlot()

const {
  rawCsvData,
  columnSelections,
  analyzeCsvColumns,
  processCsvWithColumns,
  parseCsvData,
  extractColumnsFromCsv,
  handleCsvUpload: processCsvUpload
} = useCsvData()

const {
  apiUrl,
  isLoading,
  apiError,
  fetchData: fetchApiData
} = useApiData()

const {
  isExporting,
  showExportMenu,
  toggleExportMenu,
  exportPlot: exportPlotAs,
  setupExportMenuClickOutside
} = useExportPlot()

// State from node attributes
const plotTitle = ref(props.node.attrs.title || 'Scatter Plot')
const xAxisLabel = ref(props.node.attrs.xAxisLabel || 'X Axis')
const yAxisLabel = ref(props.node.attrs.yAxisLabel || 'Y Axis')
const pointSize = ref(props.node.attrs.pointSize || 5)
const opacity = ref(props.node.attrs.opacity || 0.7)
const isLocked = ref(props.node.attrs.isLocked || false)

// Current data state
const currentData = ref<DataPoint[]>([])

// Reference to the plot visualization component
const plotVisualizationRef = ref<InstanceType<typeof PlotVisualization> | null>(null)

// Initialize or restore color mapping
onMounted(() => {
  // Set up export menu click outside handler
  const cleanup = setupExportMenuClickOutside()
  
  // Restore API URL from attributes
  if (props.node.attrs.apiUrl) {
    apiUrl.value = props.node.attrs.apiUrl
  }
  
  // Restore color mapping if available
  if (props.node.attrs.colorMapping && typeof props.node.attrs.colorMapping === 'object') {
    Object.assign(colorMapping.value, props.node.attrs.colorMapping)
  }
  
  // Initialize column selections from attributes
  if (props.node.attrs.selectedXColumn || props.node.attrs.selectedYColumn || props.node.attrs.selectedLabelColumn) {
    columnSelections.value.selectedXColumn = props.node.attrs.selectedXColumn || ''
    columnSelections.value.selectedYColumn = props.node.attrs.selectedYColumn || ''
    columnSelections.value.selectedLabelColumn = props.node.attrs.selectedLabelColumn || ''
  }
  
  // Initialize the plot
  initializePlot()
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })
})

// Watch for changes to the plot container ref
watch(() => plotVisualizationRef.value?.plotContainerRef, (newValue) => {
  if (newValue) {
    plotContainer.value = newValue
    
    // If we have data, redraw the plot
    if (currentData.value.length > 0) {
      redrawPlot()
    }
  }
}, { immediate: true })

// Initialize the plot based on available data
const initializePlot = async () => {
  // If we're locked and have a saved plot state, restore it
  if (isLocked.value && props.node.attrs.plotState) {
    restorePlotState(props.node.attrs.plotState)
    return
  }
  
  // If we have API data saved in attributes, use that
  if (props.node.attrs.apiData && Array.isArray(props.node.attrs.apiData)) {
    currentData.value = props.node.attrs.apiData
    nextTick(() => {
      redrawPlot()
    })
    return
  }
  
  // If we have saved CSV content, parse and use it
  if (props.node.attrs.csvContent) {
    try {
      // Create saved selections object from attributes
      const savedSelections = {
        selectedXColumn: props.node.attrs.selectedXColumn,
        selectedYColumn: props.node.attrs.selectedYColumn,
        selectedLabelColumn: props.node.attrs.selectedLabelColumn
      }
      
      const data = await parseCsvData(props.node.attrs.csvContent, savedSelections)
      currentData.value = data
      
      nextTick(() => {
        redrawPlot()
        
        // Save all settings after creating the plot
        saveAllSettings()
      })
    } catch (error) {
      console.error('Error parsing CSV data:', error)
      
      // Fall back to random data
      const randomData = generateRandomData()
      currentData.value = randomData
      
      nextTick(() => {
        redrawPlot()
      })
    }
    return
  }
  
  // Otherwise generate random data
  const randomData = generateRandomData()
  currentData.value = randomData
  
  nextTick(() => {
    redrawPlot()
  })
}

// Redraw the plot with current data and settings
const redrawPlot = () => {
  if (!plotContainer.value || currentData.value.length === 0) return
  
  const plotOptions = {
    pointSize: pointSize.value,
    opacity: opacity.value,
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    title: plotTitle.value,
    colorMapping: colorMapping.value
  }
  
  createScatterPlot(currentData.value, plotOptions)
  
  // Update attributes whenever plot is redrawn
  updateAttributes({
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    pointSize: pointSize.value,
    opacity: opacity.value,
    selectedXColumn: columnSelections.value.selectedXColumn,
    selectedYColumn: columnSelections.value.selectedYColumn,
    selectedLabelColumn: columnSelections.value.selectedLabelColumn,
    colorMapping: { ...colorMapping.value }
  })
}

// Handle column selection changes
const handleColumnSelectionChange = (selections: Partial<ColumnSelections>) => {
  // Update column selections
  if (selections.selectedXColumn !== undefined) {
    columnSelections.value.selectedXColumn = selections.selectedXColumn
  }
  
  if (selections.selectedYColumn !== undefined) {
    columnSelections.value.selectedYColumn = selections.selectedYColumn
  }
  
  if (selections.selectedLabelColumn !== undefined) {
    // Clear color mapping if label column changed
    if (columnSelections.value.selectedLabelColumn !== selections.selectedLabelColumn) {
      Object.keys(colorMapping.value).forEach(key => {
        delete colorMapping.value[key]
      })
    }
    
    columnSelections.value.selectedLabelColumn = selections.selectedLabelColumn
  }
  
  // Process data with new column selections
  if (rawCsvData.value.length > 0) {
    const newData = processCsvWithColumns(
      rawCsvData.value,
      columnSelections.value.selectedXColumn,
      columnSelections.value.selectedYColumn,
      columnSelections.value.selectedLabelColumn
    )
    
    // Update axis labels based on column names
    xAxisLabel.value = columnSelections.value.selectedXColumn
    yAxisLabel.value = columnSelections.value.selectedYColumn
    
    currentData.value = newData
    redrawPlot()
  }
}

// Handle CSV upload
const handleCsvUpload = async (file: File) => {
  try {
    const data = await processCsvUpload(file)
    
    // Update current data
    currentData.value = data
    
    // Update axis labels based on column names
    xAxisLabel.value = columnSelections.value.selectedXColumn
    yAxisLabel.value = columnSelections.value.selectedYColumn
    
    // Save the CSV content
    const text = await file.text()
    updateAttributes({
      csvContent: text
    })
    
    // Clear any API url since we're now using CSV data
    apiUrl.value = ''
    updateAttributes({ apiUrl: '' })
    
    // Redraw the plot
    redrawPlot()
  } catch (error) {
    console.error('Error handling CSV upload:', error)
    apiError.value = error instanceof Error ? error.message : 'Failed to parse CSV file'
  }
}

// Fetch data from API
const fetchData = async () => {
  const data = await fetchApiData()
  
  if (data) {
    currentData.value = data
    redrawPlot()
    
    // Save the successful API response in the node attributes
    updateAttributes({
      apiData: data,
      apiUrl: apiUrl.value
    })
  } else if (currentData.value.length === 0) {
    // Only use random data if there's no existing data
    const randomData = generateRandomData()
    currentData.value = randomData
    redrawPlot()
  }
}

// Export the plot
const exportPlot = (format: ExportFormat) => {
  exportPlotAs(format, plotContainer.value, plotTitle.value)
}

// Handle double click on the plot
const handleDoubleClick = () => {
  if (isLocked.value) {
    isLocked.value = false
    updateAttributes({
      isLocked: false,
    })
  }
}

// Toggle lock state
const toggleLock = () => {
  isLocked.value = !isLocked.value
  
  if (isLocked.value) {
    // Save the complete plot state when locking
    const plotState = savePlotState()
    
    // Create a snapshot of the current state to persist
    const attrs: Record<string, any> = {
      isLocked: true,
      plotState: plotState,
      colorMapping: { ...colorMapping.value },
      selectedXColumn: columnSelections.value.selectedXColumn,
      selectedYColumn: columnSelections.value.selectedYColumn,
      selectedLabelColumn: columnSelections.value.selectedLabelColumn
    }
    
    // Don't include API URL in locked state
    if (apiUrl.value) {
      // Store but don't display
      attrs.savedApiUrl = apiUrl.value
      attrs.apiUrl = ''
    }
    
    updateAttributes(attrs)
  } else {
    const attrs: Record<string, any> = {
      isLocked: false,
      selectedXColumn: columnSelections.value.selectedXColumn,
      selectedYColumn: columnSelections.value.selectedYColumn,
      selectedLabelColumn: columnSelections.value.selectedLabelColumn
    }
    
    // Restore API URL if it was saved
    if (props.node.attrs.savedApiUrl) {
      attrs.apiUrl = props.node.attrs.savedApiUrl
      attrs.savedApiUrl = ''
    }
    
    updateAttributes(attrs)
  }
}

// Store the complete plot state
const savePlotState = (): PlotState => {
  return {
    data: [...currentData.value],
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    pointSize: pointSize.value,
    opacity: opacity.value,
    title: plotTitle.value,
    csvContent: props.node.attrs.csvContent,
    selectedXColumn: columnSelections.value.selectedXColumn,
    selectedYColumn: columnSelections.value.selectedYColumn,
    selectedLabelColumn: columnSelections.value.selectedLabelColumn,
    colorMapping: { ...colorMapping.value },
    isZoomed: zoomState.value.isZoomed,
    zoomTransform: zoomState.value.transform ? {
      x: zoomState.value.transform.x,
      y: zoomState.value.transform.y,
      k: zoomState.value.transform.k
    } : undefined
  }
}

// Restore plot from saved state
const restorePlotState = (state: PlotState) => {
  if (!state) return
  
  // Restore the data first
  currentData.value = state.data
  
  // Restore important parameters
  xAxisLabel.value = state.xAxisLabel
  yAxisLabel.value = state.yAxisLabel
  pointSize.value = state.pointSize
  opacity.value = state.opacity
  plotTitle.value = state.title
  
  // Restore column selections if available
  if (state.selectedXColumn) {
    columnSelections.value.selectedXColumn = state.selectedXColumn
  }
  
  if (state.selectedYColumn) {
    columnSelections.value.selectedYColumn = state.selectedYColumn
  }
  
  // Handle label column explicitly - important to preserve emptiness
  if (state.selectedLabelColumn !== undefined) {
    columnSelections.value.selectedLabelColumn = state.selectedLabelColumn
  }
  
  // Restore color mapping BEFORE drawing the plot
  if (state.colorMapping) {
    Object.assign(colorMapping.value, state.colorMapping)
  }
  
  // Restore zoom state if available
  if (state.zoomTransform) {
    zoomState.value.transform = state.zoomTransform
    zoomState.value.isZoomed = state.isZoomed || false
  }
  
  // Make sure we have the data and redraw the plot
  nextTick(() => {
    redrawPlot()
  })
}

// Save all settings to Tiptap attributes
const saveAllSettings = () => {
  const settings = {
    // Plot appearance
    title: plotTitle.value,
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    pointSize: pointSize.value,
    opacity: opacity.value,
    
    // Column selections
    selectedXColumn: columnSelections.value.selectedXColumn,
    selectedYColumn: columnSelections.value.selectedYColumn,
    selectedLabelColumn: columnSelections.value.selectedLabelColumn,
    
    // Color settings
    colorMapping: { ...colorMapping.value },
    
    // Zoom settings
    isZoomed: zoomState.value.isZoomed,
    zoomTransform: zoomState.value.transform ? {
      x: zoomState.value.transform.x,
      y: zoomState.value.transform.y,
      k: zoomState.value.transform.k
    } : null
  }
  
  updateAttributes(settings)
}

// Update attributes helper
const updateAttributes = (attrs: Record<string, any>) => {
  props.updateAttributes(attrs)
}
</script>

<style scoped>
.scatter-plot-block {
  margin: 1rem 0;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
}
</style> 