<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Link, Server, RotateCw } from 'lucide-vue-next'
import { toast } from '@/services/toast'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import ServerListItem from '@/features/editor/components/blocks/nota-config/ServerListItem.vue'

const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const jupyterService = new JupyterService()
const executionTimeoutSeconds = ref(codeExecutionStore.executionTimeoutSeconds)

const saveExecutionTimeout = () => {
  try {
    codeExecutionStore.setExecutionTimeoutSeconds(executionTimeoutSeconds.value)
    executionTimeoutSeconds.value = codeExecutionStore.executionTimeoutSeconds
    toast.success('Execution timeout saved')
  } catch (error) {
    executionTimeoutSeconds.value = codeExecutionStore.executionTimeoutSeconds
    toast.error(error instanceof Error ? error.message : 'Failed to save execution timeout')
  }
}

// Form states
const serverForm = ref<{
  ip: string
  port: string
  token: string
  url: string
}>({
  ip: '',
  port: '',
  token: '',
  url: '',
})

const isTestingConnection = ref(false)
const showServerForm = ref(false)
const destructiveDialogOpen = ref(false)
const pendingDestructiveAction = ref<
  { type: 'remove'; server: JupyterServer } | { type: 'reset' } | null
>(null)

// Refresh kernels for a server
const updateKernels = (
  server: JupyterServer,
  kernels: Parameters<typeof jupyterStore.updateKernels>[1],
) => {
  jupyterStore.updateKernels(server, kernels)
}

// Add new server
const addServer = async () => {
  // Validate form values
  if (!serverForm.value.ip || !serverForm.value.port) {
    toast({
      title: 'Validation Error',
      description: 'Please fill in both IP and Port fields',
      variant: 'destructive',
    })
    return
  }

  const server: JupyterServer = {
    ip: serverForm.value.ip.trim(),
    port: serverForm.value.port.trim(),
    token: serverForm.value.token.trim(),
  }

  isTestingConnection.value = true
  try {
    const testResult = await jupyterService.testConnection(server)

    if (!testResult?.success) {
      throw new Error(testResult?.message || 'Connection failed')
    }

    const wasAdded = jupyterStore.addServer(server)
    if (wasAdded) {
      serverForm.value = { ip: '', port: '', token: '', url: '' }
      showServerForm.value = false
    }
  } catch (error) {
    toast({
      title: 'Connection Failed',
      description: error instanceof Error ? error.message : 'Failed to add server',
      variant: 'destructive',
    })
  } finally {
    isTestingConnection.value = false
  }
}

const requestRemoveServer = (server: JupyterServer) => {
  pendingDestructiveAction.value = { type: 'remove', server }
  destructiveDialogOpen.value = true
}

// Parse Jupyter URL
const parseJupyterUrl = () => {
  if (!serverForm.value.url) {
    toast({
      title: 'URL Required',
      description: 'Please enter a Jupyter URL',
      variant: 'destructive',
    })
    return
  }

  const parsedServer = jupyterService.parseJupyterUrl(serverForm.value.url)
  if (parsedServer) {
    serverForm.value.ip = parsedServer.ip
    serverForm.value.port = parsedServer.port
    serverForm.value.token = parsedServer.token
    toast({
      title: 'URL Parsed',
      description: 'URL parsed successfully',
      variant: 'default',
    })
  } else {
    toast({
      title: 'Parse Error',
      description: 'Failed to parse Jupyter URL',
      variant: 'destructive',
    })
  }
}

// Reset to defaults
const requestResetToDefaults = () => {
  pendingDestructiveAction.value = { type: 'reset' }
  destructiveDialogOpen.value = true
}

const confirmDestructiveAction = () => {
  const action = pendingDestructiveAction.value
  if (!action) return

  if (action.type === 'remove') {
    jupyterStore.removeServer(action.server)
  } else {
    for (const server of [...jupyterStore.servers]) {
      jupyterStore.removeServer(server, { notify: false })
    }
    serverForm.value = { ip: '', port: '', token: '', url: '' }
    showServerForm.value = false
    toast.success('All Jupyter servers removed')
  }

  destructiveDialogOpen.value = false
  pendingDestructiveAction.value = null
}

