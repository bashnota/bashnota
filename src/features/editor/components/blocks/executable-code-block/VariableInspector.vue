<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Eye, EyeOff, RefreshCw, Search, Filter, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import { logger } from '@/services/logger'

export interface Variable {
  name: string
  type: string
  value: any
  size?: string
  shape?: string
  dtype?: string
  isPrivate?: boolean
  isFunction?: boolean
  isClass?: boolean
  module?: string
}

const props = defineProps<{
  sessionId: string
  isVisible: boolean
  isExecuting?: boolean
}>()

const emit = defineEmits<{
  'variable-selected': [variable: Variable]
  'update:isVisible': [value: boolean]
}>()

// Initialize stores and services
const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const jupyterService = new JupyterService()

// Reactive state

// State
const variables = ref<Variable[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedFilter = ref<'all' | 'data' | 'functions' | 'classes'>('all')
const expandedVariables = ref<Set<string>>(new Set())
const refreshInterval = ref<number | null>(null)
const autoRefresh = ref(false)

// Computed
const filteredVariables = computed(() => {
  let filtered = variables.value

  // Apply type filter
  if (selectedFilter.value !== 'all') {
    filtered = filtered.filter(variable => {
      switch (selectedFilter.value) {
        case 'data':
          return !variable.isFunction && !variable.isClass
        case 'functions':
          return variable.isFunction
        case 'classes':
          return variable.isClass
        default:
          return true
      }
    })
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(variable =>
      variable.name.toLowerCase().includes(query) ||
      variable.type.toLowerCase().includes(query)
    )
  }

  // Sort by name
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

const variableStats = computed(() => {
  const stats = {
    total: variables.value.length,
    data: 0,
    functions: 0,
    classes: 0,
    private: 0
  }

  variables.value.forEach(variable => {
    if (variable.isFunction) stats.functions++
    else if (variable.isClass) stats.classes++
    else stats.data++
    
    if (variable.isPrivate) stats.private++
  })

  return stats
})

// Methods
const refreshVariables = async () => {
  if (!props.sessionId) {
    logger.warn('No session ID provided for variable inspection')
    return
  }

  isLoading.value = true
  try {
    // Get the session from the code execution store
    const session = codeExecutionStore.kernelSessions.get(props.sessionId)
    if (!session) {
      logger.warn('Session not found:', props.sessionId)
      variables.value = []
      return
    }

    // Get server configuration from session
    const server = session.serverConfig
    if (!server) {
      logger.warn('No server configuration found for session')
      variables.value = []
      return
    }

    // Execute code to get variable information
    const inspectionCode = `
import sys
import json
import types

def get_variable_info():
    variables = []
    namespace = globals()
    
    for name, obj in namespace.items():
        if name.startswith('_'):
            continue
            
        try:
            var_type = type(obj).__name__
            var_size = sys.getsizeof(obj)
            
            # Determine if it's a function or class
            is_function = callable(obj) and not isinstance(obj, type)
            is_class = isinstance(obj, type)
            
            # Get shape for arrays/dataframes
            shape = None
            if hasattr(obj, 'shape'):
                shape = str(obj.shape)
            elif hasattr(obj, '__len__') and not isinstance(obj, (str, bytes)):
                try:
                    shape = f"({len(obj)},)"
                except:
                    pass
            
            # Get value representation
            if var_size > 1000:  # Large objects
                value = f"<{var_type} object>"
            else:
                try:
                    value = str(obj)[:100]  # Truncate long values
                    if len(str(obj)) > 100:
                        value += "..."
                except:
                    value = f"<{var_type} object>"
            
            variables.append({
                "name": name,
                "type": var_type,
                "value": value,
                "size": f"{var_size / 1024:.1f} KB" if var_size > 1024 else f"{var_size} bytes",
                "shape": shape,
                "isFunction": is_function,
                "isClass": is_class
            })
        except Exception as e:
            continue
    
    return json.dumps(variables)

print(get_variable_info())
`

    // Execute the inspection code via Jupyter service
    const result = await jupyterService.executeCode(server, inspectionCode, session.kernelId)
    
    if (result && result.content) {
      try {
        // Get the output from stdout or text/plain data
        let output = ''
        if (result.content.stdout) {
          output = result.content.stdout
        } else if (result.content.data?.['text/plain']) {
          output = result.content.data['text/plain']
        }
        
        if (output) {
          const lastLine = output.trim().split('\\n').pop() || '{}'
          const variableData = JSON.parse(lastLine)
          
          // Transform the data to match our Variable interface
          variables.value = variableData.map((v: any) => ({
            name: v.name,
            type: v.type,
            value: v.value,
            size: v.size,
            shape: v.shape,
            isFunction: v.isFunction || false,
            isClass: v.isClass || false
          }))
          
          logger.log(`Loaded ${variables.value.length} variables from session`)
        } else {
          logger.warn('No output from variable inspection code')
          variables.value = []
        }
      } catch (parseError) {
        logger.error('Failed to parse variable data:', parseError)
        variables.value = []
      }
    } else {
      logger.warn('No execution result received')
      variables.value = []
    }
  } catch (error) {
    logger.error('Failed to refresh variables:', error)
    variables.value = []
  } finally {
    isLoading.value = false
  }
}

const toggleVariable = (variableName: string) => {
  if (expandedVariables.value.has(variableName)) {
    expandedVariables.value.delete(variableName)
  } else {
    expandedVariables.value.add(variableName)
  }
}

const formatValue = (variable: Variable): string => {
  if (typeof variable.value === 'string') {
    return variable.value.length > 50 
      ? variable.value.substring(0, 50) + '...'
      : variable.value
  }
  return String(variable.value)
}

const getVariableIcon = (variable: Variable): string => {
  if (variable.isFunction) return '🔧'
  if (variable.isClass) return '🏗️'
  if (variable.type.includes('DataFrame')) return '📊'
  if (variable.type.includes('ndarray')) return '🔢'
  if (variable.type.includes('dict')) return '📋'
  if (variable.type.includes('list')) return '📝'
  return '📦'
}

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  refreshInterval.value = setInterval(() => {
    if (!props.isExecuting) {
      refreshVariables()
    }
  }, 2000) as unknown as number
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Watchers
watch(() => props.sessionId, (newSessionId) => {
  if (newSessionId) {
    refreshVariables()
  } else {
    variables.value = []
  }
})

watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    refreshVariables()
    if (autoRefresh.value) {
      startAutoRefresh()
    }
  } else {
    stopAutoRefresh()
  }
})

