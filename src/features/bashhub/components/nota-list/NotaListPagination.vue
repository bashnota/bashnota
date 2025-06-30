<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/ui/button'
import { 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal
} from 'lucide-vue-next'

interface Props {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  showResultsInfo?: boolean
}

interface Emits {
  (e: 'update:page', page: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showResultsInfo: true,
  itemsPerPage: 9
})

const emit = defineEmits<Emits>()

// Calculate displayed page numbers for pagination
const displayedPages = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
  
  if (total <= 7) {
    // If 7 or fewer pages, show all
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  const pages: (number | 'ellipsis')[] = []
  
  // Always show first page
  pages.push(1)
  
  if (current <= 4) {
    // Near the beginning
    for (let i = 2; i <= Math.min(5, total - 1); i++) {
      pages.push(i)
    }
    if (total > 5) {
      pages.push('ellipsis')
    }
  } else if (current >= total - 3) {
    // Near the end
    if (total > 5) {
      pages.push('ellipsis')
    }
    for (let i = Math.max(total - 4, 2); i <= total - 1; i++) {
      pages.push(i)
    }
  } else {
    // In the middle
    pages.push('ellipsis')
    for (let i = current - 1; i <= current + 1; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
  }
  
  // Always show last page (if different from first)
  if (total > 1) {
    pages.push(total)
  }
  
  return pages
})

const resultsInfo = computed(() => {
  if (!props.totalItems) return ''
  
  const start = (props.currentPage - 1) * props.itemsPerPage + 1
  const end = Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
  
  return `Showing ${start}-${end} of ${props.totalItems} notas`
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:page', page)
  }
}

const nextPage = () => {
  if (props.currentPage < props.totalPages) {
    goToPage(props.currentPage + 1)
  }
}

const prevPage = () => {
  if (props.currentPage > 1) {
    goToPage(props.currentPage - 1)
  }
}
</script>

<template>
  <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
    <!-- Results Info -->
    <div v-if="showResultsInfo && totalItems" class="text-sm text-muted-foreground order-2 sm:order-1">
      {{ resultsInfo }}
    </div>
    
    <!-- Pagination Controls -->
    <nav class="flex items-center gap-1 order-1 sm:order-2" aria-label="Pagination">
      <!-- Previous Button -->
      <Button 
        variant="outline" 
        size="sm" 
        @click="prevPage" 
        :disabled="currentPage === 1"
        class="h-9 w-9 p-0"
        title="Previous page"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      
      <!-- Page Numbers -->
      <div class="flex items-center gap-1">
        <template v-for="(page, index) in displayedPages" :key="index">
          <!-- Ellipsis -->
          <div 
            v-if="page === 'ellipsis'" 
            class="flex items-center justify-center h-9 w-9 text-muted-foreground"
          >
            <MoreHorizontal class="h-4 w-4" />
          </div>
          
          <!-- Page Button -->
          <Button 
            v-else
            variant="outline"
            size="sm"
            :class="[
              'h-9 w-9 p-0 transition-colors',
              currentPage === page 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary' 
                : 'hover:bg-muted'
            ]"
            @click="goToPage(page)"
            :title="`Go to page ${page}`"
          >
            {{ page }}
          </Button>
        </template>
      </div>
      
      <!-- Next Button -->
      <Button 
        variant="outline" 
        size="sm" 
        @click="nextPage" 
        :disabled="currentPage === totalPages"
        class="h-9 w-9 p-0"
        title="Next page"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </nav>
  </div>
</template> 