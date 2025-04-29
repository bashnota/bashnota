<script setup lang="ts">
import { computed } from 'vue'
import NotaCard from './NotaCard.vue'
import NotaListItem from './NotaListItem.vue'
import Pagination from './Pagination.vue'
import EmptyState from './EmptyState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { PublishedNota } from '@/types/nota'
import { useAuthStore } from '@/stores/auth'

interface NotaTabProps {
  isActive: boolean
  type: 'latest' | 'popular' | 'most-voted'
  title: string
  emptyIcon: any
  emptyTitle: string
  emptyDescription: string
  items: PublishedNota[]
  isLoading: boolean
  error: string | null
  currentPage: number
  hasMoreItems: boolean
  viewMode: 'grid' | 'list'
}

const props = defineProps<NotaTabProps>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'view-nota', nota: PublishedNota): void
  (e: 'clone-nota', nota: PublishedNota, event: Event): void
}>()

const authStore = useAuthStore()

// Computed properties for conditional rendering
const showEmptyState = computed(() => !props.isLoading && !props.error && props.items.length === 0)
const showContent = computed(() => !props.isLoading && !props.error && props.items.length > 0)
const showInitialLoading = computed(() => props.isLoading && props.items.length === 0)
const showPaginationLoading = computed(() => props.isLoading && props.items.length > 0)
const showError = computed(() => !!props.error)
const isGridView = computed(() => props.viewMode === 'grid')
const isListView = computed(() => props.viewMode === 'list')

// Handle viewing a specific nota
const handleViewNota = (nota: PublishedNota) => {
  emit('view-nota', nota)
}

// Handle cloning a nota
const handleCloneNota = (nota: PublishedNota, event: Event) => {
  emit('clone-nota', nota, event)
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">{{ title }}</h2>
    
    <!-- Loading state -->
    <div v-if="showInitialLoading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    
    <!-- Error state -->
    <div v-else-if="showError" class="text-red-500 py-4 bg-destructive/10 px-4 rounded-md">
      {{ error }}
    </div>
    
    <!-- Empty state -->
    <EmptyState 
      v-else-if="showEmptyState" 
      :icon="emptyIcon" 
      :title="emptyTitle" 
      :description="emptyDescription" 
    />
    
    <!-- Content state - Grid View -->
    <div v-else-if="showContent && isGridView" class="grid gap-4 md:grid-cols-2">
      <NotaCard 
        v-for="nota in items"
        :key="nota.id"
        :nota="nota"
        :is-authenticated="authStore.isAuthenticated"
        @view="handleViewNota(nota)"
        @clone="handleCloneNota(nota, $event)"
      />
    </div>

    <!-- Content state - List View -->
    <div v-else-if="showContent && isListView" class="flex flex-col gap-2">
      <NotaListItem 
        v-for="nota in items"
        :key="nota.id"
        :nota="nota"
        :is-authenticated="authStore.isAuthenticated"
        @view="handleViewNota(nota)"
        @clone="handleCloneNota(nota, $event)"
      />
    </div>

    <!-- Pagination -->
    <Pagination 
      v-if="showContent" 
      :current-page="currentPage" 
      :has-more-items="hasMoreItems"
      @prev="emit('prev')"
      @next="emit('next')"
      class="mt-4"
    />

    <!-- Loading indicator for pagination -->
    <div v-if="showPaginationLoading" class="flex justify-center py-4 mt-4">
      <LoadingSpinner />
    </div>
  </div>
</template>