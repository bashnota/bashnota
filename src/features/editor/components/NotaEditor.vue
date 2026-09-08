<script setup lang="ts">
import { useEditor, EditorContent } from '@/features/editor/pm'
import { TagsInput } from '@/components/ui/tags-input'
import { Button } from '@/components/ui/button'
import { RotateCw, CheckCircle, Download, Clock } from 'lucide-vue-next';
import { useNotaStore } from '@/features/nota/stores/nota'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { ref, watch, computed, onUnmounted, onMounted, reactive, provide, nextTick } from 'vue'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { getURLWithoutProtocol } from '@/lib/utils'
import { toast } from '@/services/toast'
import VersionHistoryDialog from './dialogs/VersionHistoryDialog.vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getEditorExtensions } from './extensions'
import { useEquationCounter, EQUATION_COUNTER_KEY } from '@/features/editor/composables/useEquationCounter'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { logger } from '@/services/logger'
import { useDebounceFn } from '@vueuse/core'
import type { CitationEntry } from "@/features/nota/types/nota"
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'
import NotaBreadcrumb from '@/features/nota/components/NotaBreadcrumb.vue'
import MarkdownInputComponent from './blocks/MarkdownInputComponent.vue'
import { EnhancedMarkdownPasteHandler } from '../services/EnhancedMarkdownPasteHandler'
import { exportNotaToHtml } from '@/features/editor/services/exportService'
import {
  drainPersistedEdits,
  enqueuePersistedEdit,
  shouldCaptureEditorUpdate,
  type PersistedEditOperation,
} from '@/features/editor/services/editPersistenceQueue'
import { withNotaPersistence } from '@/services/databaseAdapter'
import { createLinkedSubNota } from '@/features/nota/services/subNotaService'

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
const showMarkdownInput = ref(false)

// Initialize block editor integration
const { 
  syncContentToBlocks, 
  syncContentForVersion,
  initializeBlocks, 
  getTiptapContent, 
  blockStats,
  isInitialized 
} = useBlockEditor(props.notaId)

// New ref for tracking if shared session mode toggle is in progress
const isTogglingSharedMode = ref(false)

// Edit queue system for smooth editing experience
type EditOperation = PersistedEditOperation<any>

const editQueue = ref<EditOperation[]>([])
const isProcessingQueue = ref(false)
const lastSavedContent = ref<string>('')
const editorContentHash = ref<string>('')
const isApplyingPersistedContent = ref(false)
const AUTOSAVE_RETRY_DELAYS_MS = [250, 1000, 3000] as const
let editQueueRetryTimer: ReturnType<typeof setTimeout> | null = null
let consecutiveSaveFailures = 0
let terminalSaveFailureShown = false
let isEditorUnmounted = false

const clearEditQueueRetry = () => {
  if (editQueueRetryTimer !== null) clearTimeout(editQueueRetryTimer)
  editQueueRetryTimer = null
}

const resetEditQueueRetry = () => {
  clearEditQueueRetry()
  consecutiveSaveFailures = 0
  terminalSaveFailureShown = false
}

const scheduleEditQueueRetry = () => {
  if (isEditorUnmounted || editQueueRetryTimer !== null || editQueue.value.length === 0) return

  const retryDelay = AUTOSAVE_RETRY_DELAYS_MS[consecutiveSaveFailures - 1]
  if (retryDelay === undefined) {
    if (!terminalSaveFailureShown) {
      terminalSaveFailureShown = true
      toast.error('Autosave could not recover. Your unsaved edits remain in this tab; check storage access and edit again to retry.')
    }
    return
  }

  editQueueRetryTimer = setTimeout(() => {
    editQueueRetryTimer = null
    if (!isEditorUnmounted) void processEditQueue()
  }, retryDelay)
}

// Generate a hash for content comparison
const generateContentHash = (content: any): string => {
  return JSON.stringify(content, (key, value) => {
    // Ignore temporary attributes that shouldn't affect content hash
    if (key === 'marks' || key === 'selection') return undefined
    return value
  })
}

// Add edit operation to queue
const queueEdit = (operation: Omit<EditOperation, 'id' | 'timestamp' | 'applied'>) => {
  if (terminalSaveFailureShown) resetEditQueueRetry()

  const editOp: EditOperation = {
    ...operation,
    id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    applied: false
  }
  
  const wasSaturated = editQueue.value.length >= 50
  editQueue.value = enqueuePersistedEdit(editQueue.value, editOp)
  if (wasSaturated) {
    logger.warn('Edit queue limit reached; compacted to the newest complete document snapshot')
  }
  
  // Process queue if not already processing
  if (!isProcessingQueue.value && editQueueRetryTimer === null) {
    // Use nextTick to ensure we're not in the middle of a transaction
    nextTick(() => {
      if (!isProcessingQueue.value) {
        processEditQueue()
      }
    })
  }
}

