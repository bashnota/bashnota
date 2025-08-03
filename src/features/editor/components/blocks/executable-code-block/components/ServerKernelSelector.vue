<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
// ButtonGroup functionality will be replaced with flex grouping
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Server } from 'lucide-vue-next'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'

interface Props {
  isSharedSessionMode: boolean
  isExecuting: boolean
  selectedServer?: string
  selectedKernel?: string
  availableServers: JupyterServer[]
  availableKernels: KernelSpec[]
  isServerOpen: boolean
  isKernelOpen: boolean
}

interface Emits {
  'update:isServerOpen': [value: boolean]
  'update:isKernelOpen': [value: boolean]
  'server-change': [serverId: string]
  'kernel-change': [kernelName: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const serverOptions = computed(() => 
  props.availableServers.map(server => ({
    value: `${server.ip}:${server.port}`,
    label: `${server.ip}:${server.port}`,
  }))
)

const kernelOptions = computed(() => 
  props.availableKernels.map(kernel => ({
    value: kernel.name,
    label: kernel.spec.display_name || kernel.name
  }))
)

const isConfigurationIncomplete = computed(() => 
  !props.selectedServer || 
  props.selectedServer === 'none' || 
  !props.selectedKernel || 
  props.selectedKernel === 'none'
)

const buttonTitle = computed(() => {
  if (props.isSharedSessionMode) {
    return 'Using shared server & kernel'
  }
  if (props.selectedServer && props.selectedServer !== 'none' && props.selectedKernel && props.selectedKernel !== 'none') {
    return `${props.selectedServer} - ${props.selectedKernel}`
  }
  return 'Select Server & Kernel'
})

const displayText = computed(() => {
  if (props.selectedServer && props.selectedServer !== 'none') {
    return props.selectedServer.split(':')[0]
  }
  return 'Server'
})
</script>

<template>
  <Popover 
    :open="isServerOpen" 
    @update:open="emit('update:isServerOpen', $event)"
  >
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs px-2"
        :class="{
          'bg-warning/20 hover:bg-warning/30': isConfigurationIncomplete,
          'bg-primary/20 hover:bg-primary/30': isSharedSessionMode,
          'opacity-70': isExecuting
        }"
        :title="buttonTitle"
        :disabled="isSharedSessionMode || isExecuting"
      >
        <Server class="h-3 w-3 mr-1" />
        <span class="max-w-[60px] truncate">
          {{ displayText }}
        </span>
      </Button>
    </PopoverTrigger>
    
    <PopoverContent
      class="w-[300px] p-0"
      align="start"
      :side="'bottom'"
      description="Select a Jupyter server and kernel for code execution"
    >
      <div class="p-2 text-xs font-medium text-muted-foreground">
        Select a server and kernel for code execution
      </div>
      
      <div class="border-t p-2">
        <div class="mb-2">
          <div class="text-xs font-medium mb-1">Server</div>
          <CustomSelect
            :options="serverOptions"
            :model-value="selectedServer"
            placeholder="Search servers..."
            :searchable="true"
            @select="emit('server-change', $event)"
          />
        </div>
        
        <div>
          <div class="text-xs font-medium mb-1">Kernel</div>
          <CustomSelect
            :options="kernelOptions"
            :model-value="selectedKernel"
            placeholder="Search kernels..."
            :searchable="true"
            :disabled="!selectedServer || selectedServer === 'none'"
            @select="emit('kernel-change', $event)"
          />
        </div>
      </div>
      
      <div
        v-if="availableServers.length === 0"
        class="p-3 text-sm text-center text-muted-foreground"
      >
        No servers available. Configure servers in the settings.
      </div>
      
      <div
        v-else-if="selectedServer && selectedServer !== 'none' && availableKernels.length === 0"
        class="p-3 text-sm text-center text-muted-foreground"
      >
        No kernels available on the selected server.
      </div>
    </PopoverContent>
  </Popover>
</template>
