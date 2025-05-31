<template>
  <div class="stats-visualization">
    <!-- Overall Metrics -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.accuracy * 100, 1) }}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.errorRate * 100, 1) }}%</div>
          <div class="stat-label">Error Rate</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalSamples }}</div>
          <div class="stat-label">Total Samples</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <div class="stat-value">{{ labels.length }}</div>
          <div class="stat-label">Classes</div>
        </div>
      </div>
    </div>

    <!-- Visualization Tabs -->
    <div class="tabs-container">
      <div class="tabs-header">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- Per-Class Metrics -->
        <div v-if="activeTab === 'class-metrics'" class="tab-panel">
          <div class="metrics-table-container">
            <table class="metrics-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1-Score</th>
                  <th>Specificity</th>
                  <th>Support</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(metric, index) in stats.classMetrics" :key="index">
                  <td class="class-name">{{ metric.className }}</td>
                  <td :class="getMetricClass(metric.precision)">
                    {{ formatNumber(metric.precision, 3) }}
                  </td>
                  <td :class="getMetricClass(metric.recall)">
                    {{ formatNumber(metric.recall, 3) }}
                  </td>
                  <td :class="getMetricClass(metric.f1Score)">
                    {{ formatNumber(metric.f1Score, 3) }}
                  </td>
                  <td :class="getMetricClass(metric.specificity)">
                    {{ formatNumber(metric.specificity, 3) }}
                  </td>
                  <td class="support">{{ metric.support }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="macro-avg">
                  <td><strong>Macro Avg</strong></td>
                  <td>{{ formatNumber(stats.macroAvg.precision, 3) }}</td>
                  <td>{{ formatNumber(stats.macroAvg.recall, 3) }}</td>
                  <td>{{ formatNumber(stats.macroAvg.f1Score, 3) }}</td>
                  <td>{{ formatNumber(stats.macroAvg.specificity, 3) }}</td>
                  <td>{{ stats.totalSamples }}</td>
                </tr>
                <tr class="weighted-avg">
                  <td><strong>Weighted Avg</strong></td>
                  <td>{{ formatNumber(stats.weightedAvg.precision, 3) }}</td>
                  <td>{{ formatNumber(stats.weightedAvg.recall, 3) }}</td>
                  <td>{{ formatNumber(stats.weightedAvg.f1Score, 3) }}</td>
                  <td>{{ formatNumber(stats.weightedAvg.specificity, 3) }}</td>
                  <td>{{ stats.totalSamples }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Charts -->
        <div v-if="activeTab === 'charts'" class="tab-panel">
          <div class="charts-grid">
            <!-- Precision/Recall Chart -->
            <div class="chart-container">
              <h4 class="chart-title">Precision vs Recall by Class</h4>
              <canvas ref="precisionRecallChart" class="chart-canvas"></canvas>
            </div>

            <!-- F1-Score Chart -->
            <div class="chart-container">
              <h4 class="chart-title">F1-Score by Class</h4>
              <canvas ref="f1ScoreChart" class="chart-canvas"></canvas>
            </div>

            <!-- Support Chart -->
            <div class="chart-container">
              <h4 class="chart-title">Support by Class</h4>
              <canvas ref="supportChart" class="chart-canvas"></canvas>
            </div>

            <!-- Metrics Comparison -->
            <div class="chart-container">
              <h4 class="chart-title">Metrics Comparison</h4>
              <canvas ref="metricsChart" class="chart-canvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Detailed Analysis -->
        <div v-if="activeTab === 'analysis'" class="tab-panel">
          <div class="analysis-grid">
            <div class="analysis-card">
              <h4 class="analysis-title">Model Performance</h4>
              <div class="analysis-content">
                <div class="insight">
                  <strong>Overall Assessment:</strong>
                  <span :class="getPerformanceClass(stats.accuracy)">
                    {{ getPerformanceText(stats.accuracy) }}
                  </span>
                </div>
                <div class="insight">
                  <strong>Best Performing Class:</strong>
                  {{ getBestClass.className }} (F1: {{ formatNumber(getBestClass.f1Score, 3) }})
                </div>
                <div class="insight">
                  <strong>Worst Performing Class:</strong>
                  {{ getWorstClass.className }} (F1: {{ formatNumber(getWorstClass.f1Score, 3) }})
                </div>
                <div class="insight">
                  <strong>Class Balance:</strong>
                  {{ getBalanceText() }}
                </div>
              </div>
            </div>

            <div class="analysis-card">
              <h4 class="analysis-title">Recommendations</h4>
              <div class="analysis-content">
                <ul class="recommendations">
                  <li v-for="recommendation in getRecommendations()" :key="recommendation">
                    {{ recommendation }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="analysis-card">
              <h4 class="analysis-title">Error Analysis</h4>
              <div class="analysis-content">
                <div v-for="error in getTopErrors()" :key="error.text" class="error-item">
                  <div class="error-text">{{ error.text }}</div>
                  <div class="error-count">{{ error.count }} cases</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, type ChartConfiguration, registerables } from 'chart.js'
import { formatNumber, type ConfusionMatrixStats } from '../utils/confusionMatrixUtils'

Chart.register(...registerables)

interface Props {
  stats: ConfusionMatrixStats
  labels: string[]
  matrix: number[][]
}

const props = defineProps<Props>()

const activeTab = ref('class-metrics')
const precisionRecallChart = ref<HTMLCanvasElement>()
const f1ScoreChart = ref<HTMLCanvasElement>()
const supportChart = ref<HTMLCanvasElement>()
const metricsChart = ref<HTMLCanvasElement>()

const charts: { [key: string]: Chart | null } = {
  precisionRecall: null,
  f1Score: null,
  support: null,
  metrics: null,
}

const tabs = [
  { id: 'class-metrics', label: 'Class Metrics' },
  { id: 'charts', label: 'Charts' },
  { id: 'analysis', label: 'Analysis' },
]

// Computed properties
const getBestClass = computed(() => {
  return props.stats.classMetrics.reduce((best, current) => 
    current.f1Score > best.f1Score ? current : best
  )
})

const getWorstClass = computed(() => {
  return props.stats.classMetrics.reduce((worst, current) => 
    current.f1Score < worst.f1Score ? current : worst
  )
})

// Methods
function getMetricClass(value: number): string {
  if (value >= 0.8) return 'metric-excellent'
  if (value >= 0.6) return 'metric-good'
  if (value >= 0.4) return 'metric-fair'
  return 'metric-poor'
}

function getPerformanceClass(accuracy: number): string {
  if (accuracy >= 0.9) return 'performance-excellent'
  if (accuracy >= 0.8) return 'performance-good'
  if (accuracy >= 0.7) return 'performance-fair'
  return 'performance-poor'
}

function getPerformanceText(accuracy: number): string {
  if (accuracy >= 0.9) return 'Excellent'
  if (accuracy >= 0.8) return 'Good'
  if (accuracy >= 0.7) return 'Fair'
  return 'Needs Improvement'
}

function getBalanceText(): string {
  const supports = props.stats.classMetrics.map(m => m.support)
  const max = Math.max(...supports)
  const min = Math.min(...supports)
  const ratio = max / min
  
  if (ratio <= 2) return 'Well Balanced'
  if (ratio <= 5) return 'Moderately Imbalanced'
  return 'Highly Imbalanced'
}

function getRecommendations(): string[] {
  const recommendations: string[] = []
  
  if (props.stats.accuracy < 0.8) {
    recommendations.push('Consider collecting more training data or feature engineering')
  }
  
  const imbalanced = props.stats.classMetrics.some(m => m.support < props.stats.totalSamples * 0.1)
  if (imbalanced) {
    recommendations.push('Address class imbalance using oversampling, undersampling, or class weights')
  }
  
  const lowRecall = props.stats.classMetrics.filter(m => m.recall < 0.7)
  if (lowRecall.length > 0) {
    recommendations.push(`Improve recall for: ${lowRecall.map(m => m.className).join(', ')}`)
  }
  
  const lowPrecision = props.stats.classMetrics.filter(m => m.precision < 0.7)
  if (lowPrecision.length > 0) {
    recommendations.push(`Reduce false positives for: ${lowPrecision.map(m => m.className).join(', ')}`)
  }
  
  return recommendations.length > 0 ? recommendations : ['Model performance looks good!']
}

function getTopErrors(): Array<{ text: string; count: number }> {
  const errors: Array<{ text: string; count: number }> = []
  
  for (let i = 0; i < props.matrix.length; i++) {
    for (let j = 0; j < props.matrix[i].length; j++) {
      if (i !== j && props.matrix[i][j] > 0) {
        errors.push({
          text: `${props.labels[i]} misclassified as ${props.labels[j]}`,
          count: props.matrix[i][j]
        })
      }
    }
  }
  
  return errors.sort((a, b) => b.count - a.count).slice(0, 5)
}

function createPrecisionRecallChart() {
  if (!precisionRecallChart.value) return
  
  const config: ChartConfiguration = {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Classes',
        data: props.stats.classMetrics.map((metric, index) => ({
          x: metric.recall,
          y: metric.precision,
          label: props.labels[index]
        })),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Recall' },
          min: 0,
          max: 1
        },
        y: {
          title: { display: true, text: 'Precision' },
          min: 0,
          max: 1
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const point = context.raw as any
              return `${point.label}: (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`
            }
          }
        }
      }
    }
  }
  
  charts.precisionRecall = new Chart(precisionRecallChart.value, config)
}

