<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/card'
import { Star, FileText, Settings, Clock, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import LoadingSpinner from '@/ui/LoadingSpinner.vue'
import Badge from '@/ui/badge/Badge.vue'
import type { Nota } from '@/features/nota/types/nota'
import { formatDate } from '@/utils/dateUtils'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'

const router = useRouter()
const { toggleFavorite } = useNotaStore()
const { toggleNotaFavorite, navigateToNotaSettings } = useNotaActions()

// Pagination state
const currentPage = ref(1)
const pageSize = ref(9) // 9 items per page for better grid layout

const props = defineProps<{
  isLoading: boolean
  viewType: 'grid' | 'list' | 'compact'
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
  currentPage?: number
}>()

const emit = defineEmits<{
  (e: 'create-nota'): void
  (e: 'update:selectedTag', value: string): void
  (e: 'update:page', value: number): void
}>()

// Reset to first page when filters change
watch(
  [() => props.showFavorites, () => props.searchQuery, () => props.selectedTag],
  () => {
    currentPage.value = 1
  }
)

// Watch for currentPage prop changes
watch(
  () => props.currentPage,
  (newPage) => {
    if (newPage && newPage !== currentPage.value) {
      currentPage.value = newPage
    }
  }
)

// Total pages calculation
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.notas.length / pageSize.value))
})

// Paginated notes
const paginatedNotas = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  return props.notas.slice(startIndex, startIndex + pageSize.value)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    emit('update:page', currentPage.value)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    emit('update:page', currentPage.value)
  }
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    emit('update:page', currentPage.value)
  }
}

// Display a limited number of page buttons for better UX
const displayedPages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 5) {
    // If 5 or fewer pages, show all
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  // Always include first, last, current, and 1-2 pages around current
  const pages = [1, total]
  
  // Add current and surrounding pages
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  
  // Sort and remove duplicates
  return [...new Set(pages)].sort((a, b) => a - b)
})

// Improved action handlers with error handling
const handleToggleFavorite = async (id: string) => {
  await toggleNotaFavorite(id)
}

const openSettings = (id: string) => {
  navigateToNotaSettings(id)
}

const handleTagClick = (tag: string) => {
  emit('update:selectedTag', tag)
}

// Empty state configuration
const emptyStateConfig = computed(() => {
  if (props.showFavorites) {
    return {
      icon: Star,
      title: 'No Favorite Notas',
      description: 'Star important notas for quick access',
      showButton: false
    }
  }
  
  if (props.searchQuery || props.selectedTag) {
    return {
      icon: FileText,
      title: 'No Matching Notas',
      description: 'Try adjusting your search or create a new nota',
      showButton: true
    }
  }
  
  return {
    icon: FileText,
    title: 'No Notas Yet',
    description: 'Create your first nota to get started',
    showButton: true
  }
})
</script>

