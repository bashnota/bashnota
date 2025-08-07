<template>
  <div class="kernels-list">
    <div class="flex items-center justify-between mb-2">
      <h5 class="text-xs font-medium text-muted-foreground">Available Kernels</h5>
      <span class="text-xs text-muted-foreground">{{ kernels.length }}</span>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Button
        v-for="kernel in kernels"
        :key="kernel.name"
        variant="outline"
        size="sm"
        class="justify-start h-auto py-2 px-3 text-left"
        @click="handleConnect(kernel.name)"
      >
        <div class="flex flex-col items-start w-full min-w-0">
          <span class="text-xs font-medium truncate w-full">
            {{ kernel.spec?.display_name || kernel.name }}
          </span>
          <div class="flex items-center gap-2 w-full">
            <span class="text-[10px] text-muted-foreground font-mono truncate">
              {{ kernel.name }}
            </span>
            <KernelLanguageBadge 
              v-if="kernel.spec?.language"
              :language="kernel.spec.language"
            />
          </div>
        </div>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'
import KernelLanguageBadge from './KernelLanguageBadge.vue'

interface Props {
  kernels: KernelSpec[]
  server: JupyterServer
}

interface Emits {
  connect: [kernelName: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleConnect = (kernelName: string) => {
  emit('connect', kernelName)
}
</script>

<style scoped>
.kernels-list {
  @apply space-y-2;
}
</style> 







