<script setup lang="ts">
import { ref } from 'vue'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { ServerIcon, CpuChipIcon, ArrowPathIcon, TrashIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

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

const refreshKernels = async () => {
  isRefreshing.value = true
  try {
    emit('kernels-updated', props.server)
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <Card class="p-4">
    <Collapsible :open="isOpen" @update:open="isOpen = $event">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-blue-50 dark:bg-blue-700 border border-blue-950 p-2">
            <ServerIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-medium">
              <code>{{ server.ip }}:{{ server.port }}</code>
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ kernels?.length || 0 }} kernels available
            </p>
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
        <div v-if="!kernels?.length" class="text-center py-4 text-muted-foreground">
          No kernels found. Click refresh to check for available kernels.
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="kernel in kernels"
            :key="kernel.name"
            class="flex items-start gap-2 p-3 rounded-lg border bg-muted/50"
          >
            <div class="rounded-md bg-blue-50 dark:bg-blue-700 border border-blue-950 p-1.5">
              <CpuChipIcon class="w-4 h-4" />
            </div>
            <div>
              <p class="font-medium text-sm">{{ kernel.spec.display_name }}</p>
              <span class="text-xs px-2 py-0.5 rounded-full bg-muted border inline-block mt-1">
                {{ kernel.spec.language }}
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </Card>
</template> 