// Handle specific edit types more intelligently
const handleEditOperation = (transaction: any, editor: any) => {
  if (!transaction.docChanged) return
  
  // Analyze the transaction to determine edit type
  const { steps } = transaction
  
  for (const step of steps) {
    if (step.from !== undefined && step.to !== undefined) {
      // This is a replacement operation
      if (step.slice && step.slice.content && step.slice.content.size > 0) {
        // Content was inserted/replaced
        queueEdit({
          type: 'update',
          position: step.from,
          content: editor.getJSON()
        })
      } else if (step.from !== step.to) {
        // Content was deleted
        queueEdit({
          type: 'delete',
          position: step.from,
          content: editor.getJSON()
        })
      }
    }
  }
}

// Process edit queue
const processEditQueue = async () => {
  if (isProcessingQueue.value || editQueue.value.length === 0) return
  
  isProcessingQueue.value = true
  
  try {
    // Reserve the complete drain for this nota. A replacement editor can queue
    // behind it, but cannot insert a newer write between this instance's
    // in-flight snapshot and its queued final snapshot.
    await withNotaPersistence(props.notaId, async () => {
      await drainPersistedEdits({
        readQueue: () => editQueue.value,
        writeQueue: queue => { editQueue.value = queue },
        persist: async edit => {
          const contentToPersist = edit.content ?? editor.value?.getJSON()
          if (!contentToPersist) throw new Error('Editor content was unavailable while saving.')

          await applyEditToDatabase(edit, contentToPersist)
          lastSavedContent.value = JSON.stringify(contentToPersist)
        },
      })
    })
    resetEditQueueRetry()
  } catch (error) {
    consecutiveSaveFailures += 1
    logger.error('Error processing edit queue:', error)
    scheduleEditQueueRetry()
  } finally {
    isProcessingQueue.value = false
    
  }
}

// Apply edit to database
const applyEditToDatabase = async (edit: EditOperation, currentContent: any) => {
  try {
    // Save to block-based system
    await syncContentToBlocks(currentContent, true)
    
    // Save sessions
    await codeExecutionStore.saveSessions(props.notaId, true)
    
    logger.info(`Applied edit ${edit.id} to database`)
  } catch (error) {
    logger.error(`Error applying edit ${edit.id}:`, error)
    throw error
  }
}

// Debounced save function that uses the edit queue
const debouncedSave = useDebounceFn(async () => {
  if (!editor.value) return
  
  try {
    emit('saving', true)
    
    // Process any pending edits
    await processEditQueue()
    
  } catch (error) {
    logger.error('Error in debounced save:', error)
  } finally {
    emit('saving', false)
  }
}, 2000)

// Smart save that respects the edit queue
const smartSave = useDebounceFn(async () => {
  if (!editor.value || !editor.value.isFocused) return
  
  const content = editor.value.getJSON()
  const currentHash = generateContentHash(content)
  
  if (currentHash !== editorContentHash.value) {
    editorContentHash.value = currentHash
    debouncedSave()
  }
}, 3000)

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
  
  // Return empty document when no block content is available
  // The title block is displayed separately in the UI, not in the content
  return {
    type: 'doc',
    content: []
  }
})

// On-demand code cell registration for better performance
const registerCodeCell = (block: any) => {
  try {
    const { attrs, content } = block
    const code = content ? content.map((c: any) => c.text).join('\n') : ''

    const servers = jupyterStore.jupyterServers
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
    
    logger.info(`Registered code cell: ${attrs.id}`)
  } catch (error) {
    logger.error('Error registering code cell:', error)
  }
}

// Function to find all code blocks in content (for when we need to scan)
const findCodeBlocks = (content: any): any[] => {
  const blocks: any[] = []
  const scanNode = (node: any) => {
    if (node.type === 'executableCodeBlock') {
      blocks.push(node)
    }
    if (node.content) {
      node.content.forEach((child: any) => {
        scanNode(child)
      })
    }
  }
  scanNode(content)
  return blocks
}

