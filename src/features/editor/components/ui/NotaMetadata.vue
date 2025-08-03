<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useNotaMetadata } from '@/features/nota/composables/useNotaMetadata'
import { toast } from 'vue-sonner'
import { formatDate } from '@/lib/utils'
import { 
  Clock, 
  Calendar, 
  Tag, 
  ChevronDown, 
  ChevronRight, 
  Copy,
  Check,
  Info
} from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

const props = defineProps<{
  nota: Nota | null
  isSaving: boolean
  showSaved: boolean
  autoSaveEnabled?: boolean
}>()

const emit = defineEmits<{
  'update:tags': [tags: string[]]
}>()

// Reactive states for copy buttons
const hasCopiedId = ref(false)
const hasCopiedLink = ref(false)

// Use our metadata composable
const {
  showFullMetadata,
  formattedCreatedAt,
  lastUpdatedRelative,
  shareableLink,
  toggleFullMetadata
} = useNotaMetadata(props.nota)

// Get all tags for suggestions
const notaStore = useNotaStore()
const allTags = computed(() => {
  // Get unique tags from all notas
  const tagSet = new Set<string>()
  notaStore.items.forEach(nota => {
    if (nota.tags) {
      nota.tags.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// Store initial tags for comparison
const initialTags = ref<string[]>([])

// Update initial tags when component is mounted
watchEffect(() => {
  if (props.nota?.tags) {
    initialTags.value = [...props.nota.tags]
  }
})

/**
 * Handle tag updates
 * @param tags - New tags array
 */
const updateTags = (tags: any[]) => {
  if (props.nota) {
    // Convert tags to strings if they aren't already
    const stringTags = tags.map(tag => typeof tag === 'string' ? tag : String(tag))
    emit('update:tags', stringTags)
  }
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @param type - Type of content being copied (for reference)
 */
const copyToClipboard = async (text: string, type: 'id' | 'link') => {
  try {
    await navigator.clipboard.writeText(text)
    
    // Set the copied state
    if (type === 'id') {
      hasCopiedId.value = true
      setTimeout(() => { hasCopiedId.value = false }, 2000)
    } else {
      hasCopiedLink.value = true
      setTimeout(() => { hasCopiedLink.value = false }, 2000)
    }
    
    toast(`${type === 'id' ? 'Nota ID' : 'Link'} copied to clipboard`, { description: 'Success' })
  } catch (error) {
    toast('Failed to copy to clipboard', { description: 'Error' })
  }
}

/**
 * Get formatted ID (shortened with ellipsis for display)
 */
const formattedId = computed(() => {
  if (!props.nota?.id) return ''
  const id = props.nota.id
  return id.length > 12 ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}` : id
})
</script>

<template>
  <div v-if="nota" class="nota-metadata">
    <!-- Combined header with tags input -->
    <div class="tags-section mb-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <Tag class="h-3.5 w-3.5 text-primary" />
          <h3 class="text-xs font-medium">Tags</h3>
        </div>
        
        <!-- Integrated metadata toggle -->
        <Button 
          variant="ghost" 
          size="sm" 
          class="h-6 text-xs flex items-center gap-0.5 text-muted-foreground px-1.5 py-0.5" 
          @click="toggleFullMetadata"
        >
          <Info class="h-3 w-3" />
          <span class="text-[10px]">{{ showFullMetadata ? 'Hide' : 'Info' }}</span>
          <component :is="showFullMetadata ? ChevronDown : ChevronRight" class="h-2.5 w-2.5" />
        </Button>
      </div>
      
      <!-- Compact tags input with inline suggestions -->
      <div class="flex items-center gap-1">
        <TagsInput 
          :model-value="nota.tags" 
          @update:model-value="updateTags"
          class="w-full border-none shadow-none text-xs"
        >
          <TagsInputItem v-for="item in nota.tags" :key="item" :value="item" class="h-5 text-xs">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput :placeholder="nota.tags?.length ? '+' : 'Add tags...'" class="text-xs" />
        </TagsInput>

        <Button 
          v-if="allTags.length > 0"
          variant="ghost" 
          size="sm" 
          class="flex-shrink-0 h-5 w-5 p-0"
          title="Show tag suggestions"
        >
          <ChevronDown class="h-3 w-3" />
          
          <!-- Tag suggestions tooltip -->
          <div class="absolute top-full right-0 mt-1 bg-background shadow-md rounded-md p-1 border flex flex-wrap max-w-[200px] gap-1 z-20 hidden group-hover:flex">
            <Button 
              v-for="tag in allTags.filter(t => !nota?.tags?.includes(t)).slice(0, 5)" 
              :key="tag"
              variant="outline"
              size="sm"
              class="text-xs px-1.5 py-0 h-5 bg-muted/30"
              @click="updateTags([...(nota?.tags || []), tag])"
            >
              + {{ tag }}
            </Button>
          </div>
        </Button>
      </div>
    </div>
    
    <!-- Integrated save indicator -->
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge v-if="isSaving" variant="secondary" class="text-xs">
        <Clock class="w-3 h-3 mr-1" />
        Saving...
      </Badge>
      <Badge v-else-if="showSaved" variant="secondary" class="text-xs">
        <Check class="w-3 h-3 mr-1" />
        Saved
      </Badge>
      <div v-if="typeof nota.updatedAt === 'string' ? new Date(nota.updatedAt) : nota.updatedAt" class="text-xs">
        Updated {{ formatDate(typeof nota.updatedAt === 'string' ? new Date(nota.updatedAt) : nota.updatedAt) }}
      </div>
    </div>
    
    <!-- Compact Expanded Metadata -->
    <div v-if="showFullMetadata" class="mt-1 p-2 rounded-md bg-muted/30 text-xs space-y-1 animate-in fade-in-50 slide-in-from-top-5 duration-200">
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <!-- Created Date -->
        <div class="flex items-center gap-1">
          <Calendar class="h-3 w-3 text-muted-foreground" />
          <span class="text-[10px] text-muted-foreground">{{ formattedCreatedAt }}</span>
        </div>
        
        <!-- Last Modified -->
        <div class="flex items-center gap-1">
          <Clock class="h-3 w-3 text-muted-foreground" />
          <span class="text-[10px] text-muted-foreground">{{ lastUpdatedRelative }}</span>
        </div>
      </div>
      
      <div class="flex justify-between items-center pt-1">
        <!-- Nota ID with copy button -->
        <div class="flex items-center gap-1">
          <span class="text-[10px] text-muted-foreground">ID:</span>
          <span class="text-[10px] font-mono">{{ formattedId }}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-4 w-4 p-0"
            @click="copyToClipboard(nota.id, 'id')"
            title="Copy ID to clipboard"
          >
            <Check v-if="hasCopiedId" class="h-2.5 w-2.5 text-green-500" />
            <Copy v-else class="h-2.5 w-2.5" />
          </Button>
        </div>
        
        <!-- Shareable Link -->
        <Button 
          variant="ghost" 
          size="sm" 
          class="h-5 text-[10px] px-1.5"
          @click="copyToClipboard(shareableLink, 'link')"
        >
          <Copy v-if="!hasCopiedLink" class="h-2.5 w-2.5 mr-1" />
          <Check v-else class="h-2.5 w-2.5 mr-1 text-green-500" />
          Copy Link
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nota-metadata {
  margin-bottom: 0.75rem;
  position: relative;
  z-index: 10;
}

.tags-section {
  transition: all 0.2s ease;
}

/* Animation utilities */
.animate-in {
  animation-duration: 120ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.fade-in-50 {
  animation-name: fadeIn50;
}

.slide-in-from-top-5 {
  animation-name: slideInFromTop5;
}

@keyframes fadeIn50 {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@keyframes slideInFromTop5 {
  from { transform: translateY(-3px); }
  to { transform: translateY(0); }
}
</style>







