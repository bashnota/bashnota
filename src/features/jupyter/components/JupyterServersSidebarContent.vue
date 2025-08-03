<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Server, RotateCw, Plus } from 'lucide-vue-next'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'
import ServerItem from './ServerItem.vue'
import AddServerDialog from '@/features/editor/components/jupyter/AddServerDialog.vue'

const props = defineProps<{
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const showAddServerDialog = ref(false)

const {
  servers,
  hasServers,
  isAnyRefreshing,
  isTestingConnection,
  isParsing,
  serverForm,
  cachedKernels,
  testResults,
  getKernelsForServer,
  isServerRefreshing,
  getTestResultForServer,
  createServerKey,
  refreshKernels,
  refreshAllServers,
  addServer,
  removeServer,
  parseJupyterUrl,
  resetForm,
  initializeKernels
} = useJupyterServers()

// Computed properties for session and kernel data
const totalSessions = computed(() => {
  // This would need to be implemented based on your session tracking logic
  return 0
})

const getSessionsForServer = (server: any) => {
  // This would need to be implemented based on your session tracking logic
  return []
}

const getRunningKernelsForServer = (server: any) => {
  // This would need to be implemented based on your running kernels logic
  return []
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

const getLastUpdatedForServer = (server: any) => {
  // This would need to be implemented based on your last updated tracking
  return new Date()
}

// Handler functions
const handleRefreshAll = () => refreshAllServers()
const handleServerRefresh = (server: any) => refreshKernels(server)
const handleServerRemove = (server: any) => removeServer(server)
const handleKernelConnect = (server: any, kernel: any) => {
  // This would need to be implemented based on your kernel connection logic
  console.log('Connect kernel:', kernel, 'on server:', server)
}
const handleSessionUse = (session: any) => {
  // This would need to be implemented based on your session usage logic
  console.log('Use session:', session)
}

const setupPolling = () => {
  // This would need to be implemented if you want polling
}

const cleanup = () => {
  // This would need to be implemented for cleanup
}

onMounted(() => {
  setupPolling()
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <!-- Toolbar -->
  <div class="p-3 border-b">
    <div class="flex items-center gap-2">
      <Tooltip content="Refresh All Servers">
        <Button 
          size="sm" 
          variant="ghost" 
          class="h-8 w-8 p-0" 
          @click="handleRefreshAll"
          :disabled="isAnyRefreshing"
        >
          <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isAnyRefreshing }" />
        </Button>
      </Tooltip>
      <Tooltip content="Add Server">
        <Button 
          size="sm" 
          variant="ghost" 
          class="h-8 w-8 p-0" 
          @click="showAddServerDialog = true"
        >
          <Plus class="w-4 h-4" />
        </Button>
      </Tooltip>
    </div>
    
    <div v-if="hasServers" class="mt-2">
      <p class="text-xs text-muted-foreground">
        {{ servers.length }} server{{ servers.length !== 1 ? 's' : '' }}
      </p>
    </div>
  </div>

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
    :form="serverForm"
    :testing-connection="isTestingConnection"
    :is-parsing="isParsing"
    @add-server="handleAddServer"
    @parse-url="handleParseUrl"
    @update:form="serverForm = $event"
  />
</template>
