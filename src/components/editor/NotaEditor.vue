<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { TagsInput } from '@/components/ui/tags-input'
import { RotateCw, CheckCircle, Star, Share2, Download, PlayCircle, Loader2, Save, Clock, Sparkles, Book, Server, Tag } from 'lucide-vue-next'
import { useNotaStore } from '@/stores/nota'
import { useJupyterStore } from '@/stores/jupyterStore'
import EditorToolbar from './EditorToolbar.vue'
import { ref, watch, computed, onUnmounted, onMounted, reactive, provide } from 'vue'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TableOfContents from './TableOfContents.vue'
import JupyterServersSidebar from './JupyterServersSidebar.vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BookIcon, ServerIcon, BrainIcon } from 'lucide-vue-next'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { getURLWithoutProtocol, toast } from '@/lib/utils'
import VersionHistoryDialog from './VersionHistoryDialog.vue'
import FavoriteBlocksSidebar from './FavoriteBlocksSidebar.vue'
import ReferencesSidebar from './ReferencesSidebar.vue'
import AIAssistantSidebar from './ai-assistant/components/AIAssistantSidebar.vue'
import { getEditorExtensions } from './extensions'
import { useEquationCounter, EQUATION_COUNTER_KEY } from '@/composables/useEquationCounter'
import { useCitationStore } from '@/stores/citationStore'
import { logger } from '@/services/logger'

// Import shared CSS
import '@/assets/editor-styles.css'

const props = defineProps<{
  notaId: string
  extensions?: any[]
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
}>()

const emit = defineEmits<{
  saving: [boolean]
  'run-all': []
  'toggle-favorite': []
  share: []
  'open-config': []
  'export-nota': []
}>()

const notaStore = useNotaStore()
const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const citationStore = useCitationStore()
const router = useRouter()
const isSidebarOpen = ref(false)
const isReferencesOpen = ref(false)
const isJupyterServersOpen = ref(false)
const isAIAssistantOpen = ref(false)
const isMetadataSidebarOpen = ref(false)
const isFavoriteBlocksOpen = ref(false)
const autoSaveEnabled = ref(true)
const showVersionHistory = ref(false)

const currentNota = computed(() => {
  return notaStore.getCurrentNota(props.notaId)
})

const content = computed(() => {
  // Insert the title as the first block if not present
  if (!currentNota.value) return null
  let doc
  try {
    doc = currentNota.value.content ? JSON.parse(currentNota.value.content) : null
  } catch (e) {
    doc = null
  }
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    doc = { type: 'doc', content: [] }
  }
  // Ensure first block is h1 with title
  if (!doc.content.length || doc.content[0].type !== 'heading' || doc.content[0].attrs?.level !== 1) {
    doc.content.unshift({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: currentNota.value.title || 'Untitled' }]
    })
  } else if (doc.content[0].content?.[0]?.text !== currentNota.value.title) {
    doc.content[0].content = [{ type: 'text', text: currentNota.value.title || 'Untitled' }]
  }
  return doc
})

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
  const servers = jupyterStore.jupyterServers

  // Register each code block with the store
  codeBlocks.forEach((block) => {
    const { attrs, content } = block
    const code = content ? content.map((c: any) => c.text).join('\n') : ''

    const serverID = attrs.serverID ? getURLWithoutProtocol(attrs.serverID).split(':') : null
    const server = serverID
      ? servers.find(
        (s: any) => getURLWithoutProtocol(s.ip) === serverID[0] && s.port === serverID[1],
      )
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
  autoSave: true,
})

// Get our shared extensions from the extensions module
const editorExtensions = getEditorExtensions()

