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
import NotaConfigSessions from './NotaConfigSessions.vue'
import { Server, PlayCircle } from 'lucide-vue-next'

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
        <DialogTitle>Jupyter Configuration</DialogTitle>
        <DialogDescription>
          Configure Jupyter servers and kernels for your Nota
        </DialogDescription>
      </DialogHeader>

      <div class="mt-6">
        <Tabs default-value="servers" class="w-full">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="servers">
              <div class="flex items-center justify-center gap-2 p-1">
                <Server class="w-4 h-4 shrink-0" />
                <span class="text-sm">Servers</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <div class="flex items-center justify-center gap-2 p-1">
                <PlayCircle class="w-4 h-4 shrink-0" />
                <span class="text-sm">Sessions</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servers">
            <NotaConfigServers
              :nota-id="notaId"
              :config="config"
            />
          </TabsContent>

          <TabsContent value="sessions">
            <NotaConfigSessions
              :nota-id="notaId"
              :config="config"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template> 