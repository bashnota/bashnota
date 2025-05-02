<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Select Jupyter Server</DialogTitle>
        <DialogDescription>
          Choose a server to use for the shared session mode. This server will be used for all code blocks.
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div v-if="loading" class="flex justify-center py-6">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        
        <div v-else-if="servers.length === 0" class="text-center py-6 text-muted-foreground">
          <div class="mb-2">No servers found</div>
          <p class="text-sm">Add a server in the Jupyter configuration settings.</p>
        </div>
        
        <div v-else class="grid gap-3">
          <div v-for="server in servers" :key="`${server.ip}:${server.port}`" 
               class="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 cursor-pointer"
               @click="selectServer(server)">
            <div class="flex items-center space-x-3">
              <ServerIcon class="h-5 w-5 text-muted-foreground" />
              <div>
                <p class="font-medium">{{ server.name || 'Unnamed Server' }}</p>
                <p class="text-sm text-muted-foreground">{{ server.ip }}:{{ server.port }}</p>
              </div>
            </div>
            
            <span 
              v-if="selectedServer && server.ip === selectedServer.ip && server.port === selectedServer.port"
              class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon class="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          @click="cancel"
        >
          Cancel
        </Button>
        <Button 
          @click="confirm" 
          :disabled="!selectedServer || loading || testing"
          class="gap-2"
        >
          <Loader2 v-if="testing" class="h-4 w-4 animate-spin" />
          <span>{{ testing ? 'Testing Connection...' : 'Confirm' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ServerIcon, CheckIcon, Loader2 } from 'lucide-vue-next'
import { useJupyterStore } from '@/stores/jupyterStore'
import { JupyterService } from '@/services/jupyterService'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'
import type { JupyterServer } from '@/types/jupyter'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [server: JupyterServer]
  'cancel': []
}>()

const jupyterStore = useJupyterStore()
const jupyterService = new JupyterService()

const servers = computed(() => jupyterStore.jupyterServers || [])
const selectedServer = ref<JupyterServer | null>(null)
const loading = ref(false)
const testing = ref(false)

onMounted(() => {
  // If there's only one server, select it by default
  if (servers.value.length === 1) {
    selectedServer.value = servers.value[0]
  }
})

const selectServer = (server: JupyterServer) => {
  selectedServer.value = server
}

const confirm = async () => {
  if (!selectedServer.value) return
  
  testing.value = true
  try {
    // Test connection to the server first
    const result = await jupyterService.testConnection(selectedServer.value)
    
    if (result.success) {
      emit('select', selectedServer.value)
      emit('update:open', false)
    } else {
      toast('Connection Failed',`Could not connect to server: ${result.message}`,'destructive')
    }
  } catch (error) {
    logger.error('Error testing server connection:', error)
    toast('Connection Error', 'Failed to connect to the server. Please check your connection.','destructive')
  } finally {
    testing.value = false
  }
}

const cancel = () => {
  selectedServer.value = null
  emit('cancel')
  emit('update:open', false)
}
</script>