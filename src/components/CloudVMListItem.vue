<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CloudVM, JupyterServer } from '@/types/jupyter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JupyterService } from '@/services/jupyterService'
import LoadingSpinner from './LoadingSpinner.vue'
import {
  ServerIcon,
  CloudIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  vm: CloudVM
}>()

const emit = defineEmits<{
  'add-server': [server: JupyterServer]
  'remove': [vm: CloudVM]
}>()

const jupyterService = new JupyterService()
const isTestingConnection = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Status badge color
const statusColor = computed(() => {
  switch (props.vm.status) {
    case 'running':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'creating':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'stopped':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
})

// Status icon
const StatusIcon = computed(() => {
  switch (props.vm.status) {
    case 'running':
      return CheckCircleIcon
    case 'creating':
      return ClockIcon
    case 'stopped':
      return ServerIcon
    case 'error':
      return ExclamationCircleIcon
    default:
      return ServerIcon
  }
})

// Provider name
const providerName = computed(() => {
  const providers: Record<string, string> = {
    aws: 'AWS',
    gcp: 'Google Cloud',
    azure: 'Azure',
    digitalocean: 'DigitalOcean',
  }
  return providers[props.vm.provider] || props.vm.provider
})

// Test server connection
const testConnection = async () => {
  if (!props.vm.ipAddress || !props.vm.jupyterToken) return
  
  isTestingConnection.value = true
  try {
    const server: JupyterServer = {
      ip: props.vm.ipAddress,
      port: '8888',
      token: props.vm.jupyterToken,
    }
    
    const result = await jupyterService.testConnection(server)
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Add server to Jupyter servers
const addServer = () => {
  if (!props.vm.ipAddress || !props.vm.jupyterToken) return
  
  const server: JupyterServer = {
    ip: props.vm.ipAddress,
    port: '8888',
    token: props.vm.jupyterToken,
  }
  
  emit('add-server', server)
}

// Remove VM
const removeVM = () => {
  emit('remove', props.vm)
}
</script>

<template>
  <div class="rounded-lg border p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
    <div class="flex items-start justify-between">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <h4 class="font-medium text-lg">{{ vm.name }}</h4>
          <Badge :class="statusColor" class="ml-2">
            <component :is="StatusIcon" class="w-3.5 h-3.5 mr-1" />
            {{ vm.status }}
          </Badge>
        </div>
        
        <div class="space-y-1 text-sm text-muted-foreground">
          <div class="flex items-center gap-2">
            <CloudIcon class="w-4 h-4" />
            <span>{{ providerName }} ({{ vm.region }})</span>
          </div>
          <div class="flex items-center gap-2">
            <ServerIcon class="w-4 h-4" />
            <span>{{ vm.instanceType }}</span>
          </div>
          <div v-if="vm.ipAddress" class="flex items-center gap-2">
            <GlobeAltIcon class="w-4 h-4" />
            <span>{{ vm.ipAddress }}</span>
          </div>
        </div>
        
        <div v-if="testResult" class="mt-2">
          <p
            class="text-sm"
            :class="{
              'text-green-600': testResult.success,
              'text-red-600': !testResult.success,
            }"
          >
            {{ testResult.message }}
          </p>
        </div>
      </div>
      
      <div class="flex flex-col gap-2">
        <Button
          v-if="vm.status === 'running'"
          variant="outline"
          size="sm"
          @click="testConnection"
          :disabled="isTestingConnection || !vm.ipAddress || !vm.jupyterToken"
        >
          <LoadingSpinner v-if="isTestingConnection" />
          <ArrowPathIcon v-else class="w-4 h-4 mr-1" />
          Test
        </Button>
        
        <Button
          v-if="vm.status === 'running' && (!testResult || testResult.success)"
          variant="default"
          size="sm"
          @click="addServer"
          :disabled="!vm.ipAddress || !vm.jupyterToken"
        >
          Add Server
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          @click="removeVM"
        >
          Remove
        </Button>
      </div>
    </div>
    
    <div v-if="vm.status === 'creating'" class="flex items-center justify-center p-4">
      <div class="flex flex-col items-center gap-2">
        <LoadingSpinner />
        <p class="text-sm text-muted-foreground">Setting up Jupyter server...</p>
      </div>
    </div>
    
    <div v-if="vm.jupyterUrl && vm.status === 'running'" class="mt-2 p-3 bg-muted rounded-md">
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium">Jupyter Server</p>
        <p class="text-sm">
          <span class="font-medium">URL:</span> {{ vm.jupyterUrl }}
        </p>
        <p class="text-sm">
          <span class="font-medium">Token:</span> {{ vm.jupyterToken }}
        </p>
      </div>
    </div>
  </div>
</template> 