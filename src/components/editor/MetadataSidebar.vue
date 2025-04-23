<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import { 
  Tag, 
  X, 
  Info, 
  Calendar, 
  Clock, 
  Copy, 
  Link, 
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  RotateCw
} from 'lucide-vue-next'
import { useNotaStore } from '@/stores/nota'
import { useNotaMetadata } from '@/composables/useNotaMetadata'
import { toast } from '@/lib/utils'
import type { Nota } from '@/types/nota'
import { onKeyStroke } from '@vueuse/core'

const props = defineProps<{
  nota: Nota | null
  isSaving: boolean
  showSaved: boolean
  autoSaveEnabled?: boolean
  isMetadataSidebarOpen?: boolean
}>()

const emit = defineEmits<{
  'update:tags': [tags: string[]]
  'update:isMetadataSidebarOpen': [isOpen: boolean]
}>()

// Reactive states
const isOpen = ref(props.isMetadataSidebarOpen || false)
const hasCopiedId = ref(false)
const hasCopiedLink = ref(false)
const showExpandedSection = ref<Record<string, boolean>>({
  tags: true,
  details: false
})

// Use our metadata composable
const {
  formattedCreatedAt,
  lastUpdatedRelative,
  shareableLink,
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

// Watch for props changes to update local state
watch(() => props.isMetadataSidebarOpen, (newValue) => {
  isOpen.value = newValue || false
})

// Watch for local state changes to emit updates
watch(isOpen, (newValue) => {
  emit('update:isMetadataSidebarOpen', newValue)
  localStorage.setItem('metadata-sidebar-state', JSON.stringify(newValue))
})

// Load saved state
onMounted(() => {
  const savedState = localStorage.getItem('metadata-sidebar-state')
  if (savedState) {
    isOpen.value = JSON.parse(savedState)
    emit('update:isMetadataSidebarOpen', isOpen.value)
  }
})

// Toggle sidebar visibility
const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

// Toggle section expansion
const toggleSection = (section: string) => {
  showExpandedSection.value[section] = !showExpandedSection.value[section]
}

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
    
    toast(`${type === 'id' ? 'Nota ID' : 'Link'} copied to clipboard`, 'Success')
  } catch (error) {
    toast('Failed to copy to clipboard', 'Error', 'destructive')
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

// Keyboard shortcut for toggling sidebar - Ctrl+Shift+Alt+M for Metadata
onKeyStroke('m', (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey) {
    e.preventDefault()
    toggleSidebar()
  }
})
</script>

