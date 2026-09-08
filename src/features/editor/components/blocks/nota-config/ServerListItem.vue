<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'
import { Server, Cpu, RotateCw, Trash2, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import { toast } from '@/services/toast'

const props = defineProps<{
  server: JupyterServer
  kernels?: KernelSpec[]
}>()

const emit = defineEmits<{
  (e: 'remove', server: JupyterServer): void
  (e: 'kernels-updated', server: JupyterServer, kernels: KernelSpec[]): void
}>()

const isOpen = ref(false)
const isRefreshing = ref(false)
const serverStatus = ref<{ success: boolean; message: string } | null>(null)
const jupyterService = new JupyterService()
const serverLabel = computed(() => `${props.server.ip}:${props.server.port}`)
const pollingFailures = ref(0)
let pollingTimer: ReturnType<typeof setTimeout> | null = null
let stopped = false

const clearPollingTimer = () => {
  if (pollingTimer !== null) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
}

const scheduleStatusCheck = () => {
  clearPollingTimer()
  if (stopped || document.visibilityState === 'hidden') return

  const delay = Math.min(30_000 * 2 ** pollingFailures.value, 5 * 60_000)
  pollingTimer = setTimeout(async () => {
    await checkServerStatus()
    scheduleStatusCheck()
  }, delay)
}

const checkServerStatus = async () => {
  try {
    const result = await jupyterService.testConnection(props.server)
    serverStatus.value = result
    pollingFailures.value = result.success ? 0 : Math.min(pollingFailures.value + 1, 4)
  } catch (error) {
    pollingFailures.value = Math.min(pollingFailures.value + 1, 4)
    serverStatus.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

const refreshKernels = async () => {
  isRefreshing.value = true
  try {
    const result = await jupyterService.testConnection(props.server)
    if (!result.success) throw new Error(result.message || 'Connection failed')

    const kernels = await jupyterService.getAvailableKernels(props.server)
    serverStatus.value = {
      success: true,
      message: `Connected. ${kernels.length} ${kernels.length === 1 ? 'kernel' : 'kernels'} available.`,
    }
    pollingFailures.value = 0
    emit('kernels-updated', props.server, kernels)
    toast.success(`Refreshed ${serverLabel.value}`, {
      description: serverStatus.value.message,
    })
  } catch (error) {
    pollingFailures.value = Math.min(pollingFailures.value + 1, 4)
    serverStatus.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
    toast.error(`Could not refresh ${serverLabel.value}`, {
      description: serverStatus.value.message,
    })
  } finally {
    isRefreshing.value = false
    scheduleStatusCheck()
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    clearPollingTimer()
    return
  }

  void checkServerStatus().finally(scheduleStatusCheck)
}

// Check server status on mount and periodically
onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (document.visibilityState !== 'hidden') await checkServerStatus()
  scheduleStatusCheck()
})

onUnmounted(() => {
  stopped = true
  clearPollingTimer()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <Card class="p-4" data-testid="jupyter-server-card">
    <Collapsible :open="isOpen" @update:open="isOpen = $event">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="rounded-md border p-2"
            :class="{
              'bg-green-50 dark:bg-green-700 border-green-950': serverStatus?.success,
              'bg-red-50 dark:bg-red-700 border-red-950': serverStatus?.success === false,
              'bg-muted text-foreground': serverStatus === null,
            }"
          >
            <Server class="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 class="font-medium">
              <code>{{ server.ip }}:{{ server.port }}</code>
            </h3>
            <div class="flex items-center gap-2">
              <span
                role="status"
                aria-live="polite"
                class="text-sm px-2 py-0.5 rounded"
                :class="{
                  'bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300':
                    serverStatus?.success,
                  'bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300':
                    serverStatus?.success === false,
                  'bg-muted text-foreground': serverStatus === null,
                }"
              >
                {{
                  serverStatus?.success
                    ? 'Online'
                    : serverStatus?.success === false
                      ? 'Offline'
                      : 'Checking...'
                }}
              </span>
              <span class="text-sm text-muted-foreground">
                {{ kernels?.length || 0 }} kernels available
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click.stop="refreshKernels"
            :disabled="isRefreshing"
            class="flex items-center gap-2"
            :aria-label="`Refresh kernels for ${serverLabel}`"
          >
            <RotateCw
              class="w-4 h-4"
              :class="{ 'animate-spin': isRefreshing }"
              aria-hidden="true"
            />
            {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            @click.stop="emit('remove', server)"
            class="text-destructive hover:text-destructive"
            :aria-label="`Remove Jupyter server ${serverLabel}`"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
          </Button>
          <CollapsibleTrigger as-child>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :aria-label="`${isOpen ? 'Hide' : 'Show'} details for Jupyter server ${serverLabel}`"
            >
              <ChevronDown
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'transform rotate-180': isOpen }"
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent class="mt-4">
        <div v-if="serverStatus?.success === false" class="mb-4">
          <div
            class="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm"
            role="alert"
          >
            {{ serverStatus.message }}
          </div>
        </div>
        <div v-if="kernels && kernels.length > 0" class="space-y-3">
          <div
            v-for="kernel in kernels"
            :key="kernel.name"
            class="flex items-center gap-3 p-2 rounded-md bg-muted/50"
          >
            <Cpu class="w-5 h-5" />
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
