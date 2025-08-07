<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Link2, Zap, CheckCircle, Info, Server } from 'lucide-vue-next'
import { useSharedSession } from '@/features/editor/composables/useSharedSession'
import { useRobustExecution } from '@/features/editor/composables/useRobustExecution'

interface Props {
  isReadOnly: boolean
  isPublished: boolean
  isExecuting: boolean
  cellId: string
  // Legacy props for backward compatibility
  isSharedSessionMode?: boolean
  selectedServer?: string
  selectedKernel?: string
  selectedSession?: string
}

const props = defineProps<Props>()

// Use new composables for better state management
const { isSharedSessionEnabled, getSharedSessionInfo } = useSharedSession()
const { getExecutionStatus } = useRobustExecution()

// Get execution status for this cell
const executionStatus = computed(() => getExecutionStatus.value(props.cellId))
const sharedSessionInfo = computed(() => getSharedSessionInfo.value)

// Determine banner type and content
const bannerInfo = computed(() => {
  // Don't show banners in readonly or published mode
  if (props.isReadOnly || props.isPublished) {
    return null
  }

  // Don't show banners while executing
  if (props.isExecuting) {
    return null
  }

  // Shared session mode banner
  if (isSharedSessionEnabled.value) {
    if (executionStatus.value.isShared) {
      return {
        type: 'shared-active',
        icon: Link2,
        title: 'Shared Session Active',
        message: `Connected to shared session with ${sharedSessionInfo.value.cellCount} code blocks. Variables are shared across all blocks.`,
        class: 'status-success'
      }
    } else {
      return {
        type: 'shared-pending',
        icon: Link2,
        title: 'Shared Session Ready',
        message: 'Press Run to automatically join the shared session and start sharing variables with other code blocks.',
        class: 'status-info'
      }
    }
  }

  // Auto-configuration available
  if (!executionStatus.value.configured) {
    return {
      type: 'auto-config',
      icon: Zap,
      title: 'Auto-Configuration Available',
      message: 'Press Run to automatically detect and configure a Jupyter server and kernel.',
      class: 'status-info'
    }
  }

  // Cell is configured and ready
  if (executionStatus.value.configured) {
    const serverInfo = executionStatus.value.sessionId === 'default' ? 'individual session' : `session ${executionStatus.value.sessionId}`
    return {
      type: 'configured',
      icon: CheckCircle,
      title: 'Ready to Execute',
      message: `Configured with server and kernel (${serverInfo}).`,
      class: 'status-ready'
    }
  }

  return null
})

// Legacy warning for backward compatibility
const legacyWarningMessage = computed(() => {
  if (!props.selectedServer || props.selectedServer === 'none') {
    return 'Server configuration needed'
  }
  if (!props.selectedKernel || props.selectedKernel === 'none') {
    return 'Kernel configuration needed'
  }
  return ''
})

// Show legacy warning if using old props and not configured
const shouldShowLegacyWarning = computed(() => {
  return !props.isReadOnly &&
    !props.isPublished &&
    !isSharedSessionEnabled.value && 
    !props.isExecuting &&
    !executionStatus.value.configured &&
    (props.selectedServer !== undefined || props.selectedKernel !== undefined) &&
    legacyWarningMessage.value
})
</script>

<template>
  <!-- New Smart Banner System -->
  <div
    v-if="bannerInfo"
    class="border-b px-3 py-2 flex items-start gap-2 text-xs transition-all duration-200"
    :class="bannerInfo.class"
  >
    <component 
      :is="bannerInfo.icon" 
      class="h-3 w-3 mt-0.5 flex-shrink-0" 
    />
    <div class="flex-1 min-w-0">
      <div class="font-medium mb-0.5">{{ bannerInfo.title }}</div>
      <div class="opacity-90 leading-relaxed">{{ bannerInfo.message }}</div>
    </div>
  </div>
  
  <!-- Legacy Warning Banner (for backward compatibility) -->
  <div
    v-else-if="shouldShowLegacyWarning"
    class="border-b px-3 py-2 flex items-center text-xs status-warning"
  >
    <AlertTriangle class="h-3 w-3 mr-2 flex-shrink-0" />
    <span>{{ legacyWarningMessage }}</span>
  </div>
</template>

<style scoped>
/* Legacy styles */
.status-warning {
  background-color: hsl(var(--warning) / 0.1);
  color: hsl(var(--warning));
  border-left: 3px solid hsl(var(--warning));
}

.status-running {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-left: 3px solid hsl(var(--primary));
}

/* New banner styles */
.status-info {
  background-color: hsl(var(--blue) / 0.1);
  color: hsl(var(--blue));
  border-left: 3px solid hsl(var(--blue));
}

.status-success {
  background-color: hsl(var(--green) / 0.1);
  color: hsl(var(--green));
  border-left: 3px solid hsl(var(--green));
}

.status-ready {
  background-color: hsl(var(--muted) / 0.6);
  color: hsl(var(--muted-foreground));
  border-left: 3px solid hsl(var(--muted-foreground));
}

/* Enhanced typography */
.font-medium {
  font-weight: 500;
}

.leading-relaxed {
  line-height: 1.4;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .flex-start {
    align-items: center;
  }
  
  .gap-2 {
    gap: 0.375rem;
  }
}
</style>
