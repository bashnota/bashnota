<template>
  <div class="jupyter-config-panel">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Jupyter Configuration</CardTitle>
        <CardDescription>Configure Jupyter server and kernel for code execution</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- No servers configured -->
        <div
          v-if="jupyterStore.jupyterServers.length === 0"
          class="rounded-lg border border-dashed p-4 text-center"
        >
          <Server class="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p class="text-sm font-medium mb-2">No Jupyter Servers Configured</p>
          <p class="text-sm text-muted-foreground max-w-md mx-auto mb-3">
            You need to configure a Jupyter server to enable code execution.
          </p>
          <Button @click="openJupyterSettings" variant="outline" class="flex items-center gap-2 mx-auto">
            <Settings class="w-4 h-4" />
            Configure Jupyter Settings
          </Button>
        </div>

        <!-- Server and kernel selection -->
        <div v-else class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Jupyter Server</label>
            <Select v-model="selectedServerValue" @update:modelValue="handleServerChange">
              <SelectTrigger>
                <SelectValue :placeholder="selectedServer ? `${selectedServer.ip}:${selectedServer.port}` : 'Select server'" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Available Servers</SelectLabel>
                  <SelectItem 
                    v-for="server in jupyterStore.jupyterServers" 
                    :key="`${server.ip}:${server.port}`"
                    :value="`${server.ip}:${server.port}`"
                  >
                    {{ server.ip }}:{{ server.port }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium">Default Kernel</label>
              <Button 
                v-if="selectedServer"
                @click="refreshKernels" 
                variant="ghost" 
                size="sm"
                class="h-7 px-2"
                :disabled="isRefreshing"
              >
                <RefreshCw :class="{'animate-spin': isRefreshing}" class="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
            
            <Select v-model="selectedKernelValue" :disabled="!selectedServer || isRefreshing">
              <SelectTrigger>
                <SelectValue :placeholder="selectedKernel ? selectedKernel.spec.display_name : 'Select kernel'" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Python Kernels</SelectLabel>
                  <SelectItem 
                    v-for="kernel in pythonKernels" 
                    :key="kernel.name"
                    :value="kernel.name"
                  >
                    {{ kernel.spec.display_name }}
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator v-if="pythonKernels.length > 0 && rKernels.length > 0" />
                <SelectGroup v-if="rKernels.length > 0">
                  <SelectLabel>R Kernels</SelectLabel>
                  <SelectItem 
                    v-for="kernel in rKernels" 
                    :key="kernel.name"
                    :value="kernel.name"
                  >
                    {{ kernel.spec.display_name }}
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator v-if="(pythonKernels.length > 0 || rKernels.length > 0) && otherKernels.length > 0" />
                <SelectGroup v-if="otherKernels.length > 0">
                  <SelectLabel>Other Kernels</SelectLabel>
                  <SelectItem 
                    v-for="kernel in otherKernels" 
                    :key="kernel.name"
                    :value="kernel.name"
                  >
                    {{ kernel.spec.display_name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="pt-2 flex justify-end">
            <Button @click="saveConfiguration" :disabled="!selectedKernel || !selectedServer">
              Save Configuration
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useJupyterStore } from '@/stores/jupyterStore'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { Server, Settings, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator 
} from '@/components/ui/select'
import { toast } from '@/lib/utils'
import { useRouter } from 'vue-router'

// Emits
const emit = defineEmits(['configUpdated'])

// Props
const props = defineProps({
  initialServer: {
    type: Object as () => JupyterServer | null,
    default: null
  },
  initialKernel: {
    type: Object as () => KernelSpec | null,
    default: null
  }
})

// Store and service
const jupyterStore = useJupyterStore()
const jupyterService = new JupyterService()
const router = useRouter()

// State
const selectedServer = ref<JupyterServer | null>(props.initialServer)
const selectedKernel = ref<KernelSpec | null>(props.initialKernel)
const isRefreshing = ref(false)

// String values for v-model binding (to fix type errors)
const selectedServerValue = ref<string>('')
const selectedKernelValue = ref<string>('')

// Watchers to sync objects and string values
watch(selectedServer, (server) => {
  if (server) {
    selectedServerValue.value = `${server.ip}:${server.port}`
  } else {
    selectedServerValue.value = ''
  }
})

watch(selectedServerValue, (value) => {
  if (value) {
    // Find the server object from the string value
    const [ip, port] = value.split(':')
    selectedServer.value = jupyterStore.jupyterServers.find(
      s => s.ip === ip && s.port === port
    ) || null
  } else {
    selectedServer.value = null
  }
})

watch(selectedKernel, (kernel) => {
  if (kernel) {
    selectedKernelValue.value = kernel.name
  } else {
    selectedKernelValue.value = ''
  }
})

watch(selectedKernelValue, (value) => {
  if (value && serverKernels.value.length > 0) {
    selectedKernel.value = serverKernels.value.find(k => k.name === value) || null
  } else {
    selectedKernel.value = null
  }
})

// Computed for grouping kernels by type
const serverKernels = computed(() => {
  if (!selectedServer.value) return []
  
  const serverKey = `${selectedServer.value.ip}:${selectedServer.value.port}`
  return jupyterStore.kernels[serverKey] || []
})

const pythonKernels = computed(() => 
  serverKernels.value.filter(k => 
    k.spec.language.toLowerCase() === 'python' || 
    k.name.toLowerCase().includes('python')
  )
)

const rKernels = computed(() => 
  serverKernels.value.filter(k => 
    k.spec.language.toLowerCase() === 'r' || 
    k.name.toLowerCase().includes('ir') ||
    k.name.toLowerCase() === 'r'
  )
)

const otherKernels = computed(() => 
  serverKernels.value.filter(k => 
    !pythonKernels.value.includes(k) && 
    !rKernels.value.includes(k)
  )
)

// Methods
const handleServerChange = async (value: string) => {
  // The watcher will update selectedServer, we just need to reset the kernel
  selectedKernel.value = null
  selectedKernelValue.value = ''
  
  if (selectedServer.value) {
    // Refresh kernels for this server if not already loaded
    const serverKey = `${selectedServer.value.ip}:${selectedServer.value.port}`
    if (!jupyterStore.kernels[serverKey] || jupyterStore.kernels[serverKey].length === 0) {
      await refreshKernels()
    }
  }
}

const refreshKernels = async () => {
  if (!selectedServer.value) return
  
  isRefreshing.value = true
  try {
    const kernels = await jupyterService.getAvailableKernels(selectedServer.value)
    jupyterStore.updateKernels(selectedServer.value, kernels)
    
    // Select first Python kernel by default if available
    if (pythonKernels.value.length > 0 && !selectedKernel.value) {
      selectedKernel.value = pythonKernels.value[0]
      selectedKernelValue.value = pythonKernels.value[0].name
    }
    
    toast('Kernels refreshed successfully')
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
    toast('Failed to refresh kernels')
  } finally {
    isRefreshing.value = false
  }
}

const saveConfiguration = () => {
  if (!selectedServer.value || !selectedKernel.value) {
    toast('Please select both a server and kernel')
    return
  }
  
  emit('configUpdated', {
    server: selectedServer.value,
    kernel: selectedKernel.value
  })
  
  toast('Jupyter configuration saved')
}

const openJupyterSettings = () => {
  router.push('/settings?tab=jupyter')
}

// Initialization
onMounted(async () => {
  if (jupyterStore.jupyterServers.length > 0) {
    // Select first server by default if none provided
    if (!selectedServer.value) {
      selectedServer.value = jupyterStore.jupyterServers[0]
      selectedServerValue.value = `${selectedServer.value.ip}:${selectedServer.value.port}`
    }
    
    // Load kernels for the selected server
    await handleServerChange(selectedServerValue.value)
  }
})
</script>

<style scoped>
.jupyter-config-panel {
  @apply mb-4;
}
</style> 