<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Hash } from 'lucide-vue-next'

interface Props {
  tags: string[]
  selectedTags?: Set<string>
  maxVisible?: number
  size?: 'sm' | 'md'
  label?: string
  variant?: 'pills' | 'select'
  maxHeight?: string
}

interface Emits {
  (e: 'toggle-tag', tag: string): void
  (e: 'select-tag', tag: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => new Set(),
  maxVisible: 20,
  size: 'md',
  label: 'Tags:',
  variant: 'pills',
  maxHeight: 'max-h-20'
})

const emit = defineEmits<Emits>()

const visibleTags = computed(() => {
  return props.tags.slice(0, props.maxVisible)
})

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4'
}

const badgeSizes = {
  sm: 'text-xs h-5 px-2',
  md: 'text-xs h-6 px-2'
}

const handleTagClick = (tag: string) => {
  if (props.variant === 'pills') {
    emit('toggle-tag', tag)
  } else {
    emit('select-tag', tag)
  }
}

const isTagSelected = (tag: string) => {
  return props.selectedTags?.has(tag) || false
}
</script>

<template>
  <div v-if="tags.length > 0">
    <div class="flex items-center gap-2 mb-2">
      <Hash :class="['text-muted-foreground', iconSizes[size]]" />
      <span :class="['font-medium text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm']">
        {{ label }}
      </span>
    </div>
    
    <div :class="['flex flex-wrap gap-1 overflow-y-auto', maxHeight]">
      <Badge
        v-for="tag in visibleTags"
        :key="tag"
        @click="handleTagClick(tag)"
        :variant="isTagSelected(tag) ? 'default' : 'outline'"
        :class="[
          'cursor-pointer hover:bg-primary/10',
          badgeSizes[size]
        ]"
      >
        {{ tag }}
      </Badge>
      
      <Badge
        v-if="tags.length > maxVisible"
        variant="outline"
        :class="[
          'text-muted-foreground',
          badgeSizes[size]
        ]"
      >
        +{{ tags.length - maxVisible }} more
      </Badge>
    </div>
  </div>
</template>
