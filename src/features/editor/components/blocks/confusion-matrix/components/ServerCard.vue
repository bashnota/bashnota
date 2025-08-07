<template>
  <Card
    :class="[
      'cursor-pointer transition-all hover:shadow-md',
      {
        'border-primary ring-2 ring-primary/20': selected,
        'border-green-500 bg-green-50 dark:bg-green-950/20': connectionStatus === 'connected',
        'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20': connectionStatus === 'connecting'
      }
    ]"
    @click="$emit('select', server)"
  >
    <CardContent class="p-4">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="font-medium">{{ displayName }}</div>
          <div class="text-sm text-muted-foreground">{{ displayUrl }}</div>
        </div>
        <div class="flex items-center gap-3">
          <ConnectionStatus :status="connectionStatus" />
          <Button
            @click.stop="$emit('test', server)"
            :disabled="connectionStatus === 'connecting'"
            variant="outline"
            size="sm"
          >
            Test
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import ConnectionStatus from './ConnectionStatus.vue'

interface Props {
  server: JupyterServer
  selected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
}

interface Emits {
  (e: 'select', server: JupyterServer): void
  (e: 'test', server: JupyterServer): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const displayName = computed(() => {
  return props.server.name || `${props.server.ip}:${props.server.port}`
})

const displayUrl = computed(() => {
  return `${props.server.ip}:${props.server.port}`
})
</script> 







