<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CloudVM } from '@/types/jupyter'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import LoadingSpinner from './LoadingSpinner.vue'
import { CheckCircleIcon, ServerIcon, CommandLineIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  vm: CloudVM
  currentStep: number
  totalSteps: number
  logs: string[]
}>()

const emit = defineEmits<{
  'close': []
}>()

// Progress percentage
const progressPercentage = computed(() => {
  return Math.round((props.currentStep / props.totalSteps) * 100)
})

// Step descriptions
const steps = [
  'Creating VM instance',
  'Waiting for VM to start',
  'Installing dependencies',
  'Configuring Jupyter server',
  'Starting Jupyter server',
  'Retrieving connection details',
]

// Format logs with timestamps
const formattedLogs = computed(() => {
  return props.logs.map((log) => {
    if (log.includes('|')) {
      const [timestamp, message] = log.split('|')
      return { timestamp, message }
    }
    return { timestamp: '', message: log }
  })
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium">Setting up {{ vm.name }}</h3>
        <div class="text-sm font-medium">{{ progressPercentage }}%</div>
      </div>
      <Progress :value="progressPercentage" class="w-full" />
    </div>
    
    <div class="space-y-4">
      <div class="space-y-2">
        <h4 class="text-sm font-medium">Progress</h4>
        <ul class="space-y-2">
          <li
            v-for="(step, index) in steps"
            :key="index"
            class="flex items-center gap-2 text-sm"
            :class="{
              'text-muted-foreground': index > props.currentStep,
              'font-medium': index === props.currentStep,
            }"
          >
            <CheckCircleIcon v-if="index < props.currentStep" class="w-5 h-5 text-green-500" />
            <LoadingSpinner v-else-if="index === props.currentStep" class="w-5 h-5" />
            <div v-else class="w-5 h-5 rounded-full border-2 border-muted"></div>
            {{ step }}
          </li>
        </ul>
      </div>
      
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium">Installation Logs</h4>
          <Button v-if="progressPercentage === 100" variant="outline" size="sm" @click="emit('close')">
            Close
          </Button>
        </div>
        <div class="bg-black text-white rounded-md p-4 h-64 overflow-y-auto font-mono text-xs">
          <div v-for="(log, index) in formattedLogs" :key="index" class="py-0.5">
            <span v-if="log.timestamp" class="text-gray-400 mr-2">[{{ log.timestamp }}]</span>
            <span>{{ log.message }}</span>
          </div>
          <div v-if="props.currentStep < props.totalSteps" class="flex items-center gap-2 mt-2 text-green-400">
            <CommandLineIcon class="w-4 h-4 animate-pulse" />
            <span>Working...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 