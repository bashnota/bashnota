<script setup lang="ts">
import { ref } from 'vue'
import type { JupyterServer, KernelSpec, KernelConfig } from '@/types/jupyter'
import { ServerIcon, CpuChipIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { JupyterService } from '@/services/jupyterService'
import { useNotaStore } from '@/stores/nota'

const props = defineProps<{
  notaId: string
  config: {
    jupyterServers: JupyterServer[]
    kernels: Record<string, KernelSpec[]>
    kernelPreferences: Record<string, KernelConfig>
    savedSessions: Array<{ id: string; name: string }>
  }
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()
const isRefreshingKernels = ref(false)

// Refresh kernels for a server
const refreshKernels = async (server: JupyterServer) => {
  isRefreshingKernels.value = true
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    await store.updateNotaConfig(props.notaId, (config) => {
      if (!config.kernels) config.kernels = {}
      const serverKey = `${server.ip}:${server.port}`
      config.kernels[serverKey] = kernels
    })
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
  } finally {
    isRefreshingKernels.value = false
  }
}
</script>

<template>
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
          v-if="!config.kernels[`${server.ip}:${server.port}`]?.length"
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
            v-for="kernel in config.kernels[`${server.ip}:${server.port}`]"
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
</template> 