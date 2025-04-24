<template>
  <BaseSidebar 
    id="jupyter-servers"
    title="Jupyter Servers"
    :icon="Server"
    position="right" 
    @close="$emit('close')"
  >
    <template #headerActions>
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
      <Tooltip content="Add Server">
        <Button 
          size="sm" 
          variant="ghost" 
          class="h-7 w-7 p-0" 
          @click="showAddServerDialog = true"
        >
          <Plus class="w-3.5 h-3.5" />
        </Button>
      </Tooltip>
    </template>
    
    <template #headerSubtitle>
      <p v-if="jupyterStore.jupyterServers.length > 0" class="text-xs text-muted-foreground">
        {{ jupyterStore.jupyterServers.length }} server{{ jupyterStore.jupyterServers.length !== 1 ? 's' : '' }}
      </p>
    </template>
    
    <!-- No Servers State -->
    <div 
      v-if="jupyterStore.jupyterServers.length === 0" 
      class="flex flex-col items-center justify-center h-64 p-4"
    >
      <Server class="w-12 h-12 text-muted-foreground/20 mb-4" />
      <h3 class="text-base font-medium mb-2">No Jupyter Servers</h3>
      <p class="text-sm text-muted-foreground text-center mb-4">
        Add a Jupyter server to run code cells in your notebooks.
      </p>
      <Button @click="showAddServerDialog = true" class="shadow-sm">
        <Plus class="w-4 h-4 mr-2" />
        Add Server
      </Button>
    </div>
    
    <!-- Server List -->
    <ScrollArea v-else class="flex-1 w-full h-full">
      <div class="p-2">
        <ServerItem 
          v-for="server in jupyterStore.jupyterServers" 
          :key="`${server.ip}:${server.port}`"
          :server="server"
          :kernels="cachedKernels[`${server.ip}:${server.port}`]"
          @refresh="refreshKernels(server)"
          @remove="removeServer(server)"
          @connect-kernel="connectToKernel(server, $event)"
          @use-session="useSession($event)"
        />
      </div>
    </ScrollArea>

    <!-- Add Server Dialog -->
    <AddServerDialog 
      :open="showAddServerDialog"
      @update:open="showAddServerDialog = $event"
      :testing-connection="isTestingConnection"
      :is-parsing="isParsing"
      @add-server="addServer"
      @parse-url="parseJupyterUrl"
      v-model:form="serverForm"
    />
    
    <!-- Keyboard Shortcut -->
    <KeyboardShortcut 
      :ctrl="true"
      :shift="true"
      :keyName="'J'" 
      action="toggle Jupyter servers"
    />
  </BaseSidebar>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Server,
  Plus,
  RotateCw,
} from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useJupyterStore } from '@/stores/jupyterStore'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { toast } from '@/lib/utils'
import { BaseSidebar, KeyboardShortcut } from '@/components/ui/sidebars'
import ServerItem from './jupyter/ServerItem.vue'
import AddServerDialog from '@/components/editor/jupyter/AddServerDialog.vue'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useSidebarComposable } from '@/composables/useSidebarComposable'

const props = defineProps<{
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const jupyterStore = useJupyterStore()
const sidebarStore = useSidebarStore()
const jupyterService = new JupyterService()

// State
const showAddServerDialog = ref(false)
const isTestingConnection = ref(false)
const isRefreshing = ref<string | null>(null)
const serverForm = ref({
  name: '',
  ip: '',
  port: '',
  token: '',
  url: ''
})
const isParsing = ref(false)
const cachedKernels = ref<Record<string, KernelSpec[]>>({})

// Use the sidebar composable for consistent behavior but without width settings
const { } = useSidebarComposable({
  id: 'jupyter-servers',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'j'
  }
})

// No longer need resize handler

// Load kernels for a server
const refreshKernels = async (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  isRefreshing.value = serverKey
  
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    cachedKernels.value[serverKey] = kernels
    toast(
       `Found ${kernels.length} kernels on ${server.ip}:${server.port}`,
    )
  } catch (error) {
    console.error('Failed to get kernels:', error)
    toast(`Could not connect to ${server.ip}:${server.port}`)
  } finally {
    isRefreshing.value = null
  }
}

