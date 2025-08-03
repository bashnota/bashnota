<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  FileText, 
  Star, 
  Clock, 
  Tag,
  MoreHorizontal
} from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'
import { formatDate, getRelativeTime } from '@/utils/dateUtils'

interface Props {
  nota: Nota
  viewType?: 'grid' | 'list' | 'compact'
  isSelected?: boolean
}

interface Emits {
  (e: 'toggle-favorite', id: string): void
  (e: 'tag-click', tag: string): void
  (e: 'more-actions', id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  viewType: 'list',
  isSelected: false
})

const emit = defineEmits<Emits>()

const relativeDate = computed(() => getRelativeTime(props.nota.updatedAt))
const hasContent = computed(() => props.nota.content && props.nota.content.trim().length > 0)
const tagCount = computed(() => props.nota.tags?.length || 0)

const handleToggleFavorite = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  emit('toggle-favorite', props.nota.id)
}

const handleTagClick = (event: Event, tag: string) => {
  event.preventDefault()
  event.stopPropagation()
  emit('tag-click', tag)
}

const handleMoreActions = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  emit('more-actions', props.nota.id)
}
</script>

<template>
  <!-- Grid View Card -->
  <RouterLink 
    v-if="viewType === 'grid'" 
    :to="`/nota/${nota.id}`"
    class="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
  >
    <Card class="h-full transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 border-border/50 hover:border-primary/20 group-focus-visible:border-primary/50">
      <CardHeader class="pb-3">
        <!-- Header Row -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="p-2 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <FileText class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle class="text-base font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {{ nota.title }}
              </CardTitle>
              <div class="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <Clock class="h-3 w-3 flex-shrink-0" />
                <span>{{ relativeDate }}</span>
                <span v-if="nota.favorite" class="text-yellow-500">★</span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
              :class="{ 'text-yellow-500': nota.favorite }"
              @click="handleToggleFavorite"
              :title="nota.favorite ? 'Remove from favorites' : 'Add to favorites'"
            >
              <Star 
                class="h-4 w-4" 
                :class="{ 'fill-current': nota.favorite }"
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="handleMoreActions"
              title="More actions"
            >
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent class="pt-0">
        <!-- Tags -->
        <div v-if="tagCount > 0" class="flex flex-wrap gap-1.5">
          <Badge
            v-for="tag in nota.tags?.slice(0, 3)"
            :key="tag"
            variant="secondary"
            class="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
            @click="(e) => handleTagClick(e, tag)"
          >
            {{ tag }}
          </Badge>
          <Badge
            v-if="tagCount > 3"
            variant="outline"
            class="text-xs px-2 py-0.5"
          >
            +{{ tagCount - 3 }}
          </Badge>
        </div>
        <div v-else class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag class="h-3 w-3" />
          <span>No tags</span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>

  <!-- List View Item -->
  <RouterLink 
    v-else-if="viewType === 'list'" 
    :to="`/nota/${nota.id}`"
    class="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
  >
    <div class="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 hover:border-primary/20 transition-all duration-200 group-focus-visible:border-primary/50">
      <!-- Icon -->
      <div class="p-2 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors flex-shrink-0">
        <FileText class="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
              {{ nota.title }}
            </h3>
            <div class="flex items-center gap-3 mt-1.5">
              <span class="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock class="h-3 w-3" />
                {{ relativeDate }}
              </span>
              <span v-if="nota.favorite" class="text-yellow-500 text-sm">★ Favorite</span>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
              :class="{ 'text-yellow-500': nota.favorite }"
              @click="handleToggleFavorite"
              :title="nota.favorite ? 'Remove from favorites' : 'Add to favorites'"
            >
              <Star 
                class="h-4 w-4" 
                :class="{ 'fill-current': nota.favorite }"
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="handleMoreActions"
              title="More actions"
            >
              <MoreHorizontal class="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <!-- Tags Row -->
        <div v-if="tagCount > 0" class="flex flex-wrap gap-1.5 mt-2">
          <Badge
            v-for="tag in nota.tags?.slice(0, 4)"
            :key="tag"
            variant="secondary"
            class="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
            @click="(e) => handleTagClick(e, tag)"
          >
            {{ tag }}
          </Badge>
          <Badge
            v-if="tagCount > 4"
            variant="outline"
            class="text-xs px-2 py-0.5"
          >
            +{{ tagCount - 4 }}
          </Badge>
        </div>
      </div>
    </div>
  </RouterLink>

  <!-- Compact View Item -->
  <RouterLink 
    v-else 
    :to="`/nota/${nota.id}`"
    class="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
  >
    <div class="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-muted/50 transition-colors duration-200 border-b border-border/30 last:border-b-0">
      <FileText class="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span class="font-medium truncate flex-1 group-hover:text-primary transition-colors">
        {{ nota.title }}
      </span>
      <div class="flex items-center gap-2 flex-shrink-0">
        <Star 
          v-if="nota.favorite"
          class="h-3 w-3 text-yellow-500 fill-current"
        />
        <span class="text-xs text-muted-foreground">{{ relativeDate }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 