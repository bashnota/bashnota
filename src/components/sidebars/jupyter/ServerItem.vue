<template>
  <div class="server-item border rounded-md mb-2 overflow-hidden">
    <!-- Server Header -->
    <div
      class="server-header p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
      :class="{ 'bg-muted/20': isExpanded }"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-3">
        <!-- Connection Status -->
        <div class="relative h-3 w-3">
          <span
            class="absolute inset-0 rounded-full transition-colors"
            :class="connectionStatusClass"
          ></span>
          <span
            v-if="isConnected"
            class="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"
          ></span>
        </div>

        <!-- Server Details -->
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-medium truncate">
            {{ displayName }}
          </h4>
          <p class="text-xs text-muted-foreground">
            {{ kernelCount }} kernel{{ kernelCount !== 1 ? 's' : '' }},
            {{ sessionCount }} session{{ sessionCount !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Header Actions -->
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click.stop="handleRefresh"
          :disabled="isRefreshing"
          :title="isRefreshing ? 'Refreshing...' : 'Refresh kernels and sessions'"
        >
          <RotateCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isRefreshing }" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0 text-destructive hover:text-destructive"
          @click.stop="handleRemove"
          title="Remove server"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>
        
        <ChevronDown 
          class="h-4 w-4 text-muted-foreground transition-transform"
          :class="{ 'rotate-180': isExpanded }"
        />
      </div>
    </div>

    <!-- Expanded Content -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="isExpanded" class="border-t overflow-hidden">
        <div class="p-3 space-y-4">
          <!-- Server Info -->
          <ServerInfo 
            :server="server"
            :test-result="testResult"
            :last-updated="lastUpdated"
          />

          <!-- Available Kernels -->
          <KernelsList
            v-if="kernels && kernels.length > 0"
            :kernels="kernels"
            :server="server"
            @connect="handleKernelConnect"
          />

          <!-- Active Sessions -->
          <SessionsList
            v-if="sessions && sessions.length > 0"
            :sessions="sessions"
            @use="handleSessionUse"
          />

          <!-- Empty States -->
          <EmptyState
            v-if="(!kernels || kernels.length === 0) && (!sessions || sessions.length === 0)"
            :is-loading="isRefreshing"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Trash2, ChevronDown } from 'lucide-vue-next'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import type { JupyterSession, RunningKernel } from '@/composables/useJupyterSessions'
import ServerInfo from './ServerInfo.vue'
import KernelsList from './KernelsList.vue'
import SessionsList from './SessionsList.vue'
import EmptyState from './EmptyState.vue'

interface Props {
  server: JupyterServer
  kernels?: KernelSpec[]
  sessions?: JupyterSession[]
  runningKernels?: RunningKernel[]
  isRefreshing?: boolean
  testResult?: { success: boolean; message: string }
  lastUpdated?: Date
}

interface Emits {
  refresh: []
  remove: []
  'connect-kernel': [kernelName: string]
  'use-session': [sessionId: string]
}

const props = withDefaults(defineProps<Props>(), {
  kernels: () => [],
  sessions: () => [],
  runningKernels: () => [],
  isRefreshing: false
})

const emit = defineEmits<Emits>()

// Local state
const isExpanded = ref(false)

// Computed properties
const displayName = computed(() => 
  props.server.name || `${props.server.ip}:${props.server.port}`
)

const kernelCount = computed(() => props.kernels?.length || 0)
const sessionCount = computed(() => props.sessions?.length || 0)

const isConnected = computed(() => props.testResult?.success === true)
const hasTestResult = computed(() => !!props.testResult)

const connectionStatusClass = computed(() => ({
  'bg-green-500': isConnected.value,
  'bg-red-500': hasTestResult.value && !isConnected.value,
  'bg-yellow-500': !hasTestResult.value,
}))

// Event handlers
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const handleRefresh = () => {
  emit('refresh')
}

const handleRemove = () => {
  emit('remove')
}

const handleKernelConnect = (kernelName: string) => {
  emit('connect-kernel', kernelName)
}

const handleSessionUse = (sessionId: string) => {
  emit('use-session', sessionId)
}
</script>

<style scoped>
.server-item {
  @apply transition-all duration-200;
}

.server-item:hover {
  @apply shadow-sm;
}

.server-header {
  @apply select-none;
}
</style>