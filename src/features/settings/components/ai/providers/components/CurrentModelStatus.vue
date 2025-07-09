<template>
  <div class="p-4 bg-muted/50 rounded-lg">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <GaugeIcon class="h-5 w-5 mr-2 text-primary" />
        <h3 class="font-medium">Current Status</h3>
      </div>
      <div class="flex items-center gap-2">
        <Badge :variant="currentModel ? 'default' : 'outline'">
          {{ currentModel ? 'Model Loaded' : 'No Model' }}
        </Badge>
        <Button
          v-if="currentModel"
          @click="$emit('unload-model')"
          variant="outline"
          size="sm"
          class="text-red-600 hover:text-red-700"
        >
          <XIcon class="h-4 w-4 mr-1" />
          Unload
        </Button>
      </div>
    </div>
    <p class="mt-2 text-sm text-muted-foreground">
      {{ modelStatus }}
    </p>

    <!-- Loading Progress -->
    <div v-if="isLoading" class="mt-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Loading Progress</span>
        <span class="text-sm">{{ Math.round(loadingProgress) }}%</span>
      </div>
      <div class="w-full bg-blue-200 rounded-full h-2">
        <div 
          class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          :style="{ width: `${loadingProgress}%` }"
        ></div>
      </div>
      <p class="text-xs text-muted-foreground">
        {{ loadingStatusText }}
      </p>
    </div>

    <!-- Loading Error -->
    <div v-if="loadingError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <div class="flex items-start">
        <XCircleIcon class="h-4 w-4 text-red-600 mt-0.5 mr-2" />
        <div>
          <p class="text-sm font-medium text-red-800">Error Loading Model</p>
          <p class="text-sm text-red-700 mt-1">{{ loadingError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Gauge as GaugeIcon, X as XIcon, XCircle as XCircleIcon } from 'lucide-vue-next'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'

interface Props {
  currentModel: string | null
  modelStatus: string
  isLoading: boolean
  loadingProgress: number
  loadingStatusText: string
  loadingError: string | null
}

interface Emits {
  (e: 'unload-model'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script> 