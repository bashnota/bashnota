<script setup lang="ts">
import { ref } from 'vue'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import { Server, Plus, Link } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Input } from '@/ui/input'
import ServerListItem from '@/features/editor/components/blocks/nota-config/ServerListItem.vue'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'

const jupyterStore = useJupyterStore()
const jupyterService = new JupyterService()

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
const testResults = ref<Record<string, { success: boolean; message: string }>>({})
const showServerForm = ref(false)

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
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    jupyterStore.updateKernels(server, kernels)
  } catch (error) {
    logger.error('Failed to refresh kernels:', error)
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
  }

  // Test connection before adding
  toast('Testing connection to server...')
  await testConnection(server)

  const serverKey = `${server.ip}:${server.port}`
  const testResult = testResults.value[serverKey]
  
  if (testResult?.success) {
    jupyterStore.addServer(server)
    // Reset form and hide it
    serverForm.value = { ip: '', port: '', token: '', url: '' }
    showServerForm.value = false
    toast('Server added successfully')
  } else {
    // Provide more detailed failure message
    const errorMessage = testResult?.message || 'Connection failed'
    toast(`Failed to add server: ${errorMessage}`)
    // Keep the form open so user can fix the issues
  }
}

// Remove server
const removeServer = async (serverToRemove: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    jupyterStore.removeServer(serverToRemove)
  }
}

// Parse Jupyter URL
const parseJupyterUrl = () => {
  if (!serverForm.value.url) {
    toast('Please enter a Jupyter URL')
    return
  }

  const parsedServer = jupyterService.parseJupyterUrl(serverForm.value.url)
  if (parsedServer) {
    serverForm.value.ip = parsedServer.ip
    serverForm.value.port = parsedServer.port
    serverForm.value.token = parsedServer.token
    toast('URL parsed successfully')
  } else {
    toast('Failed to parse Jupyter URL')
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle>Jupyter Servers</CardTitle>
          <CardDescription>Manage your Jupyter server connections</CardDescription>
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
    <CardContent>
      <!-- New Server Form -->
      <div v-if="showServerForm" class="mb-6 border rounded-lg p-4 bg-muted/50">
        <form @submit.prevent="addServer" class="space-y-4">
          <!-- URL Input -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Jupyter URL (Optional)</label>
            <div class="flex gap-2">
              <Input
                :value="serverForm.url"
                @input="(e: Event) => serverForm.url = (e.target as HTMLInputElement).value"
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
              <label class="text-sm font-medium">Server IP</label>
              <Input
                :value="serverForm.ip"
                @input="(e: Event) => serverForm.ip = (e.target as HTMLInputElement).value"
                type="text"
                placeholder="localhost"
                required
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Port</label>
              <Input
                :value="serverForm.port"
                @input="(e: Event) => serverForm.port = (e.target as HTMLInputElement).value"
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
              @input="(e: Event) => serverForm.token = (e.target as HTMLInputElement).value"
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
                serverForm.url = ''
              }"
              :disabled="isTestingConnection"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              :disabled="isTestingConnection"
              :class="{'pointer-events-none': isTestingConnection}"
            >
              <span v-if="isTestingConnection" class="flex items-center gap-2">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing...
              </span>
              <span v-else>Add Server</span>
            </Button>
          </div>
        </form>
      </div>

      <!-- Server List -->
      <div
        v-if="jupyterStore.jupyterServers.length === 0"
        class="rounded-lg border border-dashed p-8 text-center"
      >
        <Server class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p class="text-sm font-medium mb-2">No Jupyter Servers Configured</p>
        <p class="text-sm text-muted-foreground max-w-md mx-auto">
          Add a Jupyter server to enable code execution in your notebooks. You can connect to a local or remote Jupyter server.
        </p>
      </div>

      <div v-else class="space-y-4">
        <ServerListItem
          v-for="server in jupyterStore.jupyterServers"
          :key="`${server.ip}:${server.port}`"
          :server="server"
          :kernels="jupyterStore.kernels[`${server.ip}:${server.port}`]"
          @remove="removeServer"
          @kernels-updated="refreshKernels"
        />
      </div>
    </CardContent>
  </Card>
</template> 







