<script setup lang="ts">
import { computed } from 'vue'
import ContributorCard from './ContributorCard.vue'
import PodiumView from './PodiumView.vue'
import EmptyState from './EmptyState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { Heart } from 'lucide-vue-next'

interface VotesContributorTabProps {
  isActive: boolean
  title: string
  contributors: Array<{
    uid: string
    name: string
    tag?: string
    count: number
    totalVotes?: number
  }>
  isLoading: boolean
  error: string | null
}

const props = defineProps<VotesContributorTabProps>()

// Computed properties
const hasContributors = computed(() => props.contributors.length > 0)
const hasError = computed(() => !!props.error)
const showLoading = computed(() => props.isLoading)
const showEmptyState = computed(() => !props.isLoading && !hasError.value && !hasContributors.value)
const showContent = computed(() => !props.isLoading && !hasError.value && hasContributors.value)
const remainingContributors = computed(() => props.contributors.slice(3))
const hasMoreThanThreeContributors = computed(() => props.contributors.length > 3)

// Prepare contributors data for the podium, adding totalVotes property
const podiumContributors = computed(() => {
  return props.contributors.map(contributor => ({
    ...contributor,
    // Display totalVotes instead of count for the podium
    count: contributor.totalVotes || 0
  }))
})
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
      :icon="Heart" 
      title="No Top Voted Users Found"
      description="Be the first to get votes on your content!"
    />
    
    <!-- Content state -->
    <div v-else-if="showContent">
      <!-- Podium view for top 3 voted contributors -->
      <div class="mb-2 text-center">
        <h3 class="text-lg font-semibold">Most Voted Users Podium</h3>
        <p class="text-sm text-muted-foreground">Users with the highest total upvotes</p>
      </div>
      
      <PodiumView :contributors="podiumContributors" />
      
      <!-- Leaderboard Section for remaining contributors -->
      <div v-if="hasMoreThanThreeContributors">
        <h3 class="text-lg font-semibold mb-4">Votes Leaderboard</h3>
        <div class="grid gap-2">
          <div 
            v-for="(contributor, index) in remainingContributors" 
            :key="contributor.uid"
            class="flex items-center justify-between p-3 bg-card rounded-md border shadow-sm"
          >
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 flex items-center justify-center bg-primary/10 rounded-full font-semibold">
                {{ index + 4 }}
              </span>
              <div>
                <div class="font-medium">{{ contributor.name }}</div>
                <div v-if="contributor.tag" class="text-sm text-muted-foreground">@{{ contributor.tag }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1 text-sm">
              <Heart class="h-4 w-4 text-primary" />
              <span class="font-medium">{{ contributor.totalVotes || 0 }} votes</span>
              <span class="text-muted-foreground">({{ contributor.count }} notas)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>