<template>
  <!-- Empty State -->
  <div
    v-if="!isLoading && props.notas.length === 0"
    class="flex flex-col items-center justify-center p-12 text-center"
  >
    <component
      :is="emptyStateConfig.icon"
      class="w-12 h-12 text-muted-foreground/50 mb-4"
    />
    <h3 class="text-lg font-semibold mb-2">
      {{ emptyStateConfig.title }}
    </h3>
    <p class="text-muted-foreground mb-4">
      {{ emptyStateConfig.description }}
    </p>
    <Button 
      v-if="emptyStateConfig.showButton" 
      @click="$emit('create-nota')"
    >
      Create Nota
    </Button>
  </div>

  <!-- Loading State -->
  <div v-else-if="isLoading" class="flex justify-center items-center py-12">
    <LoadingSpinner />
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Grid View -->
    <div v-if="viewType === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink v-for="nota in paginatedNotas" :key="nota.id" :to="`/nota/${nota.id}`">
        <Card class="h-full hover:shadow-md transition-all group relative">
          <CardHeader>
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <FileText class="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <CardTitle class="text-lg truncate">{{ nota.title }}</CardTitle>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.prevent="handleToggleFavorite(nota.id)"
                >
                  <Star
                    class="w-5 h-5"
                    :class="nota.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.prevent="openSettings(nota.id)"
                >
                  <Settings class="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div class="flex items-center text-sm text-muted-foreground mt-2">
              <Clock class="w-4 h-4 mr-1 flex-shrink-0" />
              {{ formatDate(nota.updatedAt) }}
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="nota.tags && nota.tags.length > 0" class="flex flex-wrap gap-2">
              <Badge
                v-for="tag in nota.tags"
                :key="tag"
                @click.prevent="handleTagClick(tag)"
                class="cursor-pointer transition-colors truncate max-w-full hover:bg-primary/10"
              >
                {{ tag }}
              </Badge>
            </div>
            <p v-else class="text-sm text-muted-foreground italic">No tags</p>
          </CardContent>
        </Card>
      </RouterLink>
    </div>

    <!-- List View -->
    <div v-else-if="viewType === 'list'" class="flex flex-col space-y-3">
      <RouterLink v-for="nota in paginatedNotas" :key="nota.id" :to="`/nota/${nota.id}`">
        <div class="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors group border">
          <FileText class="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 justify-between flex-wrap">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <h3 class="font-medium truncate">{{ nota.title }}</h3>
                <Star
                  v-if="nota.favorite"
                  class="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0"
                />
              </div>
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button variant="ghost" size="icon" class="h-8 w-8" @click.prevent="handleToggleFavorite(nota.id)">
                  <Star
                    class="w-4 h-4"
                    :class="nota.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'"
                  />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8" @click.prevent="openSettings(nota.id)">
                  <Settings class="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div class="flex items-center gap-4 mt-2 flex-wrap">
              <span class="text-xs text-muted-foreground flex items-center flex-shrink-0">
                <Clock class="w-3 h-3 mr-1" />
                {{ formatDate(nota.updatedAt) }}
              </span>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="tag in nota.tags || []"
                  :key="tag"
                  @click.prevent="handleTagClick(tag)"
                  class="cursor-pointer transition-colors truncate max-w-[200px] hover:bg-primary/10"
                >
                  {{ tag }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Compact View -->
    <div v-else class="divide-y">
      <RouterLink v-for="nota in paginatedNotas" :key="nota.id" :to="`/nota/${nota.id}`">
        <div class="flex items-center gap-3 py-2 hover:bg-muted/50 transition-colors px-2 border-b">
          <FileText class="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span class="font-medium truncate">{{ nota.title }}</span>
          <Star
            v-if="nota.favorite"
            class="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0"
          />
          <span class="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {{ formatDate(nota.updatedAt) }}
          </span>
        </div>
      </RouterLink>
    </div>

    <!-- Pagination Controls -->
    <div class="flex justify-between items-center mt-6">
      <p v-if="searchQuery" class="text-sm text-muted-foreground">
        Found {{ props.notas.length }} results
      </p>
      
      <div v-if="totalPages > 1" class="flex items-center gap-1 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="h-8 w-8 p-0"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        
        <template v-for="(page, index) in displayedPages" :key="page">
          <!-- Add ellipsis when there are gaps in page numbers -->
          <span 
            v-if="index > 0 && page > displayedPages[index-1] + 1" 
            class="px-1 text-muted-foreground"
          >
            ...
          </span>
          
          <Button 
            variant="outline"
            size="sm"
            :class="[
              'h-8 w-8 p-0',
              currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
            ]"
            @click="goToPage(page)"
          >
            {{ page }}
          </Button>
        </template>
        
        <Button 
          variant="outline" 
          size="sm" 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="h-8 w-8 p-0"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Responsive adjustments for better mobile experience */
@media (max-width: 640px) {
  :deep(.badge) {
    @apply max-w-[120px];
  }
}

@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1;
  }
}
</style>









