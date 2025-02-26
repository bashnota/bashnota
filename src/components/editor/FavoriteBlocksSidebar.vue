<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useFavoriteBlocksStore } from '@/stores/favoriteBlocksStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StarIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon, Bars3Icon, ChevronRightIcon } from '@heroicons/vue/24/solid'
import { TagsInput, TagsInputInput, TagsInputItem } from '@/components/ui/tags-input'
import { toast } from '@/lib/utils'
import { onKeyStroke } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor?: Editor | null
}>()

const store = useFavoriteBlocksStore()
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const isOpen = ref(true)
const previewContent = ref('')
const isDragging = ref(false)

// Load saved state
onMounted(() => {
  const savedState = localStorage.getItem('favorite-blocks-sidebar')
  if (savedState) {
    isOpen.value = JSON.parse(savedState)
  }
  store.loadBlocks()
})

// Watch for changes to save state
watch(isOpen, (newState) => {
  localStorage.setItem('favorite-blocks-sidebar', JSON.stringify(newState))
})

const filteredBlocks = computed(() => {
  return store.blocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesTags = selectedTags.value.length === 0 || 
      selectedTags.value.every(tag => block.tags.includes(tag))
    return matchesSearch && matchesTags
  })
})

const availableTags = computed(() => {
  const tags = new Set<string>()
  store.blocks.forEach(block => {
    block.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags)
})

const insertBlock = async (content: string) => {
  if (props.editor) {
    try {
      const parsedContent = JSON.parse(content)
      props.editor.commands.insertContent({
        type: parsedContent.type,
        content: parsedContent.content,
        attrs: parsedContent.attrs
      })
      toast({
        title: 'Block Inserted',
        description: 'The block was successfully inserted into the document',
      })
    } catch (error) {
      console.error('Failed to insert block:', error)
      toast({
        title: 'Error',
        description: 'Failed to insert block',
        variant: 'destructive'
      })
    }
  }
}

const removeBlock = async (id: string) => {
  if (confirm('Are you sure you want to remove this block from favorites?')) {
    await store.removeBlock(id)
    toast({
      title: 'Block Removed',
      description: 'The block was removed from favorites',
    })
  }
}

const handleDragStart = (event: DragEvent, content: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', content)
    isDragging.value = true
  }
}

const handleDragEnd = () => {
  isDragging.value = false
}

const showPreview = (content: string) => {
  try {
    const parsed = JSON.parse(content)
    previewContent.value = parsed.content?.[0]?.text || 'No preview available'
  } catch {
    previewContent.value = 'Invalid content'
  }
}

// Toggle sidebar
const toggleSidebar = () => {
  isOpen.value = !isOpen.value
}

// Keyboard shortcuts
onKeyStroke('f', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    toggleSidebar()
  }
})

onKeyStroke('/', (e) => {
  if (isOpen.value) {
    e.preventDefault()
    document.querySelector<HTMLInputElement>('.favorite-blocks-search')?.focus()
  }
})
</script>

<template>
  <div 
    class="fixed top-14 right-0 bottom-0 z-50 transition-transform duration-200 ease-in-out"
    :class="[isOpen ? 'translate-x-0' : 'translate-x-full']"
  >
    <!-- Toggle Button -->
    <Button
      class="absolute -left-10 top-4 z-10 shadow-md"
      variant="ghost"
      size="icon"
      @click="toggleSidebar"
      :title="isOpen ? 'Hide Favorites' : 'Show Favorites'"
    >
      <ChevronRightIcon 
        class="w-4 h-4 transition-transform duration-200" 
        :class="{ 'rotate-180': isOpen }" 
      />
    </Button>

    <!-- Sidebar Content -->
    <div 
      class="w-72 h-full flex flex-col bg-background border-l shadow-lg"
      :class="[isDragging ? 'pointer-events-none' : '']"
    >
      <div class="p-4 border-b">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <StarIcon class="w-5 h-5 text-yellow-400" />
            Favorite Blocks
          </h3>
          <Button variant="ghost" size="icon" @click="isOpen = false">
            <XMarkIcon class="w-4 h-4" />
          </Button>
        </div>
        
        <div class="space-y-4">
          <div class="relative">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search blocks... (/)"
              class="pl-9 favorite-blocks-search"
            />
          </div>

          <TagsInput v-model="selectedTags" placeholder="Filter by tags...">
            <TagsInputItem v-for="tag in selectedTags" :key="tag" :value="tag">
              {{ tag }}
            </TagsInputItem>
            <TagsInputInput :placeholder="`Add tag (${availableTags.length} available)...`" />
          </TagsInput>
        </div>
      </div>

      <ScrollArea class="flex-1">
        <div class="p-4 space-y-4">
          <div v-for="block in filteredBlocks" :key="block.id" 
            class="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            draggable="true"
            @dragstart="handleDragStart($event, block.content)"
            @dragend="handleDragEnd"
            @mouseenter="showPreview(block.content)"
            @mouseleave="previewContent = ''"
          >
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium">{{ block.name }}</h4>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="icon" @click="insertBlock(block.content)">
                  <span class="sr-only">Insert</span>
                  <PlusIcon class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="removeBlock(block.id)">
                  <span class="sr-only">Remove</span>
                  <XMarkIcon class="h-4 w-4" />
                </Button>
                <div class="cursor-move">
                  <Bars3Icon class="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-1 mb-2">
              <span v-for="tag in block.tags" :key="tag" 
                class="text-xs bg-muted px-2 py-1 rounded-full">
                {{ tag }}
              </span>
            </div>

            <div v-if="previewContent" class="text-sm text-muted-foreground mt-2 border-t pt-2">
              {{ previewContent }}
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredBlocks.length === 0" class="text-center py-8">
            <StarIcon class="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h4 class="font-medium mb-2">No Blocks Found</h4>
            <p class="text-sm text-muted-foreground">
              {{ searchQuery || selectedTags.length > 0 
                ? 'Try adjusting your search or filters' 
                : 'Add blocks to your favorites for quick access' }}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>

<style scoped>
.favorite-blocks-search:focus {
  @apply ring-2 ring-primary ring-offset-2;
}
</style>