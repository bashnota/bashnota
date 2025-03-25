<template>
  <Dialog
    :open="!!task"
    @update:open="open => { if (!open) $emit('update:task', null) }"
  >
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle v-if="task">{{ task.title }}</DialogTitle>
        <DialogDescription v-if="task">
          {{ getActorName(task.actorType) }} - {{ formatDate(task.completedAt) }}
        </DialogDescription>
      </DialogHeader>
      
      <div v-if="task" class="mt-4 space-y-4">
        <!-- Task description -->
        <div>
          <h4 class="text-sm font-medium mb-1">Description:</h4>
          <div class="text-sm bg-muted/30 p-2 rounded">{{ task.description }}</div>
        </div>
        
        <!-- Formatted result based on actor type -->
        <div v-if="task.status === 'completed'">
          <h4 class="text-sm font-medium mb-1">Result:</h4>
          
          <!-- Researcher results -->
          <div v-if="task.actorType === ActorType.RESEARCHER" class="space-y-3">
            <div v-if="getResearchSummary(task)" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Summary</h5>
              <div class="text-sm whitespace-pre-wrap">{{ getResearchSummary(task) }}</div>
            </div>
            
            <div v-if="getResearchKeyFindings(task)?.length" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Key Findings</h5>
              <ul class="list-disc pl-5 text-sm space-y-1">
                <li v-for="(finding, idx) in getResearchKeyFindings(task)" :key="idx">
                  {{ finding }}
                </li>
              </ul>
            </div>
            
            <div v-if="getResearchContent(task)" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Detailed Research</h5>
              
              <!-- Handle structured content with sections -->
              <div v-if="typeof getResearchContent(task) === 'object' && getResearchContent(task).sections" class="space-y-3">
                <div v-for="(section, idx) in getResearchContent(task).sections" :key="idx" class="border-t pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
                  <h6 v-if="section.title" class="text-sm font-semibold mb-1">{{ section.title }}</h6>
                  
                  <!-- Section content could be string or object -->
                  <div v-if="typeof section.content === 'string'" class="text-sm whitespace-pre-wrap">{{ section.content }}</div>
                  
                  <!-- Handle JSON content -->
                  <pre v-else-if="typeof section.content === 'object'" class="text-xs bg-muted p-2 rounded overflow-x-auto">{{ JSON.stringify(section.content, null, 2) }}</pre>
                </div>
              </div>
              
              <!-- Default handling of content as string -->
              <div v-else-if="typeof getResearchContent(task) === 'string'" class="text-sm whitespace-pre-wrap">{{ getResearchContent(task) }}</div>
              
              <!-- JSON fallback -->
              <pre v-else class="text-xs bg-muted p-2 rounded overflow-x-auto">{{ JSON.stringify(getResearchContent(task), null, 2) }}</pre>
            </div>
            
            <div v-if="task.result.references?.length" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">References</h5>
              <ol class="list-decimal pl-5 text-sm space-y-1">
                <li v-for="(ref, idx) in task.result.references" :key="idx">
                  {{ ref }}
                </li>
              </ol>
            </div>
          </div>
          
          <!-- Analyst results -->
          <div v-else-if="task.actorType === ActorType.ANALYST" class="space-y-3">
            <div v-if="getAnalysisSummary(task)" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Summary</h5>
              <div class="text-sm whitespace-pre-wrap">{{ getAnalysisSummary(task) }}</div>
            </div>
            
            <div v-if="getAnalysisInsights(task)?.length" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Insights</h5>
              <ul class="list-disc pl-5 text-sm space-y-1">
                <li v-for="(insight, idx) in getAnalysisInsights(task)" :key="idx">
                  {{ insight }}
                </li>
              </ul>
            </div>
            
            <div v-if="getAnalysisVisualizations(task)?.length" class="space-y-3">
              <h5 class="text-sm font-medium">Visualizations</h5>
              <div v-for="(viz, idx) in getAnalysisVisualizations(task)" :key="idx" 
                class="bg-card border rounded-md p-3"
              >
                <h6 class="text-sm font-medium mb-2">{{ viz.title }}</h6>
                <!-- Handle different visualization types -->
                <div v-if="viz.type === 'mermaid'" class="bg-muted p-3 rounded">
                  <div class="mermaid">{{ viz.data }}</div>
                </div>
                <pre v-else-if="viz.type === 'math'" class="bg-muted p-3 rounded">{{ typeof viz.data === 'object' && viz.data.formula ? viz.data.formula : viz.data }}</pre>
                <div v-else-if="viz.type === 'table'" class="bg-muted p-3 rounded overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-300 text-sm">
                    <thead>
                      <tr>
                        <th v-for="(col, colIdx) in getTableColumns(viz.data)" :key="colIdx" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {{ col }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="(row, rowIdx) in viz.data.rows || viz.data" :key="rowIdx">
                        <td v-for="(col, colIdx) in getTableColumns(viz.data)" :key="colIdx" class="px-3 py-2 whitespace-nowrap">
                          {{ row[col] }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <pre v-else class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ JSON.stringify(viz.data, null, 2) }}</pre>
              </div>
            </div>
          </div>
          
          <!-- Planner results -->
          <div v-else-if="task.actorType === ActorType.PLANNER" class="space-y-3">
            <div v-if="getPlannerMainGoal(task)" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Main Goal</h5>
              <div class="text-sm font-medium">{{ getPlannerMainGoal(task) }}</div>
            </div>
            
            <div v-if="getPlannerTasks(task)?.length" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Planned Tasks</h5>
              <div class="space-y-3">
                <div 
                  v-for="(plannedTask, idx) in getPlannerTasks(task)" 
                  :key="idx"
                  class="border rounded p-3"
                >
                  <div class="flex justify-between">
                    <div class="font-medium text-sm">{{ plannedTask.title }}</div>
                    <Badge>{{ plannedTask.actorType }}</Badge>
                  </div>
                  <div class="text-sm mt-1">{{ plannedTask.description }}</div>
                  
                  <div class="flex gap-2 mt-2">
                    <Badge variant="outline">Priority: {{ plannedTask.priority }}</Badge>
                    <Badge variant="outline">Time: {{ plannedTask.estimatedCompletion }}</Badge>
                  </div>
                  
                  <div v-if="plannedTask.dependencies?.length > 0" class="mt-2 text-xs">
                    <span class="text-muted-foreground">Dependencies:</span> 
                    <span v-for="(dep, depIdx) in plannedTask.dependencies" :key="depIdx" class="ml-1">
                      <Badge variant="secondary" class="text-xs">Task {{ dep }}</Badge>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="getPlanSummary(task)" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Plan Summary</h5>
              <div class="text-sm whitespace-pre-wrap">{{ getPlanSummary(task) }}</div>
            </div>
          </div>
          
          <!-- Coder results -->
          <div v-else-if="task.actorType === ActorType.CODER" class="space-y-3">
            <div class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Generated {{ getCoderLanguage(task) }} Code</h5>
              <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderCode(task) }}</pre>
            </div>
            
            <div v-if="task.result?.execution" class="bg-card border rounded-md p-3">
              <h5 class="text-sm font-medium mb-2">Execution Result</h5>
              <div class="flex items-center mb-2">
                <div 
                  class="mr-2 h-3 w-3 rounded-full" 
                  :class="{
                    'bg-green-500': task.result.execution.success,
                    'bg-red-500': !task.result.execution.success
                  }"
                ></div>
                <span class="text-sm">
                  {{ task.result.execution.success ? 'Success' : 'Failed' }}
                </span>
              </div>
              <pre v-if="task.result.execution.error" class="bg-destructive/10 p-3 mb-2 rounded text-destructive text-sm">{{ task.result.execution.error }}</pre>
              <pre v-if="task.result.execution.output" class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ task.result.execution.output }}</pre>
            </div>
          </div>
          
          <!-- Fallback for other actor types -->
          <div v-else class="bg-card border rounded-md p-3">
            <pre class="whitespace-pre-wrap text-sm">{{ formatTaskResult(task.result) }}</pre>
          </div>
        </div>
        
        <!-- Error display -->
        <div v-if="task.status === 'failed'" class="mt-4">
          <h4 class="text-sm font-medium text-destructive mb-1">Error:</h4>
          <div class="bg-destructive/10 p-3 rounded text-destructive">
            {{ task.error }}
          </div>
          
          <!-- Show code for failed coder tasks that still have code -->
          <div v-if="task.actorType === ActorType.CODER && getCoderCodeFromResult(task)" class="mt-4">
            <h4 class="text-sm font-medium mb-1">Generated Code (Failed):</h4>
            <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderCodeFromResult(task) }}</pre>
            
            <!-- Show execution details if available -->
            <div v-if="getCoderExecutionFromResult(task)" class="mt-3">
              <h4 class="text-sm font-medium mb-1">Execution Error:</h4>
              <pre class="bg-destructive/10 p-3 rounded text-destructive text-sm">{{ getCoderExecutionFromResult(task).error }}</pre>
              
              <div v-if="getCoderExecutionFromResult(task).output" class="mt-2">
                <h4 class="text-sm font-medium mb-1">Execution Output:</h4>
                <pre class="bg-muted p-3 rounded overflow-x-auto text-sm">{{ getCoderExecutionFromResult(task).output }}</pre>
              </div>
            </div>
            
            <!-- Show retry info if available -->
            <div v-if="getCoderRetryInfo(task)" class="mt-3 border-t pt-3">
              <h4 class="text-sm font-medium mb-1">Retry Information:</h4>
              <div class="text-xs text-muted-foreground">
                This task failed after {{ getCoderRetryInfo(task) }} attempts to fix the code.
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          v-if="task && canInsertResult(task)" 
          @click="$emit('insert-result', task)"
        >
          <ClipboardCopy class="h-4 w-4 mr-2" />
          Insert Result
        </Button>
        <Button variant="outline" @click="$emit('update:task', null)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardCopy } from 'lucide-vue-next'
