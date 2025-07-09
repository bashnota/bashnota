<template>
  <div class="space-y-3">
    <Label class="text-sm font-medium">Browser Compatibility</Label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="flex items-center space-x-2 p-3 border rounded-md">
        <component :is="webglSupported ? CheckCircleIcon : XCircleIcon" 
                   :class="webglSupported ? 'text-green-500' : 'text-red-500'" 
                   class="h-4 w-4" />
        <span class="text-sm">WebGL Support</span>
      </div>
      <div class="flex items-center space-x-2 p-3 border rounded-md">
        <component :is="wasmSupported ? CheckCircleIcon : XCircleIcon" 
                   :class="wasmSupported ? 'text-green-500' : 'text-red-500'" 
                   class="h-4 w-4" />
        <span class="text-sm">WebAssembly Support</span>
      </div>
      <div class="flex items-center space-x-2 p-3 border rounded-md">
        <component :is="webgpuSupported ? CheckCircleIcon : AlertTriangleIcon" 
                   :class="webgpuSupported ? 'text-green-500' : 'text-yellow-500'" 
                   class="h-4 w-4" />
        <span class="text-sm">WebGPU Support</span>
      </div>
      <div class="flex items-center space-x-2 p-3 border rounded-md">
        <component :is="memoryEstimate ? CheckCircleIcon : AlertTriangleIcon" 
                   :class="memoryEstimate && memoryEstimate >= 4 ? 'text-green-500' : 'text-yellow-500'" 
                   class="h-4 w-4" />
        <span class="text-sm">RAM: {{ memoryEstimate ? `${memoryEstimate}GB` : 'Unknown' }}</span>
      </div>
    </div>
    
    <div v-if="!isCompatible" class="p-3 bg-red-50 border border-red-200 rounded-md">
      <div class="flex items-start">
        <AlertTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div class="text-sm text-red-700">
          <p class="font-medium">Browser Not Compatible</p>
          <p class="mt-1">{{ compatibilityMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, AlertTriangle as AlertTriangleIcon } from 'lucide-vue-next'
import { Label } from '@/ui/label'

interface Props {
  webglSupported: boolean
  wasmSupported: boolean
  webgpuSupported: boolean
  memoryEstimate: number | null
  isCompatible: boolean
  compatibilityMessage: string
}

defineProps<Props>()
</script> 