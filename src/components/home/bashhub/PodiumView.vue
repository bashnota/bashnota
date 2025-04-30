<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { Trophy, Award, Medal, BarChart2 } from 'lucide-vue-next'

interface PodiumViewProps {
  contributors: Array<{
    uid: string
    name: string
    tag?: string
    count: number
  }>
  podiumTitle?: string
}

// Add a default value for the podium title
const props = withDefaults(defineProps<PodiumViewProps>(), {
  podiumTitle: 'Top Contributors Podium'
})

// Animation state
const showPodium = ref(false)
const animateItems = ref(false)

onMounted(() => {
  // Trigger animations with a slight delay for better effect
  setTimeout(() => {
    showPodium.value = true
    setTimeout(() => {
      animateItems.value = true
    }, 300)
  }, 100)
})

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
const podiumHeights = ['h-28', 'h-36', 'h-20']

// Pedestal colors
const pedestalColors = [
  'from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700', // Silver
  'from-yellow-200 to-yellow-400 dark:from-yellow-600 dark:to-yellow-700', // Gold
  'from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800'  // Bronze
]

// Get position title
const getPositionTitle = (index: number): string => {
  const positions = ['Silver', 'Gold', 'Bronze']
  return positions[index]
}

// Animation delays for each position
const getAnimationDelay = (index: number): string => {
  // First the 1st place (middle) appears, then 2nd (left), then 3rd (right)
  const delays = ['300ms', '100ms', '500ms']
  return delays[index]
}
</script>

<template>
  <div v-if="hasAtLeastOneContributor" class="mb-8">
    
    <div class="flex items-end justify-center gap-4 mt-6 relative h-64">
      <div 
        v-for="(contributor, index) in podiumContributors"
        :key="contributor.uid" 
        class="flex flex-col items-center relative z-10 transition-all duration-500"
        :class="[
          showPodium ? 'opacity-100' : 'opacity-0 translate-y-4',
          animateItems ? 'translate-y-0' : 'translate-y-4'
        ]"
        :style="`transition-delay: ${getAnimationDelay(index)}`"
      >
        <!-- Contributor details with enhanced animation -->
        <div 
          v-if="contributor.name" 
          class="text-center mb-2 transition-all duration-500 transform"
          :class="animateItems ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
          :style="`transition-delay: ${getAnimationDelay(index)}`"
        >
          <div class="relative">
            <div 
              class="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center"
              :class="[
                index === 1 ? 'bg-yellow-100 dark:bg-yellow-900/50' : 
                index === 0 ? 'bg-gray-100 dark:bg-gray-800/50' : 
                'bg-amber-100 dark:bg-amber-900/50'
              ]"
            >
              <component 
                :is="positionIcons[index]" 
                class="h-5 w-5"
                :class="{
                  'text-yellow-500': index === 1,
                  'text-gray-400': index === 0,
                  'text-amber-600': index === 2
                }"
              />
            </div>
            <div 
              class="overflow-hidden rounded-full p-1 border-2"
              :class="[
                index === 1 ? 'border-yellow-400 dark:border-yellow-600' : 
                index === 0 ? 'border-gray-300 dark:border-gray-500' : 
                'border-amber-500 dark:border-amber-700'
              ]"
            >
              <!-- Avatar placeholder - could be replaced with actual avatars -->
              <div 
                class="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-primary/10"
                :class="[
                  index === 1 ? 'bg-yellow-100 dark:bg-yellow-900/50' : 
                  index === 0 ? 'bg-gray-100 dark:bg-gray-800/50' : 
                  'bg-amber-100 dark:bg-amber-900/50'
                ]"
              >
                {{ contributor.name.charAt(0).toUpperCase() }}
              </div>
            </div>
          </div>
          <div class="font-semibold truncate max-w-[100px] mt-2">{{ contributor.name }}</div>
          <div v-if="contributor.tag" class="text-xs text-muted-foreground">
            @{{ contributor.tag }}
          </div>
          <div class="text-sm font-medium flex items-center justify-center gap-1 mt-1">
            <BarChart2 class="h-3 w-3" />
            {{ contributor.count }} nota{{ contributor.count !== 1 ? 's' : '' }}
          </div>
        </div>
        
        <!-- Empty position placeholder with animation -->
        <div 
          v-else 
          class="text-center mb-2 text-muted-foreground transition-all duration-500 transform"
          :class="animateItems ? 'scale-100 opacity-40' : 'scale-95 opacity-0'"
          :style="`transition-delay: ${getAnimationDelay(index)}`"
        >
          <div class="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-1 opacity-30"
            :class="[
              index === 1 ? 'border-yellow-400' : 
              index === 0 ? 'border-gray-300' : 
              'border-amber-500'
            ]"
          >
            <component :is="positionIcons[index]" class="h-6 w-6" />
          </div>
          <div class="text-xs">Position {{ index === 1 ? 1 : index === 0 ? 2 : 3 }}</div>
        </div>
        
        <!-- Podium pedestal with enhanced styling and animation -->
        <div 
          :class="[
            podiumHeights[index], 
            'w-24 rounded-t-md shadow-md relative overflow-hidden bg-gradient-to-b',
            pedestalColors[index],
            showPodium ? 'max-h-96' : 'max-h-0',
          ]"
          :title="getPositionTitle(index)"
          :style="`transition-delay: ${getAnimationDelay(index)}`"
          class="transition-all duration-700 ease-out transform"
        >
          <div 
            class="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-background rounded-full w-8 h-8 flex items-center justify-center shadow-md font-bold"
            :class="[
              index === 1 ? 'text-yellow-600' : 
              index === 0 ? 'text-gray-600' : 
              'text-amber-700'
            ]"
          >
            {{ index === 1 ? 1 : index === 0 ? 2 : 3 }}
          </div>
          <!-- Decorative pattern -->
          <div class="absolute inset-0 opacity-30">
            <div class="absolute bottom-0 left-0 right-0 h-1/3 bg-black/10"></div>
            <div class="absolute top-1/3 left-1/4 w-1/2 h-1/3 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>