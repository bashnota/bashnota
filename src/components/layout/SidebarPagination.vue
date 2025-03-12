<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'

interface Props {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:page': [page: number]
}>()

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:page', page)
  }
}

const pageNumbers = () => {
  const pages = []
  const maxVisiblePages = 3
  
  // Always show first page
  pages.push(1)
  
  // Calculate range around current page
  let startPage = Math.max(2, props.currentPage - Math.floor(maxVisiblePages / 2))
  let endPage = Math.min(props.totalPages - 1, startPage + maxVisiblePages - 1)
  
  // Adjust if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(2, endPage - maxVisiblePages + 1)
  }
  
  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('...')
  }
  
  // Add pages in range
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  
  // Add ellipsis before last page if needed
  if (endPage < props.totalPages - 1) {
    pages.push('...')
  }
  
  // Always show last page if there is more than one page
  if (props.totalPages > 1) {
    pages.push(props.totalPages)
  }
  
  return pages
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between text-xs py-1 px-2 border-t">
    <div class="text-muted-foreground">
      {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, totalItems) }} of {{ totalItems }}
    </div>
    
    <div class="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        class="h-6 w-6" 
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        <ChevronLeftIcon class="h-3 w-3" />
      </Button>
      
      <div v-for="(page, index) in pageNumbers()" :key="index" class="flex items-center">
        <Button 
          v-if="page !== '...'" 
          variant="ghost" 
          size="sm" 
          class="h-6 w-6 px-0"
          :class="{ 'bg-primary/10 text-primary': page === currentPage }"
          @click="goToPage(Number(page))"
        >
          {{ page }}
        </Button>
        <span v-else class="px-1">{{ page }}</span>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        class="h-6 w-6" 
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        <ChevronRightIcon class="h-3 w-3" />
      </Button>
    </div>
  </div>
</template> 