function createF1ScoreChart() {
  if (!f1ScoreChart.value) return
  
  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        label: 'F1-Score',
        data: props.stats.classMetrics.map(m => m.f1Score),
        backgroundColor: props.stats.classMetrics.map(m => 
          m.f1Score >= 0.8 ? 'rgba(34, 197, 94, 0.8)' :
          m.f1Score >= 0.6 ? 'rgba(251, 191, 36, 0.8)' :
          'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: props.stats.classMetrics.map(m => 
          m.f1Score >= 0.8 ? 'rgba(34, 197, 94, 1)' :
          m.f1Score >= 0.6 ? 'rgba(251, 191, 36, 1)' :
          'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          title: { display: true, text: 'F1-Score' }
        }
      }
    }
  }
  
  charts.f1Score = new Chart(f1ScoreChart.value, config)
}

function createSupportChart() {
  if (!supportChart.value) return
  
  const config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.stats.classMetrics.map(m => m.support),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  }
  
  charts.support = new Chart(supportChart.value, config)
}

function createMetricsChart() {
  if (!metricsChart.value) return
  
  const config: ChartConfiguration = {
    type: 'radar',
    data: {
      labels: props.labels,
      datasets: [
        {
          label: 'Precision',
          data: props.stats.classMetrics.map(m => m.precision),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
        },
        {
          label: 'Recall',
          data: props.stats.classMetrics.map(m => m.recall),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
        },
        {
          label: 'F1-Score',
          data: props.stats.classMetrics.map(m => m.f1Score),
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 1
        }
      }
    }
  }
  
  charts.metrics = new Chart(metricsChart.value, config)
}

