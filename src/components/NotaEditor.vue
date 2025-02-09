<script setup lang="ts">
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { PageLink } from './editor/PageLinkExtension'
import { useNotaStore } from '@/stores/nota'
import EditorToolbar from './EditorToolbar.vue'
import SlashCommands from './editor/Commands'
import suggestion from './editor/suggestion'
import { ref, watch, computed } from 'vue'
import { common, createLowlight } from 'lowlight'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TableOfContents from './TableOfContents.vue'
import { ExecutableCodeBlockExtension } from './editor/ExecutableCodeBlockExtension'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListIcon } from 'lucide-vue-next'

const props = defineProps<{
  notaId?: string
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

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

// Register languages directly
Promise.all([
  import('highlight.js/lib/languages/python'),
  import('highlight.js/lib/languages/javascript'),
  import('highlight.js/lib/languages/typescript'),
  import('highlight.js/lib/languages/r'),
  import('highlight.js/lib/languages/sql'),
  import('highlight.js/lib/languages/bash'),
]).then(([python, javascript, typescript, r, sql, bash]) => {
  lowlight.register('python', python.default)
  lowlight.register('javascript', javascript.default)
  lowlight.register('typescript', typescript.default)
  lowlight.register('r', r.default)
  lowlight.register('sql', sql.default)
  lowlight.register('bash', bash.default)
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
      lowlight,
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
      placeholder: 'Press "/" for commands...',
    }),
    SlashCommands.configure({
      suggestion,
    }),
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

const shouldShow = ({ editor, view, state, oldState, from, to }) => {
  return editor.isActive('text') && view.state.selection.content().size > 0
}

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

        <!-- Bubble Menu -->
        <bubble-menu
          v-if="editor"
          :editor="editor"
          :should-show="shouldShow"
          class="flex gap-1 p-1 rounded-lg border shadow-lg bg-background backdrop-blur-lg"
        >
          <Button
            v-for="(action, index) in ['Bold', 'Italic', 'Code', 'Link']"
            :key="index"
            variant="ghost"
            size="sm"
            @click="editor.chain().focus()[`toggle${action}`]().run()"
          >
            {{ action }}
          </Button>
        </bubble-menu>
      </div>
    </div>
  </div>
</template>

<style>
/* TipTap Specific Styles */
.ProseMirror {
  @apply outline-none min-h-[calc(100vh-10rem)];
}

.ProseMirror p.is-empty::before {
  @apply text-muted-foreground float-left pointer-events-none h-0;
  content: attr(data-placeholder);
}

.code-block {
  @apply bg-muted p-3 rounded-md font-mono my-4;
}

/* Table Styles */
.ProseMirror table {
  @apply w-full border-collapse table-fixed;
}

.ProseMirror td,
.ProseMirror th {
  @apply border-2 border-border p-2 align-top relative min-w-[1em];
}

.ProseMirror th {
  @apply bg-muted font-bold text-left;
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
