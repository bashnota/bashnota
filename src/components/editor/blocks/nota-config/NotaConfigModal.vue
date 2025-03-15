<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import NotaConfigServers from './NotaConfigServers.vue'
import NotaConfigKernels from './NotaConfigKernels.vue'
import NotaConfigGeneral from './NotaConfigGeneral.vue'
import { ServerIcon, CpuChipIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  notaId: string
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const store = useNotaStore()

// Computed properties
const currentNota = computed(() => store.getCurrentNota(props.notaId))
const config = computed(() => {
  return {
    jupyterServers: currentNota.value?.config?.jupyterServers || [],
    kernels: currentNota.value?.config?.kernels || {},
    kernelPreferences: currentNota.value?.config?.kernelPreferences || {},
    savedSessions: currentNota.value?.config?.savedSessions || []
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nota Configuration</DialogTitle>
        <DialogDescription>
          Configure settings, Jupyter servers, and kernels for your Nota
        </DialogDescription>
      </DialogHeader>

      <div class="mt-6">
        <Tabs default-value="servers" class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="servers">
              <div class="flex items-center justify-center gap-2 p-1">
                <ServerIcon class="w-4 h-4 shrink-0" />
                <span class="text-sm">Servers</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="kernels">
              <div class="flex items-center justify-center gap-2 p-1">
                <CpuChipIcon class="w-4 h-4 shrink-0" />
                <span class="text-sm">Kernels</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <div class="flex items-center justify-center gap-2 p-1">
                <Cog6ToothIcon class="w-4 h-4 shrink-0" />
                <span class="text-sm">Settings</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servers">
            <NotaConfigServers
              :nota-id="notaId"
              :config="config"
            />
          </TabsContent>

          <TabsContent value="kernels">
            <NotaConfigKernels
              :nota-id="notaId"
              :config="config"
            />
          </TabsContent>

          <TabsContent value="settings">
            <NotaConfigGeneral
              :nota-id="notaId"
              :config="config"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template> 