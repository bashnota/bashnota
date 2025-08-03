<template>
  <Card class="w-full">
    <CardContent class="p-6 space-y-6">
      <!-- Overall Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card class="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <div class="flex items-center justify-center mb-2">
            <Target class="w-8 h-8 text-blue-600" />
          </div>
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ formatNumber(stats.accuracy * 100, 1) }}%</div>
          <div class="text-sm text-blue-600 dark:text-blue-400">Accuracy</div>
        </Card>
        
        <Card class="p-4 text-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <div class="flex items-center justify-center mb-2">
            <XCircle class="w-8 h-8 text-red-600" />
          </div>
          <div class="text-2xl font-bold text-red-700 dark:text-red-300">{{ formatNumber(stats.errorRate * 100, 1) }}%</div>
          <div class="text-sm text-red-600 dark:text-red-400">Error Rate</div>
        </Card>
        
        <Card class="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <div class="flex items-center justify-center mb-2">
            <BarChart class="w-8 h-8 text-green-600" />
          </div>
          <div class="text-2xl font-bold text-green-700 dark:text-green-300">{{ stats.totalSamples }}</div>
          <div class="text-sm text-green-600 dark:text-green-400">Total Samples</div>
        </Card>
        
        <Card class="p-4 text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <div class="flex items-center justify-center mb-2">
            <Tags class="w-8 h-8 text-purple-600" />
          </div>
          <div class="text-2xl font-bold text-purple-700 dark:text-purple-300">{{ labels.length }}</div>
          <div class="text-sm text-purple-600 dark:text-purple-400">Classes</div>
        </Card>
      </div>

      <!-- Visualization Tabs -->
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="class-metrics">
            <TableIcon class="w-4 h-4 mr-1" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="charts">
            <PieChart class="w-4 h-4 mr-1" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Brain class="w-4 h-4 mr-1" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <!-- Per-Class Metrics -->
        <TabsContent value="class-metrics" class="mt-6">
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <TableIcon class="w-5 h-5 text-primary" />
                Per-Class Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b">
                      <th class="text-left p-3 font-medium">Class</th>
                      <th class="text-center p-3 font-medium">Precision</th>
                      <th class="text-center p-3 font-medium">Recall</th>
                      <th class="text-center p-3 font-medium">F1-Score</th>
                      <th class="text-center p-3 font-medium">Specificity</th>
                      <th class="text-center p-3 font-medium">Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(metric, index) in stats.classMetrics" :key="index" class="border-b hover:bg-muted/20">
                      <td class="p-3 font-medium">{{ metric.className }}</td>
                      <td class="p-3 text-center">
                        <Badge :variant="getMetricVariant(metric.precision)" class="text-xs">
                          {{ formatNumber(metric.precision, 3) }}
                        </Badge>
                      </td>
                      <td class="p-3 text-center">
                        <Badge :variant="getMetricVariant(metric.recall)" class="text-xs">
                          {{ formatNumber(metric.recall, 3) }}
                        </Badge>
                      </td>
                      <td class="p-3 text-center">
                        <Badge :variant="getMetricVariant(metric.f1Score)" class="text-xs">
                          {{ formatNumber(metric.f1Score, 3) }}
                        </Badge>
                      </td>
                      <td class="p-3 text-center">
                        <Badge :variant="getMetricVariant(metric.specificity)" class="text-xs">
                          {{ formatNumber(metric.specificity, 3) }}
                        </Badge>
                      </td>
                      <td class="p-3 text-center text-sm">{{ metric.support }}</td>
                    </tr>
                  </tbody>
                  <tfoot class="border-t-2">
                    <tr class="font-semibold">
                      <td class="p-3">Macro Avg</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.macroAvg.precision, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.macroAvg.recall, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.macroAvg.f1Score, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.macroAvg.specificity, 3) }}</td>
                      <td class="p-3 text-center">{{ stats.totalSamples }}</td>
                    </tr>
                    <tr class="font-semibold">
                      <td class="p-3">Weighted Avg</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.weightedAvg.precision, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.weightedAvg.recall, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.weightedAvg.f1Score, 3) }}</td>
                      <td class="p-3 text-center">{{ formatNumber(stats.weightedAvg.specificity, 3) }}</td>
                      <td class="p-3 text-center">{{ stats.totalSamples }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Charts -->
        <TabsContent value="charts" class="mt-6">
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Precision/Recall Chart -->
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Precision vs Recall by Class</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="h-64 relative">
                  <canvas ref="precisionRecallChart" class="w-full h-full"></canvas>
                </div>
              </CardContent>
            </Card>

            <!-- F1-Score Chart -->
            <Card>
              <CardHeader>
                <CardTitle class="text-base">F1-Score by Class</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="h-64 relative">
                  <canvas ref="f1ScoreChart" class="w-full h-full"></canvas>
                </div>
              </CardContent>
            </Card>

            <!-- Support Chart -->
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Support by Class</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="h-64 relative">
                  <canvas ref="supportChart" class="w-full h-full"></canvas>
                </div>
              </CardContent>
            </Card>

            <!-- Metrics Comparison -->
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Metrics Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="h-64 relative">
                  <canvas ref="metricsChart" class="w-full h-full"></canvas>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <!-- Detailed Analysis -->
        <TabsContent value="analysis" class="mt-6">
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <!-- Model Performance -->
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-base">
                  <TrendingUp class="w-4 h-4 text-green-600" />
                  Model Performance
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">Overall Assessment:</span>
                  <Badge :variant="getPerformanceVariant(stats.accuracy)">
                    {{ getPerformanceText(stats.accuracy) }}
                  </Badge>
                </div>
                <div class="text-sm">
                  <span class="font-medium">Best Class:</span>
                  <span class="text-green-600 dark:text-green-400">{{ getBestClass.className }}</span>
                  <span class="text-muted-foreground">(F1: {{ formatNumber(getBestClass.f1Score, 3) }})</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium">Worst Class:</span>
                  <span class="text-red-600 dark:text-red-400">{{ getWorstClass.className }}</span>
                  <span class="text-muted-foreground">(F1: {{ formatNumber(getWorstClass.f1Score, 3) }})</span>
                </div>
                <div class="text-sm">
                  <span class="font-medium">Class Balance:</span>
                  <span class="text-muted-foreground">{{ getBalanceText() }}</span>
                </div>
              </CardContent>
            </Card>

            <!-- Recommendations -->
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-base">
                  <Lightbulb class="w-4 h-4 text-yellow-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul class="space-y-2">
                  <li v-for="recommendation in getRecommendations()" :key="recommendation" class="text-sm flex items-start gap-2">
                    <ArrowRight class="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                    <span>{{ recommendation }}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <!-- Error Analysis -->
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2 text-base">
                  <AlertTriangle class="w-4 h-4 text-orange-600" />
                  Error Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-3">
                  <div v-for="error in getTopErrors()" :key="error.text" class="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span class="text-sm">{{ error.text }}</span>
                    <Badge variant="destructive" class="text-xs">{{ error.count }}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, type ChartConfiguration, registerables } from 'chart.js'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Badge
} from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Target,
  XCircle,
  BarChart,
  Tags,
  TableIcon,
  PieChart,
  Brain,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  AlertTriangle
} from 'lucide-vue-next'
import {
  formatNumber,
  type ConfusionMatrixStats
} from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'