// Expose methods for parent components
defineExpose({
  resetToDefaults: requestResetToDefaults,
})
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Overview -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Server class="h-5 w-5" />
              Jupyter Integration
            </CardTitle>
            <CardDescription>
              Connect to Jupyter servers for code execution and data analysis
            </CardDescription>
          </div>
          <Button
            @click="showServerForm = !showServerForm"
            variant="outline"
            class="flex items-center gap-2"
          >
            <Plus class="w-4 h-4" />
            Add Server
          </Button>
        </div>
      </CardHeader>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Execution lifecycle</CardTitle>
        <CardDescription>
          Stop a kernel that never becomes idle. Running code can always be interrupted from its
          code block.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex max-w-md items-end gap-3">
          <div class="flex-1 space-y-2">
            <Label for="jupyter-execution-timeout">Timeout (seconds)</Label>
            <Input
              id="jupyter-execution-timeout"
              v-model.number="executionTimeoutSeconds"
              type="number"
              min="5"
              max="3600"
              step="5"
            />
          </div>
          <Button type="button" variant="outline" @click="saveExecutionTimeout">
            Save timeout
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Allowed range: 5 seconds to 60 minutes. The default is 120 seconds.
        </p>
      </CardContent>
    </Card>

    <!-- Add New Server Form -->
    <Card v-if="showServerForm">
      <CardHeader>
        <CardTitle>Add New Jupyter Server</CardTitle>
        <CardDescription>Connect to a new Jupyter server for code execution</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="addServer" class="space-y-4">
          <!-- URL Input -->
          <div class="space-y-2">
            <Label for="jupyter-server-url" class="text-sm font-medium"
              >Jupyter URL (optional)</Label
            >
            <div class="flex gap-2">
              <Input
                id="jupyter-server-url"
                v-model="serverForm.url"
                type="text"
                placeholder="https://jupyter-server.example.com:8888/?token=abc123"
                class="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                @click="parseJupyterUrl"
                class="flex items-center gap-2"
              >
                <Link class="w-4 h-4" />
                Parse URL
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Paste a Jupyter URL (including Kaggle URLs) to automatically fill the fields below
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="jupyter-server-host" class="text-sm font-medium">Server host</Label>
              <Input
                id="jupyter-server-host"
                v-model="serverForm.ip"
                type="text"
                placeholder="localhost"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="jupyter-server-port" class="text-sm font-medium">Port</Label>
              <Input
                id="jupyter-server-port"
                v-model="serverForm.port"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="8888"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="jupyter-server-token" class="text-sm font-medium">Token</Label>
            <Input
              id="jupyter-server-token"
              v-model="serverForm.token"
              type="password"
              placeholder="Enter your Jupyter token"
            />
            <p class="text-xs text-muted-foreground">
              Optional but recommended for secure connections
            </p>
          </div>

          <div class="flex gap-2 pt-4">
            <Button type="submit" :disabled="isTestingConnection">
              {{ isTestingConnection ? 'Testing...' : 'Add Server' }}
            </Button>
            <Button type="button" variant="outline" @click="showServerForm = false">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Existing Servers -->
    <Card v-if="jupyterStore.servers && jupyterStore.servers.length > 0">
      <CardHeader>
        <CardTitle>Configured Servers</CardTitle>
        <CardDescription>Manage your existing Jupyter server connections</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div v-for="server in jupyterStore.servers" :key="`${server.ip}:${server.port}`">
            <ServerListItem
              :server="server"
              :kernels="jupyterStore.kernels[`${server.ip}:${server.port}`] || []"
              @remove="requestRemoveServer"
              @kernels-updated="updateKernels"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <Card v-else-if="!showServerForm">
      <CardContent class="pt-6">
        <div class="text-center py-12">
          <Server class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 class="text-lg font-medium mb-2">No Jupyter Servers Configured</h3>
          <p class="text-muted-foreground mb-4 max-w-md mx-auto">
            Add a Jupyter server to enable code execution and data analysis features.
          </p>
          <Button @click="showServerForm = true" class="flex items-center gap-2">
            <Plus class="w-4 h-4" />
            Add Your First Server
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Help & Documentation -->
    <Card>
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>Learn how to set up Jupyter integration</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div
              class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
            >
              <span class="text-xs font-medium text-primary">1</span>
            </div>
            <div>
              <h4 class="font-medium">Install Jupyter</h4>
              <p class="text-sm text-muted-foreground">
                Install Jupyter on your machine using
                <code class="px-1 py-0.5 bg-muted rounded text-xs">pip install jupyter</code>
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
            >
              <span class="text-xs font-medium text-primary">2</span>
            </div>
            <div>
              <h4 class="font-medium">Start Jupyter Server</h4>
              <p class="text-sm text-muted-foreground">
                Run <code class="px-1 py-0.5 bg-muted rounded text-xs">jupyter notebook</code> or
                <code class="px-1 py-0.5 bg-muted rounded text-xs">jupyter lab</code> to start the
                server
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div
              class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
            >
              <span class="text-xs font-medium text-primary">3</span>
            </div>
            <div>
              <h4 class="font-medium">Add Server</h4>
              <p class="text-sm text-muted-foreground">
                Copy the server URL with token and add it using the form above
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Remove all configured Jupyter servers</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="requestResetToDefaults" class="flex items-center gap-2">
          <RotateCw class="h-4 w-4" />
          Reset All Servers
        </Button>
      </CardContent>
    </Card>

    <AlertDialog v-model:open="destructiveDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{
              pendingDestructiveAction?.type === 'reset'
                ? 'Remove all Jupyter servers?'
                : 'Remove this Jupyter server?'
            }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="pendingDestructiveAction?.type === 'remove'">
              BashNota will forget
              <strong
                >{{ pendingDestructiveAction.server.ip }}:{{
                  pendingDestructiveAction.server.port
                }}</strong
              >. Running kernels on that server are not stopped.
            </template>
            <template v-else>
              BashNota will forget every configured Jupyter server. Running kernels are not stopped.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDestructiveAction = null">Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDestructiveAction"
          >
            {{
              pendingDestructiveAction?.type === 'reset' ? 'Remove all servers' : 'Remove server'
            }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
