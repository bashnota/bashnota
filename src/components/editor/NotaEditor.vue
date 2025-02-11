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
  <div class="flex h-full">
    <!-- Sidebar -->
    <div
      class="transition-all duration-300 ease-in-out border-r relative"
      :class="{
        'w-72 px-6 py-4': isSidebarOpen,
        'w-0 p-0': !isSidebarOpen,
      }"
    >
      <ScrollArea class="h-full" v-show="isSidebarOpen">
        <TableOfContents :editor="editor" />
      </ScrollArea>
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0">
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
</style>
