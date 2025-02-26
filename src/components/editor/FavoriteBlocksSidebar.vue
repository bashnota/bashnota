<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFavoriteBlocksStore } from '@/stores/favoriteBlocksStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StarIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/vue/24/solid'
import { TagsInput, TagsInputInput, TagsInputItem } from '@/components/ui/tags-input'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor?: Editor | null
}>()

const store = useFavoriteBlocksStore()
const searchQuery = ref('')
const selectedTags = ref<string[]>([])

// Load blocks when component mounts
store.loadBlocks()

const filteredBlocks = computed(() => {
  return store.blocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesTags = selectedTags.value.length === 0 || 
      selectedTags.value.every(tag => block.tags.includes(tag))
    return matchesSearch && matchesTags
  })
})

const insertBlock = (content: string) => {
  if (props.editor) {
    try {
      const parsedContent = JSON.parse(content)
      // Reconstruct the full node structure
      props.editor.commands.insertContent({
        type: parsedContent.type,
        content: parsedContent.content,
        attrs: parsedContent.attrs
      })
    } catch (error) {
      console.error('Failed to insert block:', error)
    }
  }
}

const removeBlock = async (id: string) => {
  if (confirm('Are you sure you want to remove this block from favorites?')) {
    await store.removeBlock(id)
  }
}
</script>

<template>
  <div class="w-72 border-l h-full">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <StarIcon class="w-5 h-5 text-yellow-400" />
        Favorite Blocks
      </h3>
      
      <div class="space-y-4">
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search blocks..."
            class="pl-9"
          />
        </div>

        <TagsInput v-model="selectedTags" placeholder="Filter by tags...">
          <TagsInputItem v-for="tag in selectedTags" :key="tag" :value="tag">
            {{ tag }}
          </TagsInputItem>
          <TagsInputInput placeholder="Add tag..." />
        </TagsInput>
      </div>
    </div>

    <ScrollArea class="h-[calc(100vh-10rem)]">
      <div class="p-4 space-y-4">
        <div v-for="block in filteredBlocks" :key="block.id" 
          class="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
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
            </div>
          </div>
          
          <div class="flex flex-wrap gap-1">
            <span v-for="tag in block.tags" :key="tag" 
              class="text-xs bg-muted px-2 py-1 rounded-full">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>