// Function to register code cells on-demand (called when user interacts with them)
const registerCodeCellsOnDemand = (content: any, notaId: string) => {
  const codeBlocks = findCodeBlocks(content)
  codeBlocks.forEach(registerCodeCell)
}

// Function to register a code cell when it's about to be executed
const registerCodeCellForExecution = (blockId: string) => {
  if (!editor.value) return
  
  const content = editor.value.getJSON()
  const findBlockById = (node: any): any => {
    if (node.attrs?.id === blockId) {
      return node
    }
    if (node.content) {
      for (const child of node.content) {
        const found = findBlockById(child)
        if (found) return found
      }
    }
    return null
  }
  
  const block = findBlockById(content)
  if (block && block.type === 'executableCodeBlock') {
    registerCodeCell(block)
  }
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
  content: null, // Start with no content, let the loading state handle it
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

      // Use enhanced markdown detection
      if (EnhancedMarkdownPasteHandler.isMarkdownContent(text)) {
        // Get the editor instance
        const editorInstance = editor.value

        if (editorInstance) {
          // Prevent the default paste behavior
          event.preventDefault()

          // Use enhanced paste handler for better parsing and validation
          EnhancedMarkdownPasteHandler.handlePaste(text).then(pasteResult => {
            if (pasteResult.success && pasteResult.blocks.length > 0) {
              // Insert validated blocks
              setTimeout(() => {
                // Delete selection if there is one
                if (view.state.selection.from !== view.state.selection.to) {
                  editorInstance.commands.deleteSelection()
                }

                // Insert the parsed blocks
                editorInstance.commands.insertContent(pasteResult.blocks)
                
                // Show success message
                toast.success(pasteResult.message)
              }, 0)
            } else {
              // Show error message and offer to open markdown input
              toast.error(pasteResult.message)
              
              // Ask user if they want to open the markdown input dialog
              if (confirm('Would you like to open the markdown input dialog to fix the issues?')) {
                showMarkdownInput.value = true
              }
            }
          }).catch(error => {
            logger.error('Error in enhanced paste handling:', error)
            
            // Fallback to original behavior
            setTimeout(() => {
              if (view.state.selection.from !== view.state.selection.to) {
                editorInstance.commands.deleteSelection()
              }
              editorInstance.commands.insertContent(text, {
                parseOptions: { preserveWhitespace: 'full' },
              })
            }, 0)
          })

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

    // Set initial content for tracking changes
    const content = editor.getJSON()
    lastSavedContent.value = JSON.stringify(content)
    
    // Initialize content hash for the initial content
    editorContentHash.value = generateContentHash(content)

    // Update citation numbers
    updateCitationNumbers()

    editor.view.dom.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      
      // Handle link clicks
      const linkElement = target.tagName === 'A' ? target : target.closest('a')
      if (linkElement) {
        event.preventDefault()
        const href = linkElement.getAttribute('href')
        if (href?.startsWith('/nota/')) {
          router.push(href)
        }
        return
      }
      
      // Handle code block clicks for on-demand registration
      const codeBlockElement = target.closest('[data-type="executableCodeBlock"]')
      if (codeBlockElement) {
        const blockId = codeBlockElement.getAttribute('data-block-id')
        if (blockId) {
          // Find the block in the current content and register it
          const content = editor.getJSON()
          const findBlockById = (node: any): any => {
            if (node.attrs?.id === blockId) {
              return node
            }
            if (node.content) {
              for (const child of node.content) {
                const found = findBlockById(child)
                if (found) return found
              }
            }
            return null
          }
          
          const block = findBlockById(content)
          if (block && block.type === 'executableCodeBlock') {
            registerCodeCell(block)
          }
        }
      }
    })
  },
  onUpdate: ({ editor, transaction }) => {
    if (shouldCaptureEditorUpdate({
      docChanged: transaction.docChanged,
      isFocused: editor.isFocused,
      isApplyingPersistedContent: isApplyingPersistedContent.value,
    })) {
      // Use intelligent edit handling
      handleEditOperation(transaction, editor)
      
      // Update content hash for smart save
      const content = editor.getJSON()
      const currentHash = generateContentHash(content)
      if (currentHash !== editorContentHash.value) {
        editorContentHash.value = currentHash
        smartSave()
      }
    }
  },
  onBlur: ({ editor }) => {
    // Process any pending edits when editor loses focus
    if (editQueue.value.length > 0) {
      debouncedSave()
    }
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
  try {
    // Reset the equation counter when the content changes
    resetEquationCounter()
  } catch (error) {
    logger.error('Error in content change watcher:', error)
  }
})

