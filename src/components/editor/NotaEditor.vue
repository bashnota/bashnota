<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { PageLink } from './extensions/PageLinkExtension'
import { useNotaStore } from '@/stores/nota'
import EditorToolbar from './EditorToolbar.vue'
import SlashCommands from './extensions/Commands'
import suggestion from './extensions/suggestion'
import { ref, watch, computed } from 'vue'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TableOfContents from './TableOfContents.vue'
import { ExecutableCodeBlockExtension } from './extensions/ExecutableCodeBlockExtension'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListIcon } from 'lucide-vue-next'
import { TableExtension } from './extensions/TableExtension'
import { MathExtension } from './extensions/MathExtension'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import { MarkdownPasteExtension } from './extensions/MarkdownPasteExtension'
import { MarkdownExtension } from './extensions/MarkdownExtension'

const props = defineProps<{
  notaId: string
}>()

const emit = defineEmits<{
  saving: [boolean]
}>()

const notaStore = useNotaStore()
const router = useRouter()
const isSidebarOpen = ref(true)

const content = computed(() => {
  const nota = notaStore.getCurrentNota(props.notaId)
  return nota?.content || ''
})

const editor = useEditor({
  content: content.value,
  extensions: [
    StarterKit.configure({
      codeBlock: false,
    }),
    ExecutableCodeBlockExtension.configure({
      HTMLAttributes: {
        class: 'code-block',
      },
      languageClassPrefix: 'language-',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'nota-link',
      },
    }),
    PageLink,
    Table.configure({
      allowTableNodeSelection: true,
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Image,
    Placeholder.configure({
      placeholder: 'Type "/" for commands ...',
    }),
    SlashCommands.configure({
      suggestion,
    }),
    TableExtension.configure({
      HTMLAttributes: {
        class: 'data-table',
      },
    }),
    MathExtension,
    GlobalDragHandle,
    MarkdownPasteExtension,
    MarkdownExtension,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
    },
  },
  onCreate({ editor }) {
    editor.view.dom.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      // Find the closest link element (either the target or its parent)
      const linkElement = target.tagName === 'A' ? target : target.closest('a')
      if (linkElement) {
        event.preventDefault()
        const href = linkElement.getAttribute('href')
        if (href?.startsWith('/page/')) {
          router.push(href)
        }
      }
    })
    isLoading.value = false
  },
  onUpdate: ({ editor }) => {
    emit('saving', true) // Emit instead of setting local ref
    notaStore
      .saveNota({
        id: props.notaId,
        content: editor.getHTML(),
        updatedAt: new Date(),
      })
      .finally(() => {
        emit('saving', false) // Emit instead of setting local ref
      })
  },
})

// Watch for ID changes to update editor content
watch(
  [() => props.notaId],
  ([newNotaId]) => {
    if (editor.value) {
      if (newNotaId) {
        const nota = notaStore.getCurrentNota(newNotaId)
        editor.value.commands.setContent(nota?.content || '')
      }
    }
  },
  { immediate: true },
)

const isLoading = ref(true)

const wordCount = computed(() => {
  if (!editor.value) return 0
  const text = editor.value.getText()
  return text.split(/\s+/).filter((word) => word.length > 0).length
})
</script>

<template>
  <div class="flex">
    <!-- Sidebar -->
    <div
      class="transition-all duration-300 ease-in-out relative"
      :class="{
        'w-72': isSidebarOpen,
        'w-0': !isSidebarOpen,
      }"
    >
      <div v-show="isSidebarOpen" class="fixed" :style="{ width: isSidebarOpen ? 'inherit' : '0' }">
        <ScrollArea class="h-[calc(100vh-2rem)] px-6 py-4">
          <TableOfContents :editor="editor" />
        </ScrollArea>
      </div>
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0" :class="{ 'border-l': isSidebarOpen }">
      <!-- Editor Toolbar -->
      <div class="border-b backdrop-blur sticky top-0 z-10">
        <EditorToolbar v-if="editor" :editor="editor" class="px-4 py-2" />

        <!-- Editor Info Bar -->
        <div
          class="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t"
        >
          <Button
            variant="ghost"
            size="sm"
            class="flex items-center gap-2"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <ListIcon class="h-4 w-4" />
            <span class="text-xs">Contents</span>
          </Button>
          <span>{{ wordCount }} words</span>
        </div>
      </div>

      <!-- Editor Content -->
      <div class="flex-1 relative">
        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm"
        >
          <LoadingSpinner class="w-8 h-8" />
        </div>

        <!-- Editor Content Area -->
        <div class="h-full overflow-auto px-4 md:px-8 lg:px-12">
          <editor-content :editor="editor" class="max-w-4xl mx-auto py-8" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ProseMirror {
  @apply outline-none min-h-[calc(100vh-10rem)];
}

