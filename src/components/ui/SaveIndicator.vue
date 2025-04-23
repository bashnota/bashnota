<script setup lang="ts">
import { RotateCw, CheckCircle } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  isSaving: boolean
  showSaved: boolean
  updatedAt?: Date | null
}>()

// Format the timestamp using a locale string
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
</script>

<template>
  <div class="save-indicator">
    <!-- Save Status Indicator -->
    <div
      class="flex items-center text-xs text-muted-foreground transition-opacity duration-200"
      :class="{ 'opacity-0': !isSaving && !showSaved }"
    >
      <span v-if="isSaving" class="flex items-center gap-1">
        <RotateCw class="w-3 h-3 animate-spin" />
        Saving
      </span>
      <span v-else-if="showSaved" class="flex items-center gap-1">
        <CheckCircle class="w-3 h-3 text-green-600" />
        Saved
      </span>
    </div>

    <!-- Last Updated Timestamp -->
    <span v-if="updatedAt" class="text-xs text-muted-foreground mt-1 block">
      Last updated {{ formattedTimestamp }}
    </span>
  </div>
</template>