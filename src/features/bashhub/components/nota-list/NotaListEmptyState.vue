<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Star, 
  Search,
  Sparkles,
  Plus
} from 'lucide-vue-next'

interface Props {
  showFavorites?: boolean
  hasSearchQuery?: boolean
  hasSelectedTag?: boolean
  searchQuery?: string
  selectedTag?: string
}

interface Emits {
  (e: 'create-nota'): void
  (e: 'clear-filters'): void
}

const props = withDefaults(defineProps<Props>(), {
  showFavorites: false,
  hasSearchQuery: false,
  hasSelectedTag: false,
  searchQuery: '',
  selectedTag: ''
})

const emit = defineEmits<Emits>()

const emptyStateConfig = computed(() => {
  if (props.showFavorites) {
    return {
      icon: Star,
      title: 'No Favorite Notas',
      description: 'Star important notas for quick access',
      showCreateButton: false,
      showClearButton: false,
      illustration: '⭐'
    }
  }
  
  if (props.hasSearchQuery || props.hasSelectedTag) {
    const filters: string[] = []
    if (props.hasSearchQuery) filters.push(`"${props.searchQuery}"`)
    if (props.hasSelectedTag) filters.push(`#${props.selectedTag}`)
    
    return {
      icon: Search,
      title: 'No Matching Notas',
      description: `No notas found for ${filters.join(' and ')}. Try adjusting your filters or create a new nota.`,
      showCreateButton: true,
      showClearButton: true,
      illustration: '🔍'
    }
  }
  
  return {
    icon: FileText,
    title: 'Welcome to Your Nota Workspace',
    description: 'Create your first nota to start organizing your thoughts, ideas, and knowledge.',
    showCreateButton: true,
    showClearButton: false,
    illustration: '📝'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
    <!-- Illustration -->
    <div class="mb-6 p-4 rounded-full bg-muted/30">
      <div class="text-4xl mb-2">{{ emptyStateConfig.illustration }}</div>
      <component
        :is="emptyStateConfig.icon"
        class="w-8 h-8 text-muted-foreground/60 mx-auto"
      />
    </div>
    
    <!-- Content -->
    <div class="max-w-md">
      <h3 class="text-xl font-semibold mb-3 text-foreground">
        {{ emptyStateConfig.title }}
      </h3>
      <p class="text-muted-foreground mb-6 leading-relaxed">
        {{ emptyStateConfig.description }}
      </p>
      
      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          v-if="emptyStateConfig.showCreateButton"
          @click="$emit('create-nota')"
          class="flex gap-2"
        >
          <Plus class="h-4 w-4" />
          Create Your First Nota
        </Button>
        
        <Button 
          v-if="emptyStateConfig.showClearButton"
          variant="outline"
          @click="$emit('clear-filters')"
          class="flex gap-2"
        >
          <Search class="h-4 w-4" />
          Clear Filters
        </Button>
      </div>
    </div>
    
    <!-- Tips for new users -->
    <div v-if="!showFavorites && !hasSearchQuery && !hasSelectedTag" class="mt-8 max-w-lg">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/20">
          <Sparkles class="h-5 w-5 text-primary" />
          <span class="font-medium">Rich Content</span>
          <span class="text-xs text-muted-foreground text-center">Add text, code, math, and more</span>
        </div>
        <div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/20">
          <Star class="h-5 w-5 text-yellow-500" />
          <span class="font-medium">Organize</span>
          <span class="text-xs text-muted-foreground text-center">Use tags and favorites</span>
        </div>
        <div class="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/20">
          <Search class="h-5 w-5 text-blue-500" />
          <span class="font-medium">Find Fast</span>
          <span class="text-xs text-muted-foreground text-center">Powerful search and filtering</span>
        </div>
      </div>
    </div>
  </div>
</template> 