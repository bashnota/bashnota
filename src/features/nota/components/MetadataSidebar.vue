<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-vue-next'
import { Editor } from '@tiptap/vue-3'
import { logger } from '@/services/logger'
import { toast } from 'vue-sonner'
import { BaseSidebar, SidebarSection, KeyboardShortcut } from '@/ui/sidebars'
import { useSidebarComposable } from '@/composables/useSidebarComposable'

// Props definition
const props = defineProps<{
  notaId: string
  editor?: Editor | null
}>()

// Define emit options
const emit = defineEmits<{
  close: []
}>()

// Store initialization
const notaStore = useNotaStore()

// Use our sidebar composable for consistent behavior but without width settings
const { } = useSidebarComposable({
  id: 'metadata-sidebar',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'm'
  }
})

// UI state management
const showSuggestions = ref(false)
const inputValue = ref('')
const debounceTimeout = ref<number | null>(null)
const tagSuggestionCache = ref<string[]>([])

// Get current nota from store
const currentNota = computed(() => {
  return notaStore.getCurrentNota(props.notaId)
})

// Stats computations
const wordCount = computed(() => {
  if (!props.editor) return 0
  const text = props.editor.getText()
  return text.split(/\s+/).filter((word) => word.length > 0).length
})

const characterCount = computed(() => {
  if (!props.editor) return 0
  return props.editor.getText().length
})

const blockCount = computed(() => {
  if (!props.editor) return 0
  const json = props.editor.getJSON()
  return json.content?.length || 0
})

