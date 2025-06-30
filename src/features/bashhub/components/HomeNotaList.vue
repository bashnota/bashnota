<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/dropdown-menu'
import { Settings, ExternalLink } from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import type { Nota } from '@/features/nota/types/nota'

// Import our new modular components
import {
  NotaCard,
  NotaListEmptyState,
  NotaListPagination,
  NotaListSkeleton
} from './nota-list'

const router = useRouter()
const { toggleNotaFavorite, navigateToNotaSettings } = useNotaActions()

// Props with better typing and defaults
interface Props {
  isLoading: boolean
  viewType: 'grid' | 'list' | 'compact'
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
  currentPage?: number
}

interface Emits {
  (e: 'create-nota'): void
  (e: 'update:selectedTag', value: string): void
  (e: 'update:page', value: number): void
  (e: 'clear-filters'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Pagination configuration
const ITEMS_PER_PAGE = computed(() => {
  switch (props.viewType) {
    case 'grid':
      return 9 // 3x3 grid
    case 'list':
      return 8 // Comfortable list view
    case 'compact':
      return 15 // More items in compact view
    default:
      return 8
  }
})

// Local pagination state
const currentPage = ref(props.currentPage || 1)

// Reset to first page when filters change
watch(
  [() => props.showFavorites, () => props.searchQuery, () => props.selectedTag, () => props.viewType],
  () => {
    currentPage.value = 1
    emit('update:page', 1)
  }
)

// Watch for external page changes
watch(
  () => props.currentPage,
  (newPage) => {
    if (newPage && newPage !== currentPage.value) {
      currentPage.value = newPage
    }
  }
)

// Pagination calculations
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.notas.length / ITEMS_PER_PAGE.value))
})

const paginatedNotas = computed(() => {
  const startIndex = (currentPage.value - 1) * ITEMS_PER_PAGE.value
  return props.notas.slice(startIndex, startIndex + ITEMS_PER_PAGE.value)
})

// Filter state helpers
const hasFilters = computed(() => {
  return Boolean(props.searchQuery || props.selectedTag)
})

// Event handlers
const handleToggleFavorite = async (id: string) => {
  try {
    await toggleNotaFavorite(id)
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
  }
}

const handleTagClick = (tag: string) => {
  emit('update:selectedTag', tag)
}

const handleMoreActions = (id: string) => {
  navigateToNotaSettings(id)
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  emit('update:page', page)
}

const handleClearFilters = () => {
  emit('clear-filters')
}

// Container classes for different view types
const containerClasses = computed(() => {
  const baseClasses = 'transition-all duration-200'
  
  switch (props.viewType) {
    case 'grid':
      return `${baseClasses} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
    case 'list':
      return `${baseClasses} space-y-3`
    case 'compact':
      return `${baseClasses} divide-y divide-border/30`
    default:
      return `${baseClasses} space-y-3`
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <NotaListSkeleton 
      v-if="isLoading"
      :view-type="viewType"
      :count="ITEMS_PER_PAGE"
    />

    <!-- Empty State -->
    <NotaListEmptyState
      v-else-if="notas.length === 0"
      :show-favorites="showFavorites"
      :has-search-query="Boolean(searchQuery)"
      :has-selected-tag="Boolean(selectedTag)"
      :search-query="searchQuery"
      :selected-tag="selectedTag"
      @create-nota="$emit('create-nota')"
      @clear-filters="handleClearFilters"
    />

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Notas List -->
      <div :class="containerClasses">
        <NotaCard
          v-for="nota in paginatedNotas"
          :key="nota.id"
          :nota="nota"
          :view-type="viewType"
          @toggle-favorite="handleToggleFavorite"
          @tag-click="handleTagClick"
          @more-actions="handleMoreActions"
        />
      </div>

      <!-- Pagination -->
      <NotaListPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="notas.length"
        :items-per-page="ITEMS_PER_PAGE"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for layout changes */
.grid {
  transition: grid-template-columns 0.2s ease-in-out;
}

/* Focus management for better accessibility */
:deep(.nota-card:focus-within) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .lg:grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}
</style>









