<template>
  <ServerSelectDialog
    v-if="dialogOpen"
    :open="dialogOpen"
    @update:open="handleDialogUpdate"
    @select="handleServerSelect"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import ServerSelectDialog from './ServerSelectDialog.vue'
import type { JupyterServer } from '@/types/jupyter'

const codeExecutionStore = useCodeExecutionStore()

// Check if dialog should be open from the store
const dialogOpen = computed(() => codeExecutionStore.serverDialogControls.isOpen)

// Handle dialog close
const handleDialogUpdate = (isOpen: boolean) => {
  if (!isOpen) {
    handleCancel()
  }
}

// Forward the selected server to the store
const handleServerSelect = (server: JupyterServer) => {
  codeExecutionStore.handleServerSelected(server)
}

// Notify the store that selection was cancelled
const handleCancel = () => {
  codeExecutionStore.handleServerSelectionCancelled()
}
</script>