// Title block is now displayed separately in the UI, not in the content

const loadPersistedContent = (persistedContent: any, reason: string): boolean => {
  if (!editor.value) return false

  isApplyingPersistedContent.value = true
  try {
    const loaded = editor.value.commands.setContent(persistedContent)
    if (!loaded) {
      logger.error(`Persisted content load refused (${reason}); preserving the current editor document`)
      return false
    }

    const loadedContent = editor.value.getJSON()
    editorContentHash.value = generateContentHash(loadedContent)
    lastSavedContent.value = JSON.stringify(loadedContent)
    logger.info(`Persisted content loaded (${reason})`, loadedContent)
    return true
  } finally {
    isApplyingPersistedContent.value = false
  }
}

// Function to load content from blocks into editor
const loadContentFromBlocks = () => {
  try {
    if (!editor.value) return false
    
    const blockContent = getTiptapContent.value
    if (blockContent) {
      const currentContent = editor.value.getJSON()
      const hasRealContent = currentContent && 
        currentContent.content && 
        currentContent.content.length > 0 && 
        currentContent.content.some((node: any) => 
          node.type !== 'doc' && 
          (node.content && node.content.length > 0 || node.text)
        )
      
      if (!hasRealContent) {
        return loadPersistedContent(blockContent, 'block load')
      } else {
        logger.info('Editor already has content, skipping load')
        return false
      }
    } else {
      logger.info('No block content available to load')
      return false
    }
  } catch (error) {
    logger.error('Error loading content from blocks:', error)
    return false
  }
}

// Watch for block system initialization to ensure content is loaded
watch(isBlockSystemReady, (ready) => {
  try {
    if (ready && editor.value) {
      // Block system is ready, ensure editor has the latest content
      const blockContent = getTiptapContent.value
      if (blockContent) {
        // Always load content on initial block system ready (page refresh)
        // This is the main purpose of the blocking system
        const currentContent = editor.value.getJSON()
        const hasRealContent = currentContent && 
          currentContent.content && 
          currentContent.content.length > 0 && 
          currentContent.content.some((node: any) => 
            node.type !== 'doc' && 
            (node.content && node.content.length > 0 || node.text)
          )
        
        if (!hasRealContent) {
          loadPersistedContent(blockContent, 'block system ready')
        } else {
          logger.info('Editor already has content, skipping load:', currentContent)
        }
      } else {
        logger.info('No block content available when block system is ready')
      }
    }
  } catch (error) {
    logger.error('Error in block system ready watcher:', error)
  }
})

// Additional watcher specifically for page refresh scenarios
watch(() => getTiptapContent.value, (newContent, oldContent) => {
  try {
    if (newContent && editor.value && !oldContent) {
      // This is likely a page refresh - content just became available
      const currentContent = editor.value.getJSON()
      const hasContent = currentContent && currentContent.content && currentContent.content.length > 0
      
      if (!hasContent) {
        loadPersistedContent(newContent, 'page refresh')
      }
    }
  } catch (error) {
    logger.error('Error in page refresh content watcher:', error)
  }
}, { immediate: true })

// Watch for content changes to update editor when content becomes available
watch(() => getTiptapContent.value, (newContent) => {
  try {
    if (newContent && editor.value) {
      // Check if we're still loading by evaluating the conditions directly
      const stillLoading = !currentNota.value || !isInitialized.value || !editor.value
      if (!stillLoading) {
        // Always load content when it becomes available (page refresh)
        // This is the main purpose of the blocking system
        const currentContent = editor.value.getJSON()
        const hasContent = currentContent && currentContent.content && currentContent.content.length > 0
        
        if (!hasContent) {
          loadPersistedContent(newContent, 'content watcher')
        }
      }
    }
  } catch (error) {
    logger.error('Error in content watcher:', error)
  }
})

// Loading state is now handled by the parent NotaPane component
// This component focuses on editor-specific functionality

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

// Title field refs and state
const titleInput = ref<HTMLElement>()
const originalTitle = ref('')
const currentTitle = ref('')
const isTitleSaving = ref(false)

