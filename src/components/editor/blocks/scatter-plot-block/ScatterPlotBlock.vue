<template>
  <node-view-wrapper class="scatter-plot-block">
    <div class="scatter-plot-controls" v-if="editor.isEditable" :class="{ 'locked': isLocked }">
      <div class="control-group">
        <input
          v-model="plotTitle"
          placeholder="Enter plot title"
          @change="updateAttributes({ title: plotTitle })"
          class="title-input"
          :disabled="isLocked"
        />
        <div class="api-input-container" v-if="!isLocked">
          <input
            v-model="apiUrl"
            placeholder="Enter API URL (optional)"
            @change="handleApiUrlChange"
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
                :disabled="currentData.length === 0 || isExporting"
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
                <button @click="exportPlot('svg')">SVG</button>
                <button @click="exportPlot('png')">PNG</button>
                <button @click="exportPlot('jpeg')">JPEG</button>
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
        <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleCsvUpload" />
      </div>
      
      <!-- Column selection for CSV data -->
      <div class="control-group column-selectors" v-if="!isLocked && availableColumns.length > 0">
        <div class="selector-container">
          <label for="x-axis-select">X Axis:</label>
          <select 
            id="x-axis-select" 
            v-model="selectedXColumn" 
            @change="handleColumnSelectionChange"
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
            @change="handleColumnSelectionChange"
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
            @change="handleColumnSelectionChange"
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
        <label>
          <span>Point Size:</span>
          <input
            type="range"
            v-model="pointSize"
            min="2"
            max="10"
            @change="redrawPlot"
            :disabled="isLocked"
          />
        </label>
        <label>
          <span>Opacity:</span>
          <input
            type="range"
            v-model="opacity"
            min="0.1"
            max="1"
            step="0.1"
            @change="redrawPlot"
            :disabled="isLocked"
          />
        </label>
      </div>
      <div v-if="apiError" class="error-message">{{ apiError }}</div>
    </div>
    <h3 v-if="plotTitle" class="scatter-plot-title">{{ plotTitle }}</h3>
    <div class="axis-labels" v-if="editor.isEditable && !isLocked">
      <input
        v-model="xAxisLabel"
        placeholder="X-axis label"
        @change="redrawPlot"
        class="axis-input"
        :disabled="isLocked"
      />
      <input
        v-model="yAxisLabel"
        placeholder="Y-axis label"
        @change="redrawPlot"
        class="axis-input"
        :disabled="isLocked"
      />
    </div>
    <div class="plot-container-wrapper">
      <div ref="plotContainer" class="plot-container" @dblclick="handleDoubleClick"></div>
      <div v-if="isZoomed" class="zoom-indicator">
        <span>Zoomed In</span>
        <Button variant="ghost" size="sm" @click="resetZoom" class="reset-zoom-btn">
          <RefreshCwIcon class="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>
    </div>
    <div v-if="uniqueLabels.length > 0" class="legend">
      <div v-for="label in uniqueLabels" :key="label" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: getColorForLabel(label) }"></span>
        <span class="legend-label">{{ label }}</span>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from 'vue'
import * as d3 from 'd3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { LockIcon, UnlockIcon, PlusIcon, DownloadIcon, RefreshCwIcon } from 'lucide-vue-next'
import type { ScaleOrdinal } from 'd3'

const props = defineProps<NodeViewProps>()
const plotContainer = ref<HTMLElement | null>(null)
const plotTitle = ref(props.node.attrs.title || 'Scatter Plot')
const apiUrl = ref(props.node.attrs.apiUrl || '')
const pointSize = ref(props.node.attrs.pointSize || 5)
const opacity = ref(props.node.attrs.opacity || 0.7)
const xAxisLabel = ref(props.node.attrs.xAxisLabel || 'X Axis')
const yAxisLabel = ref(props.node.attrs.yAxisLabel || 'Y Axis')
const isLocked = ref(props.node.attrs.isLocked || false)
const isLoading = ref(false)
const apiError = ref('')

// CSV data and column selection
const rawCsvData = ref<Array<Record<string, any>>>([])
const availableColumns = ref<string[]>([])
const numericColumns = ref<string[]>([])
const selectedXColumn = ref<string>('')
const selectedYColumn = ref<string>('')
const selectedLabelColumn = ref<string>(props.node.attrs.selectedLabelColumn || '')

interface DataPoint {
  x: number
  y: number
  label?: string
}

interface PlotState {
  data: DataPoint[]
  xAxisLabel: string
  yAxisLabel: string
  pointSize: number
  opacity: number
  title: string
  csvContent?: string
  selectedXColumn?: string
  selectedYColumn?: string
  selectedLabelColumn?: string
  colorMapping?: Record<string, string>
  isZoomed?: boolean
  zoomTransform?: any
}

const currentData = ref<DataPoint[]>([])
const uniqueLabels = computed(() => {
  const labels = new Set(currentData.value.map((d) => d.label || 'default'))
  return Array.from(labels)
})

// Use a more consistent color generation method with proper typing
const colorScale: ScaleOrdinal<string, string> = d3.scaleOrdinal<string>(d3.schemeSet2)

// Store the color mapping for persistence
const colorMapping = ref<Record<string, string>>({})