const editor = useEditor({
  content: content.value,

  extensions: editorExtensions,
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
    },
    handlePaste: (view, event) => {
      // Get the plain text content
      const text = event.clipboardData?.getData('text/plain')

      // If there's no text, let the default handler work
      if (!text) return false

      // Check if it looks like markdown
      const isMarkdown =
        /(\#{1,6}\s.+)|(\*\*.+\*\*)|(\*.+\*)|(\[.+\]\(.+\))|(\`\`\`.+\`\`\`)|(\>\s.+)|(\-\s.+)|(\d+\.\s.+)/m.test(
          text,
        )

      if (isMarkdown) {
        // Get the editor instance to use its markdown parsing capability
        const editorInstance = editor.value

        if (editorInstance) {
          // Prevent the default paste behavior
          event.preventDefault()

          // Use the Markdown extension's parsing capability directly
          // This delays the processing to let the editor handle it properly
          setTimeout(() => {
            // First delete the selection if there is one
            if (view.state.selection.from !== view.state.selection.to) {
              editorInstance.commands.deleteSelection()
            }

            // Now insert the markdown as HTML content to trigger proper parsing
            editorInstance.commands.insertContent(text, {
              parseOptions: {
                preserveWhitespace: 'full',
              },
            })
          }, 0)

          return true
        }
      }

      // Let the default handler work for non-markdown content
      return false
    },
  },
  onCreate({ editor }) {
    // Load saved sessions first
    codeExecutionStore.loadSavedSessions(props.notaId)

    // Then register code cells which will associate them with sessions
    registerCodeCells(editor.getJSON())

    // Update citation numbers
    updateCitationNumbers()

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

// Watch for content changes to reset the equation counter
watch(() => content.value, () => {
  // Reset the equation counter when the content changes
  resetEquationCounter()
})

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
        spellcheck: settings.spellCheck.toString(),
      },
    },
  })

  // Update CSS variables for the editor
  const editorElement = document.querySelector('.ProseMirror') as HTMLElement
  if (editorElement) {
    const cssVars = {
      '--editor-font-size': `${settings.fontSize}px`,
      '--editor-line-height': settings.lineHeight.toString(),
      '--editor-tab-size': settings.tabSize.toString(),
      '--drag-handle-width': `${settings.dragHandleWidth}px`,
      '--word-wrap': settings.wordWrap ? 'break-word' : 'normal',
    }

    Object.entries(cssVars).forEach(([key, value]) => {
      editorElement.style.setProperty(key, value)
    })
  }

  // Update auto-save behavior
  autoSaveEnabled.value = settings.autoSave
}

const isSaving = ref(false)
const showSaved = ref(false)

// Function to save editor content
const saveEditorContent = async () => {
  // Before saving, sync the title from the first block
  if (editor.value && currentNota.value) {
    const json = editor.value.getJSON()
    if (
      json.content &&
      json.content.length > 0 &&
      json.content[0].type === 'heading' &&
      json.content[0].attrs?.level === 1 &&
      json.content[0].content &&
      json.content[0].content[0]?.text
    ) {
      const newTitle = json.content[0].content[0].text.trim()
      if (newTitle && newTitle !== currentNota.value.title) {
        currentNota.value.title = newTitle
      }
    }
  }
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
    logger.error('Error saving content:', error)
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
    c: () =>
      editor
        .value!.chain()
        .focus()
        .insertContent({
          type: 'executableCodeBlock',
          attrs: { language: 'python' },
        })
        .run(),
    t: () =>
      editor.value!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    m: () =>
      editor
        .value!.chain()
        .focus()
        .insertContent({
          type: 'mathBlock',
          attrs: { latex: '' },
        })
        .run(),
    d: () => editor.value!.chain().focus().setMermaid({ content: 'graph TD;\nA-->B;' }).run(),
    y: () =>
      editor.value!.chain().focus().setYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ').run(),
    f: () => editor.value!.chain().focus().setSubfigure().run(),
    h: () => editor.value!.chain().focus().setHorizontalRule().run(),
    q: () => editor.value!.chain().focus().toggleBlockquote().run(),
    k: () => editor.value!.chain().focus().toggleTaskList().run(),
    g: () => editor.value!.chain().focus().insertDrawIo().run(),
    b: () => {
      if (currentNota.value?.id) {
        editor.value!.chain().focus().insertNotaTable(currentNota.value.id).run()
      }
    },
    a: () => editor.value!.chain().focus().insertInlineAIGeneration().run(),
    x: () => {
      if (editor.value) {
        // Instead of trying to set text selection at the end,
        // we'll append a new paragraph directly
        editor.value.chain()
          .focus()
          // First ensure we're at the end by appending the content
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              // Create a new paragraph node
              const node = editor.value!.schema.nodes.paragraph.create(
                null,
                editor.value!.schema.text('New text block')
              )

              // Append it to the end of the document
              tr.insert(tr.doc.content.size, node)
            }
            return true
          })
          .run()
      }
    },
  }

  const key = event.key.toLowerCase()
  if (insertionMap[key]) {
    insertionMap[key]()
  }
}