const syncTitleField = (title: string) => {
  const input = titleInput.value
  if (!input || document.activeElement === input) return

  if (input.textContent !== title) input.textContent = title
  currentTitle.value = title
  originalTitle.value = title
}

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
  // Initialize the visible title before the asynchronous block load. Waiting
  // until after that load can overwrite text a user has already started
  // entering on a slower device or CI worker.
  await nextTick()
  syncTitleField(currentNota.value?.title || '')

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

  // Add event listener for opening markdown input dialog from slash commands
  document.addEventListener('open-markdown-input', ((event: CustomEvent) => {
    showMarkdownInput.value = true
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
  isEditorUnmounted = true
  clearEditQueueRetry()

  // Clean up event listeners
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('activate-ai-assistant', (() => { }) as EventListener)
  window.removeEventListener('open-jupyter-sidebar', (() => { }) as EventListener)
  document.removeEventListener('open-markdown-input', (() => { }) as EventListener)
  codeExecutionStore.cleanup()
})

const handleExport = async () => {
  if (!editor.value || !currentNota.value) return
  try {
    toast.message('Starting export... (this may take a moment for large trees)')
    const content = editor.value.getJSON()
    await exportNotaToHtml({
      title: currentNota.value.title || 'Untitled',
      content,
      citations: citationStore.getCitationsByNotaId(props.notaId), // Pass citations from store to ensure they are up to date
      rootNotaId: currentNota.value.id,
      fetchNota: async (id: string) => {
          // Avoid refetching current nota if requested
          if (id === currentNota.value?.id) {
              return { title: currentNota.value.title, content, citations: currentNota.value.citations }
          }
          
          // Get metadata (load if necessary)
          let targetNota = notaStore.getItem(id)
          if (!targetNota) {
              targetNota = await notaStore.loadNota(id) as any
          }
          
          if (!targetNota) return null
          
          // Get content
          const notaContent = await notaStore.getNotaContentAsTiptap(id)
          return { title: targetNota.title, content: notaContent, citations: targetNota.citations }
      }
    })
    toast.success('Export completed successfully')
  } catch (e) {
    logger.error('Export failed', e)
    toast.error('Export failed')
  }
}

const isSavingVersion = ref(false)
let saveVersionInFlight: ReturnType<typeof notaStore.saveNotaVersion> | null = null

const saveVersion = () => {
  if (saveVersionInFlight) return saveVersionInFlight
  if (!editor.value || !currentNota.value) {
    return Promise.reject(new Error('Unable to save version: the editor is not ready.'))
  }

  isSavingVersion.value = true
  const content = editor.value.getJSON()

  saveVersionInFlight = notaStore.saveNotaVersion({
      id: props.notaId,
      versionName: `Version ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      // Convert the live PM document through the production normalized-block
      // path inside the same transaction as the historical snapshot.
      prepareCanonical: () => syncContentForVersion(content),
    })
    .catch((error) => {
      logger.error('Error saving version:', error)
      throw error
    })
    .finally(() => {
      isSavingVersion.value = false
      saveVersionInFlight = null
    })
  return saveVersionInFlight
}
const refreshEditorContent = async () => {
  if (editor.value) {
    // Reload the nota content from blocks
    const blockContent = getTiptapContent.value
    
    if (blockContent) {
      loadPersistedContent(blockContent, 'manual refresh')
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
    return await createLinkedSubNota({
      parentId: props.notaId,
      title,
      editor: editor.value,
    })
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
})

// Only title changes should update the title field. Canonical body/config
// refreshes must not rewrite a focused contenteditable while the user types.
watch(
  () => currentNota.value?.title,
  (title) => {
    if (title !== undefined) syncTitleField(title)
  },
  { flush: 'post' },
)

// Title field methods
const handleTitleInput = (event: Event) => {
  const target = event.target as HTMLElement
  currentTitle.value = target.textContent || ''
}

const handleTitleFocus = () => {
  originalTitle.value = currentTitle.value
}

const handleTitleBlur = async () => {
  if (isTitleSaving.value) return
  
  const title = currentTitle.value.trim()
  
  // Don't save if no changes or empty
  if (title === originalTitle.value || title === '') {
    if (title === '') {
      // Revert empty title
      if (titleInput.value) {
        titleInput.value.textContent = originalTitle.value
        currentTitle.value = originalTitle.value
      }
    }
    return
  }
  
  // Auto-save the title
  await saveTitle(title)
}

const handleTitleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Move focus to the editor to trigger auto-save
    editor.value?.commands.focus()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    // Revert to original title
    if (titleInput.value) {
      titleInput.value.textContent = originalTitle.value
      currentTitle.value = originalTitle.value
    }
  }
}

const saveTitle = async (title: string) => {
  if (isTitleSaving.value) return
  
  try {
    isTitleSaving.value = true
    
    // Update the nota title in the store
    await notaStore.updateNotaTitle(props.notaId, title)
    originalTitle.value = title
    toast.success('Title updated')
    
  } catch (error) {
    console.error('Error saving title:', error)
    toast.error('Failed to update title')
    
    // Revert on error
    if (titleInput.value) {
      titleInput.value.textContent = originalTitle.value
      currentTitle.value = originalTitle.value
    }
  } finally {
    isTitleSaving.value = false
  }
}

// Handle markdown block insertion
const handleMarkdownBlocksInsertion = (blocks: any[]) => {
  if (!editor.value || blocks.length === 0) return
  
  try {
    // Insert blocks at current cursor position
    const inserted = editor.value.commands.insertContent(blocks)
    if (!inserted) {
      throw new Error('The editor rejected one or more parsed blocks.')
    }
    
    // Show success message
    toast.success(`Successfully inserted ${blocks.length} block${blocks.length !== 1 ? 's' : ''}`)
    
    // Close the dialog
    showMarkdownInput.value = false
    
    // Trigger save
    debouncedSave()
    
  } catch (error) {
    logger.error('Error inserting markdown blocks:', error)
    toast.error('Failed to insert blocks. Please try again.')
  }
}

defineExpose({
  editor,
  insertSubNotaLink,
  createAndLinkSubNota,
  saveVersion,
  showVersionHistory,
  showMarkdownInput,
  registerCodeCell,
  registerCodeCellsOnDemand,
  findCodeBlocks,
  registerCodeCellForExecution,
  // Edit queue management
  processEditQueue,
  queueEdit,
  // Manual sync when needed
  syncContent: () => {
    if (editor.value) {
      const content = editor.value.getJSON()
      syncContentToBlocks(content)
    }
  },
  // Force load content from database (for debugging/testing)
  forceLoadContent: () => {
    if (editor.value) {
      const blockContent = getTiptapContent.value
      if (blockContent) {
        return loadPersistedContent(blockContent, 'forced reload')
      }
      return false
    }
    return false
  }
})

</script>

<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <!-- Editor Content -->
      <div class="flex-1 min-h-0 relative overflow-auto">
        <!-- Editor Content Area -->
        <div class="h-full overflow-hidden px-4 md:px-8 lg:px-12">
          <ScrollArea class="h-full">
            <div class="max-w-4xl mx-auto py-8">
              <!-- Breadcrumb Navigation -->
              <NotaBreadcrumb v-if="currentNota" :nota-id="currentNota.id" class="mb-4" />
              
              <!-- Nota Title Field -->
              <div class="nota-title-field mb-6">
                <div class="flex items-center justify-between">
                  <div
                    ref="titleInput"
                    class="nota-title-input flex-1"
                    contenteditable="true"
                    role="textbox"
                    aria-label="Nota title"
                    aria-multiline="false"
                    :placeholder="'Untitled'"
                    @input="handleTitleInput"
                    @blur="handleTitleBlur"
                    @keydown="handleTitleKeydown"
                    @focus="handleTitleFocus"
                  ></div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="showVersionHistory = true"
                    class="ml-4 h-8 px-2 text-xs"
                  >
                    <Clock class="h-3 w-3 mr-1" />
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleExport"
                    class="ml-2 h-8 px-2 text-xs"
                    title="Export to HTML"
                  >
                    <Download class="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
              

              
              <!-- Editor content area -->
              <editor-content :editor="editor" />
              <!-- Tags and Save Status below editor content -->
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
    
    <!-- Markdown Input Dialog -->
    <MarkdownInputComponent 
      v-model="showMarkdownInput"
      @insert-blocks="handleMarkdownBlocksInsertion"
    />
  </div>
</template>

<style>
/* Apply the editor-specific class to the editable ProseMirror instance */
:deep(.ProseMirror) {
  min-height: calc(100vh - 10rem);
}

/* Nota title field styles */
.nota-title-field {
  margin-bottom: 1.5rem;
}

.nota-title-input {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  color: hsl(var(--foreground));
  background: transparent;
  border: none;
  outline: none;
  padding: 0.5rem 0;
  min-height: 3rem;
  resize: none;
  font-family: inherit;
  width: 100%;
  margin-right: 0.5rem;
}

.nota-title-input:empty::before {
  content: attr(placeholder);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.nota-title-input:focus {
  outline: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .nota-title-input {
    font-size: 1.5rem;
    min-height: 2.5rem;
  }
}
</style>
