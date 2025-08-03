<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Link, Server, RotateCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import ServerListItem from '@/features/editor/components/blocks/nota-config/ServerListItem.vue'
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
const showServerForm = ref(false)

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
    toast({
      title: 'Validation Error',
      description: 'Please fill in both IP and Port fields',
      variant: 'destructive'
    })
    return
  }

  const server: JupyterServer = {
    ip: serverForm.value.ip.trim(),
    port: serverForm.value.port.trim(),
    token: serverForm.value.token.trim(),
  }

  // Test connection before adding
  toast({
    title: 'Testing Connection',
    description: 'Testing connection to server...',
    variant: 'default'
  })
  
  const testResult = await jupyterService.testConnection(server)
  
  if (testResult?.success) {
    jupyterStore.addServer(server)
    // Reset form and hide it
    serverForm.value = { ip: '', port: '', token: '', url: '' }
    showServerForm.value = false
    toast({
      title: 'Success',
      description: 'Server added successfully',
      variant: 'default'
    })
  } else {
    // Provide more detailed failure message
    const errorMessage = testResult?.message || 'Connection failed'
    toast({
      title: 'Connection Failed',
      description: `Failed to add server: ${errorMessage}`,
      variant: 'destructive'
    })
    // Keep the form open so user can fix the issues
  }
}

// Remove server
const removeServer = async (serverToRemove: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    jupyterStore.removeServer(serverToRemove)
    toast({
      title: 'Server Removed',
      description: 'Jupyter server has been removed',
      variant: 'default'
    })
  }
}

// Parse Jupyter URL
const parseJupyterUrl = () => {
  if (!serverForm.value.url) {
    toast({
      title: 'URL Required',
      description: 'Please enter a Jupyter URL',
      variant: 'destructive'
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
      variant: 'default'
    })
  } else {
    toast({
      title: 'Parse Error',
      description: 'Failed to parse Jupyter URL',
      variant: 'destructive'
    })
  }
}

// Reset to defaults
const resetToDefaults = () => {
  if (confirm('Are you sure you want to remove all Jupyter servers?')) {
    // Clear all servers
    if (jupyterStore.servers) {
      jupyterStore.servers.forEach(server => {
        jupyterStore.removeServer(server)
      })
    }
    
    // Reset form
    serverForm.value = { ip: '', port: '', token: '', url: '' }
    showServerForm.value = false
    
    toast({
      title: 'Settings Reset',
      description: 'All Jupyter servers have been removed',
      variant: 'default'
    })
  }
}

onMounted(() => {
  // Any initialization if needed
})

// Expose methods for parent components
defineExpose({
  resetToDefaults
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
            <Label class="text-sm font-medium">Jupyter URL (Optional)</Label>
            <div class="flex gap-2">
              <Input
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
              <Label class="text-sm font-medium">Server IP</Label>
              <Input
                v-model="serverForm.ip"
                type="text"
                placeholder="localhost"
                required
              />
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-medium">Port</Label>
              <Input
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
            <Label class="text-sm font-medium">Token</Label>
            <Input
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
          <div
            v-for="server in jupyterStore.servers"
            :key="`${server.ip}:${server.port}`"
          >
            <ServerListItem
              :server="server"
              :kernels="jupyterStore.kernels[`${server.ip}:${server.port}`] || []"
              @remove="removeServer"
              @kernels-updated="refreshKernels"
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
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-medium text-primary">1</span>
            </div>
            <div>
              <h4 class="font-medium">Install Jupyter</h4>
              <p class="text-sm text-muted-foreground">Install Jupyter on your machine using <code class="px-1 py-0.5 bg-muted rounded text-xs">pip install jupyter</code></p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-medium text-primary">2</span>
            </div>
            <div>
              <h4 class="font-medium">Start Jupyter Server</h4>
              <p class="text-sm text-muted-foreground">Run <code class="px-1 py-0.5 bg-muted rounded text-xs">jupyter notebook</code> or <code class="px-1 py-0.5 bg-muted rounded text-xs">jupyter lab</code> to start the server</p>
            </div>
          </div>
          
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-medium text-primary">3</span>
            </div>
            <div>
              <h4 class="font-medium">Add Server</h4>
              <p class="text-sm text-muted-foreground">Copy the server URL with token and add it using the form above</p>
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
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2">
          <RotateCw class="h-4 w-4" />
          Reset All Servers
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 