Chart.register(...registerables)

interface Props {
  stats: ConfusionMatrixStats
  labels: string[]
  matrix: number[][]
  colorScheme?: string
}

const props = withDefaults(defineProps<Props>(), {
  colorScheme: 'default'
})

// Reactive state
const activeTab = ref('class-metrics')
const precisionRecallChart = ref<HTMLCanvasElement>()
const f1ScoreChart = ref<HTMLCanvasElement>()
const supportChart = ref<HTMLCanvasElement>()
const metricsChart = ref<HTMLCanvasElement>()

let chartInstances: Chart[] = []

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
function getMetricVariant(value: number): "default" | "secondary" | "destructive" | "outline" {
  if (value >= 0.8) return "default"
  if (value >= 0.6) return "secondary"
  if (value >= 0.4) return "outline"
  return "destructive"
}

function getPerformanceVariant(accuracy: number): "default" | "secondary" | "destructive" | "outline" {
  if (accuracy >= 0.9) return "default"
  if (accuracy >= 0.8) return "secondary"
  if (accuracy >= 0.7) return "outline"
  return "destructive"
}

function getPerformanceText(accuracy: number): string {
  if (accuracy >= 0.9) return 'Excellent'
  if (accuracy >= 0.8) return 'Good'
  if (accuracy >= 0.7) return 'Fair'
  if (accuracy >= 0.6) return 'Poor'
  return 'Very Poor'
}

function getBalanceText(): string {
  const supports = props.stats.classMetrics.map(m => m.support)
  const min = Math.min(...supports)
  const max = Math.max(...supports)
  const ratio = min / max
  
  if (ratio >= 0.8) return 'Well Balanced'
  if (ratio >= 0.5) return 'Moderately Balanced'
  return 'Imbalanced'
}

