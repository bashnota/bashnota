<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-vue-next'
import type { FilterOption } from '@/features/nota/composables/useNotaFilters'

interface Props {
  filters: FilterOption[]
  selectedFilters: Set<string>
  showCounts?: boolean
  size?: 'sm' | 'md'
  label?: string
}

interface Emits {
  (e: 'toggle-filter', filterId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showCounts: true,
  size: 'md',
  label: 'Quick Filters:'
})

const emit = defineEmits<Emits>()

const sizeClasses = {
  sm: 'h-6 px-2 text-xs',
  md: 'h-7 px-3 text-sm'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4'
}

const badgeSizes = {
  sm: 'h-3 text-xs px-1',
  md: 'h-4 text-xs px-1'
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2">
      <Filter :class="['text-muted-foreground', iconSizes[size]]" />
      <span :class="['font-medium text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm']">
        {{ label }}
      </span>
    </div>
    
    <Button
      v-for="filter in filters"
      :key="filter.id"
      @click="emit('toggle-filter', filter.id)"
      :variant="selectedFilters.has(filter.id) ? 'default' : 'outline'"
      size="sm"
      :class="sizeClasses[size]"
    >
      <component :is="filter.icon" :class="['mr-1', iconSizes[size]]" />
      {{ filter.label }}
      
      <Badge 
        v-if="showCounts && filter.count !== undefined && filter.count > 0" 
        variant="secondary" 
        :class="['ml-1', badgeSizes[size]]"
      >
        {{ filter.count }}
      </Badge>
    </Button>
  </div>
</template>
