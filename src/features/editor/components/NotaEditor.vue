<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { TagsInput } from '@/components/ui/tags-input'
import { RotateCw, CheckCircle, Star, Share2, Download, PlayCircle, Loader2, Save, Clock, Sparkles, Book, Server, Tag, Link2 } from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { ref, watch, computed, onUnmounted, onMounted, reactive, provide } from 'vue'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { getURLWithoutProtocol } from '@/lib/utils'
import { toast } from 'vue-sonner'
import VersionHistoryDialog from './dialogs/VersionHistoryDialog.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getEditorExtensions } from './extensions'
import { useEquationCounter, EQUATION_COUNTER_KEY } from '@/features/editor/composables/useEquationCounter'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { logger } from '@/services/logger'
import { useDebounceFn } from '@vueuse/core'
import type { CitationEntry } from "@/features/nota/types/nota"
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'

// Import shared CSS
import '@/assets/editor-styles.css'

const props = defineProps<{
  notaId: string
  extensions?: any[]
}>()

const emit = defineEmits<{
  saving: [boolean]
}>()

const notaStore = useNotaStore()
const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const citationStore = useCitationStore()
const router = useRouter()
const autoSaveEnabled = ref(true)
const showVersionHistory = ref(false)

// Initialize block editor integration
const { 
  syncContentToBlocks, 
  initializeBlocks, 
  getTiptapContent, 
  blockStats,
  isInitialized 
} = useBlockEditor(props.notaId)

// New ref for tracking if shared session mode toggle is in progress
const isTogglingSharedMode = ref(false)

// Add ref to track last saved content
const lastSavedContent = ref<string>('')

// Add debounced save function
const debouncedSave = useDebounceFn(async () => {
  if (!editor.value) return;
  
  try {
    emit('saving', true);
    const content = editor.value.getJSON();

    // Only register code cells if content has changed
    const currentContent = JSON.stringify(content);
    if (currentContent !== lastSavedContent.value) {
      lastSavedContent.value = currentContent;
      registerCodeCells(content, props.notaId);
    }

    // Save sessions whenever content updates
    await codeExecutionStore.saveSessions(props.notaId);

    // Save to block-based system
    await syncContentToBlocks(content);
  } catch (error) {
    logger.error('Error saving content:', error);
  } finally {
    emit('saving', false);
  }
}, 1000);

const currentNota = computed(() => {
  return notaStore.getCurrentNota(props.notaId)
})

const content = computed(() => {
  // Get content from block-based system
  if (!currentNota.value) return null
  
  // Use the block system to get Tiptap content
  const blockContent = getTiptapContent.value
  
  if (blockContent) {
    return blockContent
  }
  
  // Fallback to empty document with title
  return {
    type: 'doc',
    content: [{
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: currentNota.value.title || 'Untitled' }]
    }]
  }
})

const registerCodeCells = (content: any, notaId: string) => {
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
    const content = editor.getJSON()
    lastSavedContent.value = JSON.stringify(content)
    registerCodeCells(content, props.notaId)

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
  onUpdate: () => {
    // Use debounced save to prevent too frequent updates
    debouncedSave()
  },
})

// Function to check if block system is ready
const isBlockSystemReady = computed(() => isInitialized.value)

// Watch for ID changes to update editor content
watch(
  [() => props.notaId],
  ([newNotaId]) => {
    if (editor.value && newNotaId) {
      // Content will be loaded from blocks when the editor initializes
      // The block system handles content loading automatically
    }
  },
  { immediate: true },
)

// Watch for content changes to reset the equation counter
watch(() => content.value, () => {
  // Reset the equation counter when the content changes
  resetEquationCounter()
})