watch(autoRefresh, (enabled) => {
  if (enabled && props.isVisible) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

// Lifecycle
onMounted(() => {
  if (props.isVisible && props.sessionId) {
    refreshVariables()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <Card v-if="isVisible" class="variable-inspector">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm flex items-center gap-2">
          <Eye class="w-4 h-4" />
          Variable Inspector
        </CardTitle>
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            @click="autoRefresh = !autoRefresh"
            :class="{ 'text-primary': autoRefresh }"
            class="h-7 px-2"
            title="Auto-refresh"
          >
            <RefreshCw :class="{ 'animate-spin': autoRefresh }" class="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            @click="refreshVariables"
            :disabled="isLoading"
            class="h-7 px-2"
            title="Refresh variables"
          >
            <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            @click="emit('update:isVisible', false)"
            class="h-7 px-2"
            title="Hide inspector"
          >
            <EyeOff class="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <!-- Stats -->
      <div class="flex gap-2 text-xs">
        <Badge variant="secondary">{{ variableStats.total }} total</Badge>
        <Badge variant="outline">{{ variableStats.data }} data</Badge>
        <Badge variant="outline">{{ variableStats.functions }} functions</Badge>
        <Badge variant="outline">{{ variableStats.classes }} classes</Badge>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <!-- Search and Filter -->
      <div class="flex gap-2 mb-3">
        <div class="flex-1 relative">
          <Search class="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
          <Input
            v-model="searchQuery"
            placeholder="Search variables..."
            class="pl-7 h-7 text-xs"
          />
        </div>
        <select
          v-model="selectedFilter"
          class="px-2 py-1 border rounded text-xs bg-background"
        >
          <option value="all">All</option>
          <option value="data">Data</option>
          <option value="functions">Functions</option>
          <option value="classes">Classes</option>
        </select>
      </div>

      <!-- Variables List -->
      <div class="space-y-1 max-h-64 overflow-y-auto">
        <div
          v-for="variable in filteredVariables"
          :key="variable.name"
          class="border rounded-md"
        >
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div
                class="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer"
                @click="toggleVariable(variable.name)"
              >
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <component
                    :is="expandedVariables.has(variable.name) ? ChevronDown : ChevronRight"
                    class="w-3 h-3 text-muted-foreground"
                  />
                  <span class="text-xs">{{ getVariableIcon(variable) }}</span>
                  <span class="font-mono text-xs font-medium truncate">
                    {{ variable.name }}
                  </span>
                  <Badge variant="outline" class="text-xs">
                    {{ variable.type }}
                  </Badge>
                </div>
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <span v-if="variable.size">{{ variable.size }}</span>
                  <span v-if="variable.shape">{{ variable.shape }}</span>
                </div>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div class="px-4 pb-2 border-t bg-muted/20">
                <div class="text-xs space-y-1 pt-2">
                  <div><strong>Type:</strong> {{ variable.type }}</div>
                  <div><strong>Value:</strong> 
                    <code class="bg-muted px-1 rounded">{{ formatValue(variable) }}</code>
                  </div>
                  <div v-if="variable.size"><strong>Size:</strong> {{ variable.size }}</div>
                  <div v-if="variable.shape"><strong>Shape:</strong> {{ variable.shape }}</div>
                  <div v-if="variable.dtype"><strong>Dtype:</strong> {{ variable.dtype }}</div>
                  <div v-if="variable.module"><strong>Module:</strong> {{ variable.module }}</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <div v-if="filteredVariables.length === 0" class="text-center py-4 text-xs text-muted-foreground">
          <div v-if="isLoading">Loading variables...</div>
          <div v-else-if="searchQuery">No variables match your search</div>
          <div v-else>No variables in scope</div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.variable-inspector {
  font-size: 0.875rem;
}

.variable-inspector :deep(.collapsible-trigger) {
  width: 100%;
}
</style> 








