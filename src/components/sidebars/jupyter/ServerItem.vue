<template>
  <div class="server-item border rounded-md mb-2 overflow-hidden">
    <!-- Server Header -->
    <div
      class="server-header p-2 flex items-center justify-between cursor-pointer hover:bg-muted/30"
      :class="{ 'bg-muted/20': isExpanded }"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-2">
        <!-- Connection Status -->
        <div class="relative h-2 w-2">
          <span
            class="absolute inset-0 rounded-full"
            :class="{
              'bg-green-500': testResults?.success,
              'bg-red-500': testResults && !testResults.success,
              'bg-yellow-500': !testResults,
            }"
          ></span>
          <span
            v-if="testResults?.success"
            class="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"
          ></span>
        </div>

        <!-- Server Name/Details -->
        <div>
          <h4 class="text-sm font-medium">{{ server.name || `${server.ip}:${server.port}` }}</h4>
          <p class="text-xs text-muted-foreground">
            {{ kernels?.length || 0 }} kernel{{ (kernels?.length || 0) !== 1 ? 's' : '' }},
            {{ sessions?.length || 0 }} session{{ (sessions?.length || 0) !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1">
        <!-- Refresh Button -->
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click.stop="$emit('refresh')"
          :disabled="isRefreshing"
        >
          <RotateCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isRefreshing }" />
        </Button>

        <!-- Remove Button -->
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0 text-destructive hover:text-destructive"
          @click.stop="$emit('remove')"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </Button>

        <!-- Expand/Collapse Icon -->
        <ChevronDown
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': !isExpanded }"
        />
      </div>
    </div>

    <!-- Server Details (when expanded) -->
    <div v-if="isExpanded" class="border-t px-2 py-2">
      <!-- Server Status & Info -->
      <div class="p-1 mb-2">
        <div class="flex justify-between text-xs">
          <div>
            <span class="text-muted-foreground">URL:</span>
            {{ server.ip }}:{{ server.port }}
          </div>

          <div v-if="refreshedTimestamp" class="text-muted-foreground">
            Last updated: {{ formatTimeAgo(refreshedTimestamp) }}
          </div>
        </div>

        <!-- Status Message -->
        <div
          v-if="testResults"
          class="text-xs mt-1"
          :class="{
            'text-green-500': testResults.success,
            'text-red-500': !testResults.success,
          }"
        >
          {{ testResults.message }}
        </div>
      </div>

      <!-- Available Kernels -->
      <div v-if="kernels && kernels.length > 0" class="mb-3">
        <h5 class="text-xs font-medium mb-1.5">Available Kernels</h5>
        <div class="grid grid-cols-2 gap-2">
          <Button
            v-for="kernel in kernels"
            :key="kernel.name"
            variant="outline"
            size="sm"
            class="justify-start h-auto py-1.5"
            @click="$emit('connect-kernel', kernel.name)"
          >
            <div class="flex flex-col items-start text-left">
              <span class="text-xs">{{ kernel.spec?.display_name || kernel.name }}</span>
              <span class="text-[10px] text-muted-foreground">{{ kernel.name }}</span>
            </div>
          </Button>
        </div>
      </div>

      <!-- Active Sessions -->
      <div v-if="sessions && sessions.length > 0">
        <h5 class="text-xs font-medium mb-1.5">Active Sessions</h5>
        <div class="space-y-2">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="flex items-center justify-between bg-muted/30 p-2 rounded-md"
          >
            <div>
              <div class="text-xs font-medium">{{ session.name || session.id }}</div>
              <div class="text-[10px] text-muted-foreground">
                Kernel: {{ session.kernelName || 'Unknown' }}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-7"
              @click="$emit('use-session', session.id)"
            >
              Use
            </Button>
          </div>
        </div>
      </div>

      <!-- Empty States -->
      <div v-if="!kernels || kernels.length === 0" class="text-center py-3">
        <p class="text-xs text-muted-foreground">No kernels available</p>
      </div>

      <div v-if="!sessions || sessions.length === 0" class="text-center py-2">
        <p class="text-xs text-muted-foreground">No active sessions</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Trash2, ChevronDown } from 'lucide-vue-next'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'

// Define CodeExecutionSession interface locally
interface CodeExecutionSession {
  id: string
  name?: string
  kernelName?: string
}

const props = defineProps<{
  server: JupyterServer
  kernels?: KernelSpec[]
  isRefreshing?: boolean
  testResults?: { success: boolean; message: string }
  refreshedTimestamp?: Date
  sessions?: CodeExecutionSession[]
}>()

defineEmits<{
  refresh: []
  remove: []
  'connect-kernel': [kernelName: string]
  'use-session': [sessionId: string]
}>()

// Local state
const isExpanded = ref(false)

// Format time ago function
const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}
</script>