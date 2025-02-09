<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import LoadingSpinner from './LoadingSpinner.vue'
import type { JupyterServer } from '@/types/jupyter'
import { ServerIcon, CpuChipIcon, ArrowPathIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()

// Form states
const serverForm = ref({
  ip: 'localhost',
  port: '8888',
  token: '',
})

const isTestingConnection = ref(false)
const isRefreshingKernels = ref(false)
const testResults = ref<Record<string, { success: boolean; message: string }>>({})

// Active tab state
const activeTab = ref('servers') // 'servers', 'kernels', or 'settings'

// Load config from store
const config = computed(() => {
  const nota = store.getCurrentNota(props.notaId)
  return (
    nota?.config || {
      jupyterServers: [],
      notebooks: [],
      kernels: {},
    }
  )
})

// Test server connection
const testConnection = async (server: JupyterServer) => {
  isTestingConnection.value = true
  try {
    const result = await jupyterService.testConnection(server)
    testResults.value[server.ip] = result
    if (result.success) {
      // Load available kernels
      await refreshKernels(server)
    }
  } catch (error) {
    testResults.value[server.ip] = {
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
      config.kernels[server.ip] = kernels
    })
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
  } finally {
    isRefreshingKernels.value = false
  }
}

// Add new server
const addServer = async () => {
  const server = {
    ip: serverForm.value.ip,
    port: serverForm.value.port,
    token: serverForm.value.token,
  }

  // Test connection before adding
  await testConnection(server)

  if (testResults.value[server.ip]?.success) {
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.jupyterServers) config.jupyterServers = []
      config.jupyterServers.push(server)
    })

    // Reset form
    serverForm.value = {
      ip: 'localhost',
      port: '8888',
      token: '',
    }
  }
}

// Remove server
const removeServer = async (server: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    await store.updateNotaConfig(props.notaId, (config) => {
      config.jupyterServers = config.jupyterServers.filter((s) => s.ip !== server.ip)
      if (config.kernels) {
        delete config.kernels[server.ip]
      }
    })
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold tracking-tight">Nota Configuration</h2>
      </div>

      <Tabs :default-value="activeTab" class="w-full" @update:value="activeTab = $event">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="servers">
            <div class="flex items-center justify-center gap-2 p-1">
              <ServerIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Servers</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="kernels">
            <div class="flex items-center justify-center gap-2 p-1">
              <CpuChipIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">Kernels</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <div class="flex items-center justify-center gap-2 p-1">
              <Cog6ToothIcon class="w-4 h-4 shrink-0" />
              <span class="text-sm">General Settings</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <!-- Servers Tab -->
        <TabsContent value="servers" class="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Servers</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                v-if="config.jupyterServers.length === 0"
                class="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
              >
                No servers configured yet
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="server in config.jupyterServers"
                  :key="server.ip"
                  class="rounded-lg border p-4 space-y-4 bg-slate-50 dark:bg-slate-900"
                >
                  <div class="flex items-center justify-between">
                    <div class="space-y-1">
                      <h4 class="font-medium">{{ server.ip }}:{{ server.port }}</h4>
                      <p
                        class="text-sm"
                        :class="{
                          'text-green-600': testResults[server.ip]?.success,
                          'text-red-600': testResults[server.ip]?.success === false,
                        }"
                      >
                        {{ testResults[server.ip]?.message || 'Not tested' }}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="testConnection(server)"
                        :disabled="isTestingConnection"
                      >
                        <LoadingSpinner v-if="isTestingConnection" />
                        <span v-else>Test Connection</span>
                      </Button>
                      <Button variant="destructive" size="sm" @click="removeServer(server)">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Server</CardTitle>
            </CardHeader>
            <CardContent>
              <form @submit.prevent="addServer" class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Server IP</label>
                  <Input v-model="serverForm.ip" placeholder="localhost" required />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Port</label>
                  <Input v-model="serverForm.port" placeholder="8888" required />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium">Token</label>
                  <Input v-model="serverForm.token" type="password" placeholder="Jupyter token" />
                </div>
                <Button type="submit" class="w-full">Add Server</Button>
              </form>
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
                  v-if="!config.kernels[server.ip]?.length"
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
                    v-for="kernel in config.kernels[server.ip]"
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
                            <span class="font-medium">{{ kernel.display_name }}</span>
                            <span
                              class="text-xs sn px-3 rounded-full bg-slate-100 dark:bg-slate-800 border font-medium"
                            >
                              {{ kernel.language }}
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

        <!-- Settings Tab -->
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <!-- Add general settings here -->
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