import { ActorType } from '@/types/vibe'

// Props
const props = defineProps({
  task: {
    type: Object,
    default: null
  },
  canInsertResult: {
    type: Function,
    default: () => false
  }
})

// Emits
const emit = defineEmits(['update:task', 'insert-result'])

// Get actor name for display
function getActorName(actorType) {
  switch (actorType) {
    case ActorType.RESEARCHER: return 'Researcher'
    case ActorType.ANALYST: return 'Analyst'
    case ActorType.CODER: return 'Coder'
    case ActorType.PLANNER: return 'Planner'
    case ActorType.COMPOSER: return 'Composer'
    default: return actorType
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Format task result
function formatTaskResult(result) {
  if (typeof result === 'string') {
    return result
  } else if (typeof result === 'object') {
    return JSON.stringify(result, null, 2)
  }
  return 'Result format not recognized'
}

// Research helpers
function getResearchSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

function getResearchKeyFindings(task) {
  if (task.result && typeof task.result === 'object' && task.result.keyFindings) {
    return task.result.keyFindings
  }
  return null
}

function getResearchContent(task) {
  if (task.result && typeof task.result === 'object' && task.result.content) {
    return task.result.content
  }
  return null
}

// Analysis helpers
function getAnalysisSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

function getAnalysisInsights(task) {
  if (task.result && typeof task.result === 'object' && task.result.insights) {
    return task.result.insights
  }
  return null
}

function getAnalysisVisualizations(task) {
  if (task.result && typeof task.result === 'object' && task.result.visualizations) {
    return task.result.visualizations
  }
  return null
}

// Get table columns
function getTableColumns(data) {
  if (!data) return []
  
  // If data has a columns property, use that
  if (data.columns) return data.columns
  
  // If data has explicit headers property, use that
  if (data.headers && Array.isArray(data.headers)) return data.headers
  
  // Make sure we have an array to work with
  let rows = data
  
  // If data has rows property that's an array, use that
  if (data.rows && Array.isArray(data.rows)) {
    rows = data.rows
  }
  
  // If data is not an array yet, try to make it one
  if (!Array.isArray(rows)) {
    // If it's an object (but not an array), make it a single-item array
    if (rows && typeof rows === 'object') {
      rows = [rows]
    } else {
      // Can't extract columns from this data
      return []
    }
  }
  
  // If data is an array of objects, get all unique keys
  if (rows.length > 0) {
    const columns = new Set()
    rows.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => columns.add(key))
      }
    })
    return Array.from(columns)
  }
  
  return []
}

// Planner helpers
function getPlannerMainGoal(task) {
  if (task.result && typeof task.result === 'object' && task.result.plan && task.result.plan.mainGoal) {
    return task.result.plan.mainGoal
  }
  return null
}

function getPlannerTasks(task) {
  if (task.result && typeof task.result === 'object' && task.result.plan && Array.isArray(task.result.plan.tasks)) {
    return task.result.plan.tasks
  }
  return null
}

function getPlanSummary(task) {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

// Coder helpers
function getCoderLanguage(task) {
  if (task.result && typeof task.result === 'object' && task.result.language) {
    return task.result.language
  }
  return 'Code'
}

function getCoderCode(task) {
  if (task.result && typeof task.result === 'object' && task.result.code) {
    return task.result.code
  }
  return null
}

function getCoderCodeFromResult(task) {
  if (task.result && typeof task.result === 'object' && task.result.code) {
    return task.result.code
  }
  return null
}

function getCoderExecutionFromResult(task) {
  if (task.result && typeof task.result === 'object' && task.result.execution) {
    return task.result.execution
  }
  return null
}

function getCoderRetryInfo(task) {
  if (task.result && typeof task.result === 'object' && task.result.retryInfo) {
    return task.result.retryInfo
  }
  return null
}
</script> 