function getRecommendations(): string[] {
  const recommendations: string[] = []
  
  if (props.stats.accuracy < 0.7) {
    recommendations.push('Consider collecting more training data or trying different algorithms')
  }
  
  if (getBestClass.value.f1Score - getWorstClass.value.f1Score > 0.3) {
    recommendations.push(`Focus on improving performance for ${getWorstClass.value.className} class`)
  }
  
  const supports = props.stats.classMetrics.map(m => m.support)
  const ratio = Math.min(...supports) / Math.max(...supports)
  if (ratio < 0.5) {
    recommendations.push('Address class imbalance with techniques like SMOTE or weighted loss')
  }
  
  if (props.stats.macroAvg.precision < 0.8) {
    recommendations.push('Reduce false positives by adjusting classification thresholds')
  }
  
  if (props.stats.macroAvg.recall < 0.8) {
    recommendations.push('Reduce false negatives by improving feature engineering')
  }
  
  return recommendations.length > 0 ? recommendations : ['Model performance looks good! Consider fine-tuning for optimal results.']
}

function getTopErrors(): Array<{ text: string; count: number }> {
  const errors: Array<{ text: string; count: number }> = []
  
  for (let i = 0; i < props.matrix.length; i++) {
    for (let j = 0; j < props.matrix[i].length; j++) {
      if (i !== j && props.matrix[i][j] > 0) {
        errors.push({
          text: `${props.labels[i]} → ${props.labels[j]}`,
          count: props.matrix[i][j]
        })
      }
    }
  }
  
  return errors.sort((a, b) => b.count - a.count).slice(0, 5)
}

function createCharts() {
  // Destroy existing charts
  chartInstances.forEach(chart => chart.destroy())
  chartInstances = []

  // Chart colors
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 101, 101, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(236, 72, 153, 0.8)'
  ]

  // Precision vs Recall Chart
  if (precisionRecallChart.value) {
    const ctx = precisionRecallChart.value.getContext('2d')
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Classes',
            data: props.stats.classMetrics.map(m => ({
              x: m.recall,
              y: m.precision,
              label: m.className
            })),
            backgroundColor: colors[0],
            borderColor: colors[0].replace('0.8', '1'),
            pointRadius: 6
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
                label: (context: any) => {
                  const point = context.raw
                  return `${point.label}: (${point.x.toFixed(3)}, ${point.y.toFixed(3)})`
                }
              }
            }
          }
        }
      })
      chartInstances.push(chart)
    }
  }

  // F1-Score Chart
  if (f1ScoreChart.value) {
    const ctx = f1ScoreChart.value.getContext('2d')
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: props.stats.classMetrics.map(m => m.className),
          datasets: [{
            label: 'F1-Score',
            data: props.stats.classMetrics.map(m => m.f1Score),
            backgroundColor: colors.slice(0, props.stats.classMetrics.length),
            borderColor: colors.slice(0, props.stats.classMetrics.length).map(c => c.replace('0.8', '1')),
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
      })
      chartInstances.push(chart)
    }
  }

  // Support Chart
  if (supportChart.value) {
    const ctx = supportChart.value.getContext('2d')
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: props.stats.classMetrics.map(m => m.className),
          datasets: [{
            data: props.stats.classMetrics.map(m => m.support),
            backgroundColor: colors.slice(0, props.stats.classMetrics.length),
            borderColor: colors.slice(0, props.stats.classMetrics.length).map(c => c.replace('0.8', '1')),
            borderWidth: 2
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
      })
      chartInstances.push(chart)
    }
  }

  // Metrics Comparison Chart
  if (metricsChart.value) {
    const ctx = metricsChart.value.getContext('2d')
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: props.stats.classMetrics.map(m => m.className),
          datasets: [
            {
              label: 'Precision',
              data: props.stats.classMetrics.map(m => m.precision),
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
            },
            {
              label: 'Recall',
              data: props.stats.classMetrics.map(m => m.recall),
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderColor: 'rgba(16, 185, 129, 1)',
              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(16, 185, 129, 1)'
            },
            {
              label: 'F1-Score',
              data: props.stats.classMetrics.map(m => m.f1Score),
              backgroundColor: 'rgba(245, 101, 101, 0.2)',
              borderColor: 'rgba(245, 101, 101, 1)',
              pointBackgroundColor: 'rgba(245, 101, 101, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(245, 101, 101, 1)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          elements: {
            line: {
              borderWidth: 3
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 1
            }
          }
        }
      })
      chartInstances.push(chart)
    }
  }
}

// Watch for tab changes to create charts
watch(activeTab, (newTab) => {
  if (newTab === 'charts') {
    nextTick(() => {
      createCharts()
    })
  }
})

// Watch for data changes
watch(() => props.stats, () => {
  if (activeTab.value === 'charts') {
    nextTick(() => {
      createCharts()
    })
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  if (activeTab.value === 'charts') {
    nextTick(() => {
      createCharts()
    })
  }
})
</script> 








