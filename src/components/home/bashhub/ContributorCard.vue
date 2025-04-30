<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface ContributorCardProps {
  contributor: {
    uid: string
    name: string
    tag?: string
    count: number
  }
  index: number
}

const props = defineProps<ContributorCardProps>()

// Computed properties
const displayRank = computed(() => props.index + 1)
const hasUserTag = computed(() => !!props.contributor.tag)
const notasText = computed(() => 
  `${props.contributor.count} nota${props.contributor.count !== 1 ? 's' : ''}`
)
const isTopRanked = computed(() => displayRank.value <= 3)
</script>

<template>
  <Card class="hover:shadow-sm transition-shadow">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span 
            class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm"
            :class="{'ring-2 ring-primary/20': isTopRanked}"
          >
            {{ displayRank }}
          </span>
          <span class="truncate">{{ contributor.name }}</span>
        </div>
      </CardTitle>
      <div v-if="hasUserTag" class="text-sm text-muted-foreground">
        @{{ contributor.tag }}
      </div>
    </CardHeader>
    <CardContent class="py-2">
      <p class="text-lg font-semibold">{{ notasText }}</p>
    </CardContent>
  </Card>
</template>