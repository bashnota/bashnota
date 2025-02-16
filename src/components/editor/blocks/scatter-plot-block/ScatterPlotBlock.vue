<template>
  <node-view-wrapper class="scatter-plot-block">
    <div class="scatter-plot-controls" v-if="editor.isEditable && !isLocked">
      <div class="control-group">
        <input
          v-model="plotTitle"
          placeholder="Enter plot title"
          @change="updateAttributes({ title: plotTitle })"
          class="title-input"
          :disabled="isLocked"
        />
        <input
          v-model="apiUrl"
          placeholder="Enter API URL (optional)"
          @change="fetchAndUpdateData"
          class="url-input"
          :disabled="isLocked"
        />
        <div class="flex gap-2">
          <Tooltip content="Upload CSV">
            <Button variant="ghost" size="icon" @click="triggerFileInput" class="ml-auto">
              <PlusIcon class="h-4 w-4" />
            </Button>
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
      <div class="control-group">
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
    <div ref="plotContainer" class="plot-container" @dblclick="handleDoubleClick"></div>
    <div v-if="uniqueLabels.length > 0" class="legend">
      <div v-for="label in uniqueLabels" :key="label" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: colorScale(label) }"></span>
        <span class="legend-label">{{ label }}</span>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import * as d3 from 'd3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { LockIcon, UnlockIcon, PlusIcon } from 'lucide-vue-next'

const props = defineProps<NodeViewProps>()
const plotContainer = ref<HTMLElement | null>(null)
const plotTitle = ref(props.node.attrs.title || 'Scatter Plot')
const apiUrl = ref(props.node.attrs.apiUrl || '')
const pointSize = ref(5)
const opacity = ref(0.7)
const xAxisLabel = ref('X Axis')
const yAxisLabel = ref('Y Axis')

interface DataPoint {
  x: number
  y: number
  label?: string
}

const currentData = ref<DataPoint[]>([])
const uniqueLabels = computed(() => {
  const labels = new Set(currentData.value.map((d) => d.label || 'default'))
  return Array.from(labels)
})

const colorScale = (label: string) => {
  const colors = d3.schemeSet2
  const labelIndex = uniqueLabels.value.indexOf(label)
  return colors[labelIndex % colors.length]
}

const generateRandomData = (n: number = 50): DataPoint[] => {
  const labels = ['Group A', 'Group B', 'Group C']
  return Array.from({ length: n }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    label: labels[Math.floor(Math.random() * labels.length)],
  }))
}

const createScatterPlot = (data: DataPoint[]) => {
  if (!plotContainer.value) return

  currentData.value = data

  // Clear previous plot
  d3.select(plotContainer.value).selectAll('*').remove()

  const margin = { top: 40, right: 40, bottom: 60, left: 60 }
  const width = 700 - margin.left - margin.right
  const height = 450 - margin.top - margin.bottom

  const svg = d3
    .select(plotContainer.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Add background
  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'hsl(var(--muted))')
    .attr('rx', 8)

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.x) || 100])
    .range([0, width])
    .nice()

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.y) || 100])
    .range([height, 0])
    .nice()

  // Add grid lines
  svg
    .append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    // @ts-ignore
    .call(d3.axisBottom(x).tickSize(-height).tickFormat(''))

  // @ts-ignore
  svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).tickSize(-width).tickFormat(''))

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .call((g) =>
      g
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'middle')
        .text(xAxisLabel.value),
    )

  // Add Y axis
  svg
    .append('g')
    .call(d3.axisLeft(y))
    .call((g) =>
      g
        .append('text')
        .attr('x', -height / 2)
        .attr('y', -40)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text(yAxisLabel.value),
    )

  // Add dots with transition
  const dots = svg
    .append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d) => x(d.x))
    .attr('cy', (d) => y(d.y))
    .attr('r', 0)
    .style('fill', (d) => colorScale(d.label || 'default'))
    .style('opacity', opacity.value)
    // @ts-ignore
    .style('stroke', (d) =>
      d3
        .color(colorScale(d.label || 'default'))
        ?.darker()
        .toString(),
    )
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

      const tooltip = svg
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

      svg.selectAll('.tooltip').remove()
    })
}

const redrawPlot = () => {
  createScatterPlot(currentData.value)
}

const isLocked = ref(props.node.attrs.isLocked || false)
const savedData = ref<DataPoint[]>([])

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
    // Save current data when locking
    savedData.value = [...currentData.value]
  }
  updateAttributes({
    isLocked: isLocked.value,
    savedData: isLocked.value ? savedData.value : undefined,
  })
}

const fetchAndUpdateData = async () => {
  // If locked, use saved data
  if (isLocked.value && savedData.value.length > 0) {
    createScatterPlot(savedData.value)
    return
  }

  let data: DataPoint[]

  if (apiUrl.value) {
    try {
      const response = await fetch(apiUrl.value)
      data = await response.json()
    } catch (error) {
      console.error('Error fetching data:', error)
      data = generateRandomData()
    }
  } else {
    data = generateRandomData()
  }

  createScatterPlot(data)
  updateAttributes({
    apiUrl: apiUrl.value,
    xAxisLabel: xAxisLabel.value,
    yAxisLabel: yAxisLabel.value,
    savedData: isLocked.value ? data : undefined,
  })
}

const updateAttributes = (attrs: Record<string, any>) => {
  props.updateAttributes(attrs)
}

const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleCsvUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const csvData = await parseCsvData(text)
    createScatterPlot(csvData)

    // Save the data if successful
    currentData.value = csvData
    updateAttributes({
      savedData: isLocked.value ? csvData : undefined,
      csvContent: text, // Store the original CSV content
    })
  } catch (error) {
    console.error('Error parsing CSV:', error)
    // You might want to show an error message to the user here
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

      // Get column names
      const columns = Object.keys(rows[0] || {})

      // Try to automatically identify x, y, and label columns
      const numericColumns = columns.filter(
        (col) => !isNaN(Number(rows[0][col])) && rows[0][col] !== '',
      )

      const labelColumn = columns.find(
        (col) => !numericColumns.includes(col) && rows.some((row) => row[col] !== ''),
      )

      if (numericColumns.length < 2) {
        throw new Error('Need at least two numeric columns for x and y values')
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
    } catch (error) {
      reject(error)
    }
  })
}

onMounted(() => {
  fetchAndUpdateData()
})

watch(
  () => props.node.attrs,
  (newAttrs) => {
    plotTitle.value = newAttrs.title
    apiUrl.value = newAttrs.apiUrl
    xAxisLabel.value = newAttrs.xAxisLabel || 'X Axis'
    yAxisLabel.value = newAttrs.yAxisLabel || 'Y Axis'
    isLocked.value = newAttrs.isLocked || false
    if (newAttrs.savedData) {
      savedData.value = newAttrs.savedData
    }
    if (newAttrs.csvContent && currentData.value.length === 0) {
      parseCsvData(newAttrs.csvContent)
        .then((data) => {
          currentData.value = data
          createScatterPlot(data)
        })
        .catch(console.error)
    }
  },
  { deep: true },
)
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

.control-group {
  display: flex;
  gap: 1rem;
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

.scatter-plot-title {
  text-align: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  color: hsl(var(--foreground));
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
}

.plot-container:hover {
  cursor: pointer;
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

:deep(text) {
  fill: hsl(var(--foreground));
}

input:disabled,
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scatter-plot-controls {
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}

.scatter-plot-controls.locked {
  opacity: 0.5;
  pointer-events: none;
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
</style>
