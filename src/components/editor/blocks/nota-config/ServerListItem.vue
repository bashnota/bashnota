<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { ServerIcon, CpuChipIcon, ArrowPathIcon, TrashIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { JupyterService } from '@/services/jupyterService'

const props = defineProps<{
  server: JupyterServer
  kernels?: KernelSpec[]
}>()

const emit = defineEmits<{
  (e: 'remove', server: JupyterServer): void
  (e: 'kernels-updated', server: JupyterServer): void
}>()

const isOpen = ref(false)
const isRefreshing = ref(false)
const serverStatus = ref<{ success: boolean; message: string } | null>(null)
const jupyterService = new JupyterService()

const checkServerStatus = async () => {
  try {
    const result = await jupyterService.testConnection(props.server)
    serverStatus.value = result
  } catch (error) {
    serverStatus.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

const refreshKernels = async () => {
  isRefreshing.value = true
  try {
    await checkServerStatus()
    if (serverStatus.value?.success) {
      emit('kernels-updated', props.server)
    }
  } finally {
    isRefreshing.value = false
  }
}

// Check server status on mount and periodically
onMounted(() => {
  checkServerStatus()
  // Check status every 30 seconds
  const interval = setInterval(checkServerStatus, 30000)
  // Cleanup interval on component unmount
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <Card class="p-4">
    <Collapsible :open="isOpen" @update:open="isOpen = $event">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div 
            class="rounded-md border p-2"
            :class="{
              'bg-green-50 dark:bg-green-700 border-green-950': serverStatus?.success,
              'bg-red-50 dark:bg-red-700 border-red-950': serverStatus?.success === false,
              'bg-blue-50 dark:bg-blue-700 border-blue-950': serverStatus === null
            }"
          >
            <ServerIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-medium">
              <code>{{ server.ip }}:{{ server.port }}</code>
            </h3>
            <div class="flex items-center gap-2">
              <span 
                class="text-sm px-2 py-0.5 rounded"
                :class="{
                  'bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300': serverStatus?.success,
                  'bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300': serverStatus?.success === false,
                  'bg-slate-100 text-slate-700 dark:bg-slate-700/20 dark:text-slate-300': serverStatus === null
                }"
              >
                {{ serverStatus?.success ? 'Online' : serverStatus?.success === false ? 'Offline' : 'Checking...' }}
              </span>
              <span class="text-sm text-muted-foreground">
                {{ kernels?.length || 0 }} kernels available
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            @click.stop="refreshKernels"
            :disabled="isRefreshing"
            class="flex items-center gap-2"
          >
            <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
            {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            @click.stop="emit('remove', server)"
            class="text-destructive hover:text-destructive"
          >
            <TrashIcon class="w-4 h-4" />
          </Button>
          <CollapsibleTrigger>
            <Button variant="ghost" size="sm">
              <ChevronDownIcon 
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'transform rotate-180': isOpen }"
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent class="mt-4">
        <div v-if="serverStatus?.success === false" class="mb-4">
          <div class="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
            {{ serverStatus.message }}
          </div>
        </div>
        <div v-if="kernels && kernels.length > 0" class="space-y-3">
          <div v-for="kernel in kernels" :key="kernel.name" class="flex items-center gap-3 p-2 rounded-md bg-muted/50">
            <CpuChipIcon class="w-5 h-5" />
            <div>
              <div class="font-medium">{{ kernel.spec.display_name }}</div>
              <div class="text-sm text-muted-foreground">{{ kernel.spec.language }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground">
          No kernels available. Click refresh to check for kernels.
        </div>
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template> 