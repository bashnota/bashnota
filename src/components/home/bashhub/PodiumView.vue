<script setup lang="ts">
import { computed } from 'vue'
import { Trophy, Award, Medal } from 'lucide-vue-next'

interface PodiumViewProps {
  contributors: Array<{
    uid: string
    name: string
    tag?: string
    count: number
  }>
}

const props = defineProps<PodiumViewProps>()

// Computed properties for podium display
const podiumContributors = computed(() => {
  const topThree = props.contributors.slice(0, 3)
  
  // Make sure we have exactly 3 positions with placeholders if needed
  while (topThree.length < 3) {
    topThree.push({
      uid: `placeholder-${topThree.length}`,
      name: '',
      count: 0
    })
  }
  
  // Rearrange for podium display: 2nd, 1st, 3rd
  return [topThree[1], topThree[0], topThree[2]]
})

const hasAtLeastOneContributor = computed(() => props.contributors.length > 0)

// Icon for each position
const positionIcons = [
  Award, // Silver (2nd place)
  Trophy, // Gold (1st place)
  Medal  // Bronze (3rd place)
]

// Podium heights
const podiumHeights = ['h-24', 'h-32', 'h-16']

// Pedestal colors
const pedestalColors = [
  'bg-gray-300 dark:bg-gray-700', // Silver
  'bg-yellow-300 dark:bg-yellow-700', // Gold
  'bg-amber-700 dark:bg-amber-800'  // Bronze
]

// Get position title
const getPositionTitle = (index: number): string => {
  const positions = ['Silver', 'Gold', 'Bronze']
  return positions[index]
}
</script>

<template>
  <div v-if="hasAtLeastOneContributor" class="mb-8">
    <h3 class="text-lg font-semibold mb-2 text-center">Top Contributors Podium</h3>
    
    <div class="flex items-end justify-center gap-4 mt-6">
      <div 
        v-for="(contributor, index) in podiumContributors"
        :key="contributor.uid" 
        class="flex flex-col items-center"
      >
        <!-- Contributor details -->
        <div v-if="contributor.name" class="text-center mb-2">
          <component 
            :is="positionIcons[index]" 
            class="h-6 w-6 mx-auto mb-1"
            :class="{
              'text-yellow-500': index === 1,
              'text-gray-400': index === 0,
              'text-amber-600': index === 2
            }"
          />
          <div class="font-semibold truncate max-w-[100px]">{{ contributor.name }}</div>
          <div v-if="contributor.tag" class="text-xs text-muted-foreground">
            @{{ contributor.tag }}
          </div>
          <div class="text-sm font-medium">
            {{ contributor.count }} nota{{ contributor.count !== 1 ? 's' : '' }}
          </div>
        </div>
        
        <!-- Empty position placeholder -->
        <div v-else class="text-center mb-2 text-muted-foreground">
          <component 
            :is="positionIcons[index]" 
            class="h-6 w-6 mx-auto mb-1 opacity-30"
          />
          <div class="text-xs">Position {{ index === 1 ? 1 : index === 0 ? 2 : 3 }}</div>
        </div>
        
        <!-- Podium pedestal -->
        <div 
          :class="[pedestalColors[index], podiumHeights[index], 'w-20 rounded-t-md shadow-md relative']"
          :title="getPositionTitle(index)"
        >
          <div 
            class="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-background rounded-full w-8 h-8 flex items-center justify-center shadow font-bold"
          >
            {{ index === 1 ? 1 : index === 0 ? 2 : 3 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>