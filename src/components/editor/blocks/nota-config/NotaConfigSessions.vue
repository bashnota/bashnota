<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer } from '@/types/jupyter'
import { Server, PlayCircle, RotateCw, Cpu, Trash2, XCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/lib/utils'

const props = defineProps<{
  notaId: string
  config: {
    jupyterServers: JupyterServer[]
    savedSessions: Array<{ id: string; name: string }>
  }
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()
const isRefreshingSessions = ref(false)
const sessions = ref<Record<string, Array<{
  id: string
  name: string
  path: string
  kernel: {
    id: string
    name: string
    lastActivity: string
  }
}>>>({})
const runningKernels = ref<Record<string, Array<{
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}>>>({})
const isDeletingKernels = ref<Record<string, boolean>>({})

// Refresh sessions for a server
const refreshSessions = async (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  try {
    const result = await jupyterService.testConnection(server)
    if (result.success) {
      const [serverSessions, serverKernels] = await Promise.all([
        jupyterService.getActiveSessions(server),
        jupyterService.getRunningKernels(server)
      ])
      sessions.value[serverKey] = serverSessions
      runningKernels.value[serverKey] = serverKernels
    } else {
      sessions.value[serverKey] = []
      runningKernels.value[serverKey] = []
    }
  } catch (error) {
    console.error('Failed to refresh sessions:', error)
    sessions.value[serverKey] = []
    runningKernels.value[serverKey] = []
  }
}

// Refresh all sessions
const refreshAllSessions = async () => {
  isRefreshingSessions.value = true
  try {
    await Promise.all(props.config.jupyterServers.map(refreshSessions))
  } finally {
    isRefreshingSessions.value = false
  }
}

// Format relative time
const getRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Delete a specific kernel
const deleteKernel = async (server: JupyterServer, kernelId: string) => {
  const serverKey = `${server.ip}:${server.port}`
  isDeletingKernels.value[kernelId] = true
  
  try {
    await jupyterService.deleteKernel(server, kernelId)
    await refreshSessions(server)
    toast('Kernel deleted successfully')
  } catch (error) {
    console.error('Failed to delete kernel:', error)
    toast('Failed to delete kernel')
  } finally {
    isDeletingKernels.value[kernelId] = false
  }
}

// Clean up all idle kernels on a server
const cleanIdleKernels = async (server: JupyterServer) => {
  const serverKey = `${server.ip}:${server.port}`
  const idleKernels = runningKernels.value[serverKey]?.filter(k => k.executionState === 'idle') || []
  
  if (idleKernels.length === 0) {
    toast('No idle kernels to clean')
    return
  }

  try {
    await Promise.all(idleKernels.map(kernel => jupyterService.deleteKernel(server, kernel.id)))
    await refreshSessions(server)
    toast(`Cleaned ${idleKernels.length} idle kernel(s)`)
  } catch (error) {
    console.error('Failed to clean idle kernels:', error)
    toast('Failed to clean some kernels')
  }
}

// Load sessions on mount
onMounted(refreshAllSessions)
</script>

<template>
  <div v-if="config.jupyterServers.length === 0">
    <Alert>
      <AlertDescription>
        No servers configured. Add a server to view active sessions and kernels.
      </AlertDescription>
    </Alert>
  </div>

  <div v-else class="space-y-6">
    <div class="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        @click="refreshAllSessions"
        :disabled="isRefreshingSessions"
        class="flex items-center gap-2"
      >
        <RotateCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshingSessions }" />
        {{ isRefreshingSessions ? 'Refreshing...' : 'Refresh All' }}
      </Button>
    </div>

    <div v-for="server in config.jupyterServers" :key="`${server.ip}:${server.port}`">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Server class="w-5 h-5 text-muted-foreground" />
              <CardTitle class="text-base">
                <code>{{ server.ip }}:{{ server.port }}</code>
              </CardTitle>
            </div>
            <Button 
              v-if="runningKernels[`${server.ip}:${server.port}`]?.some(k => k.executionState === 'idle')"
              variant="outline"
              size="sm"
              @click="cleanIdleKernels(server)"
              class="flex items-center gap-2"
            >
              <XCircle class="w-4 h-4" />
              Clean Idle Kernels
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sessions" class="w-full">
            <TabsList class="w-full grid grid-cols-2">
              <TabsTrigger value="sessions" class="flex items-center gap-2">
                <PlayCircle class="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="kernels" class="flex items-center gap-2">
                <Cpu class="w-4 h-4" />
                Kernels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions">
              <div v-if="!sessions[`${server.ip}:${server.port}`]?.length" class="text-sm text-muted-foreground py-4">
                No active sessions on this server.
              </div>
              <div v-else class="space-y-3 py-4">
                <div 
                  v-for="session in sessions[`${server.ip}:${server.port}`]" 
                  :key="session.id"
                  class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div class="flex items-center gap-3">
                    <PlayCircle class="w-4 h-4 text-green-500" />
                    <div>
                      <div class="font-medium">{{ session.name || 'Untitled' }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ session.kernel.name }} • Last activity {{ getRelativeTime(session.kernel.lastActivity) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kernels">
              <div v-if="!runningKernels[`${server.ip}:${server.port}`]?.length" class="text-sm text-muted-foreground py-4">
                No running kernels on this server.
              </div>
              <div v-else class="space-y-3 py-4">
                <div 
                  v-for="kernel in runningKernels[`${server.ip}:${server.port}`]" 
                  :key="kernel.id"
                  class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div class="flex items-center gap-3">
                    <Cpu class="w-4 h-4" :class="{
                      'text-green-500': kernel.executionState === 'idle',
                      'text-yellow-500': kernel.executionState === 'busy',
                      'text-blue-500': kernel.executionState === 'starting'
                    }" />
                    <div>
                      <div class="font-medium">{{ kernel.name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ kernel.executionState }} • {{ kernel.connections }} connection(s) • Last activity {{ getRelativeTime(kernel.lastActivity) }}
                      </div>
                    </div>
                  </div>
                  <Button
                    v-if="kernel.executionState !== 'busy'"
                    variant="ghost"
                    size="sm"
                    :disabled="isDeletingKernels[kernel.id]"
                    @click="deleteKernel(server, kernel.id)"
                    class="text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-4 h-4" :class="{ 'animate-spin': isDeletingKernels[kernel.id] }" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
</template>