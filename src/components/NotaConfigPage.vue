<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import { CloudProviderService, type VMTemplate } from '@/services/cloudProviderService'
import type { JupyterServer, KernelSpec, CloudProvider, VMConfiguration, CloudVM } from '@/types/jupyter'
import {
  ServerIcon,
  CpuChipIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PlusIcon,
  CloudIcon,
} from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import ServerListItem from './ServerListItem.vue'
import CloudProviderSelector from './CloudProviderSelector.vue'
import CloudVMConfigModal from './CloudVMConfigModal.vue'
import CloudVMListItem from './CloudVMListItem.vue'
import CloudVMCreationProgress from './CloudVMCreationProgress.vue'
import CloudVMTemplateSelector from './CloudVMTemplateSelector.vue'
import { toast } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()
const cloudProviderService = new CloudProviderService()

// Form states
const serverForm = ref<{
  ip: string
  port: string
  token: string
}>({
  ip: '',
  port: '',
  token: '',
})

const isTestingConnection = ref(false)
const isRefreshingKernels = ref(false)
const testResults = ref<Record<string, { success: boolean; message: string }>>({})
const showServerForm = ref(false)

// Cloud provider states
const showCloudProviderSelector = ref(false)
const selectedProvider = ref<CloudProvider | null>(null)
const showVMConfigModal = ref(false)
const showTemplateSelector = ref(false)
const isCreatingVM = ref(false)
const showCreationProgress = ref(false)
const creatingVM = ref<CloudVM | null>(null)
const creationStep = ref(0)
const totalSteps = 6 // Total steps in VM creation process
const creationLogs = ref<string[]>([])
const selectedTemplate = ref<VMTemplate | null>(null)
const cloudTabActiveView = ref<'all' | 'recent'>('all')

// Load config from store
const currentNota = computed(() => store.getCurrentNota(props.notaId))
const config = computed(() => {
  return (
    currentNota.value?.config || {
      jupyterServers: [],
      notebooks: [],
      kernels: {},
      cloudVMs: [],
    }
  )
})

// Computed property for recently created VMs (last 7 days)
const recentCloudVMs = computed(() => {
  if (!config.value.cloudVMs) return []
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  return config.value.cloudVMs.filter(vm => {
    const createdAt = new Date(vm.createdAt)
    return createdAt >= sevenDaysAgo
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// Test server connection
const testConnection = async (server: JupyterServer) => {
  isTestingConnection.value = true
  try {
    const result = await jupyterService.testConnection(server)
    const serverKey = `${server.ip}:${server.port}`
    testResults.value[serverKey] = result
    if (result.success) {
      // Load available kernels
      await refreshKernels(server)
    }
  } catch (error) {
    const serverKey = `${server.ip}:${server.port}`
    testResults.value[serverKey] = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Refresh kernels for a server
const refreshKernels = async (server: JupyterServer) => {
  isRefreshingKernels.value = true
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.kernels) config.kernels = {}
      const serverKey = `${server.ip}:${server.port}`
      config.kernels[serverKey] = kernels
    })
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
  } finally {
    isRefreshingKernels.value = false
  }
}

// Add new server
const addServer = async () => {
  // Validate form values
  if (!serverForm.value.ip || !serverForm.value.port) {
    alert('Please fill in both IP and Port fields')
    return
  }

  const server = {
    ip: serverForm.value.ip.trim(),
    port: serverForm.value.port.trim(),
    token: serverForm.value.token.trim(),
  }

  // Check if server with same IP and port already exists
  const serverExists = config.value.jupyterServers.some(
    (s) => s.ip.toLowerCase() === server.ip.toLowerCase() && s.port === server.port,
  )

  if (serverExists) {
    alert('A server with this IP and port already exists')
    return
  }

  // Test connection before adding
  await testConnection(server)

  const serverKey = `${server.ip}:${server.port}`
  if (testResults.value[serverKey]?.success) {
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.jupyterServers) config.jupyterServers = []
      const newServer = {
        ip: server.ip,
        port: server.port,
        token: server.token,
      }
      config.jupyterServers.push(newServer)
    })

    // Reset form and hide it after successful addition
    serverForm.value = {
      ip: '',
      port: '',
      token: '',
    }
    showServerForm.value = false

    toast(`Server ${server.ip}:${server.port} added successfully to ${currentNota.value?.title}`)
  }
}

