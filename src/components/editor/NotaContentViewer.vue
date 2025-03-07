<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { ScrollArea } from '@/components/ui/scroll-area'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getViewerExtensions } from './extensions'

// Import shared CSS
import '@/assets/editor-styles.css'

// Define props
const props = defineProps<{
  content: string | null
  readonly?: boolean
}>()

// Create a read-only editor instance with our shared extensions
const editor = useEditor({
  content: props.content ? JSON.parse(props.content) : null,
  extensions: getViewerExtensions(),
  editable: false, // Read-only mode
})

// Update content when props change
watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent) {
      try {
        editor.value.commands.setContent(JSON.parse(newContent))
      } catch (err) {
        console.error('Error parsing content:', err)
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
  <div class="relative min-h-[300px]">
    <!-- Loading state -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
      <LoadingSpinner class="w-8 h-8" />
    </div>

    <!-- Editor content (read-only) -->
    <ScrollArea class="h-full" v-if="editor">
      <div class="px-4 py-6 mx-auto max-w-4xl">
        <EditorContent :editor="editor" class="prose prose-sm sm:prose lg:prose-lg max-w-none" />
      </div>
    </ScrollArea>
  </div>
</template>
