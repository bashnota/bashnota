<script setup lang="ts">
import { ref } from 'vue'
import { JupyterService } from '@/services/jupyterService'
import LoadingSpinner from './LoadingSpinner.vue'
import type { JupyterServer } from '@/types/jupyter'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  server: JupyterServer
}>()

const emit = defineEmits<{
  'remove': [server: JupyterServer]
  'kernels-updated': [server: JupyterServer]
}>()

const jupyterService = new JupyterService()
const isTestingConnection = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Test server connection
const testConnection = async () => {
  isTestingConnection.value = true
  try {
    const result = await jupyterService.testConnection(props.server)
    testResult.value = result
    if (result.success) {
      // Notify parent to refresh kernels
      emit('kernels-updated', props.server)
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  } finally {
    isTestingConnection.value = false
  }
}

const handleRemove = () => {
  emit('remove', props.server)
}
</script>

<template>
  <div class="rounded-lg border p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h4 class="font-medium">{{ server.ip }}:{{ server.port }}</h4>
        <div class="flex flex-col gap-1">
          <p v-if="server.token" class="text-xs text-muted-foreground">
            Token: {{ server.token.slice(0, 8) }}...
          </p>
          <p
            class="text-sm"
            :class="{
              'text-green-600': testResult?.success,
              'text-red-600': testResult?.success === false,
            }"
          >
            {{ testResult?.message || 'Not tested' }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="testConnection"
          :disabled="isTestingConnection"
        >
          <LoadingSpinner v-if="isTestingConnection" />
          <span v-else>Test Connection</span>
        </Button>
        <Button variant="destructive" size="sm" @click="handleRemove">
          Remove
        </Button>
      </div>
    </div>
  </div>
</template> 