<template>
  <div 
    class="fixed top-14 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out"
    :class="[isOpen ? 'translate-x-0' : 'translate-x-full']"
  >
    <!-- Toggle Button -->
    <Button
      class="absolute -left-10 top-4 z-10 shadow-md"
      variant="ghost"
      size="icon"
      @click="toggleSidebar"
      :title="isOpen ? 'Hide Metadata' : 'Show Metadata'"
      aria-label="Toggle Metadata Sidebar"
      tabindex="0"
    >
      <ChevronLeft class="h-4 w-4" />
    </Button>

    <!-- Sidebar Content -->
    <div 
      class="w-64 h-full flex flex-col bg-background border-l shadow-lg sidebar"
    >
      <div class="p-3 border-b">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold flex items-center gap-1.5">
            <Info class="h-4 w-4" />
            Nota Metadata
          </h3>
          <Button variant="ghost" size="icon" class="h-7 w-7" @click="isOpen = false">
            <X class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea class="flex-1 px-3">
        <div v-if="nota" class="py-3 space-y-4">
          <!-- Tags Section -->
          <div class="space-y-2">
            <div 
              class="flex items-center justify-between cursor-pointer"
              @click="toggleSection('tags')"
            >
              <div class="flex items-center gap-1.5">
                <Tag class="h-3.5 w-3.5 text-primary" />
                <h4 class="text-xs font-medium">Tags</h4>
              </div>
              <Button variant="ghost" size="icon" class="h-6 w-6 p-0">
                <component
                  :is="showExpandedSection.tags ? ChevronDown : ChevronRight"
                  class="h-3.5 w-3.5 text-muted-foreground"
                />
              </Button>
            </div>
            
            <div v-if="showExpandedSection.tags" class="animate-in slide-in-from-top-5 duration-150">
              <TagsInput 
                :model-value="nota.tags" 
                @update:model-value="updateTags"
                class="w-full text-xs"
              >
                <TagsInputItem v-for="item in nota.tags" :key="item" :value="item" class="h-5 text-xs">
                  <TagsInputItemText />
                  <TagsInputItemDelete />
                </TagsInputItem>
                <TagsInputInput placeholder="Add tag..." class="text-xs" />
              </TagsInput>
              
              <!-- Tag suggestions -->
              <div v-if="allTags.length > 0 && nota" class="mt-2 flex flex-wrap gap-1">
                <Button 
                  v-for="tag in allTags.filter(t => !nota?.tags?.includes(t)).slice(0, 5)" 
                  :key="tag"
                  variant="outline"
                  size="sm"
                  class="text-xs px-1.5 py-0 h-5 bg-muted/30"
                  @click="updateTags([...(nota.tags || []), tag])"
                >
                  + {{ tag }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Save Status -->
          <div class="px-1.5 py-1 bg-muted/30 rounded-md">
            <div class="flex items-center justify-between">
              <div class="flex items-center text-xs">
                <component 
                  :is="isSaving ? RotateCw : (showSaved ? Check : Clock)" 
                  class="w-3 h-3 mr-1.5"
                  :class="{ 'animate-spin': isSaving, 'text-green-500': showSaved }"
                />
                <span v-if="isSaving" class="text-[10px]">Saving...</span>
                <span v-else-if="showSaved" class="text-[10px] text-green-500">Saved</span>
              </div>
              
              <div v-if="nota.updatedAt" class="text-[10px] text-muted-foreground flex items-center">
                <span :title="formattedCreatedAt">{{ lastUpdatedRelative }}</span>
              </div>
            </div>
            
            <!-- Auto-save status -->
            <div 
              v-if="autoSaveEnabled !== undefined" 
              class="text-[10px] text-muted-foreground flex items-center mt-1"
            >
              <span class="mr-1 whitespace-nowrap">
                Auto-save: {{ autoSaveEnabled ? 'On' : 'Off' }}
              </span>
              <span 
                v-if="autoSaveEnabled" 
                class="w-1.5 h-1.5 rounded-full bg-green-500 opacity-75 animate-pulse"
              ></span>
              <span 
                v-else
                class="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-75"
              ></span>
            </div>
          </div>

          <!-- Details Section -->
          <div class="space-y-2">
            <div 
              class="flex items-center justify-between cursor-pointer"
              @click="toggleSection('details')"
            >
              <div class="flex items-center gap-1.5">
                <Info class="h-3.5 w-3.5 text-primary" />
                <h4 class="text-xs font-medium">Details</h4>
              </div>
              <Button variant="ghost" size="icon" class="h-6 w-6 p-0">
                <component
                  :is="showExpandedSection.details ? ChevronDown : ChevronRight"
                  class="h-3.5 w-3.5 text-muted-foreground"
                />
              </Button>
            </div>
            
            <div v-if="showExpandedSection.details" class="space-y-3 animate-in slide-in-from-top-5 duration-150">
              <!-- Creation Date -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <Calendar class="h-3 w-3 text-muted-foreground" />
                  <span class="text-muted-foreground">Created:</span>
                </div>
                <span class="text-[10px]">{{ formattedCreatedAt }}</span>
              </div>
              
              <!-- Nota ID -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <Tag class="h-3 w-3 text-muted-foreground" />
                  <span class="text-muted-foreground">ID:</span>
                </div>
                <div class="flex items-center gap-1">
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
              </div>
              
              <!-- Share Link -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <Link class="h-3 w-3 text-muted-foreground" />
                  <span class="text-muted-foreground">Share Link:</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  class="h-5 text-[10px] px-1.5"
                  @click="copyToClipboard(shareableLink, 'link')"
                >
                  <Copy v-if="!hasCopiedLink" class="h-2.5 w-2.5 mr-1" />
                  <Check v-else class="h-2.5 w-2.5 mr-1 text-green-500" />
                  Copy
                </Button>
              </div>
              
              <!-- Parent Nota (if applicable) -->
              <div v-if="nota.parentId" class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5">
                  <ChevronUp class="h-3 w-3 text-muted-foreground" />
                  <span class="text-muted-foreground">Parent:</span>
                </div>
                <Button 
                  variant="link" 
                  size="sm" 
                  class="h-5 text-[10px] px-1.5 text-primary"
                  @click="$router.push(`/nota/${nota.parentId}`)"
                >
                  View Parent
                </Button>
              </div>
            </div>
          </div>
          
          <!-- Word count and other stats could go here -->
        </div>
      </ScrollArea>

      <!-- Keyboard shortcut info at bottom -->
      <div class="px-3 py-2 text-[10px] text-muted-foreground border-t">
        Press <kbd class="px-1 py-0.5 rounded bg-muted">Ctrl+Shift+Alt+M</kbd> to toggle
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation-duration: 150ms;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, opacity;
}

.slide-in-from-top-5 {
  animation-name: slideInFromTop5;
}

@keyframes slideInFromTop5 {
  from { transform: translateY(-5px); opacity: 0.5; }
  to { transform: translateY(0); opacity: 1; }
}
</style>