onMounted(() => {
  // Add keyboard shortcut event listener
  document.addEventListener('keydown', handleKeyboardShortcuts)

  // Add event listener for toggling references
  window.addEventListener('toggle-references', ((event: CustomEvent) => {
    if (event.detail && event.detail.open) {
      isReferencesOpen.value = true
      isSidebarOpen.value = false
    }
  }) as EventListener)

  // Add event listener for activating AI Assistant when a robot button is clicked
  window.addEventListener('activate-ai-assistant', ((event: CustomEvent) => {
    if (event.detail) {
      // Open the AI Assistant sidebar
      isAIAssistantOpen.value = true
      // Close other sidebars
      isSidebarOpen.value = false
      isReferencesOpen.value = false
      isJupyterServersOpen.value = false
    }
  }) as EventListener)

  // Load saved editor settings
  const savedEditorSettings = localStorage.getItem('editor-settings')
  if (savedEditorSettings) {
    try {
      const settings = JSON.parse(savedEditorSettings)
      const settingsMap = {
        fontSize: (val: any) => (val && val[0] ? val[0] : undefined),
        lineHeight: (val: any) => (val && val[0] ? val[0] : undefined),
        spellCheck: (val: any) => (val !== undefined ? val : undefined),
        tabSize: (val: any) => (val && val[0] ? val[0] : undefined),
        indentWithTabs: (val: any) => (val !== undefined ? val : undefined),
        wordWrap: (val: any) => (val !== undefined ? val : undefined),
        dragHandleWidth: (val: any) => (val && val[0] ? val[0] : undefined),
        autoSave: (val: any) => (val !== undefined ? val : undefined),
      }

      Object.entries(settingsMap).forEach(([key, transform]) => {
        const value = transform(settings[key])
        if (value !== undefined) {
          ; (editorSettings as any)[key] = value
        }
      })

      applyEditorSettings()
    } catch (e) {
      logger.error('Failed to parse saved editor settings', e)
    }
  }

  // Listen for settings changes with the same mapping logic
  window.addEventListener('editor-settings-changed', ((event: CustomEvent) => {
    if (event.detail) {
      const settingsMap = {
        fontSize: (val: any) => (val && val[0] ? val[0] : undefined),
        lineHeight: (val: any) => (val && val[0] ? val[0] : undefined),
        spellCheck: (val: any) => (val !== undefined ? val : undefined),
        tabSize: (val: any) => (val && val[0] ? val[0] : undefined),
        indentWithTabs: (val: any) => (val !== undefined ? val : undefined),
        wordWrap: (val: any) => (val !== undefined ? val : undefined),
        dragHandleWidth: (val: any) => (val && val[0] ? val[0] : undefined),
        autoSave: (val: any) => (val !== undefined ? val : undefined),
      }

      let hasChanges = false
      Object.entries(settingsMap).forEach(([key, transform]) => {
        const value = transform(event.detail[key])
        if (value !== undefined) {
          ; (editorSettings as any)[key] = value
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
  window.removeEventListener('toggle-references', (() => { }) as EventListener)
  window.removeEventListener('activate-ai-assistant', (() => { }) as EventListener)
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
      createdAt: new Date(),
    })
    toast('Version saved successfully')
  } catch (error) {
    logger.error('Error saving version:', error)
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
    editor.value
      .chain()
      .focus()
      .setLink({
        href: `/nota/${subNotaId}`,
        target: '_self',
      })
      .insertContent(subNotaTitle)
      .run()

    // Save the content after inserting the link
    saveEditorContent()
  }
}

const createAndLinkSubNota = async (title: string) => {
  if (!editor.value) return

  try {
    // Create the sub-nota
    const newNota = await notaStore.createItem(title, props.notaId)

    // Insert a link to the new nota at current cursor position
    insertSubNotaLink(newNota.id, newNota.title)

    return newNota
  } catch (error) {
    logger.error('Error creating sub-nota:', error)
    toast('Failed to create sub-nota')
  }
}

// Setup equation counter
const { counters, reset: resetEquationCounter } = useEquationCounter()

// Provide the equation counter to all child components
provide(EQUATION_COUNTER_KEY, {
  counters,
  getNumber: (id: string) => {
    if (!counters.has(id)) {
      const nextNumber = counters.size + 1
      counters.set(id, nextNumber)
    }
    return counters.get(id) || 0
  },
  reset: resetEquationCounter
})

// Function to update citation numbers
const updateCitationNumbers = () => {
  if (!editor.value) return

  // Get all citations in the current nota
  const notaCitations = citationStore.getCitationsByNotaId(props.notaId)

  // Create a map of citation keys to their numbers
  const citationMap = new Map()
  notaCitations.forEach((citation, index) => {
    citationMap.set(citation.key, index + 1)
  })

  // Find all citation nodes in the document
  editor.value.state.doc.descendants((node, pos) => {
    if (node.type.name === 'citation') {
      const citationKey = node.attrs.citationKey
      const citationNumber = citationMap.get(citationKey)

      if (citationNumber !== undefined && citationNumber !== node.attrs.citationNumber) {
        // Update the citation number if it has changed
        editor.value?.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            citationNumber
          })
          return true
        })
      }
    }
    return true
  })
}

// Watch for changes in citations and update numbers
watch(() => citationStore.getCitationsByNotaId(props.notaId), () => {
  updateCitationNumbers()
}, { deep: true })

defineExpose({
  insertSubNotaLink,
  createAndLinkSubNota,
})
</script>

<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- Loading spinner -->
    <LoadingSpinner v-if="isLoading" class="absolute inset-0 z-10" />

    <!-- Table of Contents Sidebar -->
    <div v-if="isSidebarOpen" class="w-64 h-full border-r flex-shrink-0 flex flex-col bg-background">
      <TableOfContents :editor="editor" />
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <!-- Editor Toolbar -->
      <div class="border-b bg-background sticky top-0 z-10">
        <EditorToolbar v-if="editor" :editor="editor" class="px-4 py-2" :can-run-all="canRunAll"
          :is-executing-all="isExecutingAll" @run-all="$emit('run-all')" :is-favorite="isFavorite"
          @toggle-favorite="$emit('toggle-favorite')" @share="$emit('share')" @open-config="$emit('open-config')"
          @export-nota="$emit('export-nota')" />

        <!-- Editor Info Bar -->
        <div class="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t">
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" class="flex items-center gap-2"
              @click="isReferencesOpen = !isReferencesOpen; isSidebarOpen = false; isJupyterServersOpen = false; isAIAssistantOpen = false; isMetadataSidebarOpen = false; isFavoriteBlocksOpen = false"
              :class="{ 'bg-muted': isReferencesOpen }" title="References (Ctrl+Shift+Alt+R)">
              <BookIcon class="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" class="flex items-center gap-2"
              @click="isJupyterServersOpen = !isJupyterServersOpen; isSidebarOpen = false; isReferencesOpen = false; isAIAssistantOpen = false; isMetadataSidebarOpen = false; isFavoriteBlocksOpen = false"
              :class="{ 'bg-muted': isJupyterServersOpen }" title="Jupyter Servers (Ctrl+Shift+Alt+J)">
              <ServerIcon class="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" class="flex items-center gap-2"
              @click="isAIAssistantOpen = !isAIAssistantOpen; isSidebarOpen = false; isReferencesOpen = false; isJupyterServersOpen = false; isMetadataSidebarOpen = false; isFavoriteBlocksOpen = false"
              :class="{ 'bg-muted': isAIAssistantOpen }" title="AI Assistant (Ctrl+Shift+Alt+A)">
              <BrainIcon class="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" class="flex items-center gap-2"
              @click="isMetadataSidebarOpen = !isMetadataSidebarOpen; isSidebarOpen = false; isReferencesOpen = false; isJupyterServersOpen = false; isAIAssistantOpen = false; isFavoriteBlocksOpen = false"
              :class="{ 'bg-muted': isMetadataSidebarOpen }" title="Metadata (Ctrl+Shift+Alt+M)">
              <Tag class="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" class="flex items-center gap-2"
              @click="isFavoriteBlocksOpen = !isFavoriteBlocksOpen; isSidebarOpen = false; isReferencesOpen = false; isJupyterServersOpen = false; isAIAssistantOpen = false; isMetadataSidebarOpen = false"
              :class="{ 'bg-muted': isFavoriteBlocksOpen }" title="Favorite Blocks (Ctrl+Shift+Alt+V)">
              <Star class="h-4 w-4" />
            </Button>
          </div>

          <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Save Version" @click="saveVersion" :disabled="isSavingVersion">
              <span v-if="isSavingVersion"
                class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              <Save v-else class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="History" @click="showVersionHistory = true">
              <Clock class="w-4 h-4" />
            </Button>

            <!-- Action Buttons -->
            <Button v-if="canRunAll" variant="ghost" size="icon" title="Run All" :disabled="isExecutingAll"
              @click="$emit('run-all')">
              <Loader2 v-if="isExecutingAll" class="w-4 h-4 animate-spin" />
              <PlayCircle v-else class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Star" @click="$emit('toggle-favorite')"
              :class="{ 'text-yellow-500': isFavorite }">
              <Star class="w-4 h-4" :fill="isFavorite ? 'currentColor' : 'none'" />
            </Button>
            <Button variant="ghost" size="icon" title="Share" @click="$emit('share')">
              <Share2 class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Export" @click="$emit('export-nota')">
              <Download class="w-4 h-4" />
            </Button>
            <span>{{ wordCount }} words</span>
          </div>
        </div>
      </div>

      <!-- Editor Content -->
      <div class="flex-1 min-h-0 relative overflow-auto">
        <!-- Editor Content Area -->
        <div class="h-full overflow-hidden px-4 md:px-8 lg:px-12">
          <ScrollArea class="h-full">
            <div class="max-w-4xl mx-auto py-8">
              <!-- The title is now the first block inside the editor -->
              <editor-content :editor="editor" />
              <!-- Tags and Save Status below title -->
              <div class="flex items-center gap-4 mt-2">
                <TagsInput v-if="currentNota" v-model="currentNota.tags" class="w-full border-none" />
                <div class="flex items-center text-xs text-muted-foreground transition-opacity duration-200"
                  :class="{ 'opacity-0': !isSaving && !showSaved }">
                  <span v-if="isSaving" class="flex items-center gap-1">
                    <RotateCw class="w-3 h-3 animate-spin" />
                    Saving
                  </span>
                  <span v-else-if="showSaved" class="flex items-center gap-1">
                    <CheckCircle class="w-3 h-3 text-green-600" />
                    Saved
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>

    <!-- Right-side Sidebars (move all sidebars to the right side) -->
    <!-- References Sidebar -->
    <div v-if="isReferencesOpen"
      class="h-full border-l flex-shrink-0 flex flex-col bg-background right-sidebar-container">
      <ReferencesSidebar :editor="editor" :notaId="notaId" @close="isReferencesOpen = false" />
    </div>

    <!-- Jupyter Servers Sidebar -->
    <div v-if="isJupyterServersOpen"
      class="h-full border-l flex-shrink-0 flex flex-col bg-background right-sidebar-container">
      <JupyterServersSidebar :notaId="notaId" @close="isJupyterServersOpen = false" />
    </div>

    <!-- AI Assistant Sidebar -->
    <div v-if="isAIAssistantOpen"
      class="h-full border-l flex-shrink-0 flex flex-col bg-background right-sidebar-container">
      <AIAssistantSidebar :editor="editor" :notaId="notaId" @close="isAIAssistantOpen = false" />
    </div>

    <!-- Metadata Sidebar -->
    <div v-if="isMetadataSidebarOpen"
      class="h-full border-l flex-shrink-0 flex flex-col bg-background right-sidebar-container">
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="font-medium">Metadata</h3>
        <Button variant="ghost" size="icon" @click="isMetadataSidebarOpen = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </Button>
      </div>
      <ScrollArea class="flex-1 p-4">
        <div class="space-y-4">
          <div v-if="currentNota">
            <h4 class="text-sm font-medium mb-2">Tags</h4>
            <TagsInput v-model="currentNota.tags" />
          </div>
        </div>
      </ScrollArea>
    </div>

    <!-- Favorites Sidebar -->
    <div v-if="isFavoriteBlocksOpen"
      class="h-full border-l flex-shrink-0 flex flex-col bg-background right-sidebar-container">
      <FavoriteBlocksSidebar :editor="editor" @close="isFavoriteBlocksOpen = false" />
    </div>

    <!-- Version History Dialog -->
    <VersionHistoryDialog :nota-id="notaId" v-model:open="showVersionHistory"
      @version-restored="refreshEditorContent" />
  </div>
</template>

<style>
/* Apply the editor-specific class to the editable ProseMirror instance */
:deep(.ProseMirror) {
  @apply min-h-[calc(100vh-10rem)];
}

/* Right sidebar container styles */
.right-sidebar-container {
  min-width: 300px;
  width: 350px;
  /* Default width that can be overridden by resize */
  max-width: 800px;
}
</style>
