<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useEditor, EditorContent } from '@/features/editor/pm'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ListIcon } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import { getViewerExtensions } from '@/features/editor/components/extensions'
import TableOfContents from '@/features/editor/components/ui/TableOfContents.vue'
import { logger } from '@/services/logger'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import type { Editor } from '@/features/editor/pm'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { normalizeCloudPublishedContent, type CloudPublishedContent } from '@/services/cloud/types'

// Import shared CSS
import '@/assets/editor-styles.css'

// Define props
const props = defineProps<{
  content: CloudPublishedContent | string | null
  readonly?: boolean
  citations?: any[] // Add citations prop
  isPublished?: boolean // Add isPublished prop
}>()

// Define emits
const emit = defineEmits(['content-rendered'])

const codeExecutionStore = useCodeExecutionStore()
const citationStore = useCitationStore()
const isSidebarOpen = ref(false)

// Initialize citations if provided
const initializeCitations = () => {
  if (props.citations) {
    // Set public citations
    citationStore.setPublicCitations(props.citations || [])
  }
}

// Initialize citations before creating the editor
initializeCitations()

const registerCodeCells = (content: any) => {
  // Find all executable code blocks in the content
  const findCodeBlocks = (node: any): any[] => {
    const blocks: any[] = []
    if (node.type === 'executableCodeBlock') {
      blocks.push(node)
    }
    if (node.content) {
      node.content.forEach((child: any) => {
        blocks.push(...findCodeBlocks(child))
      })
    }
    return blocks
  }

  const codeBlocks = findCodeBlocks(content)

  // Register each code block with the store
  codeBlocks.forEach((block) => {
    const { attrs, content } = block
    const code = content ? content.map((c: any) => c.text).join('\n') : ''

    // Add isPublished flag to cell data when registering
    codeExecutionStore.addCell({
      id: attrs.id,
      code,
      kernelName: attrs.kernelName,
      output: attrs.output,
      sessionId: attrs.sessionId,
      isPublished: props.isPublished || false
    })
  })
}

// Create a read-only editor instance with our shared extensions
const editor = useEditor({
  content: normalizeCloudPublishedContent(props.content),
  extensions: getViewerExtensions(),
  editable: false, // Read-only mode
  onCreate({ editor }: { editor: Editor }) {
    registerCodeCells(editor.getJSON())
    isLoading.value = false
    // Emit an event when the editor is created and content is loaded
    emit('content-rendered')
  }
})

// Check if there are any headings in the document
const hasHeadings = computed(() => {
  if (!editor.value) return false

  // Get the document and check for headings
  const json = editor.value.getJSON()

  // Function to search for heading nodes
  const findHeadings = (node: any): boolean => {
    if (node.type === 'heading') return true

    if (node.content) {
      for (const child of node.content) {
        if (findHeadings(child)) return true
      }
    }

    return false
  }

  return findHeadings(json)
})

// Watch for citations changes
watch(
  () => props.citations,
  () => {
    initializeCitations()
  },
  { deep: true }
)

// Update content when props change
watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent) {
      try {
        const normalized = normalizeCloudPublishedContent(newContent)
        if (normalized) editor.value.commands.setContent(normalized)
      } catch (err) {
        logger.error('Error parsing content:', err)
      }
    }
  },
)

// Initial loading state
const isLoading = ref(true)

// Hold the editor-ready polling interval so it can be cleared on unmount
let readyInterval: ReturnType<typeof setInterval> | null = null

// Set loading to false when editor is ready
onMounted(() => {
  if (editor.value) {
    isLoading.value = false
  } else {
    // If editor isn't ready yet, wait for it
    readyInterval = setInterval(() => {
      if (editor.value) {
        isLoading.value = false
        if (readyInterval) {
          clearInterval(readyInterval)
          readyInterval = null
        }
      }
    }, 100)
  }
})

// Ensure the polling interval never outlives the component
onUnmounted(() => {
  if (readyInterval) {
    clearInterval(readyInterval)
    readyInterval = null
  }
})
</script>

<template>
  <div class="flex">
    <!-- Sidebar - only show if there are headings -->
    <div
      v-if="hasHeadings"
      class="transition-all duration-300 ease-in-out sticky top-0 h-[calc(100vh-80px)]"
      :class="{
        'w-64': isSidebarOpen,
        'w-0': !isSidebarOpen,
      }"
    >
      <div
        v-show="isSidebarOpen"
        :style="{ width: isSidebarOpen ? '100%' : '0' }"
        class="border-r h-full"
      >
        <ScrollArea class="h-full px-4 py-4">
          <TableOfContents :editor="editor ?? undefined" />
        </ScrollArea>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Only show TOC toggle if there are headings -->
      <div v-if="hasHeadings" class="border-b bg-background sticky top-0 z-10">
        <div class="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            class="flex items-center gap-2"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <ListIcon class="h-4 w-4" />
            <span class="text-xs">{{ isSidebarOpen ? 'Hide' : 'Show' }} Contents</span>
          </Button>
        </div>
      </div>

      <!-- Editor content area -->
      <div class="relative min-h-[300px] flex-1">
        <!-- Loading state -->
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
          <Skeleton class="w-8 h-8 rounded-full" />
        </div>

        <!-- Editor content (read-only) -->
        <ScrollArea class="h-full" v-if="editor">
          <div class="px-6 md:px-8 lg:px-12 py-6 mx-auto max-w-none">
            <div class="max-w-3xl mx-auto">
              <EditorContent :editor="editor" class="prose prose-sm sm:prose lg:prose-lg" />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>
</template>

<style>
/* Simple styles for page links */
a[data-type='page-link'] {
  display: inline-flex;
  align-items: center;
  padding: 0.1em 0.3em;
  border-radius: 0.25em;
  background-color: rgba(0, 0, 0, 0.03);
  text-decoration: none;
  color: inherit;
  transition: background-color 0.2s;
}

a[data-type='page-link']:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>



