<template>
  <BaseSidebar 
    id="jupyter-servers"
    title="Jupyter Servers"
    :icon="Server"
    position="right" 
    @close="$emit('close')"
  >
    <template #headerActions>
      <Tooltip content="Refresh All Servers">
        <Button 
          size="sm" 
          variant="ghost" 
          class="h-7 w-7 p-0" 
          @click="handleRefreshAll"
          :disabled="isAnyRefreshing"
        >
          <RotateCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isAnyRefreshing }" />
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
      <p v-if="hasServers" class="text-xs text-muted-foreground">
        {{ servers.length }} server{{ servers.length !== 1 ? 's' : '' }}
        <span v-if="totalSessions > 0" class="ml-1">
          • {{ totalSessions }} session{{ totalSessions !== 1 ? 's' : '' }}
        </span>
      </p>
    </template>
    
    <!-- No Servers State -->
    <div 
      v-if="!hasServers" 
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
      <div class="p-2 space-y-2">
        <ServerItem 
          v-for="server in servers" 
          :key="createServerKey(server)"
          :server="server"
          :kernels="getKernelsForServer(server)"
          :sessions="getSessionsForServer(server)"
          :running-kernels="getRunningKernelsForServer(server)"
          :is-refreshing="isServerRefreshing(server)"
          :test-result="getTestResultForServer(server)"
          :last-updated="getLastUpdatedForServer(server)"
          @refresh="handleServerRefresh(server)"
          @remove="handleServerRemove(server)"
          @connect-kernel="handleKernelConnect(server, $event)"
          @use-session="handleSessionUse($event)"
        />
      </div>
    </ScrollArea>

    <!-- Add Server Dialog -->
    <AddServerDialog 
      :open="showAddServerDialog"
      @update:open="showAddServerDialog = $event"
      :testing-connection="isTestingConnection"
      :is-parsing="isParsing"
      @add-server="handleAddServer"
      @parse-url="handleParseUrl"
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
import { ref, computed } from 'vue'
import {
  Server,
  Plus,
  RotateCw,
} from 'lucide-vue-next'
import { ScrollArea } from '@/ui/scroll-area'
import { Button } from '@/ui/button'
import { Tooltip } from '@/ui/tooltip'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import { BaseSidebar, KeyboardShortcut } from '@/ui/sidebars'
import ServerItem from '@/features/jupyter/components/ServerItem.vue'
import AddServerDialog from '@/features/editor/components/jupyter/AddServerDialog.vue'
import { useSidebarComposable } from '@/composables/useSidebarComposable'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'
import { useJupyterSessions } from '@/features/jupyter/composables/useJupyterSessions'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'

const props = defineProps<{
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()

// Composables
const { } = useSidebarComposable({
  id: 'jupyter-servers',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'j'
  }
})

const {
  // State
  servers,
  hasServers,
  isAnyRefreshing,
  isTestingConnection,
  isParsing,
  serverForm,
  
  // Operations
  refreshKernels,
  refreshAllServers,
  addServer,
  removeServer,
  parseJupyterUrl,
  resetForm,
  
  // Utilities
  getKernelsForServer,
  getTestResultForServer,
  isServerRefreshing,
  createServerKey
} = useJupyterServers({
  autoLoadKernels: true,
  showToasts: true
})

const {
  // State
  totalSessions,
  
  // Operations
  refreshSessions,
  connectToSession,
  connectToKernel,
  
  // Getters
  getSessionsForServer,
  getKernelsForServer: getRunningKernelsForServer
} = useJupyterSessions({
  showToasts: true
})

// Local state
const showAddServerDialog = ref(false)
const lastUpdatedTimes = ref<Record<string, Date>>({})

// Computed properties
const getLastUpdatedForServer = (server: JupyterServer): Date | undefined => {
  const serverKey = createServerKey(server)
  return lastUpdatedTimes.value[serverKey]
}

// Event handlers
const handleRefreshAll = async () => {
  await refreshAllServers()
  
  // Update last refreshed times for all servers
  servers.value.forEach(server => {
    const serverKey = createServerKey(server)
    lastUpdatedTimes.value[serverKey] = new Date()
  })
}

const handleServerRefresh = async (server: JupyterServer) => {
  // Refresh both kernels and sessions
  await Promise.all([
    refreshKernels(server),
    refreshSessions(server)
  ])
  
  // Update last refreshed time
  const serverKey = createServerKey(server)
  lastUpdatedTimes.value[serverKey] = new Date()
}

const handleServerRemove = async (server: JupyterServer) => {
  const success = await removeServer(server)
  if (success) {
    // Clean up last updated time
    const serverKey = createServerKey(server)
    delete lastUpdatedTimes.value[serverKey]
  }
}

const handleKernelConnect = (server: JupyterServer, kernelName: string) => {
  connectToKernel(server, kernelName)
}

const handleSessionUse = (sessionId: string) => {
  connectToSession(sessionId)
}

const handleAddServer = async () => {
  const success = await addServer()
  if (success) {
    showAddServerDialog.value = false
  }
}

const handleParseUrl = () => {
  parseJupyterUrl()
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>







