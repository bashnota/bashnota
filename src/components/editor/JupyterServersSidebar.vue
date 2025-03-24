<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import {
  Server,
  Plus,
  Trash2,
  RotateCw,
  Cpu,
  ChevronDown,
  Layers,
  Link,
} from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useJupyterStore } from '@/stores/jupyterStore'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { toast } from '@/lib/utils'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'

const props = defineProps<{
  notaId: string
}>()

const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const jupyterService = new JupyterService()

// State
const showAddServerDialog = ref(false)
const isTestingConnection = ref(false)
const isRefreshing = ref<string | null>(null)
const serverForm = ref({
  ip: '',
  port: '',
  token: '',
  url: '',
  name: '',
})

const testResults = ref<Record<string, { success: boolean; message: string }>>({})
const expandedServers = ref<Record<string, boolean>>({})
const refreshedTimestamps = ref<Record<string, Date>>({})

// Add parsing state
const isParsing = ref(false)

// Get all sessions for a specific server
const getSessionsForServer = (server: JupyterServer) => {
  const serverUrl = `${server.ip}:${server.port}`
  return codeExecutionStore.getAllSessions.filter((session) => {
    const sessionServerUrl = session.serverConfig && `${session.serverConfig.ip}:${session.serverConfig.port}`
    return sessionServerUrl === serverUrl
  })
}

// Toggle server expanded state
const toggleServerExpanded = (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  expandedServers.value[serverKey] = !expandedServers.value[serverKey]
}

// Test connection to server
const testConnection = async (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  
  try {
    const result = await jupyterService.testConnection(server)
    testResults.value[serverKey] = result
    
    if (result.success) {
      // If connection is successful, also fetch kernels
      await refreshKernelsForServer(server)
      // Update the refreshed timestamp
      refreshedTimestamps.value[serverKey] = new Date()
    }
    
    return result.success
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    testResults.value[serverKey] = {
      success: false,
      message: errorMessage,
    }
    return false
  }
}

