<script setup lang="ts">
import { computed } from 'vue'
import ContributorCard from './ContributorCard.vue'
import PodiumView from './PodiumView.vue'
import EmptyState from './EmptyState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { Users } from 'lucide-vue-next'

interface ContributorTabProps {
  isActive: boolean
  title: string
  contributors: Array<{
    uid: string
    name: string
    tag?: string
    count: number
  }>
  isLoading: boolean
  error: string | null
}

const props = defineProps<ContributorTabProps>()

// Computed properties
const hasContributors = computed(() => props.contributors.length > 0)
const hasError = computed(() => !!props.error)
const showLoading = computed(() => props.isLoading)
const showEmptyState = computed(() => !props.isLoading && !hasError.value && !hasContributors.value)
const showContent = computed(() => !props.isLoading && !hasError.value && hasContributors.value)
const remainingContributors = computed(() => props.contributors.slice(3))
const hasMoreThanThreeContributors = computed(() => props.contributors.length > 3)
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">{{ title }}</h2>
    
    <!-- Loading state -->
    <div v-if="showLoading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    
    <!-- Error state -->
    <div v-else-if="hasError" class="text-red-500 py-4 bg-destructive/10 px-4 rounded-md">
      {{ error }}
    </div>
    
    <!-- Empty state -->
    <EmptyState 
      v-else-if="showEmptyState" 
      :icon="Users" 
      title="No Contributors Found"
      description="Be the first to publish content!"
    />
    
    <!-- Content state -->
    <div v-else-if="showContent">
      <!-- Podium view for top 3 contributors -->
      <PodiumView :contributors="contributors" />
      
      <!-- Leaderboard Section for remaining contributors -->
      <div v-if="hasMoreThanThreeContributors">
        <h3 class="text-lg font-semibold mb-4">Leaderboard</h3>
        <div class="grid gap-2">
          <ContributorCard 
            v-for="(contributor, index) in remainingContributors" 
            :key="contributor.uid"
            :contributor="contributor"
            :index="index + 3"
          />
        </div>
      </div>
    </div>
  </div>
</template>