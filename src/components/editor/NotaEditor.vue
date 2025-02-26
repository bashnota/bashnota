<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { PageLink } from './extensions/PageLinkExtension'
import { useNotaStore } from '@/stores/nota'
import EditorToolbar from './EditorToolbar.vue'
import SlashCommands from './extensions/Commands'
import suggestion from './extensions/suggestion'
import { ref, watch, computed, onUnmounted, onMounted, reactive } from 'vue'
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
import { MarkdownExtension } from './extensions/MarkdownExtension'
import { Mermaid } from './extensions/mermaid'
import { ScatterPlot } from './extensions/scatter-plot'
import { Youtube } from './extensions/youtube'
import { SubfigureExtension } from './extensions/SubfigureExtension'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { Markdown } from 'tiptap-markdown'
// @ts-ignore
import UniqueId from 'tiptap-unique-id'
import { ImageExtension } from './extensions/ImageExtension'
import GlobalDragHandle from './extensions/DragHandlePlugin'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import drawIoExtension from '@rcode-link/tiptap-drawio'
import { toast } from '@/lib/utils'
import VersionHistoryDialog from './VersionHistoryDialog.vue'
import FavoriteBlocksSidebar from './FavoriteBlocksSidebar.vue'

const props = defineProps<{
  notaId: string
  extensions?: any[]
}>()

const emit = defineEmits<{
  saving: [boolean]
}>()

const notaStore = useNotaStore()
const codeExecutionStore = useCodeExecutionStore()
const router = useRouter()
const isSidebarOpen = ref(true)
const autoSaveEnabled = ref(true)
const showVersionHistory = ref(false)

const currentNota = computed(() => {
  return notaStore.getCurrentNota(props.notaId)
})

const content = computed(() => {
  return currentNota.value?.content
})

