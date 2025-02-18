<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import LoadingSpinner from './LoadingSpinner.vue'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { ServerIcon, CpuChipIcon, ArrowPathIcon, Cog6ToothIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ServerListItem from './ServerListItem.vue'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()

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

// Load config from store
const config = computed(() => {
  const nota = store.getCurrentNota(props.notaId)
  return (
    nota?.config || {
      jupyterServers: [],
      notebooks: [],
      kernels: {} as Record<string, KernelSpec[]>,
    }
  )
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
    s => s.ip.toLowerCase() === server.ip.toLowerCase() && s.port === server.port
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
  }
}

// Remove server
const removeServer = async (serverToRemove: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    await store.updateNotaConfig(props.notaId, (config) => {
      config.jupyterServers = config.jupyterServers.filter(
        (s) => !(s.ip === serverToRemove.ip && s.port === serverToRemove.port)
      )
      if (config.kernels) {
        delete config.kernels[serverToRemove.ip]
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

      <Tabs default-value="servers" class="w-full">
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
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Servers</CardTitle>
                  <CardDescription>Manage your Jupyter server connections</CardDescription>
                </div>
                <Button @click="showServerForm = !showServerForm" variant="outline" class="flex items-center gap-2">
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
                        @input="(e) => serverForm.ip = (e.target as HTMLInputElement).value"
                        type="text"
                        placeholder="localhost"
                        required
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-sm font-medium">Port</label>
                      <Input 
                        :value="serverForm.port"
                        @input="(e) => serverForm.port = (e.target as HTMLInputElement).value"
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
                      @input="(e) => serverForm.token = (e.target as HTMLInputElement).value"
                      type="password" 
                      placeholder="Jupyter token" 
                    />
                  </div>
                  <div class="flex items-center gap-2 justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      @click="() => {
                        showServerForm = false
                        serverForm.ip = ''
                        serverForm.port = ''
                        serverForm.token = ''
                      }"
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
                class="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
              >
                No servers configured yet
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
