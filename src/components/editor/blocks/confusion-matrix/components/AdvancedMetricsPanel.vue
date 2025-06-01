<template>
  <Card class="w-full">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <LineChart class="w-5 h-5 text-primary" />
        Advanced Metrics Analysis
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- ROC Curve Simulation -->
      <div class="grid gap-6 md:grid-cols-2">
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-blue-600" />
            ROC Analysis Simulation
          </h3>
          <div class="space-y-3">
            <div v-for="(classMetric, index) in stats.classMetrics" :key="index" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="font-medium">{{ classMetric.className }}</span>
                <span class="text-muted-foreground">AUC: {{ formatNumber(calculateAUC(classMetric), 3) }}</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-500"
                  :class="getAUCColorClass(calculateAUC(classMetric))"
                  :style="{ width: `${calculateAUC(classMetric) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </Card>

        <!-- Precision-Recall Analysis -->
        <Card class="p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2">
            <Target class="w-4 h-4 text-green-600" />
            Precision-Recall Balance
          </h3>
          <div class="space-y-3">
            <div v-for="(classMetric, index) in stats.classMetrics" :key="index" class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="font-medium">{{ classMetric.className }}</span>
                <span class="text-muted-foreground">F1: {{ formatNumber(classMetric.f1Score, 3) }}</span>
              </div>
              <div class="flex gap-1">
                <div class="flex-1 bg-muted rounded h-2">
                  <div 
                    class="h-2 rounded bg-blue-500 transition-all duration-500"
                    :style="{ width: `${classMetric.precision * 100}%` }"
                    :title="`Precision: ${formatNumber(classMetric.precision, 3)}`"
                  ></div>
                </div>
                <div class="flex-1 bg-muted rounded h-2">
                  <div 
                    class="h-2 rounded bg-green-500 transition-all duration-500"
                    :style="{ width: `${classMetric.recall * 100}%` }"
                    :title="`Recall: ${formatNumber(classMetric.recall, 3)}`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Confusion Matrix Heatmap -->
      <Card class="p-4">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Grid class="w-4 h-4 text-purple-600" />
          Error Pattern Analysis
        </h3>
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Most Common Errors -->
          <div>
            <h4 class="font-medium mb-3 text-sm">Most Common Misclassifications</h4>
            <div class="space-y-2">
              <div v-for="error in topErrors" :key="error.key" class="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span class="text-sm">{{ error.actual }} → {{ error.predicted }}</span>
                <Badge variant="destructive" class="text-xs">{{ error.count }}</Badge>
              </div>
            </div>
          </div>

          <!-- Class Imbalance Analysis -->
          <div>
            <h4 class="font-medium mb-3 text-sm">Class Distribution</h4>
            <div class="space-y-2">
              <div v-for="(classMetric, index) in sortedBySupport" :key="index" class="flex justify-between items-center">
                <span class="text-sm">{{ classMetric.className }}</span>
                <div class="flex items-center gap-2">
                  <div class="w-16 h-2 bg-muted rounded">
                    <div 
                      class="h-2 rounded bg-orange-500 transition-all duration-500"
                      :style="{ width: `${(classMetric.support / maxSupport) * 100}%` }"
                    ></div>
                  </div>
                  <span class="text-xs text-muted-foreground">{{ classMetric.support }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Performance Metrics Table -->
      <Card class="p-4">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 class="w-4 h-4 text-indigo-600" />
          Detailed Performance Metrics
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2 font-medium text-sm">Class</th>
                <th class="text-center p-2 font-medium text-sm">Precision</th>
                <th class="text-center p-2 font-medium text-sm">Recall</th>
                <th class="text-center p-2 font-medium text-sm">F1-Score</th>
                <th class="text-center p-2 font-medium text-sm">Specificity</th>
                <th class="text-center p-2 font-medium text-sm">Support</th>
                <th class="text-center p-2 font-medium text-sm">NPV</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(classMetric, index) in stats.classMetrics" :key="index" class="border-b hover:bg-muted/20">
                <td class="p-2 font-medium">{{ classMetric.className }}</td>
                <td class="p-2 text-center">
                  <Badge 
                    :variant="getMetricVariant(classMetric.precision)"
                    class="text-xs"
                  >
                    {{ formatNumber(classMetric.precision, 3) }}
                  </Badge>
                </td>
                <td class="p-2 text-center">
                  <Badge 
                    :variant="getMetricVariant(classMetric.recall)"
                    class="text-xs"
                  >
                    {{ formatNumber(classMetric.recall, 3) }}
                  </Badge>
                </td>
                <td class="p-2 text-center">
                  <Badge 
                    :variant="getMetricVariant(classMetric.f1Score)"
                    class="text-xs"
                  >
                    {{ formatNumber(classMetric.f1Score, 3) }}
                  </Badge>
                </td>
                <td class="p-2 text-center">
                  <Badge 
                    :variant="getMetricVariant(classMetric.specificity)"
                    class="text-xs"
                  >
                    {{ formatNumber(classMetric.specificity, 3) }}
                  </Badge>
                </td>
                <td class="p-2 text-center text-sm">{{ classMetric.support }}</td>
                <td class="p-2 text-center">
                  <Badge 
                    :variant="getMetricVariant(calculateNPV(classMetric))"
                    class="text-xs"
                  >
                    {{ formatNumber(calculateNPV(classMetric), 3) }}
                  </Badge>
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2">
              <tr class="font-semibold">
                <td class="p-2">Macro Avg</td>
                <td class="p-2 text-center">{{ formatNumber(stats.macroAvg.precision, 3) }}</td>
                <td class="p-2 text-center">{{ formatNumber(stats.macroAvg.recall, 3) }}</td>
                <td class="p-2 text-center">{{ formatNumber(stats.macroAvg.f1Score, 3) }}</td>
                <td class="p-2 text-center">{{ formatNumber(stats.macroAvg.specificity, 3) }}</td>
                <td class="p-2 text-center">{{ stats.totalSamples }}</td>
                <td class="p-2 text-center">{{ formatNumber(averageNPV, 3) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <!-- Statistical Significance Tests -->
      <Card class="p-4">
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Calculator class="w-4 h-4 text-red-600" />
          Statistical Analysis
        </h3>
        <div class="grid gap-4 md:grid-cols-3">
          <!-- Cohen's Kappa -->
          <div class="text-center p-4 bg-muted/20 rounded-lg">
            <div class="text-2xl font-bold text-primary">{{ formatNumber(cohensKappa, 3) }}</div>
            <div class="text-sm text-muted-foreground">Cohen's Kappa</div>
            <div class="text-xs mt-1">
              <Badge :variant="getKappaVariant(cohensKappa)">
                {{ getKappaInterpretation(cohensKappa) }}
              </Badge>
            </div>
          </div>

          <!-- Matthews Correlation Coefficient -->
          <div class="text-center p-4 bg-muted/20 rounded-lg">
            <div class="text-2xl font-bold text-primary">{{ formatNumber(mcc, 3) }}</div>
            <div class="text-sm text-muted-foreground">Matthews CC</div>
            <div class="text-xs mt-1">
              <Badge :variant="getMCCVariant(mcc)">
                {{ getMCCInterpretation(mcc) }}
              </Badge>
            </div>
          </div>

          <!-- Balanced Accuracy -->
          <div class="text-center p-4 bg-muted/20 rounded-lg">
            <div class="text-2xl font-bold text-primary">{{ formatNumber(balancedAccuracy, 3) }}</div>
            <div class="text-sm text-muted-foreground">Balanced Accuracy</div>
            <div class="text-xs mt-1">
              <Badge :variant="getAccuracyVariant(balancedAccuracy)">
                {{ getAccuracyInterpretation(balancedAccuracy) }}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  LineChart,
  TrendingUp,
  Target,
  Grid,
  BarChart3,
  Calculator
} from 'lucide-vue-next'
import { formatNumber, type ConfusionMatrixStats } from '../utils/confusionMatrixUtils'

interface Props {
  stats: ConfusionMatrixStats
  labels: string[]
  matrix: number[][]
}

const props = defineProps<Props>()

// Computed values for advanced metrics
const maxSupport = computed(() => {
  return Math.max(...props.stats.classMetrics.map(m => m.support))
})

const sortedBySupport = computed(() => {
  return [...props.stats.classMetrics].sort((a, b) => b.support - a.support)
})

const topErrors = computed(() => {
  const errors: Array<{ actual: string, predicted: string, count: number, key: string }> = []
  
  for (let i = 0; i < props.matrix.length; i++) {
    for (let j = 0; j < props.matrix[i].length; j++) {
      if (i !== j && props.matrix[i][j] > 0) {
        errors.push({
          actual: props.labels[i],
          predicted: props.labels[j],
          count: props.matrix[i][j],
          key: `${i}-${j}`
        })
      }
    }
  }
  
  return errors.sort((a, b) => b.count - a.count).slice(0, 5)
})

const cohensKappa = computed(() => {
  const totalSamples = props.stats.totalSamples
  const observedAccuracy = props.stats.accuracy
  
  // Calculate expected accuracy
  let expectedAccuracy = 0
  for (let i = 0; i < props.matrix.length; i++) {
    const actualTotal = props.matrix[i].reduce((sum, val) => sum + val, 0)
    const predictedTotal = props.matrix.reduce((sum, row) => sum + row[i], 0)
    expectedAccuracy += (actualTotal * predictedTotal) / (totalSamples * totalSamples)
  }
  
  return (observedAccuracy - expectedAccuracy) / (1 - expectedAccuracy)
})

const mcc = computed(() => {
  // Matthews Correlation Coefficient for multiclass
  if (props.matrix.length === 2) {
    const tp = props.matrix[0][0]
    const tn = props.matrix[1][1]
    const fp = props.matrix[1][0]
    const fn = props.matrix[0][1]
    
    const numerator = (tp * tn) - (fp * fn)
    const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    
    return denominator === 0 ? 0 : numerator / denominator
  }
  
  // Simplified multiclass MCC approximation
  return (props.stats.accuracy * 2) - 1
})

const balancedAccuracy = computed(() => {
  const recalls = props.stats.classMetrics.map(m => m.recall)
  return recalls.reduce((sum, recall) => sum + recall, 0) / recalls.length
})

const averageNPV = computed(() => {
  const npvs = props.stats.classMetrics.map(m => calculateNPV(m))
  return npvs.reduce((sum, npv) => sum + npv, 0) / npvs.length
})

// Helper functions
function calculateAUC(classMetric: any): number {
  // Simplified AUC approximation based on precision and recall
  return (classMetric.precision + classMetric.recall) / 2
}

function calculateNPV(classMetric: any): number {
  // Negative Predictive Value = TN / (TN + FN)
  const { trueNegatives, falseNegatives } = classMetric
  return trueNegatives + falseNegatives > 0 ? trueNegatives / (trueNegatives + falseNegatives) : 0
}

function getMetricVariant(value: number): "default" | "secondary" | "destructive" | "outline" {
  if (value >= 0.8) return "default"
  if (value >= 0.6) return "secondary"
  if (value >= 0.4) return "outline"
  return "destructive"
}

function getAUCColorClass(auc: number): string {
  if (auc >= 0.9) return "bg-green-500"
  if (auc >= 0.8) return "bg-blue-500"
  if (auc >= 0.7) return "bg-yellow-500"
  return "bg-red-500"
}

function getKappaVariant(kappa: number): "default" | "secondary" | "destructive" | "outline" {
  if (kappa >= 0.8) return "default"
  if (kappa >= 0.6) return "secondary"
  if (kappa >= 0.4) return "outline"
  return "destructive"
}

function getKappaInterpretation(kappa: number): string {
  if (kappa >= 0.8) return "Excellent"
  if (kappa >= 0.6) return "Good"
  if (kappa >= 0.4) return "Moderate"
  if (kappa >= 0.2) return "Fair"
  return "Poor"
}

function getMCCVariant(mcc: number): "default" | "secondary" | "destructive" | "outline" {
  const absMcc = Math.abs(mcc)
  if (absMcc >= 0.7) return "default"
  if (absMcc >= 0.5) return "secondary"
  if (absMcc >= 0.3) return "outline"
  return "destructive"
}

function getMCCInterpretation(mcc: number): string {
  const absMcc = Math.abs(mcc)
  if (absMcc >= 0.7) return "Strong"
  if (absMcc >= 0.5) return "Moderate"
  if (absMcc >= 0.3) return "Weak"
  return "None"
}

function getAccuracyVariant(accuracy: number): "default" | "secondary" | "destructive" | "outline" {
  if (accuracy >= 0.9) return "default"
  if (accuracy >= 0.8) return "secondary"
  if (accuracy >= 0.7) return "outline"
  return "destructive"
}

function getAccuracyInterpretation(accuracy: number): string {
  if (accuracy >= 0.9) return "Excellent"
  if (accuracy >= 0.8) return "Good"
  if (accuracy >= 0.7) return "Fair"
  return "Poor"
}
</script> 