<script setup lang="ts">
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import CodeBlock from '@tiptap/extension-code-block'
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
import { formatDistanceToNow } from 'date-fns'
import TableOfContents from './TableOfContents.vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  notaId?: string
}>()

const notaStore = useNotaStore()
const router = useRouter()
const showBubbleMenu = ref(false)
const isSidebarOpen = ref(true)

const content = computed(() => {
  const nota = notaStore.getCurrentNota(props.notaId)
  return nota?.content || ''
})

const lastUpdated = computed(() => {
  const nota = notaStore.getCurrentNota(props.notaId)
  return nota?.updatedAt
})

const formatDate = (date: Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

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
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'nota-link'
      }
    }),
    PageLink,
    CodeBlock.configure({
      HTMLAttributes: {
        class: 'code-block',
      },
      languageClassPrefix: 'language-',
      lowlight,
    }),
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
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
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
    isSaving.value = true
    notaStore.saveNota({
      id: props.notaId,
      content: editor.getHTML(),
      updatedAt: new Date()
    }).finally(() => {
      isSaving.value = false
      showSavedIndicator()
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
  { immediate: true }
)

const isLoading = ref(true)
const isSaving = ref(false)
const showSaved = ref(false)

const showSavedIndicator = () => {
  showSaved.value = true
  setTimeout(() => {
    showSaved.value = false
  }, 2000)
}

const wordCount = computed(() => {
  if (!editor.value) return 0
  const text = editor.value.getText()
  return text.split(/\s+/).filter(word => word.length > 0).length
})
</script>

<template>
  <div class="editor-container">
    <div 
      class="editor-sidebar" 
      :class="{ 'closed': !isSidebarOpen }"
    >
      <TableOfContents :editor="editor" />
    </div>
    <button 
      class="sidebar-toggle"
      @click="isSidebarOpen = !isSidebarOpen"
      :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
    >
      <ChevronLeftIcon v-if="isSidebarOpen" class="icon" />
      <ChevronRightIcon v-else class="icon" />
    </button>
    <div class="editor-main">
      <EditorToolbar v-if="editor" :editor="editor" />
      <div class="editor-info">
        <span class="last-updated" v-if="lastUpdated">
          Last updated {{ formatDate(lastUpdated) }}
        </span>
        <span class="word-count">
          {{ wordCount }} words
        </span>
      </div>
      <div v-if="isLoading" class="editor-loading">
        <LoadingSpinner />
      </div>
      <div class="save-status">
        <span v-if="isSaving">Saving...</span>
        <span v-else-if="showSaved" class="saved">Saved</span>
      </div>
      <editor-content :editor="editor" />
      
      <bubble-menu
        v-if="editor"
        :editor="editor"
        :should-show="shouldShow"
        class="bubble-menu"
      >
        <button @click="editor.chain().focus().toggleBold().run()">
          Bold
        </button>
        <button @click="editor.chain().focus().toggleItalic().run()">
          Italic
        </button>
        <button @click="editor.chain().focus().toggleCode().run()">
          Code
        </button>
        <button @click="editor.chain().focus().toggleLink().run()">
          Link
        </button>
      </bubble-menu>
    </div>
  </div>
</template>

<style>
.editor-container {
  flex: 1;
  display: flex;
  gap: 2rem;
  overflow-y: auto;
  position: relative;
}

.editor-sidebar {
  width: 250px;
  padding: 2rem 0 2rem 2rem;
  flex-shrink: 0;
  transition: all 0.3s ease;
  transform: translateX(0);
}

.editor-sidebar.closed {
  width: 0;
  padding: 0;
  transform: translateX(-100%);
}

.sidebar-toggle {
  position: absolute;
  left: 250px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-sidebar.closed + .sidebar-toggle {
  left: 0;
}

.sidebar-toggle:hover {
  background: var(--color-background-mute);
}

.sidebar-toggle .icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-light);
}

.editor-main {
  flex: 1;
  padding: 2rem 2rem 2rem 0;
  min-width: 0;
  transition: padding-left 0.3s ease;
}

.editor-sidebar.closed + .sidebar-toggle + .editor-main {
  padding-left: 2rem;
}

.code-block {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  margin: 1rem 0;
}

/* Add styles for tables */
.ProseMirror table {
  border-collapse: collapse;
  margin: 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.ProseMirror td,
.ProseMirror th {
  border: 2px solid #ced4da;
  box-sizing: border-box;
  min-width: 1em;
  padding: 3px 5px;
  position: relative;
  vertical-align: top;
}

.ProseMirror th {
  background-color: #f8f9fa;
  font-weight: bold;
  text-align: left;
}

.bubble-menu {
  display: flex;
  gap: 0.5rem;
  background-color: #ffffff;
  padding: 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bubble-menu button {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.bubble-menu button:hover {
  background: var(--color-background-soft);
}

.ProseMirror {
  padding: 1rem;
  min-height: calc(100vh - 10rem);
  outline: none;
}

.ProseMirror p.is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.slash-commands-menu {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.slash-commands-item {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.slash-commands-item:hover {
  background: var(--color-background-soft);
}

.slash-commands-item .icon {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background-mute);
  border-radius: 4px;
}

.nota-link {
  color: var(--color-primary);
  text-decoration: none;
  cursor: pointer;
}

.nota-link:hover {
  text-decoration: underline;
}

.editor-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.save-status {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background: var(--color-background-soft);
  font-size: 0.875rem;
  color: var(--color-text-light);
  transition: opacity 0.2s;
}

.saved {
  color: var(--color-success);
}

.editor-info {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-light);
  display: flex;
  justify-content: space-between;
}
</style>
