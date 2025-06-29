<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Heart, 
  Bookmark 
} from 'lucide-vue-next'
import { formatRelativeTime } from '@/lib/utils'
import type { PublishedNota } from '@/features/nota/types/nota'

interface NotaListItemProps {
  nota: PublishedNota
  isAuthenticated: boolean
}

const props = defineProps<NotaListItemProps>()

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
    <CardContent class="p-4 flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-medium text-base truncate">{{ nota.title }}</h3>
          <div class="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock class="h-3 w-3" />
            <span>{{ formatRelativeTime(nota.publishedAt) }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-4 text-sm">
          <span class="inline-flex items-center gap-1">
            <Users class="h-3 w-3" />
            <span class="truncate max-w-[100px]">{{ nota.authorName }}</span>
          </span>
          
          <span class="inline-flex items-center gap-1">
            <TrendingUp class="h-3 w-3" />
            <span>{{ viewCount }}</span>
          </span>
          
          <span class="inline-flex items-center gap-1">
            <Heart class="h-3 w-3" :class="{'text-red-500': hasLikes}" />
            <span>{{ likeCount }}</span>
          </span>
        </div>
        
        <div v-if="hasTags" class="flex flex-wrap gap-1 mt-2">
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
      </div>
      
      <Button 
        v-if="isAuthenticated"
        variant="ghost" 
        size="icon"
        title="Clone this nota"
        @click="handleClone"
        class="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
      >
        <Bookmark class="h-4 w-4" />
      </Button>
    </CardContent>
  </Card>
</template>







