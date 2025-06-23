<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
} from 'lucide-vue-next'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'
import DataChart from './charts/DataChart.vue'
import SelectWrapper from './SelectWrapper.vue'

const props = defineProps<{
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
}>()

// Chart configuration
const chartType = ref<'bar' | 'line' | 'pie' | 'scatter'>('bar')
const xAxisColumn = ref<string>('')
const yAxisColumn = ref<string>('')

// Chart types with their icons
const chartTypes = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart },
  { id: 'line', label: 'Line Chart', icon: LineChart },
  { id: 'pie', label: 'Pie Chart', icon: PieChart },
  { id: 'scatter', label: 'Scatter Plot', icon: ScatterChart },
] as const

// Computed properties for chart data
const numericColumns = computed(() => {
  return props.tableData.columns.filter(col => col.type === 'number')
})

const textColumns = computed(() => {
  return props.tableData.columns.filter(col => col.type === 'text')
})

// Computed properties for axis options based on chart type
const xAxisOptions = computed(() => {
  switch (chartType.value) {
    case 'line':
    case 'scatter':
      // For line and scatter charts, both axes need to be numeric
      return numericColumns.value.map(col => ({ value: col.id, label: col.title }))
    case 'bar':
      // For bar charts, x-axis can be text or numeric
      return [...textColumns.value, ...numericColumns.value].map(col => ({ value: col.id, label: col.title }))
    case 'pie':
      // For pie charts, we don't use x-axis
      return []
    default:
      return []
  }
})

const yAxisOptions = computed(() => {
  switch (chartType.value) {
    case 'line':
    case 'scatter':
      // For line and scatter charts, both axes need to be numeric
      return numericColumns.value.map(col => ({ value: col.id, label: col.title }))
    case 'bar':
      // For bar charts, y-axis must be numeric
      return numericColumns.value.map(col => ({ value: col.id, label: col.title }))
    case 'pie':
      // For pie charts, we only use one numeric column
      return numericColumns.value.map(col => ({ value: col.id, label: col.title }))
    default:
      return []
  }
})

// Reset axis selections when chart type changes
watch(chartType, () => {
  xAxisColumn.value = ''
  yAxisColumn.value = ''
})

// Chart data transformation
const chartData = computed(() => {
  if (!xAxisColumn.value || !yAxisColumn.value) return null

  const xCol = props.tableData.columns.find(col => col.id === xAxisColumn.value)
  const yCol = props.tableData.columns.find(col => col.id === yAxisColumn.value)

  if (!xCol || !yCol) return null

  // Handle different data types based on chart type
  let labels: string[]
  let values: number[]

  switch (chartType.value) {
    case 'line':
    case 'scatter':
      // For line and scatter charts, both axes need to be numeric
      labels = props.tableData.rows.map(row => String(row.cells[xCol.id]))
      values = props.tableData.rows.map(row => Number(row.cells[yCol.id]))
      break
    case 'bar':
      // For bar charts, x-axis can be text or numeric
      labels = props.tableData.rows.map(row => String(row.cells[xCol.id]))
      values = props.tableData.rows.map(row => Number(row.cells[yCol.id]))
      break
    case 'pie':
      // For pie charts, we only use one numeric column
      labels = props.tableData.rows.map(row => String(row.cells[xCol.id]))
      values = props.tableData.rows.map(row => Number(row.cells[yCol.id]))
      break
    default:
      return null
  }

  // For line and bar charts, we need to ensure x-axis values are properly formatted
  const formattedLabels = chartType.value === 'line' || chartType.value === 'bar'
    ? labels.map((label, index) => label || `Item ${index + 1}`)
    : labels

  return {
    labels: formattedLabels,
    datasets: [
      {
        label: yCol.title,
        data: values,
        backgroundColor: chartType.value === 'pie' ? [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ] : undefined,
        borderColor: chartType.value !== 'pie' ? '#36A2EB' : undefined,
        borderWidth: chartType.value !== 'pie' ? 2 : undefined,
        tension: chartType.value === 'line' ? 0.4 : undefined,
        fill: chartType.value === 'line',
      },
    ],
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Chart Configuration -->
    <Card>
      <CardHeader>
        <CardTitle>Chart Configuration</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Chart Type Selection -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Chart Type</label>
          <SelectWrapper
            v-model="chartType"
            :options="chartTypes.map(type => ({ value: type.id, label: type.label }))"
            placeholder="Select chart type"
          >
            <template #trigger>
              <div class="flex items-center gap-2">
                <component :is="chartTypes.find(t => t.id === chartType)?.icon" class="w-4 h-4" />
                {{ chartTypes.find(t => t.id === chartType)?.label }}
              </div>
            </template>
          </SelectWrapper>
        </div>

        <!-- Axis Selection -->
        <div class="grid grid-cols-2 gap-4">
          <!-- X Axis -->
          <div class="space-y-2">
            <label class="text-sm font-medium" for="x-axis-select">X Axis</label>
            <SelectWrapper
              v-if="chartType !== 'pie'"
              id="x-axis-select"
              v-model="xAxisColumn"
              :options="xAxisOptions"
              placeholder="Select X axis"
            />
            <div v-else class="text-sm text-muted-foreground">
              X axis not used for pie charts
            </div>
            <div v-if="xAxisOptions.length === 0 && chartType !== 'pie'" class="text-sm text-muted-foreground">
              No suitable columns available for X axis
            </div>
          </div>

          <!-- Y Axis -->
          <div class="space-y-2">
            <label class="text-sm font-medium" for="y-axis-select">Y Axis</label>
            <SelectWrapper
              id="y-axis-select"
              v-model="yAxisColumn"
              :options="yAxisOptions"
              placeholder="Select Y axis"
            />
            <div v-if="yAxisOptions.length === 0" class="text-sm text-muted-foreground">
              No numeric columns available for Y axis
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Chart Display -->
    <Card>
      <CardHeader>
        <CardTitle>Chart Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="!chartData" class="h-[400px] flex items-center justify-center text-muted-foreground">
          Select X and Y axes to display the chart
        </div>
        <div v-else class="h-[400px]">
          <DataChart
            :type="chartType"
            :data="chartData"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template> 