// Remove server
const removeServer = async (serverToRemove: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    await store.updateNotaConfig(props.notaId, (config) => {
      config.jupyterServers = config.jupyterServers.filter(
        (s) => !(s.ip === serverToRemove.ip && s.port === serverToRemove.port),
      )
      if (config.kernels) {
        const serverKey = `${serverToRemove.ip}:${serverToRemove.port}`
        delete config.kernels[serverKey]
      }
    })
  }
}

// Cloud provider functions
const openCloudProviderSelector = () => {
  showCloudProviderSelector.value = true
}

const handleProviderSelect = (provider: CloudProvider) => {
  selectedProvider.value = provider
  showCloudProviderSelector.value = false
  showTemplateSelector.value = true
}

const handleTemplateSelect = (template: VMTemplate) => {
  selectedTemplate.value = template
  showTemplateSelector.value = false
  
  // Create VM from template
  createVMFromTemplate(template)
}

const handleCustomVM = () => {
  showTemplateSelector.value = false
  showVMConfigModal.value = true
}

const closeVMConfigModal = () => {
  showVMConfigModal.value = false
  selectedProvider.value = null
}

const closeTemplateSelector = () => {
  showTemplateSelector.value = false
  selectedProvider.value = null
}

const createVMFromTemplate = async (template: VMTemplate) => {
  // Generate a random password for the VM
  const randomPassword = Math.random().toString(36).substring(2, 10) + 
                         Math.random().toString(36).substring(2, 10)
  
  // Create a copy of the configuration with the password
  const vmConfig: VMConfiguration = {
    ...template.configuration,
    password: randomPassword,
  }
  
  // Start VM creation process
  await createVM(vmConfig, template.packages)
}

const createVM = async (vmConfig: VMConfiguration, packages: string[] = []) => {
  isCreatingVM.value = true
  showVMConfigModal.value = false
  showCreationProgress.value = true
  
  try {
    // Add timestamp to logs
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString()
      creationLogs.value.push(`${timestamp}|${message}`)
    }
    
    // Step 1: Create VM
    creationStep.value = 0
    addLog(`Creating VM instance on ${vmConfig.provider}...`)
    const vm = await cloudProviderService.createVM(vmConfig)
    creatingVM.value = vm
    
    // Save VM to config
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.cloudVMs) config.cloudVMs = []
      config.cloudVMs.push(vm)
    })
    
    // Step 2: Wait for VM to start
    creationStep.value = 1
    addLog('Waiting for VM to start...')
    await new Promise((resolve) => setTimeout(resolve, 3000))
    
    // Step 3: Install dependencies
    creationStep.value = 2
    addLog('Installing Python and dependencies...')
    addLog('apt-get update')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    addLog('apt-get install -y python3-pip python3-dev')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    // Step 4: Configure Jupyter
    creationStep.value = 3
    addLog('Installing Jupyter...')
    addLog('pip3 install jupyter jupyterlab')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    // Install additional packages if provided
    if (packages && packages.length > 0) {
      addLog(`Installing additional packages: ${packages.join(', ')}...`)
      const packageCommands = cloudProviderService.getPackageInstallCommands(packages)
      for (const cmd of packageCommands) {
        addLog(cmd)
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
    
    addLog('Configuring Jupyter...')
    addLog('jupyter notebook --generate-config')
    addLog('Setting up security and remote access...')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // Step 5: Start Jupyter server
    creationStep.value = 4
    addLog('Starting Jupyter server...')
    addLog('nohup jupyter lab --port=8888 &')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    // Step 6: Get connection details
    creationStep.value = 5
    addLog('Retrieving connection details...')
    const updatedVM = await cloudProviderService.provisionVM(vm, packages)
    
    // Update VM in config
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.cloudVMs) return
      const index = config.cloudVMs.findIndex((v) => v.id === updatedVM.id)
      if (index !== -1) {
        config.cloudVMs[index] = updatedVM
      }
    })
    
    creatingVM.value = updatedVM
    addLog(`Jupyter server is running at ${updatedVM.jupyterUrl}`)
    addLog(`Token: ${updatedVM.jupyterToken}`)
    addLog('Setup completed successfully!')
    
    toast(`Jupyter server on ${updatedVM.name} is now running`)
  } catch (error) {
    creationLogs.value.push(`Error: ${error instanceof Error ? error.message : String(error)}`)
    
    // Update VM status to error
    if (creatingVM.value) {
      await store.updateNotaConfig(props.notaId, (config) => {
        if (!config.cloudVMs) return
        const index = config.cloudVMs.findIndex((v) => v.id === creatingVM.value?.id)
        if (index !== -1) {
          config.cloudVMs[index] = {
            ...config.cloudVMs[index],
            status: 'error',
          }
        }
      })
    }
  } finally {
    isCreatingVM.value = false
    selectedTemplate.value = null
  }
}