// Get all unique tags across all notas
const allTags = computed(() => {
  const tagSet = new Set<string>()
  notaStore.items.forEach(nota => {
    if (nota.tags) {
      nota.tags.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// Filter suggestions based on input
const filteredSuggestions = computed(() => {
  if (!currentNota.value || !inputValue.value) return []
  
  return allTags.value
    .filter(tag => {
      // Filter out tags that are already in the current nota
      if (currentNota.value?.tags?.includes(tag)) return false
      
      // Filter by input value
      return tag.toLowerCase().includes(inputValue.value.toLowerCase())
    })
    .slice(0, 5) // Limit to 5 suggestions
})

// Get 5 recently used tags (not already in the current nota)
const recentTags = computed(() => {
  if (!currentNota.value) return []
  
  // Find tags used in other notas, sorted by recency (based on nota updatedAt)
  const recentlyUsedTags = notaStore.items
    .filter(nota => nota.id !== props.notaId) // Exclude current nota
    .sort((a, b) => {
      // Sort by updatedAt descending
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
    .flatMap(nota => nota.tags || [])
    .filter(tag => 
      tag && // Ensure tag exists
      currentNota.value?.tags && !currentNota.value.tags.includes(tag) // Don't suggest tags already in use
    )

  // Remove duplicates
  return [...new Set(recentlyUsedTags)].slice(0, 5)
})

// Date formatter
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A'
  const dateObj = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

// Add tag from suggestion
const addTag = (tag: string) => {
  if (!currentNota.value) return
  
  // Check if tag already exists to avoid duplicates
  if (!currentNota.value.tags.includes(tag)) {
    currentNota.value.tags = [...currentNota.value.tags, tag]
    saveTagsWithDebounce()
  }
}

// Helper function to debounce tag save actions
const saveTagsWithDebounce = () => {
  // Clear existing timeout
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value)
  }
  
  // Set new timeout (800ms debounce)
  debounceTimeout.value = window.setTimeout(() => {
    onTagsUpdate()
  }, 800)
}

// Tags update handler with validation
const onTagsUpdate = async () => {
  if (!currentNota.value) return
  
  // Validate and clean tags
  const validatedTags = validateTags(currentNota.value.tags)
  
  // Only if tags have changed, update them
  if (JSON.stringify(validatedTags) !== JSON.stringify(currentNota.value.tags)) {
    currentNota.value.tags = validatedTags
  }
  
  try {
    await notaStore.saveNota({
      id: props.notaId,
      tags: currentNota.value.tags,
      updatedAt: new Date()
    })
  } catch (error) {
    logger.error('Failed to save tags:', error)
    toast('Failed to save tags')
  }
}

// Validate and normalize tags
const validateTags = (tags: string[]): string[] => {
  return tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    // Filter out duplicates
    .filter((tag, index, self) => self.indexOf(tag) === index)
    // Limit tag length
    .map(tag => tag.length > 30 ? tag.substring(0, 30) : tag)
}

// Set up event listeners for tag suggestions
onMounted(() => {
  // Listen for TagsInput focus
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('.tags-input-input')) {
      showSuggestions.value = true
    } else {
      showSuggestions.value = false
    }
  })
  
  // Listen for input in the tags input
  const tagsInput = document.querySelector('.tags-input-input input') as HTMLInputElement
  if (tagsInput) {
    tagsInput.addEventListener('input', (e) => {
      inputValue.value = (e.target as HTMLInputElement).value
    })
  }
  
  // Initialize the tag suggestion cache
  tagSuggestionCache.value = allTags.value
})
</script>

<template>
  <BaseSidebar 
    id="metadata-sidebar"
    title="Metadata" 
    :icon="FileText" 
    position="right" 
    @close="$emit('close')"
  >
    <div class="p-4 space-y-4 w-full h-full">
      <!-- Tags Section -->
      <SidebarSection v-if="currentNota" title="Tags">
        <TagsInput 
          v-model="currentNota.tags" 
          @update:modelValue="onTagsUpdate"
          class="relative"
        >
          <TagsInputItem v-for="tag in currentNota.tags" :key="tag" :value="tag">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput :placeholder="currentNota.tags?.length ? '+' : 'Add tags...'" />
          
          <!-- Tag suggestions when input is focused -->
          <div v-if="showSuggestions && filteredSuggestions.length > 0" 
               class="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-md z-10 max-h-[150px] overflow-y-auto">
            <div v-for="tag in filteredSuggestions" 
                 :key="tag" 
                 @click="addTag(tag)"
                 class="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
              {{ tag }}
            </div>
          </div>
        </TagsInput>
        
        <!-- Recently used tags -->
        <div v-if="recentTags.length > 0" class="mt-2">
          <div class="text-xs text-muted-foreground mb-1">Recent tags:</div>
          <div class="flex flex-wrap gap-1">
            <Button 
              v-for="tag in recentTags" 
              :key="tag"
              variant="outline" 
              size="sm" 
              class="text-xs h-6 px-2"
              @click="addTag(tag)"
            >
              + {{ tag }}
            </Button>
          </div>
        </div>
      </SidebarSection>

      <!-- Nota Details -->
      <SidebarSection v-if="currentNota" title="Note Details">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <span class="text-muted-foreground">Created:</span>
          <span>{{ formatDate(currentNota.createdAt) }}</span>
          
          <span class="text-muted-foreground">Updated:</span>
          <span>{{ formatDate(currentNota.updatedAt) }}</span>
          
          <span class="text-muted-foreground">ID:</span>
          <span class="truncate" :title="currentNota.id">{{ currentNota.id }}</span>
        </div>
      </SidebarSection>

      <!-- Word Count Stats -->
      <SidebarSection v-if="editor" title="Statistics">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <span class="text-muted-foreground">Words:</span>
          <span>{{ wordCount }}</span>
          
          <span class="text-muted-foreground">Characters:</span>
          <span>{{ characterCount }}</span>
          
          <span class="text-muted-foreground">Blocks:</span>
          <span>{{ blockCount }}</span>
        </div>
      </SidebarSection>
    </div>
    
    <!-- Keyboard Shortcut Footer -->
    <KeyboardShortcut 
      ctrl
      shift
      keyName="M" 
      action="toggle metadata"
    />
  </BaseSidebar>
</template>







