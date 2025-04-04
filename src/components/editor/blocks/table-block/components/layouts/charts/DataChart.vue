<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Pie, Scatter } from 'vue-chartjs'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  type: 'bar' | 'line' | 'pie' | 'scatter'
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor?: string[]
      borderColor?: string
      borderWidth?: number
      fill?: boolean
      tension?: number
    }[]
  }
}>()

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
}))

const ChartComponent = computed(() => {
  switch (props.type) {
    case 'bar':
      return Bar
    case 'line':
      return Line
    case 'pie':
      return Pie
    case 'scatter':
      return Scatter
    default:
      return Bar
  }
})
</script>

<template>
  <div class="w-full h-full">
    <component
      :is="ChartComponent"
      :data="data"
      :options="chartOptions"
    />
  </div>
</template> 