<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Heart, 
  Bookmark 
} from 'lucide-vue-next'
import { formatRelativeTime } from '@/lib/utils'
import type { PublishedNota } from '@/types/nota'

interface NotaCardProps {
  nota: PublishedNota
  isAuthenticated: boolean
}

const props = defineProps<NotaCardProps>()

const emit = defineEmits<{
  (e: 'view'): void
  (e: 'clone', event: Event): void
}>()

// Maximum length for tag display
const MAX_TAG_LENGTH = 15

// Helper function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Helper function to truncate tags
const truncateTag = (tag: string) => {
  return truncateText(tag, MAX_TAG_LENGTH)
}

// Handle view nota
const handleView = () => {
  emit('view')
}

// Handle clone nota
const handleClone = (event: Event) => {
  event.stopPropagation()
  emit('clone', event)
}

// Computed props for better component readability
const hasTags = computed(() => !!props.nota.tags && props.nota.tags.length > 0)
const hasAdditionalTags = computed(() => props.nota.tags && props.nota.tags.length > 3)
const displayTags = computed(() => props.nota.tags?.slice(0, 3) || [])
const additionalTagsCount = computed(() => props.nota.tags ? props.nota.tags.length - 3 : 0)
const viewCount = computed(() => props.nota.viewCount || 0)
const likeCount = computed(() => props.nota.likeCount || 0)
const hasLikes = computed(() => likeCount.value > 0)
</script>

<template>
  <Card 
    class="cursor-pointer hover:shadow-md transition-shadow"
    @click="handleView"
  >
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center justify-between">
        <span class="truncate">{{ nota.title }}</span>
        <Button 
          v-if="isAuthenticated"
          variant="ghost" 
          size="icon"
          title="Clone this nota"
          @click="handleClone"
          class="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bookmark class="h-4 w-4" />
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent class="py-2">
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Clock class="h-3 w-3" />
        <span>{{ formatRelativeTime(nota.publishedAt) }}</span>
        <span class="inline-flex items-center gap-1">
          <Users class="h-3 w-3" />
          <span>{{ nota.authorName }}</span>
        </span>
      </div>
      <div v-if="hasTags" class="flex flex-wrap gap-1">
        <Badge 
          v-for="tag in displayTags" 
          :key="tag" 
          variant="secondary"
          class="text-xs"
        >
          {{ truncateTag(tag) }}
        </Badge>
        <Badge 
          v-if="hasAdditionalTags" 
          variant="outline"
          class="text-xs"
        >
          +{{ additionalTagsCount }}
        </Badge>
      </div>
    </CardContent>
    <CardFooter class="flex justify-between pt-2 text-sm">
      <div class="flex items-center gap-4">
        <span class="inline-flex items-center gap-1">
          <TrendingUp class="h-3 w-3" />
          {{ viewCount }} views
        </span>
        <span class="inline-flex items-center gap-1">
          <Heart class="h-3 w-3" :class="{'text-red-500': hasLikes}" />
          {{ likeCount }} likes
        </span>
      </div>
    </CardFooter>
  </Card>
</template>