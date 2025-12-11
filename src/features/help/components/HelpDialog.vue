<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-5xl h-[85vh] p-0 flex flex-col">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="flex items-center gap-2">
          <BookOpen class="w-5 h-5" />
          BashNota Help & Documentation
        </DialogTitle>
        <DialogDescription>
          Learn how to use BashNota's features
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 flex overflow-hidden">
        <!-- Left sidebar - Topics navigation -->
        <div class="w-64 border-r overflow-y-auto p-4 bg-muted/30">
          <!-- Search -->
          <div class="mb-4">
            <div class="relative">
              <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Search help..."
                class="pl-8 h-9"
                @input="debouncedSearch"
              />
            </div>
          </div>

          <!-- Search results -->
          <div v-if="searchQuery && searchResults.length > 0" class="space-y-1">
            <div class="text-xs font-semibold text-muted-foreground px-2 py-1">
              Search Results
            </div>
            <button
              v-for="topic in searchResults"
              :key="topic.id"
              @click="selectTopic(topic.id)"
              class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors"
              :class="{ 'bg-accent': selectedTopicId === topic.id }"
            >
              {{ topic.title }}
            </button>
          </div>

          <!-- Categories -->
          <div v-else class="space-y-4">
            <div
              v-for="section in helpSections"
              :key="section.category"
              class="space-y-1"
            >
              <div class="text-xs font-semibold text-muted-foreground px-2 py-1">
                {{ section.title }}
              </div>
              <button
                v-for="topic in section.topics"
                :key="topic.id"
                @click="selectTopic(topic.id)"
                class="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                :class="{ 'bg-accent': selectedTopicId === topic.id }"
              >
                {{ topic.title }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right content area -->
        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="selectedTopic" class="prose prose-sm dark:prose-invert max-w-none">
            <!-- Render markdown content -->
            <div v-html="renderedContent" class="help-content"></div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-muted-foreground">
            <div class="text-center">
              <BookOpen class="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p class="text-lg font-medium">Select a topic to get started</p>
              <p class="text-sm">Or use the search bar to find what you need</p>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-3 border-t flex items-center justify-between bg-muted/30">
        <div class="text-xs text-muted-foreground">
          Press <kbd class="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">F1</kbd> anytime to open help
        </div>
        <Button variant="outline" size="sm" @click="isOpen = false">
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'
import { BookOpen, Search } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { helpSections, searchHelpTopics, getTopicById } from '../data/helpContent'
import type { HelpTopic } from '../types'

const props = defineProps<{
  open?: boolean
  defaultTopicId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = ref(props.open ?? false)
const searchQuery = ref('')
const searchResults = ref<HelpTopic[]>([])
const selectedTopicId = ref(props.defaultTopicId ?? 'welcome')

// Configure marked once
marked.setOptions({
  breaks: true,
  gfm: true,
})

watch(() => props.open, (newValue) => {
  isOpen.value = newValue ?? false
})

watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})

watch(() => props.defaultTopicId, (newValue) => {
  if (newValue) {
    selectedTopicId.value = newValue
  }
})

const selectedTopic = computed(() => {
  return getTopicById(selectedTopicId.value)
})

const renderedContent = computed(() => {
  if (!selectedTopic.value) return ''
  return marked(selectedTopic.value.content)
})

// Debounce search function
let searchTimeout: NodeJS.Timeout | null = null
function debouncedSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 300) // 300ms debounce delay
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    searchResults.value = searchHelpTopics(searchQuery.value)
  } else {
    searchResults.value = []
  }
}

function selectTopic(topicId: string) {
  selectedTopicId.value = topicId
  searchQuery.value = ''
  searchResults.value = []
}
</script>

<style scoped>
/* Ensure proper spacing and styling for help content */
:deep(.help-content) {
  line-height: 1.6;
}

:deep(.help-content h1) {
  @apply text-2xl font-bold mb-4 mt-6 first:mt-0;
}

:deep(.help-content h2) {
  @apply text-xl font-semibold mb-3 mt-5;
}

:deep(.help-content h3) {
  @apply text-lg font-semibold mb-2 mt-4;
}

:deep(.help-content p) {
  @apply mb-4;
}

:deep(.help-content ul),
:deep(.help-content ol) {
  @apply mb-4 ml-6;
}

:deep(.help-content li) {
  @apply mb-1;
}

:deep(.help-content code) {
  @apply px-1.5 py-0.5 rounded bg-muted text-sm font-mono;
}

:deep(.help-content pre) {
  @apply p-4 rounded-lg bg-muted overflow-x-auto mb-4;
}

:deep(.help-content pre code) {
  @apply p-0 bg-transparent;
}

:deep(.help-content kbd) {
  @apply px-2 py-1 text-xs font-semibold bg-background border rounded;
}

:deep(.help-content blockquote) {
  @apply border-l-4 border-muted-foreground/20 pl-4 italic my-4;
}

:deep(.help-content table) {
  @apply w-full border-collapse mb-4;
}

:deep(.help-content th),
:deep(.help-content td) {
  @apply border border-border px-4 py-2;
}

:deep(.help-content th) {
  @apply bg-muted font-semibold;
}

:deep(.help-content a) {
  @apply text-primary hover:underline;
}
</style>