function destroyCharts() {
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.destroy()
    }
  })
  Object.keys(charts).forEach(key => {
    charts[key] = null
  })
}

function createCharts() {
  nextTick(() => {
    createPrecisionRecallChart()
    createF1ScoreChart()
    createSupportChart()
    createMetricsChart()
  })
}

// Lifecycle
onMounted(() => {
  if (activeTab.value === 'charts') {
    createCharts()
  }
})

// Watchers
watch(activeTab, (newTab) => {
  if (newTab === 'charts') {
    setTimeout(createCharts, 100)
  }
})

watch(() => props.stats, () => {
  if (activeTab.value === 'charts') {
    destroyCharts()
    setTimeout(createCharts, 100)
  }
})
</script>

<style scoped>
.stats-visualization {
  @apply space-y-6;
}

.stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-card {
  @apply bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3;
}

.stat-card.primary {
  @apply bg-blue-50 border-blue-200;
}

.stat-icon {
  @apply text-2xl;
}

.stat-content {
  @apply flex-1;
}

.stat-value {
  @apply text-xl font-bold text-gray-900;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.tabs-container {
  @apply bg-white rounded-lg border border-gray-200 shadow-sm;
}

.tabs-header {
  @apply flex border-b border-gray-200;
}

.tab-button {
  @apply px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-b-2 border-transparent transition-colors;
}

.tab-button.active {
  @apply text-blue-600 border-blue-600 bg-blue-50;
}

.tab-content {
  @apply p-6;
}

.tab-panel {
  @apply space-y-6;
}

.metrics-table-container {
  @apply overflow-x-auto;
}

.metrics-table {
  @apply w-full text-sm;
}

.metrics-table th {
  @apply px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200 bg-gray-50;
}

.metrics-table td {
  @apply px-4 py-2 border-b border-gray-100;
}

.class-name {
  @apply font-medium text-gray-900;
}

.support {
  @apply text-gray-600;
}

.metric-excellent {
  @apply text-green-700 bg-green-50;
}

.metric-good {
  @apply text-blue-700 bg-blue-50;
}

.metric-fair {
  @apply text-yellow-700 bg-yellow-50;
}

.metric-poor {
  @apply text-red-700 bg-red-50;
}

.macro-avg {
  @apply bg-gray-50 font-medium;
}

.weighted-avg {
  @apply bg-blue-50 font-medium;
}

.charts-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

.chart-container {
  @apply bg-gray-50 p-4 rounded-lg;
}

.chart-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.chart-canvas {
  @apply w-full;
  height: 300px;
}

.analysis-grid {
  @apply grid gap-6;
}

.analysis-card {
  @apply bg-gray-50 p-4 rounded-lg;
}

.analysis-title {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.analysis-content {
  @apply space-y-3;
}

.insight {
  @apply flex flex-col sm:flex-row sm:items-center gap-2;
}

.performance-excellent {
  @apply text-green-700 font-medium;
}

.performance-good {
  @apply text-blue-700 font-medium;
}

.performance-fair {
  @apply text-yellow-700 font-medium;
}

.performance-poor {
  @apply text-red-700 font-medium;
}

.recommendations {
  @apply list-disc list-inside space-y-1 text-gray-700;
}

.error-item {
  @apply flex justify-between items-center p-2 bg-white rounded border border-gray-200;
}

.error-text {
  @apply flex-1 text-gray-700;
}

.error-count {
  @apply text-sm font-medium text-gray-500;
}
</style> 