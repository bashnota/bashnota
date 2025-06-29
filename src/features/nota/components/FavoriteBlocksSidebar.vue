<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFavoriteBlocksStore } from '@/features/nota/stores/favoriteBlocksStore'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Button } from '@/ui/button'
import { Star, Search, X, Plus } from 'lucide-vue-next'
import { TagsInput, TagsInputInput, TagsInputItem } from '@/ui/tags-input'
import { toast } from '@/lib/utils'
import { onKeyStroke, useDebounceFn } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'
import Fuse from 'fuse.js'
import { logger } from '@/services/logger'
import { BaseSidebar, SidebarSection, KeyboardShortcut } from '@/ui/sidebars'
import { useSidebarComposable } from '@/composables/useSidebarComposable'

const props = defineProps<{
  editor?: Editor | null
}>()

// Define emit options to communicate with parent
const emit = defineEmits<{
  close: []
}>()

const store = useFavoriteBlocksStore()
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const expandedBlocks = ref<Set<string>>(new Set())
const previewContent = ref<Record<string, string>>({})

// Use our sidebar composable
const { isOpen, width } = useSidebarComposable({
  id: 'favorite-blocks',
  defaultWidth: 350,
  minWidth: 280,
  maxWidth: 500,
  keyboard: {
    ctrl: true,
    shift: true,
    alt: true,
    key: 'v'
  }
})

// Configure Fuse.js for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'content', weight: 1 },
    { name: 'tags', weight: 1 }
  ],
  threshold: 0.4,
  includeScore: true
}

const fuse = computed(() => new Fuse(store.blocks, fuseOptions))

// Debounced search for better performance
const debouncedSearch = useDebounceFn((query: string) => {
  searchQuery.value = query
}, 500)

// Load store data
onMounted(() => {
  store.loadBlocks()
})

const filteredBlocks = computed(() => {
  let results = store.blocks

  // Apply tag filtering
  if (selectedTags.value.length > 0) {
    results = results.filter(block => 
      selectedTags.value.every(tag => block.tags.includes(tag))
    )
  }

  // Apply search if query exists
  if (searchQuery.value.trim()) {
    const searchResults = fuse.value.search(searchQuery.value)
    results = searchResults.map(result => result.item)
  }

  return results
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
      toast('The block was successfully inserted into the document')
    } catch (error) {
      logger.error('Failed to insert block:', error)
      toast('Failed to insert block')
    }
  }
}

const removeBlock = async (id: string) => {
  if (confirm('Are you sure you want to remove this block from favorites?')) {
    await store.removeBlock(id)
    toast('The block was removed from favorites')
  }
}

const toggleBlockExpansion = (blockId: string) => {
  if (expandedBlocks.value.has(blockId)) {
    expandedBlocks.value.delete(blockId)
  } else {
    expandedBlocks.value.add(blockId)
  }
}

const showPreview = (blockId: string, content: string) => {
  try {
    const parsed = JSON.parse(content)
    const previewText = parsed.content?.[0]?.text || 
      parsed.content?.[0]?.content?.[0]?.text || 
      'No preview available'
    previewContent.value[blockId] = previewText.slice(0, 100) + 
      (previewText.length > 100 ? '...' : '')
  } catch {
    previewContent.value[blockId] = 'Invalid content'
  }
}

// Keyboard shortcut for search focus
onKeyStroke('p', (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey) {
    e.preventDefault()
    document.querySelector<HTMLInputElement>('.favorite-blocks-search')?.focus()
  }
})

// Parse and extract searchable content from JSON string
const getSearchableContent = (content: string) => {
  try {
    const parsed = JSON.parse(content)
    return parsed.content?.[0]?.text || ''
  } catch {
    return ''
  }
}

// Update store type to include parsed content
const blocks = computed(() => {
  return store.blocks.map(block => ({
    ...block,
    parsedContent: getSearchableContent(block.content)
  }))
})
</script>

<template>
  <BaseSidebar 
    id="favorite-blocks"
    title="Favorite Blocks" 
    :icon="Star" 
    position="right" 
    @close="emit('close')"
  >
    <ScrollArea class="flex-1">
      <div class="p-4 space-y-4">
        <!-- Search and Filter Section -->
        <SidebarSection>
          <div class="space-y-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                :value="searchQuery"
                @input="(e: Event) => debouncedSearch((e.target as HTMLInputElement).value)"
                placeholder="Search blocks... (Ctrl+Shift+Alt+P)"
                class="pl-9 favorite-blocks-search"
                aria-autocomplete="list"
                aria-controls="search-suggestions"
              />
            </div>

            <TagsInput v-model="selectedTags" placeholder="Filter by tags...">
              <TagsInputItem v-for="tag in selectedTags" :key="tag" :value="tag">
                {{ tag }}
              </TagsInputItem>
              <TagsInputInput :placeholder="`Add tag (${availableTags.length} available)...`" />
            </TagsInput>
          </div>
        </SidebarSection>

        <!-- Blocks List -->
        <div v-for="block in filteredBlocks" :key="block.id" 
          class="block-item border rounded-lg p-2 hover:bg-muted/50 transition-colors"
          @click="toggleBlockExpansion(block.id)"
          :class="{ 'expanded': expandedBlocks.has(block.id) }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1">
              <h4 class="font-medium text-sm truncate">{{ block.name }}</h4>
            </div>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" @click.stop="insertBlock(block.content)">
                <Plus class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" @click.stop="removeBlock(block.id)">
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div v-if="expandedBlocks.has(block.id)" 
            class="mt-2 space-y-2"
            @mouseenter="showPreview(block.id, block.content)"
            @mouseleave="previewContent[block.id] = ''"
          >
            <div class="flex flex-wrap gap-1">
              <span v-for="tag in block.tags" :key="tag" 
                class="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {{ tag }}
              </span>
            </div>
            <div v-if="previewContent[block.id]" 
              class="text-xs text-muted-foreground border-t pt-2">
              {{ previewContent[block.id] }}
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredBlocks.length === 0" class="text-center py-8">
          <Star class="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <h4 class="font-medium mb-2">No Blocks Found</h4>
          <p class="text-sm text-muted-foreground">
            {{ searchQuery || selectedTags.length > 0 
              ? 'Try adjusting your search or filters' 
              : 'Add blocks to your favorites for quick access' }}
          </p>
        </div>
      </div>
    </ScrollArea>

    <!-- Keyboard Shortcut Info -->
    <KeyboardShortcut 
      ctrl
      shift
      alt
      keyName="V" 
      action="toggle favorites"
    />
  </BaseSidebar>
</template>

<style scoped>
.block-item {
  @apply cursor-pointer;
}

.block-item:hover {
  @apply shadow-sm;
}

.block-item.expanded {
  @apply bg-muted/30;
}

/* Transition for expansion */
.block-item > div:last-child {
  @apply transition-all duration-200;
}
</style>







