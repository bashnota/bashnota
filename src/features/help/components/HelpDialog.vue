<template>
  <Dialog v-model:open="isOpen">
    <DialogContent
      data-testid="help-dialog"
      class="h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100vw-1rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:h-[min(90dvh,52rem)] sm:w-[calc(100vw-2rem)]"
      close-class="right-1 top-1 flex h-12 w-12 items-center justify-center sm:right-2 sm:top-2"
    >
      <DialogHeader class="shrink-0 border-b px-4 py-3 pr-12 text-left sm:px-6 sm:py-4 sm:pr-14">
        <DialogTitle class="flex items-start gap-2 text-lg leading-6 sm:items-center sm:text-xl">
          <BookOpen class="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
          BashNota help
        </DialogTitle>
        <DialogDescription class="text-sm leading-5">
          Find a topic, then follow the guide at your own pace.
        </DialogDescription>
      </DialogHeader>

      <div
        class="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
      >
        <Collapsible v-model:open="mobileTopicsOpen" class="shrink-0 md:contents">
          <div class="border-b bg-muted/30 p-3 md:hidden">
            <CollapsibleTrigger as-child>
              <Button
                class="min-h-12 w-full justify-between gap-3 whitespace-normal px-3 text-left"
                data-testid="help-mobile-topic-trigger"
                variant="outline"
              >
                <span class="min-w-0">
                  <span class="block text-xs font-medium text-muted-foreground">Help topics</span>
                  <span class="block truncate">{{ selectedTopic?.title ?? 'Choose a topic' }}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  class="h-4 w-4 shrink-0 transition-transform"
                  :class="{ 'rotate-180': mobileTopicsOpen }"
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <!-- The compact mobile index collapses after selection; the desktop rail remains persistent. -->
          <CollapsibleContent as-child force-mount>
            <nav
              aria-label="Help topics"
              class="max-h-[min(42dvh,20rem)] min-w-0 shrink-0 overflow-y-auto overflow-x-hidden border-b bg-muted/30 p-3 data-[state=closed]:hidden md:!block md:max-h-none md:border-b-0 md:border-r md:p-4"
              data-testid="help-topic-navigation"
            >
              <!-- Search -->
              <div class="mb-3 md:mb-4">
                <label for="help-search" class="sr-only">Search help topics</label>
                <div class="relative">
                  <Search
                    aria-hidden="true"
                    class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="help-search"
                    v-model="searchQuery"
                    placeholder="Search help"
                    class="h-11 pl-9 md:h-9"
                    @input="debouncedSearch"
                  />
                </div>
              </div>

              <!-- Search results -->
              <div v-if="searchQuery && searchResults.length > 0" class="space-y-1">
                <div class="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  Search results
                </div>
                <button
                  v-for="topic in searchResults"
                  :key="topic.id"
                  @click="selectTopic(topic.id)"
                  class="min-h-11 w-full rounded px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-9 md:py-1.5"
                  :class="{ 'bg-accent': selectedTopicId === topic.id }"
                  :aria-current="selectedTopicId === topic.id ? 'page' : undefined"
                >
                  {{ topic.title }}
                </button>
              </div>

              <!-- Categories -->
              <div v-else class="space-y-4">
                <div v-for="section in helpSections" :key="section.category" class="space-y-1">
                  <div class="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {{ section.title }}
                  </div>
                  <button
                    v-for="topic in section.topics"
                    :key="topic.id"
                    @click="selectTopic(topic.id)"
                    class="min-h-11 w-full rounded px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-9 md:py-1.5"
                    :class="{ 'bg-accent': selectedTopicId === topic.id }"
                    :aria-current="selectedTopicId === topic.id ? 'page' : undefined"
                  >
                    {{ topic.title }}
                  </button>
                </div>
              </div>
            </nav>
          </CollapsibleContent>
        </Collapsible>

        <!-- Article scrolls independently so navigation and footer remain usable at large text sizes. -->
        <article
          class="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6"
          data-testid="help-article"
        >
          <div v-if="selectedTopic" class="prose prose-sm max-w-none dark:prose-invert">
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
        </article>
      </div>

      <footer
        class="flex shrink-0 flex-col items-stretch gap-2 border-t bg-muted/30 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3"
        data-testid="help-footer"
      >
        <div class="text-xs leading-5 text-muted-foreground">
          Press
          <kbd class="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">F1</kbd>
          anytime to open help
        </div>
        <Button
          class="min-h-11 w-full sm:w-auto"
          variant="outline"
          size="sm"
          @click="isOpen = false"
        >
          Close
        </Button>
      </footer>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { marked } from 'marked'
import { sanitizeMarkdownHtml } from '@/ui/markdown-renderer/sanitizeMarkdownHtml'
import { BookOpen, ChevronDown, Search } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
const mobileTopicsOpen = ref(false)

// Configure marked once
marked.setOptions({
  breaks: true,
  gfm: true,
})

watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue ?? false
  },
)

watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})

watch(
  () => props.defaultTopicId,
  (newValue) => {
    if (newValue) {
      selectedTopicId.value = newValue
    }
  },
)

const selectedTopic = computed(() => {
  return getTopicById(selectedTopicId.value)
})

const renderedContent = computed(() => {
  if (!selectedTopic.value) return ''
  return sanitizeMarkdownHtml(String(marked(selectedTopic.value.content)))
})

// Debounce search function
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const SEARCH_DEBOUNCE_DELAY = 300 // milliseconds

function debouncedSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    handleSearch()
  }, SEARCH_DEBOUNCE_DELAY)
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
  mobileTopicsOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
}

onBeforeUnmount(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})
</script>

<style scoped>
/* Ensure proper spacing and styling for help content */
:deep(.help-content) {
  line-height: 1.6;
  min-width: 0;
  overflow-wrap: anywhere;
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
  @apply max-w-full break-words rounded bg-muted px-1.5 py-0.5 font-mono text-sm;
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
  @apply mb-4 block max-w-full overflow-x-auto border-collapse;
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