/* Editor Typography */
.ProseMirror h1 {
  @apply text-4xl font-bold tracking-tight mt-6 mb-2;
}

.ProseMirror h2 {
  @apply text-2xl font-semibold tracking-tight mt-4 mb-2;
}

.ProseMirror h3 {
  @apply text-xl font-semibold tracking-tight mt-2 mb-2;
}

.ProseMirror p {
  @apply leading-7;
}

/* Lists */
.ProseMirror ul {
  @apply my-4 ml-6 list-disc;
}

.ProseMirror ol {
  @apply my-4 ml-6 list-decimal;
}

/* Nested Lists */
.ProseMirror li > ul,
.ProseMirror li > ol {
  @apply my-2 ml-6;
}

/* Blockquotes */
.ProseMirror blockquote {
  @apply mt-4 border-l-2 border-foreground/20 pl-6 italic;
}

/* Code Blocks */
.ProseMirror pre {
  @apply my-4 p-4 bg-muted rounded-lg overflow-x-auto font-mono text-sm;
}

.ProseMirror code {
  @apply relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm;
}

.ProseMirror pre code {
  @apply bg-transparent p-0;
}

/* Empty State */
.ProseMirror p.is-empty::before {
  @apply text-muted-foreground float-left pointer-events-none h-0;
  content: attr(data-placeholder);
}

/* Links */
.ProseMirror a {
  @apply text-primary underline-offset-4 hover:underline;
}

/* Tables */
.ProseMirror table {
  @apply w-full border-collapse my-6;
}

.ProseMirror td,
.ProseMirror th {
  @apply border border-border p-2 align-top;
}

.ProseMirror th {
  @apply bg-muted font-semibold text-left;
}

/* Horizontal Rule */
.ProseMirror hr {
  @apply my-8 border-foreground/20;
}

/* Selection */
.ProseMirror ::selection {
  @apply bg-primary/20;
}

/* Focus Styles */
.ProseMirror:focus {
  @apply outline-none;
}

/* Lists with Checkboxes */
.ProseMirror ul[data-type='taskList'] {
  @apply list-none p-0;
}

.ProseMirror ul[data-type='taskList'] li {
  @apply flex items-start gap-2;
}

.ProseMirror ul[data-type='taskList'] li > label {
  @apply mt-1;
}

.ProseMirror ul[data-type='taskList'] li > div {
  @apply flex-1;
}

/* Link Styles */
.nota-link {
  @apply text-primary no-underline cursor-pointer hover:underline;
}

/* Slash Commands Menu */
.slash-commands-menu {
  @apply bg-background rounded-lg shadow-lg overflow-hidden;
}

.slash-commands-item {
  @apply p-2 flex items-center gap-2 cursor-pointer hover:bg-muted;
}

.slash-commands-item .icon {
  @apply w-6 h-6 flex items-center justify-center bg-muted rounded;
}

/* Drag Handle Styles */
.drag-handle {
  position: fixed;
  opacity: 1;
  transition: opacity ease-in 0.2s;
  border-radius: 0.25rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' style='fill: rgba(0, 0, 0, 0.5)'%3E%3Cpath d='M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z'%3E%3C/path%3E%3C/svg%3E");
  background-size: calc(0.5em + 0.375rem) calc(0.5em + 0.375rem);
  background-repeat: no-repeat;
  background-position: center;
  width: 1.2rem;
  height: 1.5rem;
  z-index: 50;
  cursor: grab;
}

.drag-handle:hover {
  /* background-color: rgb(241 245 249); */
  @apply dark:bg-gray-800 bg-gray-100;
  transition: background-color 0.2s;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle.hide {
  opacity: 0;
  pointer-events: none;
}

.dark .drag-handle {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' style='fill: rgba(255, 255, 255, 0.5)'%3E%3Cpath d='M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z'%3E%3C/path%3E%3C/svg%3E");
}

/* Markdown Styles */
.markdown-bold {
  font-weight: bold;
}

.markdown-italic {
  font-style: italic;
}

.markdown-code {
  background-color: rgba(97, 97, 97, 0.1);
  border-radius: 0.25em;
  padding: 0.2em 0.4em;
  font-family: monospace;
}

/* KaTeX Styles */
.katex-inline {
  display: inline-block;
  padding: 0 0.2em;
  cursor: pointer;
}

.katex-display {
  display: block;
  text-align: center;
  margin: 1em 0;
  width: 100%;
  cursor: pointer;
}

.katex-source {
  background-color: rgba(97, 97, 97, 0.1);
  border-radius: 0.25em;
  padding: 0.2em 0.4em;
}

/* Make sure KaTeX is properly sized */
.katex {
  font-size: 1.1em;
  text-rendering: auto;
}

.katex-display .katex {
  font-size: 1.21em;
}
</style>
