<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface PaginationProps {
  currentPage: number
  hasMoreItems: boolean
}

const props = defineProps<PaginationProps>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()

// Computed properties
const canGoBack = computed(() => props.currentPage > 1)
</script>

<template>
  <div class="flex justify-center items-center gap-2 mt-6">
    <Button 
      variant="outline" 
      size="sm" 
      @click="emit('prev')"
      :disabled="!canGoBack"
    >
      <ChevronLeft class="h-4 w-4 mr-1" />
      Previous
    </Button>
    <span class="text-sm">Page {{ currentPage }}</span>
    <Button 
      variant="outline" 
      size="sm" 
      @click="emit('next')"
      :disabled="!hasMoreItems"
    >
      Next
      <ChevronRight class="h-4 w-4 ml-1" />
    </Button>
  </div>
</template>