const closeCreationProgress = () => {
  showCreationProgress.value = false
  creatingVM.value = null
  creationStep.value = 0
  creationLogs.value = []
}

const addVMServer = async (server: JupyterServer) => {
  // Check if server already exists
  const serverExists = config.value.jupyterServers.some(
    (s) => s.ip === server.ip && s.port === server.port,
  )
  
  if (serverExists) {
    toast('This server is already added to your configuration')
    return
  }
  
  // Test connection before adding
  await testConnection(server)
  
  const serverKey = `${server.ip}:${server.port}`
  if (testResults.value[serverKey]?.success) {
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.jupyterServers) config.jupyterServers = []
      config.jupyterServers.push(server)
    })
    
    toast(`Server ${server.ip}:${server.port} added successfully`)
  }
}

const removeVM = async (vmToRemove: CloudVM) => {
  if (confirm(`Are you sure you want to remove ${vmToRemove.name}?`)) {
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.cloudVMs) return
      config.cloudVMs = config.cloudVMs.filter((vm) => vm.id !== vmToRemove.id)
    })
    
    toast(`VM ${vmToRemove.name} removed`)
  }
}

// Helper function to safely get kernels for a server
const getKernelsForServer = (server: JupyterServer): KernelSpec[] => {
  const serverKey = `${server.ip}:${server.port}`
  const kernels = config.value.kernels as Record<string, KernelSpec[]> | undefined
  if (!kernels) return []
  return kernels[serverKey] || []
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="space-y-6">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold tracking-tight">Jupyter Configuration</h2>
        <p class="text-sm text-muted-foreground">
          Configure Jupyter servers and kernels for code execution in your notebooks
        </p>
      </div>

      <Tabs default-value="servers" class="w-full">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="servers">
            <div class="flex items-center justify-center gap-2 p-1">
              <ServerIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Jupyter Servers</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="cloud">
            <div class="flex items-center justify-center gap-2 p-1">
              <CloudIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Cloud Servers</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="kernels">
            <div class="flex items-center justify-center gap-2 p-1">
              <CpuChipIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Available Kernels</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <!-- Servers Tab -->
        <TabsContent value="servers" class="space-y-6">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Servers</CardTitle>
                  <CardDescription>Manage your Jupyter server connections</CardDescription>
                </div>
                <Button
                  @click="showServerForm = !showServerForm"
                  variant="outline"
                  class="flex items-center gap-2"
                >
                  <PlusIcon class="w-4 h-4" />
                  Add Server
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <!-- New Server Form -->
              <div v-if="showServerForm" class="mb-6 border rounded-lg p-4 bg-muted/50">
                <form @submit.prevent="addServer" class="space-y-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="text-sm font-medium">Server IP</label>
                      <Input
                        :value="serverForm.ip"
                        @input="
                          (e: Event) => (serverForm.ip = (e.target as HTMLInputElement).value)
                        "
                        type="text"
                        placeholder="localhost"
                        required
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-medium">Port</label>
                      <Input
                        :value="serverForm.port"
                        @input="
                          (e: Event) => (serverForm.port = (e.target as HTMLInputElement).value)
                        "
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        placeholder="8888"
                        required
                      />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium">Token</label>
                    <Input
                      :value="serverForm.token"
                      @input="
                        (e: Event) => (serverForm.token = (e.target as HTMLInputElement).value)
                      "
                      type="password"
                      placeholder="Jupyter token"
                    />
                  </div>
                  <div class="flex items-center gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      @click="
                        () => {
                          showServerForm = false
                          serverForm.ip = ''
                          serverForm.port = ''
                          serverForm.token = ''
                        }
                      "
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Server</Button>
                  </div>
                </form>
              </div>

              <!-- Server List -->
              <div
                v-if="config.jupyterServers.length === 0"
                class="rounded-lg border border-dashed p-8 text-center"
              >
                <ServerIcon class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p class="text-sm font-medium mb-2">No Jupyter Servers Configured</p>
                <p class="text-sm text-muted-foreground max-w-md mx-auto">
                  Add a Jupyter server to enable code execution in your notebooks. You can connect to a local or remote Jupyter server.
                </p>
              </div>

              <div v-else class="space-y-4">
                <ServerListItem
                  v-for="server in config.jupyterServers"
                  :key="`${server.ip}:${server.port}`"
                  :server="server"
                  @remove="removeServer"
                  @kernels-updated="refreshKernels"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Cloud Servers Tab -->
        <TabsContent value="cloud" class="space-y-6">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Cloud Jupyter Servers</CardTitle>
                  <CardDescription>Create and manage Jupyter servers on cloud providers</CardDescription>
                </div>
                <Button
                  @click="openCloudProviderSelector"
                  variant="outline"
                  class="flex items-center gap-2"
                >
                  <CloudIcon class="w-4 h-4" />
                  Create Cloud Server
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <!-- View Selector -->
              <div v-if="config.cloudVMs?.length" class="mb-4 flex items-center space-x-2 border-b pb-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  :class="{ 'bg-muted': cloudTabActiveView === 'all' }"
                  @click="cloudTabActiveView = 'all'"
                >
                  All Servers
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  :class="{ 'bg-muted': cloudTabActiveView === 'recent' }"
                  @click="cloudTabActiveView = 'recent'"
                >
                  Recently Created
                  <Badge v-if="recentCloudVMs.length" class="ml-2">{{ recentCloudVMs.length }}</Badge>
                </Button>
              </div>

              <!-- Cloud VM List -->
              <div
                v-if="!config.cloudVMs?.length"
                class="rounded-lg border border-dashed p-8 text-center"
              >
                <CloudIcon class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p class="text-sm font-medium mb-2">No Cloud Servers Created</p>
                <p class="text-sm text-muted-foreground max-w-md mx-auto">
                  Create a Jupyter server on a cloud provider with a single click. We'll handle the setup and configuration for you.
                </p>
                <Button @click="openCloudProviderSelector" class="mt-4">
                  <CloudIcon class="w-4 h-4 mr-2" />
                  Create Your First Cloud Server
                </Button>
              </div>

              <div v-else-if="cloudTabActiveView === 'all'" class="space-y-4">
                <CloudVMListItem
                  v-for="vm in config.cloudVMs"
                  :key="vm.id"
                  :vm="vm"
                  @add-server="addVMServer"
                  @remove="removeVM"
                />
              </div>

              <div v-else-if="cloudTabActiveView === 'recent'" class="space-y-4">
                <div v-if="recentCloudVMs.length === 0" class="text-center p-8">
                  <p class="text-sm text-muted-foreground">No servers created in the last 7 days</p>
                </div>
                <CloudVMListItem
                  v-for="vm in recentCloudVMs"
                  :key="vm.id"
                  :vm="vm"
                  @add-server="addVMServer"
                  @remove="removeVM"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Kernels Tab -->
        <TabsContent value="kernels" class="space-y-6">
          <div v-if="config.jupyterServers.length === 0">
            <Alert>
              <AlertDescription>
                No servers configured. Add a server to view available kernels.
              </AlertDescription>
            </Alert>
          </div>

          <div v-else v-for="server in config.jupyterServers" :key="server.ip" class="space-y-4">
            <Card>
              <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
                <div class="space-y-1">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <ServerIcon class="w-8 h-8 text-muted-foreground" />
                    <code>{{ server.ip }}:{{ server.port }}</code>
                  </CardTitle>
                  <p class="text-sm text-muted-foreground">
                    Available Jupyter kernels on this server
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  @click="refreshKernels(server)"
                  :disabled="isRefreshingKernels"
                  class="flex items-center gap-2"
                >
                  <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isRefreshingKernels }" />
                  {{ isRefreshingKernels ? 'Refreshing...' : 'Refresh Kernels' }}
                </Button>
              </CardHeader>
              <CardContent class="border-t pt-6">
                <div
                  v-if="getKernelsForServer(server).length === 0"
                  class="rounded-lg border border-dashed p-8 text-center"
                >
                  <CpuChipIcon class="w-10 h-10 mx-auto mb-4 text-muted-foreground/50" />
                  <p class="text-sm font-medium mb-1">No kernels found</p>
                  <p class="text-sm text-muted-foreground">
                    Make sure Jupyter kernels are installed on the server.
                  </p>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="kernel in getKernelsForServer(server)"
                    :key="kernel.name"
                    class="group rounded-lg border bg-slate-50 dark:bg-slate-900 hover:shadow-sm transition-all duration-200 p-4"
                  >
                    <div class="flex items-start gap-3">
                      <div
                        class="rounded-md bg-blue-50 dark:bg-blue-700 border border-blue-950 p-2 mt-1"
                      >
                        <CpuChipIcon class="w-8 h-7" />
                      </div>
                      <div class="space-y-2 flex-1">
                        <div class="space-y-1">
                          <div class="flex flex-col items-start gap-2">
                            <span class="font-medium">{{ kernel.spec.display_name }}</span>
                            <span
                              class="text-xs sn px-3 rounded-full bg-slate-100 dark:bg-slate-800 border font-medium"
                            >
                              {{ kernel.spec.language }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>

  <!-- Cloud Provider Selection Dialog -->
  <Dialog :open="showCloudProviderSelector" @update:open="(open) => (showCloudProviderSelector = open)">
    <DialogContent class="sm:max-w-[800px]">
      <div class="space-y-6">
        <div class="space-y-2">
          <h3 class="text-lg font-medium">Select Cloud Provider</h3>
          <p class="text-sm text-muted-foreground">
            Choose a cloud provider to create your Jupyter server
          </p>
        </div>
        <CloudProviderSelector @select="handleProviderSelect" />
      </div>
    </DialogContent>
  </Dialog>

  <!-- Template Selection Dialog -->
  <Dialog :open="showTemplateSelector" @update:open="(open) => !open && closeTemplateSelector()">
    <DialogContent class="sm:max-w-[800px]">
      <CloudVMTemplateSelector
        v-if="selectedProvider"
        :provider="selectedProvider"
        @select-template="handleTemplateSelect"
        @custom-vm="handleCustomVM"
      />
    </DialogContent>
  </Dialog>

  <!-- VM Configuration Modal -->
  <CloudVMConfigModal
    v-if="selectedProvider"
    :show="showVMConfigModal"
    :provider="selectedProvider"
    @close="closeVMConfigModal"
    @create="createVM"
  />

  <!-- VM Creation Progress Dialog -->
  <Dialog :open="showCreationProgress" @update:open="(open) => !open && closeCreationProgress()">
    <DialogContent class="sm:max-w-[700px]">
      <CloudVMCreationProgress
        v-if="creatingVM"
        :vm="creatingVM"
        :current-step="creationStep"
        :total-steps="totalSteps"
        :logs="creationLogs"
        @close="closeCreationProgress"
      />
    </DialogContent>
  </Dialog>
</template>