// Get color for a label, using saved mapping if available
const getColorForLabel = (label: string): string => {
  // If we have a saved color for this label, use it
  if (colorMapping.value[label]) {
    return colorMapping.value[label];
  }
  
  // Otherwise generate a new color and save it
  const newColor = colorScale(label);
  colorMapping.value[label] = newColor;
  return newColor;
}

// Initialize or restore color mapping
const initializeColorScale = (labels: string[]) => {
  // If we have no labels, exit early
  if (!labels.length) return;
  
  // For any new labels, assign colors
  labels.forEach(label => {
    if (!colorMapping.value[label]) {
      colorMapping.value[label] = colorScale(label);
    }
  });
  
  // Save the updated color mapping
  updateAttributes({
    colorMapping: { ...colorMapping.value }
  });
}

const generateRandomData = (n: number = 50): DataPoint[] => {
  const labels = ['Group A', 'Group B', 'Group C']
  return Array.from({ length: n }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    label: labels[Math.floor(Math.random() * labels.length)],
  }))
}

const isZoomed = ref(false)
const zoomTransform = ref<d3.ZoomTransform | null>(null)
const initialXDomain = ref<[number, number] | null>(null)
const initialYDomain = ref<[number, number] | null>(null)

const createScatterPlot = (data: DataPoint[]) => {
  if (!plotContainer.value) return

  currentData.value = data
  
  // Get unique labels from data in a consistent order
  const labels = Array.from(new Set(data.map((d) => d.label || 'default')))
  
  // Initialize or restore color scale for these labels
  initializeColorScale(labels)

  // Clear previous plot
  d3.select(plotContainer.value).selectAll('*').remove()

  const margin = { top: 40, right: 40, bottom: 60, left: 60 }
  const width = 700 - margin.left - margin.right
  const height = 450 - margin.top - margin.bottom

  // Create the main SVG element
  const svg = d3
    .select(plotContainer.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    
  // Create a group for the entire plot that will be transformed during zoom
  const plotGroup = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
    
  // Add clip path to prevent elements from rendering outside the plot area
  svg.append('defs').append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 8)
    
  // Add background
  plotGroup
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'hsl(var(--muted))')
    .attr('rx', 8)

  // Find min/max values with some padding
  const xMin = d3.min(data, d => d.x) || 0
  const xMax = d3.max(data, d => d.x) || 100
  const yMin = d3.min(data, d => d.y) || 0
  const yMax = d3.max(data, d => d.y) || 100
  
  // Add 5% padding to each side
  const xPadding = (xMax - xMin) * 0.05
  const yPadding = (yMax - yMin) * 0.05
  
  // Store initial domains for reset functionality
  initialXDomain.value = [xMin - xPadding, xMax + xPadding]
  initialYDomain.value = [yMin - yPadding, yMax + yPadding]

  const x = d3
    .scaleLinear()
    .domain(initialXDomain.value)
    .range([0, width])
    .nice()

  const y = d3
    .scaleLinear()
    .domain(initialYDomain.value)
    .range([height, 0])
    .nice()
    
  // Create a group for the content that will be zoomed
  const zoomableGroup = plotGroup.append('g')
    .attr('clip-path', 'url(#clip)')
    
  // Create a group for the dots
  const dotsGroup = zoomableGroup.append('g')

  // Add grid lines
  const xGrid = d3.axisBottom(x)
    .tickSize(-height)
    .tickFormat(() => '')
  
  const xGridGroup = zoomableGroup.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(xGrid)

  const yGrid = d3.axisLeft(y)
    .tickSize(-width)
    .tickFormat(() => '')
    
  const yGridGroup = zoomableGroup.append('g')
    .attr('class', 'grid')
    .call(yGrid)
    
  // Add special lines for x=0 and y=0 axes if they are within the domain
  const xDomain = x.domain();
  const yDomain = y.domain();
  
  // Add x=0 line if it's within the y-axis domain
  if (yDomain[0] <= 0 && yDomain[1] >= 0) {
    zoomableGroup.append('line')
      .attr('class', 'zero-axis')
      .attr('x1', 0)
      .attr('y1', y(0))
      .attr('x2', width)
      .attr('y2', y(0))
      .attr('stroke', 'hsl(var(--primary))')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
  }
  
  // Add y=0 line if it's within the x-axis domain
  if (xDomain[0] <= 0 && xDomain[1] >= 0) {
    zoomableGroup.append('line')
      .attr('class', 'zero-axis')
      .attr('x1', x(0))
      .attr('y1', 0)
      .attr('x2', x(0))
      .attr('y2', height)
      .attr('stroke', 'hsl(var(--primary))')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
  }

  // Add X axis
  const xAxisGroup = plotGroup
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    
  xAxisGroup.append('text')
    .attr('x', width / 2)
    .attr('y', 40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .text(xAxisLabel.value)

  // Add Y axis
  const yAxisGroup = plotGroup
    .append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y))
    
  yAxisGroup.append('text')
    .attr('x', -height / 2)
    .attr('y', -40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text(yAxisLabel.value)

  // Add dots with transition
  const dots = dotsGroup
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d) => x(d.x))
    .attr('cy', (d) => y(d.y))
    .attr('r', 0)
    .style('fill', (d) => getColorForLabel(d.label || 'default'))
    .style('opacity', opacity.value)
    .style('stroke', function(d) {
      const color = d3.color(getColorForLabel(d.label || 'default'));
      return color ? color.darker().toString() : '';
    })
    .style('stroke-width', 1)

  dots
    .transition()
    .duration(800)
    .delay((d, i) => i * 10)
    .attr('r', pointSize.value)

  // Add hover effects
  dots
    .on('mouseover', function (event, d) {
      const circle = d3.select(this)

      circle
        .transition()
        .duration(200)
        .attr('r', pointSize.value * 1.5)
        .style('opacity', 1)
        .style('stroke-width', 2)

      const tooltip = plotGroup
        .append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${x(d.x) + 10},${y(d.y) - 10})`)

      tooltip
        .append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'hsl(var(--popover))')
        .attr('width', 120)
        .attr('height', d.label ? 60 : 40)

      tooltip
        .append('text')
        .attr('x', 10)
        .attr('y', 20)
        .attr('fill', 'hsl(var(--popover-foreground))')
        .text(`X: ${d.x.toFixed(2)}`)

      tooltip
        .append('text')
        .attr('x', 10)
        .attr('y', 40)
        .attr('fill', 'hsl(var(--popover-foreground))')
        .text(`Y: ${d.y.toFixed(2)}`)

      if (d.label) {
        tooltip
          .append('text')
          .attr('x', 10)
          .attr('y', 60)
          .attr('fill', 'hsl(var(--popover-foreground))')
          .text(`${d.label}`)
      }
    })
    .on('mouseout', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', pointSize.value)
        .style('opacity', opacity.value)
        .style('stroke-width', 1)

      plotGroup.selectAll('.tooltip').remove()
    })
    
  // Define zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 20])  // Set min zoom to 1 (current view) and max zoom to 20x
    .extent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      // Store the current zoom transform
      zoomTransform.value = event.transform
      isZoomed.value = event.transform.k > 1
      
      // Apply the transform to the zoomable group
      zoomableGroup.attr('transform', event.transform)
      
      // Update the axes with the new scales
      xAxisGroup.call(d3.axisBottom(event.transform.rescaleX(x)))
      yAxisGroup.call(d3.axisLeft(event.transform.rescaleY(y)))
      
      // Update the grid lines
      xGridGroup.call(
        d3.axisBottom(event.transform.rescaleX(x))
          .tickSize(-height)
          .tickFormat(() => '')
      )
      
      yGridGroup.call(
        d3.axisLeft(event.transform.rescaleY(y))
          .tickSize(-width)
          .tickFormat(() => '')
      )
      
      // Update dot size based on zoom level
      dotsGroup.selectAll('circle')
        .attr('r', pointSize.value / Math.sqrt(event.transform.k))
    })
    
  // Apply zoom behavior to the SVG
  svg.call(zoom as any)
  
  // Restore previous zoom state if available
  if (zoomTransform.value) {
    svg.call(zoom.transform as any, zoomTransform.value)
  }
  
  // Add zoom controls
  const zoomControls = svg.append('g')
    .attr('class', 'zoom-controls')
    .attr('transform', `translate(${width + margin.left - 30}, ${margin.top + 10})`)
  
  // Zoom in button
  zoomControls.append('circle')
    .attr('r', 12)
    .attr('fill', 'hsl(var(--background))')
    .attr('stroke', 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('cx', 0)
    .attr('cy', 0)
    .style('cursor', 'pointer')
    
  zoomControls.append('text')
    .attr('x', 0)
    .attr('y', 4)
    .attr('text-anchor', 'middle')
    .attr('fill', 'hsl(var(--foreground))')
    .style('font-size', '16px')
    .style('cursor', 'pointer')
    .text('+')
    .on('click', () => {
      svg.transition().duration(300).call(zoom.scaleBy as any, 1.5)
    })
  
  // Zoom out button
  zoomControls.append('circle')
    .attr('r', 12)
    .attr('fill', 'hsl(var(--background))')
    .attr('stroke', 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('cx', 0)
    .attr('cy', 30)
    .style('cursor', 'pointer')
    
  zoomControls.append('text')
    .attr('x', 0)
    .attr('y', 34)
    .attr('text-anchor', 'middle')
    .attr('fill', 'hsl(var(--foreground))')
    .style('font-size', '16px')
    .style('cursor', 'pointer')
    .text('−')
    .on('click', () => {
      svg.transition().duration(300).call(zoom.scaleBy as any, 0.75)
    })
  
  // Reset zoom button
  zoomControls.append('circle')
    .attr('r', 12)
    .attr('fill', 'hsl(var(--background))')
    .attr('stroke', 'hsl(var(--border))')
    .attr('stroke-width', 1)
    .attr('cx', 0)
    .attr('cy', 60)
    .style('cursor', 'pointer')
    
  zoomControls.append('text')
    .attr('x', 0)
    .attr('y', 64)
    .attr('text-anchor', 'middle')
    .attr('fill', 'hsl(var(--foreground))')
    .style('font-size', '14px')
    .style('cursor', 'pointer')
    .text('↺')
    .on('click', () => {
      svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity)
      zoomTransform.value = null
      isZoomed.value = false
    })
}

const redrawPlot = () => {
  createScatterPlot(currentData.value)
  
  // Update attributes whenever plot is redrawn - include ALL important settings
  updateAttributes({
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    pointSize: pointSize.value,
    opacity: opacity.value,
    // Always include column selections when updating attributes
    selectedXColumn: selectedXColumn.value,
    selectedYColumn: selectedYColumn.value,
    selectedLabelColumn: selectedLabelColumn.value,
    // Include color mapping to ensure it's saved
    colorMapping: { ...colorMapping.value }
  })
}

// Handle column selection changes
const handleColumnSelectionChange = () => {
  if (rawCsvData.value.length > 0) {
    // Check if we have valid selections
    if (selectedXColumn.value && selectedYColumn.value) {
      
      // Clear color mapping if label column changed
      if (props.node.attrs.selectedLabelColumn !== selectedLabelColumn.value) {
        colorMapping.value = {};
      }
      
      const newData = processCsvWithColumns(
        rawCsvData.value,
        selectedXColumn.value,
        selectedYColumn.value,
        selectedLabelColumn.value
      )
      
      // Update axis labels based on column names
      xAxisLabel.value = selectedXColumn.value
      yAxisLabel.value = selectedYColumn.value
      
      currentData.value = newData
      createScatterPlot(newData)
      
      // Save selections to attributes
      const attrs = {
        selectedXColumn: selectedXColumn.value,
        selectedYColumn: selectedYColumn.value, 
        selectedLabelColumn: selectedLabelColumn.value,
        xAxisLabel: xAxisLabel.value,
        yAxisLabel: yAxisLabel.value,
        colorMapping: { ...colorMapping.value } // Save color mapping with selections
      };
      
      updateAttributes(attrs);
    }
  }
}

// Process CSV data with selected columns
const processCsvWithColumns = (
  data: Array<Record<string, any>>,
  xColumn: string,
  yColumn: string,
  labelColumn?: string
): DataPoint[] => {
  // First check if we should use a label column
  const useLabels = labelColumn && labelColumn !== '';
  
  const processedData = data
    .map(row => {
      // Determine the label value
      let labelValue: string | undefined = undefined;
      if (useLabels) {
        labelValue = String(row[labelColumn]);
        // If the label is empty, use undefined
        if (labelValue === '') {
          labelValue = undefined;
        }
      }
      
      return {
        x: Number(row[xColumn]),
        y: Number(row[yColumn]),
        label: labelValue
      };
    })
    .filter(point => !isNaN(point.x) && !isNaN(point.y) && point.x !== null && point.y !== null);
  
  return processedData;
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
    selectedXColumn: selectedXColumn.value,
    selectedYColumn: selectedYColumn.value,
    selectedLabelColumn: selectedLabelColumn.value,
    colorMapping: { ...colorMapping.value },
    isZoomed: isZoomed.value,
    zoomTransform: zoomTransform.value ? {
      x: zoomTransform.value.x,
      y: zoomTransform.value.y,
      k: zoomTransform.value.k
    } : null
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
  if (state.selectedXColumn) selectedXColumn.value = state.selectedXColumn
  if (state.selectedYColumn) selectedYColumn.value = state.selectedYColumn
  
  // Handle label column explicitly - important to preserve emptiness
  if (state.selectedLabelColumn !== undefined) {
    selectedLabelColumn.value = state.selectedLabelColumn
  }
  
  // Restore color mapping BEFORE drawing the plot
  if (state.colorMapping) {
    colorMapping.value = { ...state.colorMapping }
  }
  
  // Restore zoom state if available
  if (state.zoomTransform) {
    zoomTransform.value = state.zoomTransform
    isZoomed.value = state.isZoomed || false
  }
  
  // Make sure we have the data and redraw the plot
  nextTick(() => {
    // Redraw with proper color assignments
    createScatterPlot(state.data)
  })
}

const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()

  if (isLocked.value) {
    isLocked.value = false
    updateAttributes({
      isLocked: false,
    })
  }
}

const toggleLock = () => {
  isLocked.value = !isLocked.value
  
  if (isLocked.value) {
    // Save the complete plot state when locking
    const plotState = savePlotState()
    
    // Create a snapshot of the current state to persist
    const attrs: Record<string, any> = {
      isLocked: true,
      plotState: plotState,
      colorMapping: { ...colorMapping.value }, // Explicitly save colorMapping at the top level
      selectedXColumn: selectedXColumn.value,
      selectedYColumn: selectedYColumn.value,
      selectedLabelColumn: selectedLabelColumn.value // Explicitly save label column even if empty
    };
    
    // Don't include API URL in locked state
    if (apiUrl.value) {
      // Store but don't display
      attrs.savedApiUrl = apiUrl.value;
      attrs.apiUrl = '';
    }
    
    updateAttributes(attrs);
  } else {
    const attrs: Record<string, any> = {
      isLocked: false
    };
    
    // Don't lose the column selections when unlocking
    attrs.selectedXColumn = selectedXColumn.value
    attrs.selectedYColumn = selectedYColumn.value
    attrs.selectedLabelColumn = selectedLabelColumn.value
    
    // Restore API URL if it was saved
    if (props.node.attrs.savedApiUrl) {
      attrs.apiUrl = props.node.attrs.savedApiUrl;
      attrs.savedApiUrl = '';
    }
    
    updateAttributes(attrs);
  }
}

const handleApiUrlChange = () => {
  // Clear any previous errors
  apiError.value = ''
  // Update the apiUrl attribute, but don't fetch yet
  updateAttributes({ apiUrl: apiUrl.value })
}

const fetchData = async () => {
  if (!apiUrl.value) return
  
  isLoading.value = true
  apiError.value = ''
  
  try {
    const response = await fetch(apiUrl.value)
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }
    
    const data = await response.json()
    
    // Process the data - handle different API response formats
    let plotData: DataPoint[] = []
    
    if (Array.isArray(data)) {
      // Try to extract x, y from array of objects
      if (data.length > 0 && typeof data[0] === 'object') {
        // Try to find appropriate fields for x and y
        const firstItem = data[0]
        const keys = Object.keys(firstItem)
        
        const numericKeys = keys.filter(key => 
          !isNaN(Number(firstItem[key])) && 
          firstItem[key] !== null && 
          firstItem[key] !== ''
        )
        
        const nonNumericKeys = keys.filter(key => !numericKeys.includes(key))
        
        if (numericKeys.length >= 2) {
          plotData = data.map(item => ({
            x: Number(item[numericKeys[0]]),
            y: Number(item[numericKeys[1]]),
            label: nonNumericKeys.length > 0 ? String(item[nonNumericKeys[0]]) : undefined
          })).filter(point => !isNaN(point.x) && !isNaN(point.y))
        }
      }
    }
    
    if (plotData.length === 0) {
      throw new Error('Could not parse data from API response')
    }
    
    currentData.value = plotData
    createScatterPlot(plotData)
    
    // Save the successful API response in the node attributes
    updateAttributes({
      apiData: plotData,
      apiUrl: apiUrl.value
    })
    
  } catch (error) {
    console.error('Error fetching data:', error)
    apiError.value = error instanceof Error ? error.message : 'Failed to fetch data'
    
    // Only use random data if there's no existing data
    if (currentData.value.length === 0) {
      const randomData = generateRandomData()
      currentData.value = randomData
      createScatterPlot(randomData)
    }
  } finally {
    isLoading.value = false
  }
}

const initializePlot = () => {
  // If we have a saved plot state from the locked state, use that
  if (isLocked.value && props.node.attrs.plotState) {
    restorePlotState(props.node.attrs.plotState)
    return
  }
  
  // If we have API data saved in attributes, use that
  if (props.node.attrs.apiData && Array.isArray(props.node.attrs.apiData)) {
    currentData.value = props.node.attrs.apiData
    createScatterPlot(props.node.attrs.apiData)
    return
  }
  
  // If we have saved csv content, parse and use it
  if (props.node.attrs.csvContent) {
    parseCsvData(props.node.attrs.csvContent)
      .then(data => {
        currentData.value = data
        createScatterPlot(data)
        
        // CRITICAL: After creating the plot, make sure all settings are saved
        // This ensures column selections are saved even if they weren't in the attributes
        saveAllSettings();
      })
      .catch(console.error)
    return
  }
  
  // Otherwise generate random data
  const data = generateRandomData()
  currentData.value = data
  createScatterPlot(data)
}

const updateAttributes = (attrs: Record<string, any>) => {
  props.updateAttributes(attrs)
}

const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const analyzeCsvColumns = (rows: Array<Record<string, any>>) => {
  if (!rows.length) return
  
  // Extract column names
  const columns = Object.keys(rows[0] || {})
  availableColumns.value = columns
  
  // Determine which columns have numeric values
  numericColumns.value = columns.filter(col => 
    !isNaN(Number(rows[0][col])) && 
    rows[0][col] !== null && 
    rows[0][col] !== ''
  )

  // Non-numeric columns (potential label columns)
  const nonNumericColumns = columns.filter(col => !numericColumns.value.includes(col))

  // Restore previous selections if available, or set defaults
  
  // For X and Y, prioritize previous selections or use first two numeric columns
  if (numericColumns.value.length >= 2) {
    selectedXColumn.value = props.node.attrs.selectedXColumn || numericColumns.value[0]
    selectedYColumn.value = props.node.attrs.selectedYColumn || numericColumns.value[1]
  }
  
  // CRITICAL: For label column, ONLY set it if it hasn't already been set from props
  // This prevents overriding the value that was explicitly set from props.node.attrs
  if (!selectedLabelColumn.value && selectedLabelColumn.value !== '') {
    // If not already set, prioritize previous selection from attributes
    if (props.node.attrs.selectedLabelColumn !== undefined) {
      selectedLabelColumn.value = props.node.attrs.selectedLabelColumn
    } 
    // Check specifically for a column named 'label'
    else if (columns.includes('label')) {
      selectedLabelColumn.value = 'label';
    }
    else if (nonNumericColumns.length > 0) {
      // Otherwise, default to first non-numeric column
      selectedLabelColumn.value = nonNumericColumns[0]
    } else {
      // If no non-numeric columns available, use empty string (no coloring)
      selectedLabelColumn.value = ''
    }
  }
}

const handleCsvUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    
    // Parse the CSV into raw data
    const parsedCsv = d3.csvParse(text)
    if (!parsedCsv.length) {
      throw new Error('CSV file appears to be empty')
    }
    
    // Store the raw data
    rawCsvData.value = parsedCsv
    
    // Analyze columns and set initial selections
    analyzeCsvColumns(parsedCsv)
    
    // Process the CSV with selected columns
    const csvData = processCsvWithColumns(
      parsedCsv,
      selectedXColumn.value,
      selectedYColumn.value,
      selectedLabelColumn.value
    )
    
    if (csvData.length === 0) {
      throw new Error('No valid data points found in CSV')
    }
    
    // Update axis labels based on column names
    xAxisLabel.value = selectedXColumn.value
    yAxisLabel.value = selectedYColumn.value
    
    currentData.value = csvData
    createScatterPlot(csvData)

    // Save ALL settings including column selections
    saveAllSettings();
    
    // Also save the CSV content
    updateAttributes({
      csvContent: text
    });
    
    // Clear any API url since we're now using CSV data
    apiUrl.value = ''
    updateAttributes({ apiUrl: '' })
    
  } catch (error) {
    console.error('Error parsing CSV:', error)
    apiError.value = error instanceof Error ? error.message : 'Failed to parse CSV file'
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const parseCsvData = async (csvContent: string): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    try {
      const rows = d3.csvParse(csvContent)
      if (!rows.length) {
        throw new Error('CSV file appears to be empty')
      }

      // Store raw data for later use
      rawCsvData.value = rows
      
      // Analyze columns (which will restore column selections)
      analyzeCsvColumns(rows)
      
      // If we have stored column selections, use them
      if (props.node.attrs.selectedXColumn && props.node.attrs.selectedYColumn) {
        // Process with stored column selections
        const data = processCsvWithColumns(
          rows, 
          selectedXColumn.value, 
          selectedYColumn.value, 
          selectedLabelColumn.value
        )
        
        resolve(data)
      } else {
        // Otherwise determine automatically
        // Get column names
        const columns = Object.keys(rows[0] || {})

        // Try to automatically identify x, y, and label columns
        const numericColumns = columns.filter(
          (col) => !isNaN(Number(rows[0][col])) && rows[0][col] !== '',
        )

        // Check specifically for a column named 'label' first
        let labelColumn = columns.includes('label') ? 'label' : undefined;
        
        // If no 'label' column, find the first non-numeric column
        if (!labelColumn) {
          labelColumn = columns.find(
            (col) => !numericColumns.includes(col) && rows.some((row) => row[col] !== ''),
          );
        }

        if (numericColumns.length < 2) {
          throw new Error('Need at least two numeric columns for x and y values')
        }
        
        // Set the column selections explicitly
        if (numericColumns.length >= 2) {
          selectedXColumn.value = numericColumns[0];
          selectedYColumn.value = numericColumns[1];
        }
        
        if (labelColumn) {
          selectedLabelColumn.value = labelColumn;
        }

        const data: DataPoint[] = rows
          .map((row) => ({
            x: Number(row[numericColumns[0]]),
            y: Number(row[numericColumns[1]]),
            label: labelColumn ? row[labelColumn] : undefined,
          }))
          .filter(
            (point) => !isNaN(point.x) && !isNaN(point.y) && point.x !== null && point.y !== null,
          )

        resolve(data)
      }
    } catch (error) {
      reject(error)
    }
  })
}

// Add a function to extract column names from CSV content
const extractColumnsFromCsv = (csvContent: string) => {
  try {
    // Parse the first row to get column names
    const firstRow = csvContent.split('\n')[0];
    if (!firstRow) return null;
    
    const columns = firstRow.split(',');
    
    // Try to determine which columns are numeric and which might be labels
    const rows = d3.csvParse(csvContent);
    if (rows.length === 0) return null;
    
    const numericColumns = columns.filter(col => 
      !isNaN(Number(rows[0][col])) && 
      rows[0][col] !== null && 
      rows[0][col] !== ''
    );
    
    const nonNumericColumns = columns.filter(col => !numericColumns.includes(col));
    
    return {
      all: columns,
      numeric: numericColumns,
      nonNumeric: nonNumericColumns
    };
  } catch (error) {
    console.error('Error extracting columns from CSV:', error);
    return null;
  }
}

// Initialize component with proper defaults
onMounted(() => {
  // CRITICAL: Set the label column from attributes FIRST, before any other initialization
  if (props.node.attrs.selectedLabelColumn !== undefined) {
    selectedLabelColumn.value = props.node.attrs.selectedLabelColumn;
  }
  
  // If we have CSV content but no column selections, try to extract them
  if (props.node.attrs.csvContent && 
      (!props.node.attrs.selectedXColumn || 
       !props.node.attrs.selectedYColumn || 
       selectedLabelColumn.value === '')) {
    const columns = extractColumnsFromCsv(props.node.attrs.csvContent);
    
    if (columns) {
      // Set default columns based on CSV content
      if (columns.numeric.length >= 2 && !props.node.attrs.selectedXColumn) {
        selectedXColumn.value = columns.numeric[0];
      }
      
      if (columns.numeric.length >= 2 && !props.node.attrs.selectedYColumn) {
        selectedYColumn.value = columns.numeric[1];
      }
      
      // Check specifically for a column named 'label' first
      if (columns.all.includes('label') && (selectedLabelColumn.value === '' || selectedLabelColumn.value === undefined)) {
        selectedLabelColumn.value = 'label';
      }
      // Otherwise use the first non-numeric column if available and label isn't set
      else if (columns.nonNumeric.length > 0 && (selectedLabelColumn.value === '' || selectedLabelColumn.value === undefined)) {
        selectedLabelColumn.value = columns.nonNumeric[0];
      }
    }
  }
  
  // Also set X and Y columns if available
  if (props.node.attrs.selectedXColumn) {
    selectedXColumn.value = props.node.attrs.selectedXColumn;
  }
  
  if (props.node.attrs.selectedYColumn) {
    selectedYColumn.value = props.node.attrs.selectedYColumn;
  }
  
  // Then restore the color mapping if available
  if (props.node.attrs.colorMapping && typeof props.node.attrs.colorMapping === 'object') {
    colorMapping.value = { ...props.node.attrs.colorMapping }
  }
  
  // Then initialize the plot (which will use the color mapping)
  initializePlot()
  
  // After initialization, make sure all settings are saved
  // This ensures column selections are saved even if they weren't in the attributes
  nextTick(() => {
    if (selectedXColumn.value && selectedYColumn.value) {
      saveAllSettings();
    }
  });
  
  // Add event listener for closing export menu
  document.addEventListener('click', closeExportMenuOnClickOutside)
})

watch(
  () => props.node.attrs,
  (newAttrs) => {
    // Only update values from attrs if they're defined and we're not already handling them
    if (newAttrs.title !== undefined) plotTitle.value = newAttrs.title
    if (newAttrs.apiUrl !== undefined) apiUrl.value = newAttrs.apiUrl
    if (newAttrs.xAxisLabel !== undefined) xAxisLabel.value = newAttrs.xAxisLabel
    if (newAttrs.yAxisLabel !== undefined) yAxisLabel.value = newAttrs.yAxisLabel
    if (newAttrs.pointSize !== undefined) pointSize.value = newAttrs.pointSize
    if (newAttrs.opacity !== undefined) opacity.value = newAttrs.opacity
    if (newAttrs.isLocked !== undefined) isLocked.value = newAttrs.isLocked
    if (newAttrs.selectedXColumn !== undefined) selectedXColumn.value = newAttrs.selectedXColumn
    if (newAttrs.selectedYColumn !== undefined) selectedYColumn.value = newAttrs.selectedYColumn
    if (newAttrs.selectedLabelColumn !== undefined) selectedLabelColumn.value = newAttrs.selectedLabelColumn
    
    // Restore color mapping from attributes if available
    if (newAttrs.colorMapping && typeof newAttrs.colorMapping === 'object') {
      colorMapping.value = { ...newAttrs.colorMapping }
    }
    
    // Handle plot state restoration if we're locked
    if (isLocked.value && newAttrs.plotState) {
      restorePlotState(newAttrs.plotState)
    }
  },
  { deep: true },
)

// Watch for changes in selected label column to update color mapping
watch(
  () => selectedLabelColumn.value,
  (newValue, oldValue) => {
    if (newValue !== oldValue && rawCsvData.value.length > 0) {
      // Clear the existing color mapping when changing label column
      colorMapping.value = {}
      handleColumnSelectionChange()
    }
  }
)

// Add a function to explicitly save all settings to Tiptap attributes
const saveAllSettings = () => {
  const settings = {
    // Plot appearance
    title: plotTitle.value,
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    pointSize: pointSize.value,
    opacity: opacity.value,
    
    // Column selections
    selectedXColumn: selectedXColumn.value,
    selectedYColumn: selectedYColumn.value,
    selectedLabelColumn: selectedLabelColumn.value,
    
    // Color settings
    colorMapping: { ...colorMapping.value },
    
    // Zoom settings
    isZoomed: isZoomed.value,
    zoomTransform: zoomTransform.value ? {
      x: zoomTransform.value.x,
      y: zoomTransform.value.y,
      k: zoomTransform.value.k
    } : null
  };
  
  updateAttributes(settings);
}

// Reset zoom function
const resetZoom = () => {
  if (!plotContainer.value) return;
  
  // Find the SVG element
  const svg = d3.select(plotContainer.value).select('svg');
  if (!svg.empty()) {
    // Get the zoom behavior
    const zoom = d3.zoom();
    
    // Reset to identity transform (no zoom, no pan)
    svg.transition().duration(500).call(zoom.transform as any, d3.zoomIdentity);
    
    // Reset our state
    zoomTransform.value = null;
    isZoomed.value = false;
    
    // Save the updated state
    saveAllSettings();
  }
}

const showExportMenu = ref(false)
const toggleExportMenu = () => {
  showExportMenu.value = !showExportMenu.value
}

// Add a loading state for export
const isExporting = ref(false)

const exportPlot = (format: 'svg' | 'png' | 'jpeg') => {
  // Close the export menu
  showExportMenu.value = false
  
  if (!plotContainer.value) return
  
  // Set loading state
  isExporting.value = true
  
  try {
    // Get the SVG element from the plot container
    const svgElement = plotContainer.value.querySelector('svg')
    if (!svgElement) {
      console.error('No SVG element found in plot container')
      isExporting.value = false
      return
    }
    
    // Create a clone of the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGElement
    
    // Set the background color for the exported SVG
    svgClone.style.backgroundColor = 'white'
    
    // Find and modify all background rectangles to be white
    const allRects = svgClone.querySelectorAll('rect')
    allRects.forEach(rect => {
      const fill = rect.getAttribute('fill')
      // If this is a background rectangle (using CSS variables or muted color)
      if (fill && (fill.includes('var(--muted)') || fill.includes('hsl('))) {
        rect.setAttribute('fill', 'white')
      }
    })
    
    // Add a white background rectangle as the first element to ensure white background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', svgClone.getAttribute('width') || '700')
    rect.setAttribute('height', svgClone.getAttribute('height') || '450')
    rect.setAttribute('fill', 'white')
    
    // Insert the background rectangle as the first child
    if (svgClone.firstChild) {
      svgClone.insertBefore(rect, svgClone.firstChild)
    } else {
      svgClone.appendChild(rect)
    }
    
    // Make sure all grid lines are visible against white background
    const gridLines = svgClone.querySelectorAll('.grid line')
    gridLines.forEach(line => {
      line.setAttribute('stroke', '#e0e0e0')
      line.setAttribute('stroke-opacity', '1')
    })
    
    // Make sure zero axes are visible in exports
    const zeroAxes = svgClone.querySelectorAll('.zero-axis')
    zeroAxes.forEach(line => {
      line.setAttribute('stroke', '#3b82f6') // Blue color for zero axes
      line.setAttribute('stroke-opacity', '1')
    })
    
    // Add the title as a text element if it exists
    if (plotTitle.value) {
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      titleElement.setAttribute('x', (parseInt(svgClone.getAttribute('width') || '0') / 2).toString())
      titleElement.setAttribute('y', '20')
      titleElement.setAttribute('text-anchor', 'middle')
      titleElement.setAttribute('font-size', '16px')
      titleElement.setAttribute('font-weight', 'bold')
      titleElement.setAttribute('fill', 'black')
      titleElement.textContent = plotTitle.value
      svgClone.appendChild(titleElement)
    }
    
    // Get the SVG as a string
    const svgData = new XMLSerializer().serializeToString(svgClone)
    
    if (format === 'svg') {
      // For SVG export, create a blob and download it
      const blob = new Blob([svgData], { type: 'image/svg+xml' })
      downloadFile(blob, `${plotTitle.value || 'scatter-plot'}.svg`)
      isExporting.value = false
    } else {
      // For PNG and JPEG, we need to convert the SVG to an image
      const canvas = document.createElement('canvas')
      const width = parseInt(svgClone.getAttribute('width') || '700')
      const height = parseInt(svgClone.getAttribute('height') || '450')
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Get canvas context
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Could not get canvas context')
        isExporting.value = false
        return
      }
      
      // Set white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, width, height)
      
      // Create an image from the SVG
      const img = new Image()
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(svgBlob)
      
      img.onload = () => {
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0)
        
        // Convert canvas to the desired format
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
        const quality = format === 'jpeg' ? 0.9 : undefined
        
        // Get the data URL
        const dataUrl = canvas.toDataURL(mimeType, quality)
        
        // Convert data URL to blob
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            // Download the file
            downloadFile(blob, `${plotTitle.value || 'scatter-plot'}.${format}`)
            
            // Clean up
            URL.revokeObjectURL(url)
            isExporting.value = false
          })
          .catch(err => {
            console.error('Error creating blob from data URL:', err)
            isExporting.value = false
          })
      }
      
      img.onerror = () => {
        console.error('Error loading SVG as image')
        URL.revokeObjectURL(url)
        isExporting.value = false
      }
      
      img.src = url
    }
  } catch (error) {
    console.error('Error exporting plot:', error)
    isExporting.value = false
  }
}

// Helper function to download a file
const downloadFile = (blob: Blob, filename: string) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

// Close export menu when clicking outside
const closeExportMenuOnClickOutside = (event: MouseEvent) => {
  if (showExportMenu.value) {
    const target = event.target as HTMLElement
    const dropdown = document.querySelector('.export-dropdown')
    if (dropdown && !dropdown.contains(target)) {
      showExportMenu.value = false
    }
  }
}

// Remove event listener on component unmount
onUnmounted(() => {
  document.removeEventListener('click', closeExportMenuOnClickOutside)
})
</script>

<style scoped>
.scatter-plot-block {
  margin: 1rem 0;
  padding: 1.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
}

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

input[type='range'] {
  width: 100px;
}

.title-input,
.url-input,
.axis-input {
  padding: 0.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  width: 100%;
  font-size: 0.9rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.api-input-container {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.fetch-button {
  flex-shrink: 0;
}

.scatter-plot-title {
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: hsl(var(--foreground));
}

.plot-container-wrapper {
  position: relative;
}

.plot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  cursor: default;
  background: hsl(var(--muted));
  border-radius: 8px;
  padding: 1rem;
  min-height: 450px;
}

.plot-container:hover {
  cursor: pointer;
}

.zoom-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.reset-zoom-btn {
  padding: 2px 6px;
  height: auto;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
}

.axis-labels {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.legend {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  padding: 0.5rem;
  background: hsl(var(--muted));
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: hsl(var(--background));
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
}

.legend-label {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

:deep(.grid line) {
  stroke: hsl(var(--muted-foreground));
  stroke-opacity: 0.2;
}

:deep(.grid path) {
  stroke-width: 0;
}

:deep(.zero-axis) {
  stroke: hsl(var(--primary));
  stroke-width: 1.5;
  stroke-dasharray: 4, 4;
}

:deep(text) {
  fill: hsl(var(--foreground));
}

:deep(.zoom-controls text) {
  user-select: none;
}

:deep(.zoom-controls circle:hover) {
  fill: hsl(var(--muted));
}

input:disabled,
button:disabled,
select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