// Refresh all servers' kernels
const refreshAllServers = async () => {
  if (jupyterStore.jupyterServers.length === 0) return
  
  let failCount = 0
  let successCount = 0
  
  for (const server of jupyterStore.jupyterServers) {
    const serverKey = `${server.ip}:${server.port}`
    isRefreshing.value = serverKey
    
    try {
      const kernels = await jupyterService.getAvailableKernels(server)
      cachedKernels.value[serverKey] = kernels
      successCount++
    } catch (error) {
      console.error(`Failed to get kernels for ${serverKey}:`, error)
      failCount++
    }
  }
  
  isRefreshing.value = null
  
  if (successCount > 0) {
    toast(`Refreshed ${successCount} server${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`)
  } else if (failCount > 0) {
    toast(`Failed to refresh ${failCount} server${failCount !== 1 ? 's' : ''}`)
  }
}

// Add a new server
const addServer = async () => {
  isTestingConnection.value = true
  
  try {
    // Create server object
    const newServer: JupyterServer = {
      name: serverForm.value.name.trim(),
      ip: serverForm.value.ip.trim(),
      port: serverForm.value.port.trim(),
      token: serverForm.value.token.trim(),
    }
    
    // Validate the server connection
    const result = await jupyterService.testConnection(newServer)
    if (!result?.success) {
      toast('Could not connect to Jupyter server')
      isTestingConnection.value = false
      return
    }
    
    // Add the server
    await jupyterStore.addServer(newServer)
    
    // Get initial kernels
    const kernels = await jupyterService.getAvailableKernels(newServer)
    cachedKernels.value[`${newServer.ip}:${newServer.port}`] = kernels
    
    // Reset form and close dialog
    serverForm.value = {
      name: '',
      ip: '',
      port: '',
      token: '',
      url: ''
    }
    
    showAddServerDialog.value = false
    
    toast(`Added server ${newServer.ip}:${newServer.port} with ${kernels.length} kernels`)
  } catch (error) {
    console.error('Failed to add server:', error)
    toast('Failed to add Jupyter server')
  } finally {
    isTestingConnection.value = false
  }
}

// Remove a server
const removeServer = async (server: JupyterServer) => {
  try {
    await jupyterStore.removeServer(server)
    const serverKey = `${server.ip}:${server.port}`
    delete cachedKernels.value[serverKey]
    toast(`Removed server ${server.ip}:${server.port}`)
  } catch (error) {
    console.error('Failed to remove server:', error)
    toast('Failed to remove Jupyter server')
  }
}

// Connect to a kernel
const connectToKernel = (server: JupyterServer, kernelName: string) => {
  toast(`Connected to ${kernelName} kernel`)
}

// Use an existing session
const useSession = (sessionId: string) => {
  toast('Connected to existing Jupyter session')
}

// Parse a Jupyter URL
const parseJupyterUrl = () => {
  isParsing.value = true
  try {
    if (!serverForm.value.url) {
      toast('Please enter a Jupyter URL')
      isParsing.value = false
      return
    }
    const parsed = jupyterService.parseJupyterUrl(serverForm.value.url)
    if (parsed) {
      serverForm.value.ip = parsed.ip
      serverForm.value.port = parsed.port
      serverForm.value.token = parsed.token
      toast('URL parsed successfully')
    } else {
      toast('Could not parse Jupyter URL')
    }
  } catch (error) {
    console.error('Failed to parse URL:', error)
    toast('Could not parse Jupyter URL')
  } finally {
    isParsing.value = false
  }
}

// Initial data loading
onMounted(async () => {
  for (const server of jupyterStore.jupyterServers) {
    try {
      const serverKey = `${server.ip}:${server.port}`
      const kernels = await jupyterService.getAvailableKernels(server)
      cachedKernels.value[serverKey] = kernels
    } catch (error) {
      console.error(`Failed to get kernels for ${server.ip}:${server.port}:`, error)
    }
  }
})
</script>