// Watch for block system initialization to ensure content is loaded
watch(isBlockSystemReady, (ready) => {
  if (ready && editor.value) {
    // Block system is ready, ensure editor has the latest content
    const blockContent = getTiptapContent.value
    if (blockContent) {
      // Always update editor content when blocks are loaded
      editor.value.commands.setContent(blockContent)
      logger.info('Updated editor content from blocks:', blockContent)
    }
  }
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

// Optimize toggleSharedSessionMode
const toggleSharedSessionMode = async () => {
  if (isTogglingSharedMode.value) return;
  
  isTogglingSharedMode.value = true;
  try {
    const isEnabled = await codeExecutionStore.toggleSharedSessionMode(props.notaId);
    const message = isEnabled 
      ? 'Shared kernel session mode enabled. All code blocks will use the same session.'
      : 'Manual session mode enabled. Each code block can use its own session.';
    toast(message);
  } catch (error) {
    logger.error('Failed to toggle shared session mode:', error);
    toast('Failed to toggle shared session mode');
  } finally {
    isTogglingSharedMode.value = false;
  }
};

// Handle keyboard shortcuts for inserting blocks
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Check if editor is initialized
  if (!editor.value) return;

  // Skip if target is a CodeMirror editor
  if (event.target instanceof HTMLElement) {
    const isCodeMirrorFocused = event.target.closest('.cm-editor') !== null;
    if (isCodeMirrorFocused) return;
  }

  // Only process Ctrl+Shift+Alt combinations
  if (!(event.ctrlKey && event.shiftKey && event.altKey)) return;

  // Prevent default browser behavior
  event.preventDefault();

  // Map of key to insertion functions
  const insertionMap: Record<string, () => void> = {
    // Content insertion shortcuts
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
    y: () =>
      editor.value!.chain().focus().setYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ').run(),
    f: () => editor.value!.chain().focus().setSubfigure().run(),
    h: () => editor.value!.chain().focus().setHorizontalRule().run(),
    q: () => editor.value!.chain().focus().toggleBlockquote().run(),
    k: () => editor.value!.chain().focus().toggleTaskList().run(),
    g: () => editor.value!.chain().focus().insertDrawIo().run(),
    b: () => {
      if (currentNota.value?.id) {
        editor.value!.chain().focus().insertNotaTable(currentNota.value.id).run();
      }
    },
    x: () => {
      if (editor.value) {
        editor.value.chain()
          .focus()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const node = editor.value!.schema.nodes.paragraph.create(
                null,
                editor.value!.schema.text('New text block')
              );
              tr.insert(tr.doc.content.size, node);
            }
            return true;
          })
          .run();
      }
    },
  };

  const key = event.key.toLowerCase();
  if (insertionMap[key]) {
    insertionMap[key]();
  }
};

// Listen for custom event to open AI sidebar
onMounted(async () => {
  // Initialize block system for this nota
  await initializeBlocks()
  
  // Add keyboard shortcut event listener
  document.addEventListener('keydown', handleKeyboardShortcuts)
  
  // Add event listener for activating AI Assistant
  window.addEventListener('activate-ai-assistant', ((event: CustomEvent) => {
    if (event.detail) {
      // The AI sidebar is now managed by SplitNotaView
    }
  }) as EventListener)

  // Add event listener for opening Jupyter sidebar from confusion matrix blocks
  window.addEventListener('open-jupyter-sidebar', (() => {
    // The Jupyter sidebar is now managed by SplitNotaView
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
  window.removeEventListener('activate-ai-assistant', (() => { }) as EventListener)
  window.removeEventListener('open-jupyter-sidebar', (() => { }) as EventListener)
  codeExecutionStore.cleanup()
})

const isSavingVersion = ref(false)

const saveVersion = async () => {
  if (isSavingVersion.value || !editor.value || !currentNota.value) return
  
  isSavingVersion.value = true
  try {
    const content = editor.value.getJSON()
    // Save version using the current nota
    const versionNota = {
      ...currentNota.value
    } as any
    
    await notaStore.saveNotaVersion({
      id: props.notaId,
      nota: versionNota,
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
    // Reload the nota content from blocks
    const blockContent = getTiptapContent.value
    
    if (blockContent) {
      // Set content directly as Tiptap object
      editor.value.commands.setContent(blockContent)
    }
  }
}

// Function to get block statistics for display
const getBlockStatistics = () => {
  return {
    totalBlocks: blockStats.value.totalBlocks,
    wordCount: blockStats.value.wordCount,
    characterCount: blockStats.value.characterCount,
    blockTypes: blockStats.value.blockTypes
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
    debouncedSave()
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

// Add renderMath state for toggling math rendering
const renderMath = ref(true)

// Expose this state to components
provide('renderMath', renderMath)

// Function to update citation numbers
const updateCitationNumbers = () => {
  if (!editor.value) return

  // Get all citations in the current nota
  const notaCitations = citationStore.getCitationsByNotaId(props.notaId)

  // Create a map of citation keys to their numbers
  const citationMap = new Map()
  notaCitations.forEach((citation: CitationEntry, index: number) => {
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
  editor,
  insertSubNotaLink,
  createAndLinkSubNota,
  saveVersion,
  showVersionHistory,
})

</script>

<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
      <Skeleton class="w-8 h-8 rounded-full" />
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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

    <!-- Version History Dialog -->
    <VersionHistoryDialog :nota-id="notaId" v-model:open="showVersionHistory"
      @version-restored="refreshEditorContent" />
  </div>
</template>

<style>
/* Apply the editor-specific class to the editable ProseMirror instance */
:deep(.ProseMirror) {
  min-height: calc(100vh - 10rem);
}
</style>








