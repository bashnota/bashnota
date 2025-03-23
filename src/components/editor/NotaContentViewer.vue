<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ListIcon } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getViewerExtensions } from './extensions'
import TableOfContents from './TableOfContents.vue'
import { logger } from '@/services/logger'

// Import shared CSS
import '@/assets/editor-styles.css'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'

// Define props
const props = defineProps<{
  content: string | null
  readonly?: boolean
}>()

const codeExecutionStore = useCodeExecutionStore()
const isSidebarOpen = ref(false)

const registerCodeCells = (content: any) => {
  // Find all executable code blocks in the content
  const findCodeBlocks = (node: any): any[] => {
    const blocks = []
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

    codeExecutionStore.addCell({
      id: attrs.id,
      code,
      kernelName: attrs.kernelName,
      output: attrs.output,
      sessionId: attrs.sessionId,
    })
  })
}

// Create a read-only editor instance with our shared extensions
const editor = useEditor({
  content: props.content ? JSON.parse(props.content) : null,
  extensions: getViewerExtensions(),
  editable: false, // Read-only mode
  onCreate({ editor }) {
    registerCodeCells(editor.getJSON())
    isLoading.value = false
  },
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

// Update content when props change
watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent) {
      try {
        editor.value.commands.setContent(JSON.parse(newContent))
      } catch (err) {
        logger.error('Error parsing content:', err)
      }
    }
  },
)

// Initial loading state
const isLoading = ref(true)

// Set loading to false when editor is ready
onMounted(() => {
  if (editor.value) {
    isLoading.value = false
  } else {
    // If editor isn't ready yet, wait for it
    const interval = setInterval(() => {
      if (editor.value) {
        isLoading.value = false
        clearInterval(interval)
      }
    }, 100)
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
          <TableOfContents :editor="editor" />
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
          <LoadingSpinner class="w-8 h-8" />
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
