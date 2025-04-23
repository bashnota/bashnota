<template>
  <BaseSidebar 
    title="Jupyter Servers" 
    :icon="Server" 
    position="right" 
    @close="$emit('close')"
  >
    <!-- Compact Header with Server Count in Header Subtitle -->
    <template #headerSubtitle>
      <p v-if="jupyterStore.jupyterServers.length > 0" class="text-xs text-muted-foreground">
        {{ jupyterStore.jupyterServers.length }} server{{ jupyterStore.jupyterServers.length !== 1 ? 's' : '' }}
      </p>
    </template>
    
    <!-- Header Actions -->
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
      <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="showAddServerDialog = true">
        <Plus class="w-3.5 h-3.5" />
      </Button>
    </template>
    
    <!-- Servers List -->
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
        <ServerItem 
          v-for="server in jupyterStore.jupyterServers"
          :key="`${server.ip}:${server.port}`"
          :server="server"
          :is-expanded="expandedServers[`${server.ip}:${server.port}`]"
          :is-refreshing="isRefreshing === `${server.ip}:${server.port}`"
          :test-results="testResults[`${server.ip}:${server.port}`]"
          :kernel-count="getKernelsForServer(server).length"
          :session-count="getSessionsForServer(server).length"
          :refreshed-timestamp="refreshedTimestamps[`${server.ip}:${server.port}`]"
          :kernels="getKernelsForServer(server)"
          :sessions="getSessionsForServer(server)"
          @expand="toggleServerExpanded(server)"
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
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { BaseSidebar, KeyboardShortcut } from '@/components/ui/sidebar'
import ServerItem from './jupyter/ServerItem.vue'
import AddServerDialog from './jupyter/AddServerDialog.vue'

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
// Initialize expandedServers with false for each server
const expandedServers = ref<Record<string, boolean>>({})

// Helper function to ensure server key exists in expandedServers
const ensureServerKey = (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  if (expandedServers.value[serverKey] === undefined) {
    expandedServers.value[serverKey] = false
  }
  return serverKey
}
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
  const serverKey = ensureServerKey(server)
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
      const serverKey = ensureServerKey(server)
      expandedServers.value[serverKey] = true
      
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
  const serverKey = ensureServerKey(server)
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
    const serverKey = ensureServerKey(server)
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

// Check connections on mount
onMounted(async () => {
  // Initialize expandedServers for all servers and check connection status
  for (const server of jupyterStore.jupyterServers) {
    ensureServerKey(server)
    await testConnection(server)
  }
  
  // Auto-expand if there's only one server
  if (jupyterStore.jupyterServers.length === 1) {
    const server = jupyterStore.jupyterServers[0]
    const serverKey = ensureServerKey(server)
    expandedServers.value[serverKey] = true
  }
})

// Watch for changes in the jupyterServers array
watch(() => jupyterStore.jupyterServers.length, async (newLength, oldLength) => {
  // If a new server was added, check its connection
  if (newLength > oldLength) {
    const newServer = jupyterStore.jupyterServers[newLength - 1]
    if (newServer) {
      // Initialize expandedServers for the new server
      ensureServerKey(newServer)
      await testConnection(newServer)
    }
  }
})
</script>