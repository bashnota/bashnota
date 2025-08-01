<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Link2 } from 'lucide-vue-next'

interface Props {
  isReadOnly: boolean
  isPublished: boolean
  isSharedSessionMode: boolean
  isExecuting: boolean
  selectedServer?: string
  selectedKernel?: string
  selectedSession?: string
}

const props = defineProps<Props>()

const shouldShowWarning = computed(() => {
  return !props.isReadOnly &&
    !props.isPublished &&
    !props.isSharedSessionMode && 
    !props.isExecuting &&
    (!props.selectedServer ||
      props.selectedServer === 'none' ||
      !props.selectedKernel ||
      props.selectedKernel === 'none')
})

const shouldShowSharedModeInfo = computed(() => {
  return !props.isReadOnly && 
    !props.isPublished && 
    props.isSharedSessionMode && 
    !props.selectedSession && 
    !props.isExecuting
})

const warningMessage = computed(() => {
  if (!props.selectedServer || props.selectedServer === 'none') {
    return 'Select a server to run this code block'
  }
  if (!props.selectedKernel || props.selectedKernel === 'none') {
    return 'Select a kernel to run this code block'
  }
  return ''
})
</script>

<template>
  <!-- Warning Banner (hidden in readonly and public mode) -->
  <div
    v-if="shouldShowWarning"
    class="border-b px-3 py-2 flex items-center text-xs status-warning"
  >
    <AlertTriangle class="h-3 w-3 mr-2" />
    <span>{{ warningMessage }}</span>
  </div>
  
  <!-- Shared Mode Info Banner - hidden in public mode -->
  <div
    v-else-if="shouldShowSharedModeInfo"
    class="border-b px-3 py-2 flex items-center text-xs status-running"
  >
    <Link2 class="h-3 w-3 mr-2" />
    <span>
      Using shared kernel mode. Press Run to automatically join the shared session.
    </span>
  </div>
</template>

<style scoped>
.status-warning {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
}

.status-running {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}
</style>
