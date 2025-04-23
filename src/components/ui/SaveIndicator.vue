<script setup lang="ts">
import { RotateCw, CheckCircle, Clock, AlertTriangle } from 'lucide-vue-next'
import { computed, ref, onMounted, watch } from 'vue'
import { formatRelativeTime } from '@/lib/utils'

const props = defineProps<{
  isSaving: boolean
  showSaved: boolean
  updatedAt?: Date | null
  autoSaveEnabled?: boolean
}>()

// Show warning state for unsaved changes (future use)
const hasUnsavedChanges = ref(false)

// Format timestamps
const formattedTimestamp = computed(() => {
  if (!props.updatedAt) return ''
  
  return new Date(props.updatedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Format relative time (e.g., "5 minutes ago")
const relativeTime = computed(() => {
  if (!props.updatedAt) return ''
  return formatRelativeTime(props.updatedAt)
})

// Determine the status message and icon
const statusInfo = computed(() => {
  if (props.isSaving) {
    return {
      icon: RotateCw,
      message: 'Saving...',
      colorClass: 'text-primary'
    }
  } else if (props.showSaved) {
    return {
      icon: CheckCircle,
      message: 'Saved',
      colorClass: 'text-green-600'
    }
  } else if (hasUnsavedChanges.value) {
    return {
      icon: AlertTriangle,
      message: 'Unsaved changes',
      colorClass: 'text-amber-500'
    }
  } else {
    return {
      icon: Clock,
      message: '',
      colorClass: 'text-muted-foreground'
    }
  }
})

// Reset the unsaved changes flag when saved
watch(() => props.showSaved, (newValue) => {
  if (newValue) {
    hasUnsavedChanges.value = false
  }
})
</script>

<template>
  <div class="save-indicator" :class="{ 'compact': typeof $attrs.class === 'string' && $attrs.class.includes('compact') }">
    <!-- Save Status Indicator -->
    <div class="flex items-center justify-between">
      <transition
        name="fade"
        mode="out-in"
      >
        <div 
          :key="statusInfo.message || 'status'"
          class="flex items-center text-xs transition-all duration-200"
          :class="[statusInfo.colorClass]"
        >
          <component 
            :is="statusInfo.icon" 
            class="w-3 h-3 mr-1"
            :class="{ 'animate-spin': props.isSaving }"
          />
          <span class="text-[10px]">{{ statusInfo.message }}</span>
        </div>
      </transition>
      
      <!-- Last Updated Time - simplified in compact mode -->
      <div v-if="updatedAt" class="text-[10px] text-muted-foreground flex items-center">
        <Clock v-if="!(typeof $attrs.class === 'string' && $attrs.class.includes('compact'))" class="w-2.5 h-2.5 mr-1 opacity-70" />
        <span :title="formattedTimestamp">{{ relativeTime }}</span>
      </div>
    </div>
    
    <!-- Auto-save status (if provided) - appears horizontally in compact mode -->
    <div 
      v-if="autoSaveEnabled !== undefined" 
      class="text-[10px] text-muted-foreground flex items-center"
      :class="{ 'mt-0 inline-flex ml-2': typeof $attrs.class === 'string' && $attrs.class.includes('compact'), 'mt-1': !(typeof $attrs.class === 'string' && $attrs.class.includes('compact')) }"
    >
      <span class="mr-1 whitespace-nowrap">
        Auto: {{ autoSaveEnabled ? 'On' : 'Off' }}
      </span>
      <span 
        v-if="autoSaveEnabled" 
        class="w-1.5 h-1.5 rounded-full bg-green-500 opacity-75 animate-pulse"
      ></span>
      <span 
        v-else
        class="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-75"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(2px);
}

.save-indicator {
  padding: 0.25rem 0;
}

.compact {
  padding: 0.125rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>