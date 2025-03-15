<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer } from '@/types/jupyter'
import { ServerIcon, PlayCircleIcon, ArrowPathIcon, CpuChipIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
        <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isRefreshingSessions }" />
        {{ isRefreshingSessions ? 'Refreshing...' : 'Refresh All' }}
      </Button>
    </div>

    <div v-for="server in config.jupyterServers" :key="`${server.ip}:${server.port}`">
      <Card>
        <CardHeader>
          <div class="flex items-center gap-3">
            <ServerIcon class="w-5 h-5 text-muted-foreground" />
            <CardTitle class="text-base">
              <code>{{ server.ip }}:{{ server.port }}</code>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sessions" class="w-full">
            <TabsList class="w-full grid grid-cols-2">
              <TabsTrigger value="sessions" class="flex items-center gap-2">
                <PlayCircleIcon class="w-4 h-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="kernels" class="flex items-center gap-2">
                <CpuChipIcon class="w-4 h-4" />
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
                    <PlayCircleIcon class="w-4 h-4 text-green-500" />
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
                    <CpuChipIcon class="w-4 h-4" :class="{
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
</template> 