// Format the time since last refresh
const formatLastRefreshed = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  
  if (diff < 60000) { // Less than a minute
    return 'Just now'
  } else if (diff < 3600000) { // Less than an hour
    const minutes = Math.floor(diff / 60000)
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`
  } else if (diff < 86400000) { // Less than a day
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diff / 86400000)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

// Add new server
const addServer = async () => {
  // Validate form values
  if (!serverForm.value.ip || !serverForm.value.port) {
    toast('Please fill in both IP and Port fields')
    return
  }

  const server: JupyterServer = {
    ip: serverForm.value.ip.trim(),
    port: serverForm.value.port.trim(),
    token: serverForm.value.token.trim(),
    name: serverForm.value.name.trim() || `${serverForm.value.ip.trim()}:${serverForm.value.port.trim()}`,
  }

  // Check if server already exists
  const serverExists = jupyterStore.jupyterServers.some(
    s => s.ip === server.ip && s.port === server.port
  )
  
  if (serverExists) {
    toast('A server with this IP and port already exists', 'Error', 'destructive')
    return
  }

  // Test connection before adding
  isTestingConnection.value = true
  toast('Testing connection to server...')
  const success = await testConnection(server)
  isTestingConnection.value = false

  if (success) {
    if (jupyterStore.addServer(server)) {
      // Reset form and hide dialog
      serverForm.value = { ip: '', port: '', token: '', url: '', name: '' }
      showAddServerDialog.value = false
      
      // Expand the newly added server
      expandedServers.value[`${server.ip}:${server.port}`] = true
      
      toast('Server added successfully', 'Success')
    }
  } else {
    const serverKey = `${server.ip}:${server.port}`
    const errorMessage = testResults.value[serverKey]?.message || 'Connection failed'
    toast(`Failed to add server: ${errorMessage}`, 'Error', 'destructive')
  }
}

// Remove server
const removeServer = (server: JupyterServer) => {
  if (confirm(`Are you sure you want to remove the server ${server.ip}:${server.port}?`)) {
    jupyterStore.removeServer(server)
    toast('Server removed', 'Success')
  }
}

// Parse Jupyter URL
const parseJupyterUrl = async () => {
  if (!serverForm.value.url) {
    toast('Please enter a Jupyter URL', 'Error', 'destructive')
    return
  }

  isParsing.value = true
  try {
    const parsedServer = jupyterService.parseJupyterUrl(serverForm.value.url)
    if (parsedServer) {
      serverForm.value.ip = parsedServer.ip
      serverForm.value.port = parsedServer.port
      serverForm.value.token = parsedServer.token
      // Generate a default name from the URL if none exists
      if (!serverForm.value.name) {
        const url = new URL(serverForm.value.url)
        serverForm.value.name = url.hostname || `${parsedServer.ip}:${parsedServer.port}`
      }
      toast('URL parsed successfully', 'Success')
    } else {
      toast('Failed to parse Jupyter URL', 'Error', 'destructive')
    }
  } catch (error) {
    toast('Error parsing URL', 'Error', 'destructive')
  } finally {
    isParsing.value = false
  }
}

// Refresh kernels for a specific server
const refreshKernelsForServer = async (server: JupyterServer) => {
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    jupyterStore.updateKernels(server, kernels)
    return kernels
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
    return []
  }
}

// Refresh kernels for a server (UI action)
const refreshKernels = async (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  expandedServers.value[serverKey] = true // Auto-expand when refreshing
  
  isRefreshing.value = serverKey
  try {
    const success = await testConnection(server)
    
    if (success) {
      toast(`Refreshed kernels for ${server.ip}:${server.port}`, 'Success')
    } else {
      toast(`Failed to connect to ${server.ip}:${server.port}`, 'Error', 'destructive')
    }
  } catch (error) {
    toast('Failed to refresh kernels', 'Error', 'destructive')
  } finally {
    isRefreshing.value = null
  }
}

// Get kernels for a server
const getKernelsForServer = (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  return jupyterStore.kernels[serverKey] || []
}

// Connect to a kernel
const connectToKernel = async (server: JupyterServer, kernel: KernelSpec) => {
  try {
    // Create a session name
    const sessionName = `${kernel.spec.display_name} (${server.ip}:${server.port})`
    
    // Create a new session in the code execution store
    const sessionId = codeExecutionStore.createSession(sessionName)
    
    // Configure the session with server and kernel info
    if (sessionId) {
      // Get the session and update it with the kernel info
      const session = codeExecutionStore.getAllSessions.find(s => s.id === sessionId)
      if (session) {
        session.serverConfig = server
        session.kernelName = kernel.name
        
        toast(`Created session for ${kernel.spec.display_name}`, 'Success')
      }
    }
    
    // Auto-expand this server to show the new session
    const serverKey = `${server.ip}:${server.port}`
    expandedServers.value[serverKey] = true
  } catch (error) {
    toast('Failed to create kernel session', 'Error', 'destructive')
    console.error('Failed to create kernel session:', error)
  }
}

// Use an existing session
const useSession = (sessionId: string) => {
  try {
    // Here we would typically set this session as the active one for the current editor
    // For now, we'll just show a toast notification
    const session = codeExecutionStore.getAllSessions.find(s => s.id === sessionId)
    if (session) {
      toast(`Using session: ${session.name || session.id}`, 'Success')
    }
  } catch (error) {
    toast('Failed to use session', 'Error', 'destructive')
    console.error('Failed to use session:', error)
  }
}

// Check connections on mount
onMounted(async () => {
  // Check connection status for all servers
  for (const server of jupyterStore.jupyterServers) {
    await testConnection(server)
  }
  
  // Auto-expand if there's only one server
  if (jupyterStore.jupyterServers.length === 1) {
    const server = jupyterStore.jupyterServers[0]
    expandedServers.value[`${server.ip}:${server.port}`] = true
  }
})

// Watch for changes in the jupyterServers array
watch(() => jupyterStore.jupyterServers.length, async (newLength, oldLength) => {
  // If a new server was added, check its connection
  if (newLength > oldLength) {
    const newServer = jupyterStore.jupyterServers[newLength - 1]
    if (newServer) {
      await testConnection(newServer)
    }
  }
})

// Refresh all servers
const refreshAllServers = async () => {
  if (isRefreshing.value !== null) return; // Don't start if already refreshing
  
  isRefreshing.value = 'all'
  try {
    for (const server of jupyterStore.jupyterServers) {
      await testConnection(server)
    }
    toast('All servers refreshed', 'Success')
  } catch (error) {
    toast('Failed to refresh servers', 'Error', 'destructive')
  } finally {
    isRefreshing.value = null
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Compact Header -->
    <div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2 border-b flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <Server class="w-4 h-4 text-primary" />
        <div>
          <h3 class="font-medium text-sm">Jupyter Servers</h3>
          <p class="text-xs text-muted-foreground" v-if="jupyterStore.jupyterServers.length > 0">
            {{ jupyterStore.jupyterServers.length }} server{{ jupyterStore.jupyterServers.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <Tooltip content="Refresh Servers">
          <Button 
            size="sm" 
            variant="ghost" 
            class="h-7 w-7 p-0" 
            @click="refreshAllServers"
            :disabled="isRefreshing !== null"
          >
            <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isRefreshing !== null }" />
          </Button>
        </Tooltip>
        <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="showAddServerDialog = true">
          <Plus class="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>

    <!-- Compact Server List -->
    <ScrollArea class="flex-1 px-2 py-2">
      <div v-if="jupyterStore.jupyterServers.length === 0" class="flex flex-col items-center justify-center h-[70vh] text-center">
        <div class="bg-muted/50 p-4 rounded-full mb-3">
          <Server class="w-8 h-8 text-muted-foreground/60" />
        </div>
        <h3 class="text-base font-medium mb-1">No Jupyter Servers</h3>
        <p class="text-xs text-muted-foreground max-w-[220px] mb-3">
          Add a Jupyter server to connect to your notebooks
        </p>
        <Button 
          variant="default" 
          size="sm"
          @click="showAddServerDialog = true"
          class="flex items-center gap-1.5"
        >
          <Plus class="w-3.5 h-3.5" /> Add Server
        </Button>
      </div>

      <div v-else class="flex flex-col gap-1.5">
        <div
          v-for="server in jupyterStore.jupyterServers"
          :key="`${server.ip}:${server.port}`"
          class="rounded border shadow-sm transition-all duration-200 overflow-hidden"
          :class="{
            'ring-1 ring-primary': expandedServers[`${server.ip}:${server.port}`],
            'border-primary/30 bg-primary/5': isRefreshing === `${server.ip}:${server.port}`
          }"
        >
          <Collapsible
            :open="expandedServers[`${server.ip}:${server.port}`]"
            @update:open="expandedServers[`${server.ip}:${server.port}`] = $event"
          >
            <!-- Compact Server Header -->
            <div 
              class="py-1.5 px-2 flex items-center justify-between cursor-pointer hover:bg-muted/50"
              @click="expandedServers[`${server.ip}:${server.port}`] = !expandedServers[`${server.ip}:${server.port}`]"
            >
              <div class="flex items-center gap-1.5 overflow-hidden">
                <div 
                  class="w-5 h-5 rounded flex items-center justify-center"
                  :class="{
                    'bg-green-100 dark:bg-green-900/20': testResults[`${server.ip}:${server.port}`]?.success,
                    'bg-red-100 dark:bg-red-900/20': testResults[`${server.ip}:${server.port}`]?.success === false,
                    'bg-muted': !testResults[`${server.ip}:${server.port}`]
                  }"
                >
                  <Server 
                    class="w-3 h-3" 
                    :class="{
                      'text-green-600 dark:text-green-400': testResults[`${server.ip}:${server.port}`]?.success,
                      'text-red-600 dark:text-red-400': testResults[`${server.ip}:${server.port}`]?.success === false,
                      'text-muted-foreground': !testResults[`${server.ip}:${server.port}`]
                    }"
                  />
                </div>
                <div class="overflow-hidden">
                  <p class="font-medium text-xs truncate" :title="`${server.ip}:${server.port}`">
                    {{ server.name || `${server.ip}:${server.port}` }}
                  </p>
                  <div class="flex items-center text-[10px] text-muted-foreground">
                    <span class="inline-flex items-center gap-0.5" title="Available kernels">
                      <Cpu class="w-2.5 h-2.5" />{{ getKernelsForServer(server).length }}
                    </span>
                    <span class="mx-1">•</span>
                    <span class="inline-flex items-center gap-0.5" title="Active sessions">
                      <Layers class="w-2.5 h-2.5" />{{ getSessionsForServer(server).length }}
                    </span>
                    <span 
                      class="ml-1 text-[9px] px-1 py-0 rounded-sm"
                      :class="{
                        'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400': testResults[`${server.ip}:${server.port}`]?.success,
                        'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400': testResults[`${server.ip}:${server.port}`]?.success === false,
                        'bg-muted text-muted-foreground': !testResults[`${server.ip}:${server.port}`]
                      }"
                    >
                      {{ testResults[`${server.ip}:${server.port}`]?.success ? 'Online' : 
                         testResults[`${server.ip}:${server.port}`]?.success === false ? 'Offline' : 'Unknown' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center">
                <Tooltip content="Remove">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    class="h-5 w-5 text-muted-foreground hover:text-destructive" 
                    @click.stop="removeServer(server)"
                    :disabled="isRefreshing !== null"
                  >
                    <Trash2 class="w-3 h-3" />
                  </Button>
                </Tooltip>
                <Button 
                  variant="ghost" 
                  size="icon"
                  class="h-5 w-5"
                  @click.stop="expandedServers[`${server.ip}:${server.port}`] = !expandedServers[`${server.ip}:${server.port}`]"
                >
                  <ChevronDown 
                    class="w-3 h-3 transition-transform duration-200"
                    :class="{ 'transform rotate-180': expandedServers[`${server.ip}:${server.port}`] }"
                  />
                </Button>
              </div>
            </div>

            <CollapsibleContent>
              <div class="p-2 space-y-2 text-xs bg-muted/20">
                <!-- Connection Error -->
                <div 
                  v-if="testResults[`${server.ip}:${server.port}`]?.success === false" 
                  class="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 text-red-700 dark:text-red-400 text-[10px] py-1 px-1.5 rounded"
                >
                  <p><span class="font-medium">Error:</span> {{ testResults[`${server.ip}:${server.port}`]?.message }}</p>
                </div>

                <!-- Kernels and Sessions Lists -->
                <div class="space-y-1.5">
                  <!-- Kernels List -->
                  <div>
                    <h5 class="font-medium mb-1 flex items-center gap-1.5 justify-between text-[10px] uppercase text-muted-foreground">
                      <span class="flex items-center"><Cpu class="w-3 h-3 mr-0.5" /> Kernels</span>
                      <span v-if="getKernelsForServer(server).length > 0">{{ getKernelsForServer(server).length }}</span>
                    </h5>
                    
                    <div 
                      v-if="getKernelsForServer(server).length > 0"
                      class="grid gap-0.5 max-h-[120px] overflow-y-auto pr-1"
                    >
                      <div
                        v-for="kernel in getKernelsForServer(server)"
                        :key="kernel.name"
                        class="flex items-center justify-between py-0.5 px-1 rounded text-xs hover:bg-muted"
                      >
                        <div class="flex items-center gap-1.5 overflow-hidden">
                          <div class="w-4 h-4 flex-shrink-0 rounded-sm flex items-center justify-center bg-primary/10">
                            <Cpu class="w-2.5 h-2.5 text-primary" />
                          </div>
                          <div class="overflow-hidden">
                            <p class="font-medium text-xs truncate">{{ kernel.spec.display_name }}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          class="h-5 text-[10px] px-1.5 ml-1"
                          @click="connectToKernel(server, kernel)"
                        >
                          Connect
                        </Button>
                      </div>
                    </div>

                    <div v-else class="text-[10px] text-center py-1.5 bg-muted/30 rounded">
                      <p class="text-muted-foreground">No kernels available</p>
                    </div>
                  </div>
                  
                  <!-- Sessions List -->
                  <div v-if="getSessionsForServer(server).length > 0">
                    <h5 class="font-medium mb-1 flex items-center gap-1.5 justify-between text-[10px] uppercase text-muted-foreground">
                      <span class="flex items-center"><Layers class="w-3 h-3 mr-0.5" /> Sessions</span>
                      <span>{{ getSessionsForServer(server).length }}</span>
                    </h5>
                    
                    <div class="grid gap-0.5 max-h-[100px] overflow-y-auto pr-1">
                      <div
                        v-for="session in getSessionsForServer(server)"
                        :key="session.id"
                        class="flex items-center justify-between py-0.5 px-1 rounded text-xs hover:bg-muted"
                      >
                        <div class="flex items-center gap-1.5 overflow-hidden">
                          <div class="w-4 h-4 flex-shrink-0 rounded-sm flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                            <Cpu class="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                          </div>
                          <div class="overflow-hidden">
                            <p class="font-medium text-xs truncate" :title="session.name || session.id">
                              {{ session.name || session.id }}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          class="h-5 text-[10px] px-1.5 ml-1"
                          @click="useSession(session.id)"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div v-if="refreshedTimestamps[`${server.ip}:${server.port}`]" class="text-[9px] text-muted-foreground text-right">
                  Last refreshed: {{ formatLastRefreshed(refreshedTimestamps[`${server.ip}:${server.port}`]) }}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </ScrollArea>

    <!-- Add Server Dialog (kept the same) -->
    <Dialog
      :open="showAddServerDialog"
      @update:open="showAddServerDialog = $event"
    >
      <DialogContent class="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Server class="w-4 h-4" />
            Add Jupyter Server
          </DialogTitle>
          <DialogDescription class="text-xs">
            Connect to a Jupyter server to run code in your notebooks
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="addServer" class="space-y-4 mt-1">
          <!-- Server Name -->
          <div class="space-y-1.5">
            <Label class="text-xs">Server Name (Optional)</Label>
            <Input
              :value="serverForm.name"
              @input="(e: Event) => serverForm.name = (e.target as HTMLInputElement).value"
              type="text"
              placeholder="My Jupyter Server"
              class="h-8 text-xs"
            />
            <p class="text-[10px] text-muted-foreground">
              A friendly name to identify this server
            </p>
          </div>
          
          <!-- URL Input -->
          <div class="space-y-1.5">
            <Label class="text-xs">Jupyter URL (Optional)</Label>
            <div class="flex gap-2">
              <Input
                :value="serverForm.url"
                @input="(e: Event) => serverForm.url = (e.target as HTMLInputElement).value"
                type="text"
                placeholder="https://jupyter-server.example.com:8888/?token=abc123"
                class="flex-1 h-8 text-xs"
              />
              <Button 
                type="button" 
                variant="outline" 
                @click="parseJupyterUrl"
                :disabled="!serverForm.url || isParsing"
                class="h-8 text-xs"
              >
                <span 
                  v-if="isParsing"
                  class="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent animate-spin rounded-full"
                ></span>
                {{ isParsing ? 'Parsing...' : 'Parse' }}
              </Button>
            </div>
            <p class="text-[10px] text-muted-foreground">
              Paste a Jupyter URL to automatically fill the fields below
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label class="text-xs">Server IP</Label>
              <Input
                :value="serverForm.ip"
                @input="(e: Event) => serverForm.ip = (e.target as HTMLInputElement).value"
                type="text"
                placeholder="localhost"
                class="h-8 text-xs"
                required
              />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">Port</Label>
              <Input
                :value="serverForm.port"
                @input="(e: Event) => serverForm.port = (e.target as HTMLInputElement).value"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="8888"
                class="h-8 text-xs"
                required
              />
            </div>
          </div>
          
          <div class="space-y-1.5">
            <Label class="text-xs">Token (Optional)</Label>
            <Input
              :value="serverForm.token"
              @input="(e: Event) => serverForm.token = (e.target as HTMLInputElement).value"
              type="text"
              placeholder="Jupyter token"
              class="h-8 text-xs"
            />
            <p class="text-[10px] text-muted-foreground">
              Leave empty if your server doesn't require authentication
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs"
              @click="showAddServerDialog = false"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="h-8 text-xs"
              :disabled="isTestingConnection"
            >
              <span 
                v-if="isTestingConnection"
                class="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent animate-spin rounded-full"
              ></span>
              {{ isTestingConnection ? 'Testing...' : 'Add Server' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template> 