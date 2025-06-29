<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
import { Badge } from '@/ui/badge'
import { X, Hash } from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

const props = defineProps<{
  selectedTag: string
  notas: Nota[]
  class?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedTag', value: string): void
}>()

const allTags = computed(() => {
  const tagCounts = new Map<string, number>()
  
  props.notas.forEach((nota) => {
    if (nota.tags) {
      nota.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    }
  })
  
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
})

const handleTagSelect = (value: string) => {
  emit('update:selectedTag', value === 'all' ? '' : value)
}

const clearTag = () => {
  emit('update:selectedTag', '')
}
</script>

<template>
  <div :class="['flex items-center gap-2', props.class]">
    <div class="relative flex-1">
      <Select 
        :value="selectedTag || 'all'" 
        @update:value="handleTagSelect"
      >
        <SelectTrigger class="w-full">
          <div class="flex items-center gap-2">
            <Hash class="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter by tag" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div class="flex items-center justify-between w-full">
              <span>All tags</span>
              <Badge variant="secondary" class="ml-2">
                {{ allTags.reduce((sum, { count }) => sum + count, 0) }}
              </Badge>
            </div>
          </SelectItem>
          <template v-if="allTags.length > 0">
            <div class="h-px bg-border my-1" />
            <SelectItem 
              v-for="{ tag, count } in allTags" 
              :key="tag" 
              :value="tag"
            >
              <div class="flex items-center justify-between w-full">
                <span class="truncate">{{ tag }}</span>
                <Badge variant="secondary" class="ml-2 flex-shrink-0">
                  {{ count }}
                </Badge>
              </div>
            </SelectItem>
          </template>
        </SelectContent>
      </Select>
      
      <Button
        v-if="selectedTag"
        variant="ghost"
        size="sm"
        class="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
        @click="clearTag"
        title="Clear tag filter"
      >
        <X class="h-3 w-3" />
      </Button>
    </div>
  </div>
</template>