// Create a base extensions array
const editorExtensions = [
  StarterKit.configure({
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  UniqueId.configure({
    attributeName: 'id',
    types: ['executableCodeBlock'],
    createId: () => crypto.randomUUID(),
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
  GlobalDragHandle.configure({
    dragHandleWidth: 24,
    shouldShow: () => true,
  }),
  MarkdownExtension,
  Markdown.configure({
    transformPastedText: true,
  }),
  Mermaid.configure({
    HTMLAttributes: {
      class: 'mermaid-block',
    },
  }),
  ScatterPlot,
  Youtube,
  SubfigureExtension,
  ImageExtension,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  drawIoExtension.configure({
    openDialog: 'dblclick',
  }),
  Blockquote,
  HorizontalRule,
]

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
  const servers = currentNota.value?.config?.jupyterServers || []

  // Register each code block with the store
  codeBlocks.forEach((block) => {
    const { attrs, content } = block
    const code = content ? content.map((c: any) => c.text).join('\n') : ''

    const serverID = attrs.serverID ? attrs.serverID.split(':') : null
    const server = serverID
      ? servers.find((s: any) => s.ip === serverID[0] && s.port === serverID[1])
      : undefined

    codeExecutionStore.addCell({
      id: attrs.id,
      code,
      serverConfig: server,
      kernelName: attrs.kernelName,
      output: attrs.output,
      sessionId: attrs.sessionId,
    })
  })
}

const editorSettings = reactive({
  fontSize: 16,
  lineHeight: 1.6,
  spellCheck: true,
  tabSize: 2,
  indentWithTabs: false,
  wordWrap: true,
  dragHandleWidth: 24,
  autoSave: true
})

const editor = useEditor({
  content: content.value ? JSON.parse(content.value) : null,
  extensions: editorExtensions,
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
    },
  },
  onCreate({ editor }) {
    // Load saved sessions first
    codeExecutionStore.loadSavedSessions(props.notaId)

    // Then register code cells which will associate them with sessions
    registerCodeCells(editor.getJSON())

    editor.view.dom.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      // Find the closest link element (either the target or its parent)
      const linkElement = target.tagName === 'A' ? target : target.closest('a')
      if (linkElement) {
        event.preventDefault()
        const href = linkElement.getAttribute('href')
        if (href?.startsWith('/nota/')) {
          router.push(href)
        }
      }
    })
    isLoading.value = false
  },
  onUpdate: () => saveEditorContent(),
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

// Function to apply settings to the editor
function applyEditorSettings(settings = editorSettings) {
  if (!editor.value) return
  
  // Apply settings to editor
  editor.value.setOptions({
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none editor-font-size-${settings.fontSize}`,
        spellcheck: settings.spellCheck.toString()
      }
    }
  })
  
  // Update CSS variables for the editor
  const editorElement = document.querySelector('.ProseMirror') as HTMLElement
  if (editorElement) {
    const cssVars = {
      '--editor-font-size': `${settings.fontSize}px`,
      '--editor-line-height': settings.lineHeight.toString(),
      '--editor-tab-size': settings.tabSize.toString(),
      '--drag-handle-width': `${settings.dragHandleWidth}px`,
      '--word-wrap': settings.wordWrap ? 'break-word' : 'normal'
    }
    
    Object.entries(cssVars).forEach(([key, value]) => {
      editorElement.style.setProperty(key, value)
    })
  }
  
  // Update auto-save behavior
  autoSaveEnabled.value = settings.autoSave
}

// Function to save editor content
const saveEditorContent = () => {
  if (!editor.value) return
  
  try {
    emit('saving', true)
    const content = editor.value.getJSON()

    // Register/update code cells on content change
    registerCodeCells(content)

    // Save sessions whenever content updates
    codeExecutionStore.saveSessions(props.notaId)

    return notaStore
      .saveNota({
        id: props.notaId,
        content: JSON.stringify(content),
        updatedAt: new Date(),
      })
      .finally(() => {
        emit('saving', false)
      })
  } catch (error) {
    console.error('Error saving content:', error)
    emit('saving', false)
    return Promise.reject(error)
  }
}

// Handle keyboard shortcuts for inserting blocks
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Check if editor is initialized
  if (!editor.value) return
  
  // Skip if target is a CodeMirror editor
  if (event.target instanceof HTMLElement) {
    const isCodeMirrorFocused = event.target.closest('.cm-editor') !== null
    if (isCodeMirrorFocused) return
  }
  
  // Only process Ctrl+Shift+Alt combinations
  if (!(event.ctrlKey && event.shiftKey && event.altKey)) return
  
  // Prevent default browser behavior
  event.preventDefault()
  
  // Map of key to insertion functions
  const insertionMap: Record<string, () => void> = {
    'c': () => editor.value!.chain().focus().insertContent({
      type: 'executableCodeBlock',
      attrs: { language: 'python' }
    }).run(),
    't': () => editor.value!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    'i': () => editor.value!.chain().focus().setImage().run(),
    'm': () => editor.value!.chain().focus().insertContent({
      type: 'mathBlock',
      attrs: { latex: '' }
    }).run(),
    'd': () => editor.value!.chain().focus().setMermaid('graph TD;\nA-->B;').run(),
    'y': () => editor.value!.chain().focus().setYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ').run(),
    's': () => editor.value!.chain().focus().setScatterPlot().run(),
    'f': () => editor.value!.chain().focus().setSubfigures().run(),
    'h': () => editor.value!.chain().focus().setHorizontalRule().run(),
    'q': () => editor.value!.chain().focus().toggleBlockquote().run(),
    'k': () => editor.value!.chain().focus().toggleTaskList().run(),
    'g': () => editor.value!.chain().focus().insertDrawIo().run(),
    'b': () => {
      if (currentNota.value?.id) {
        editor.value!.chain().focus().insertDataTable(currentNota.value.id).run()
      }
    }
  }
  
  const key = event.key.toLowerCase()
  if (insertionMap[key]) {
    insertionMap[key]()
  }
}

onMounted(() => {
  // Add keyboard shortcut event listener
  document.addEventListener('keydown', handleKeyboardShortcuts)
  
  // Load saved editor settings
  const savedEditorSettings = localStorage.getItem('editor-settings')
  if (savedEditorSettings) {
    try {
      const settings = JSON.parse(savedEditorSettings)
      const settingsMap = {
        'fontSize': (val: any) => val && val[0] ? val[0] : undefined,
        'lineHeight': (val: any) => val && val[0] ? val[0] : undefined,
        'spellCheck': (val: any) => val !== undefined ? val : undefined,
        'tabSize': (val: any) => val && val[0] ? val[0] : undefined,
        'indentWithTabs': (val: any) => val !== undefined ? val : undefined,
        'wordWrap': (val: any) => val !== undefined ? val : undefined,
        'dragHandleWidth': (val: any) => val && val[0] ? val[0] : undefined,
        'autoSave': (val: any) => val !== undefined ? val : undefined
      }
      
      Object.entries(settingsMap).forEach(([key, transform]) => {
        const value = transform(settings[key])
        if (value !== undefined) {
          (editorSettings as any)[key] = value
        }
      })
      
      applyEditorSettings()
    } catch (e) {
      console.error('Failed to parse saved editor settings', e)
    }
  }
  
  // Listen for settings changes with the same mapping logic
  window.addEventListener('editor-settings-changed', ((event: CustomEvent) => {
    if (event.detail) {
      const settingsMap = {
        'fontSize': (val: any) => val && val[0] ? val[0] : undefined,
        'lineHeight': (val: any) => val && val[0] ? val[0] : undefined,
        'spellCheck': (val: any) => val !== undefined ? val : undefined,
        'tabSize': (val: any) => val && val[0] ? val[0] : undefined,
        'indentWithTabs': (val: any) => val !== undefined ? val : undefined,
        'wordWrap': (val: any) => val !== undefined ? val : undefined,
        'dragHandleWidth': (val: any) => val && val[0] ? val[0] : undefined,
        'autoSave': (val: any) => val !== undefined ? val : undefined
      }
      
      let hasChanges = false
      Object.entries(settingsMap).forEach(([key, transform]) => {
        const value = transform(event.detail[key])
        if (value !== undefined) {
          (editorSettings as any)[key] = value
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        applyEditorSettings()
      }
    }
  }) as EventListener)
})

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  codeExecutionStore.cleanup()
})

const isSavingVersion = ref(false)

const saveVersion = async () => {
  if (!editor.value || !currentNota.value) return
  
  try {
    isSavingVersion.value = true
    const content = editor.value.getJSON()
    
    await notaStore.saveNotaVersion({
      id: props.notaId,
      content: JSON.stringify(content),
      versionName: `Version ${new Date().toLocaleString()}`,
      createdAt: new Date()
    })
    
    toast('Version saved successfully')
  } catch (error) {
    console.error('Error saving version:', error)
    toast('Failed to save version')
  } finally {
    isSavingVersion.value = false
  }
}

const refreshEditorContent = async () => {
  if (editor.value) {
    // Reload the nota content
    const nota = await notaStore.loadNota(props.notaId)
    if (nota?.content) {
      // Set the editor content from the restored version
      editor.value.commands.setContent(JSON.parse(nota.content))
    }
  }
}

const insertSubNotaLink = (subNotaId: string, subNotaTitle: string) => {
  if (editor.value) {
    // Create a link to the sub-nota
    editor.value.chain().focus().setLink({
      href: `/nota/${subNotaId}`,
      target: '_self',
    }).insertContent(subNotaTitle).run()
    
    // Save the content after inserting the link
    saveEditorContent()
  }
}

defineExpose({
  insertSubNotaLink
})
</script>

<template>
  <div class="flex">
    <!-- Sidebar -->
    <div
      class="transition-all duration-300 ease-in-out sticky top-0 h-full"
      :class="{
        'w-72': isSidebarOpen,
        'w-0': !isSidebarOpen,
      }"
    >
      <div v-show="isSidebarOpen" :style="{ width: isSidebarOpen ? 'inherit' : '0' }">
        <ScrollArea class="h-[calc(100vh-2rem)] px-6 py-4">
          <TableOfContents :editor="editor" />
        </ScrollArea>
      </div>
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0" :class="{ 'border-l': isSidebarOpen }">
      <!-- Editor Toolbar -->
      <div class="border-b bg-background sticky top-0 z-10">
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
          <div class="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              @click="saveVersion"
              :disabled="isSavingVersion"
              class="flex items-center gap-1"
            >
              <span v-if="isSavingVersion" class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              <span>Save Version</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              @click="showVersionHistory = true"
              class="flex items-center gap-1"
            >
              <span>History</span>
            </Button>
            <span>{{ wordCount }} words</span>
          </div>
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
<div class="h-full overflow-hidden px-4 md:px-8 lg:px-12">
  <ScrollArea class="h-full">
    <editor-content :editor="editor" class="max-w-4xl mx-auto py-8" />
  </ScrollArea>
</div>
      </div>
    </div>

    <!-- Favorites Sidebar is now rendered outside the editor layout -->
    <FavoriteBlocksSidebar :editor="editor" />
  </div>

  <!-- Version History Dialog -->
  <VersionHistoryDialog 
    :nota-id="props.notaId" 
    v-model:open="showVersionHistory"
    @version-restored="refreshEditorContent"
  />
</template>

<style>
.ProseMirror {
  @apply outline-none min-h-[calc(100vh-10rem)];
  font-size: var(--editor-font-size, 16px);
  line-height: var(--editor-line-height, 1.6);
  tab-size: var(--editor-tab-size, 2);
  white-space: var(--word-wrap, break-word);
}

.ProseMirror .has-focus {
  @apply relative rounded-md block;
}

.ProseMirror .has-focus::after {
  content: '';
  @apply absolute inset-0 rounded-md pointer-events-none;
  @apply bg-blue-200/10 border-blue-500/20;
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
  width: var(--drag-handle-width, 24px);
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

/* Dynamic font size classes */
.editor-font-size-12 { --editor-font-size: 12px; }
.editor-font-size-14 { --editor-font-size: 14px; }
.editor-font-size-16 { --editor-font-size: 16px; }
.editor-font-size-18 { --editor-font-size: 18px; }
.editor-font-size-20 { --editor-font-size: 20px; }
.editor-font-size-22 { --editor-font-size: 22px; }
.editor-font-size-24 { --editor-font-size: 24px; }
</style>
