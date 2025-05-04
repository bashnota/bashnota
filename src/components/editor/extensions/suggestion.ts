import { Editor, VueRenderer, type Range } from '@tiptap/vue-3'
import tippy, { type Instance, type Props } from 'tippy.js'
import CommandsList from '@/components/editor/blocks/CommandsList.vue'
import SubNotaDialog from '@/components/editor/blocks/SubNotaDialog.vue'
import 'tippy.js/dist/tippy.css'
import router from '@/router'
import { useNotaStore } from '@/stores/nota'
import { useCitationStore } from '@/stores/citationStore'
import { createSubNota } from '@/services/subNotaService'
import {
  TextIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  FileCode,
  Table2,
  FilePlus,
  Heading3,
  DatabaseIcon,
  FunctionSquare,
  ImagesIcon,
  ChartScatter,
  VideoIcon,
  ChartPieIcon,
  Quote,
  Minus,
  SquareCheck,
  PenTool,
  SparklesIcon,
  BookIcon,
  FileText
} from 'lucide-vue-next'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'

/**
 * Type definitions for improved type safety
 */
type CommandArgs = {
  editor: Editor
  range: Range
  props: any
}

// Command item with metadata
interface CommandItem {
  title: string
  category: string
  icon: any
  keywords: string[]
  description?: string
  command: (args: CommandArgs) => void
}

// Simplified tippy instance type that avoids TypeScript errors
type TippyInstance = any

/**
 * Helper class to manage tippy popups with proper cleanup
 */
class PopupManager {
  private renderer: VueRenderer | null = null;
  private instance: TippyInstance = null;
  private isDestroying = false;
  private cleanupCallbacks: (() => void)[] = [];

  /**
   * Creates a tippy popup with proper lifecycle management
   */
  createPopup(
    component: any, 
    props: Record<string, any>, 
    editor: Editor,
    getBoundingRect: () => DOMRect,
    options: Partial<Props> = {}
  ): TippyInstance {
    // Create the renderer
    this.renderer = new VueRenderer(component, {
      props,
      editor
    });

    // Set default tippy options
    const tippyOptions = {
      getReferenceClientRect: getBoundingRect,
      appendTo: () => document.body,
      content: this.renderer.element,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
      theme: 'command-palette',
      animation: 'scale',
      duration: 150,
      maxWidth: 'none',
      popperOptions: {
        strategy: 'fixed',
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          }
        ],
      },
      onHide: () => {
        // Only call cleanup if not already destroying
        if (!this.isDestroying) {
          // Use setTimeout to break the call stack
          setTimeout(() => this.cleanup(), 0);
        }
      },
      ...options
    };

    // Create tippy instance
    // @ts-ignore - Tippy typing issues
    this.instance = tippy('body', tippyOptions);
    
    return this.instance;
  }

  /**
   * Adds a callback to run during cleanup
   */
  onCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Hides the popup, which will trigger the onHide callback
   */
  hide(): void {
    if (this.isDestroying) return;
    
    try {
      if (this.instance && typeof this.instance.hide === 'function') {
        this.instance.hide();
      } else if (Array.isArray(this.instance) && this.instance[0] && typeof this.instance[0].hide === 'function') {
        this.instance[0].hide();
      } else {
        // Fallback to forced cleanup
        this.cleanup();
      }
    } catch (e) {
      logger.warn('Error hiding popup:', e);
      // Force cleanup on error
      this.cleanup();
    }
  }

  /**
   * Cleans up all resources
   */
  cleanup(): void {
    if (this.isDestroying) return;
    
    this.isDestroying = true;
    
    try {
      // Run cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          callback();
        } catch (e) {
          logger.warn('Error in cleanup callback:', e);
        }
      }
      
      // Store references locally to avoid null issues
      const currentInstance = this.instance;
      const currentRenderer = this.renderer;
      
      // Clear references immediately
      this.instance = null;
      this.renderer = null;
      this.cleanupCallbacks = [];
      
      // Cleanup tippy instance
      if (currentInstance) {
        try {
          if (typeof currentInstance.destroy === 'function') {
            currentInstance.destroy();
          } else if (Array.isArray(currentInstance) && currentInstance[0] && typeof currentInstance[0].destroy === 'function') {
            currentInstance[0].destroy();
          } else if ('popper' in currentInstance && currentInstance.popper && currentInstance.popper.parentNode) {
            currentInstance.popper.parentNode.removeChild(currentInstance.popper);
          }
        } catch (e) {
          logger.warn('Error destroying tippy instance:', e);
        }
      }
      
      // Cleanup renderer
      if (currentRenderer) {
        try {
          currentRenderer.destroy();
        } catch (e) {
          logger.warn('Error destroying renderer:', e);
        }
      }
    } finally {
      this.isDestroying = false;
    }
  }
}

/**
 * Helper function to get cursor position for popups
 */
function getCursorCoords(editor: Editor, range: Range): () => DOMRect {
  return () => {
    // Try to get position from editor range
    if (range && typeof range.from === 'number') {
      const nodePos = range.from;
      const domPos = editor.view.coordsAtPos(nodePos);
      if (domPos) {
        return new DOMRect(
          domPos.left,
          domPos.bottom,
          0,
          0
        );
      }
    }
    
    // Fallback to editor element position
    return editor.view.dom.getBoundingClientRect();
  };
}

/**
 * Helper to highlight a newly created element
 */
function highlightElement(selector: string, duration = 2000): void {
  setTimeout(() => {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('newly-created');
      setTimeout(() => element.classList.remove('newly-created'), duration);
    }
  }, 100);
}

/**
 * Helper function to create a command that sets an editor attribute
 */
function createSimpleCommand(attribute: string) {
  return ({ editor, range }: CommandArgs) => {
    // Using dynamic method access in a type-safe way
    const chain = editor.chain().focus().deleteRange(range);
    const methodName = `set${attribute}` as keyof typeof chain;
    if (typeof chain[methodName] === 'function') {
      (chain[methodName] as Function)().run();
    }
  };
}

/**
 * Helper function to safely execute editor commands with proper error handling
 */
function safeExecuteCommand(callback: Function) {
  return (...args: any[]) => {
    try {
      return callback(...args);
    } catch (error) {
      logger.error('Error executing editor command:', error);
      toast('An error occurred while executing the command', 'Error', 'destructive');
      return null;
    }
  };
}

/**
 * Creates basic text format commands
 */
function createBasicCommands(): CommandItem[] {
  return [
    {
      title: 'Text',
      category: 'Basic Blocks',
      icon: TextIcon,
      keywords: ['text', 'paragraph', 'p'],
      command: createSimpleCommand('Paragraph'),
    },
    {
      title: 'Heading 1',
      category: 'Basic Blocks',
      icon: Heading1,
      keywords: ['h1', 'heading', 'title', 'large'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      category: 'Basic Blocks',
      icon: Heading2,
      keywords: ['h2', 'heading', 'subtitle'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      category: 'Basic Blocks',
      icon: Heading3,
      keywords: ['h3', 'heading', 'subsection'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      category: 'Basic Blocks',
      icon: List,
      keywords: ['bullet', 'list', 'unordered', 'ul'],
      command: createSimpleCommand('BulletList'),
    },
    {
      title: 'Ordered List',
      category: 'Basic Blocks',
      icon: ListOrdered,
      keywords: ['ordered', 'list', 'numbered', 'ol'],
      command: createSimpleCommand('OrderedList'),
    },
    {
      title: 'Task List',
      category: 'Basic Blocks',
      icon: SquareCheck,
      keywords: ['task', 'list', 'todo', 'checkbox', 'checklist'],
      command: createSimpleCommand('TaskList'),
    },
    {
      title: 'Code Block',
      category: 'Basic Blocks',
      icon: FileCode,
      keywords: ['code', 'pre', 'codeblock', 'syntax'],
      command: createSimpleCommand('CodeBlock'),
    },
    {
      title: 'Blockquote',
      category: 'Basic Blocks',
      icon: Quote,
      keywords: ['quote', 'blockquote', 'citation'],
      command: createSimpleCommand('Blockquote'),
    },
    {
      title: 'Horizontal Rule',
      category: 'Basic Blocks',
      icon: Minus,
      keywords: ['hr', 'rule', 'line', 'divider', 'separator'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];
}

/**
 * Creates advanced content commands (images, media, etc.)
 */
function createAdvancedCommands(): CommandItem[] {
  return [
    {
      title: 'Figure with Subfigures',
      category: 'Images',
      icon: ImagesIcon,
      keywords: ['subfig', 'figures', 'multiple', 'images', 'imgs'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setSubfigure().run();
      },
    },
    {
      title: 'Math Block',
      category: 'Basic Blocks',
      icon: FunctionSquare,
      keywords: ['math', 'equation', 'latex', 'formula', '$', '$$'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'mathBlock',
            attrs: {
              latex: 'ⵟ(a,b) = \\frac{(a \\cdot b)^2}{||a - b||^2}, \\forall a,b \\in \\mathbb{R}^n, a \\neq b',
            },
          } as any)
          .run();
      },
    },
    {
      title: 'Theorem',
      category: 'Math',
      icon: FunctionSquare,
      keywords: ['theorem', 'lemma', 'proposition', 'corollary', 'definition', 'proof', 'math'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setTheorem({
            title: '',
            content: 'Let $f: \\mathbb{R} \\to \\mathbb{R}$ be a function. Then...',
            proof: 'We can prove this by...',
            type: 'theorem',
          })
          .run();
      },
    },
    {
      title: 'YouTube Video',
      category: 'Media',
      icon: VideoIcon,
      keywords: ['yt', 'video', 'youtube', 'embed'],
      command: ({ editor, range }: CommandArgs) => {
        const url = prompt('Enter YouTube URL:');
        if (!url) return;

        editor.chain().focus().deleteRange(range).setYoutube(url).run();
      },
    },
    {
      title: 'Table',
      category: 'Advanced',
      icon: Table2,
      keywords: ['table', 'grid', 'matrix'],
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run();
      },
    },
    {
      title: 'Database Table',
      category: 'Advanced',
      icon: DatabaseIcon,
      keywords: ['db', 'database', 'data', 'table'],
      command: ({ editor, range }: CommandArgs) => {
        const notaId = router.currentRoute.value.params.id as string;
        editor.chain().focus().deleteRange(range).insertNotaTable(notaId).run();
      },
    },
    {
      title: 'Mermaid Diagram',
      category: 'Advanced',
      icon: ChartPieIcon,
      keywords: ['diagram', 'chart', 'mermaid', 'flow'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setMermaid({
            content: `graph TD
  A[Client] --> B[Load Balancer]
  B --> C[Server1]
  B --> D[Server2]`
          })
          .run();
      },
    },
    {
      title: 'Draw.io Diagram',
      category: 'Advanced',
      icon: PenTool,
      keywords: ['draw.io', 'draw', 'diagram', 'chart', 'graph'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertDrawIo()
          .run();
      },
    },
    {
      title: 'AI Generation',
      description: 'Insert an inline AI generation block',
      category: 'Advanced',
      icon: SparklesIcon,
      keywords: ['ai', 'generate', 'gpt', 'assistant', 'complete'],
      command: ({ editor, range }: CommandArgs) => {
        // Delete the range first
        editor.chain().focus().deleteRange(range).run();
        
        if (editor.can().insertInlineAIGeneration?.()) {
          // Use the specialized extension if available
          editor.commands.insertInlineAIGeneration();
        } else {
          // Fallback: Use transaction to insert text directly
          const transaction = editor.state.tr;
          transaction.insertText('🤖 AI Generation');
          editor.view.dispatch(transaction);
        }
      },
    },
    {
      title: 'Citation',
      category: 'Advanced',
      icon: BookIcon,
      keywords: ['cite', 'citation', 'reference', 'bib', 'bibtex'],
      command: ({ editor, range }: CommandArgs) => {
        // Get current nota ID from router
        const currentRoute = router.currentRoute.value
        const notaId = currentRoute.params.id as string
        
        // Get citations from the store
        const citationStore = useCitationStore()
        const citations = citationStore.getCitationsByNotaId(notaId)
        
        if (citations.length === 0) {
          toast('No citations available. Add citations in the References panel first.')
          return
        }
        
        // Create citation selector UI
        const createCitationPicker = () => {
          // Check if dark mode is active
          const isDarkMode = document.documentElement.classList.contains('dark')
          const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-white'
          const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-900'
          const mutedTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500'
          const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200'
          const hoverBgColor = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
          const activeBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          const inputBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white'
          
          // For keyboard navigation
          let selectedIndex = 0
          let filteredCitations = [...citations]
          
          // Create container
          const container = document.createElement('div')
          container.className = `citation-picker w-80 max-w-[90vw] rounded-md border ${borderColor} ${bgColor} shadow-lg max-h-[60vh] overflow-hidden flex flex-col`
          
          // Header with search
          const header = document.createElement('div')
          header.className = `p-2 border-b ${borderColor} sticky top-0 ${bgColor} z-10`
          
          // Title
          const title = document.createElement('div')
          title.className = 'flex items-center mb-2'
          title.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 ${mutedTextColor}">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            <span class="text-sm font-medium ${textColor}">Select a citation</span>
          `
          header.appendChild(title)
          
          // Search box
          const searchWrapper = document.createElement('div')
          searchWrapper.className = 'relative'
          
          const searchIcon = document.createElement('div')
          searchIcon.className = `absolute left-2 top-1/2 transform -translate-y-1/2 ${mutedTextColor}`
          searchIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          `
          
          const searchInput = document.createElement('input')
          searchInput.type = 'text'
          searchInput.placeholder = 'Search citations...'
          searchInput.className = `w-full py-1.5 pl-8 pr-2 text-sm rounded-md outline-none border ${borderColor} ${inputBgColor} ${textColor} focus:ring-1 focus:ring-blue-500`
          
          searchWrapper.appendChild(searchIcon)
          searchWrapper.appendChild(searchInput)
          header.appendChild(searchWrapper)
          container.appendChild(header)
          
          // Citation list container
          const listWrapper = document.createElement('div')
          listWrapper.className = 'overflow-y-auto flex-grow scrollbar-thin'
          
          // List container
          const list = document.createElement('div')
          list.className = 'citation-list p-1'
          listWrapper.appendChild(list)
          container.appendChild(listWrapper)
          
          // Function to insert the selected citation
          const insertCitation = (citation: any, index: number) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: 'citation',
                attrs: {
                  citationKey: citation.key,
                  citationNumber: index + 1
                }
              })
              .run()
            
            // Hide and destroy the popup
            popup.hide()
          }
          
          // Function to render the citation list
          const renderCitationList = () => {
            list.innerHTML = ''
            
            if (filteredCitations.length === 0) {
              const emptyState = document.createElement('div')
              emptyState.className = 'flex flex-col items-center justify-center py-6 px-4'
              emptyState.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${mutedTextColor} mb-2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <p class="text-sm font-medium ${mutedTextColor}">No citations found</p>
                <p class="text-xs ${mutedTextColor} opacity-70">Try a different search term</p>
              `
              list.appendChild(emptyState)
              return
            }
            
            filteredCitations.forEach((citation, index) => {
              const isSelected = index === selectedIndex
              
              // Format authors for display
              const authors = citation.authors && citation.authors.length > 0
                ? citation.authors.length > 1
                  ? `${citation.authors[0]} et al.`
                  : citation.authors[0]
                : 'Unknown author'
              
              // Get publication details
              const title = citation.title || 'Untitled'
              const year = citation.year ? `(${citation.year})` : ''
              
              // Format journal/publisher info
              let sourceInfo = ''
              if (citation.journal) {
                sourceInfo = citation.journal
                if (citation.volume) {
                  sourceInfo += ` ${citation.volume}`
                  if (citation.number) sourceInfo += `(${citation.number})`
                }
              } else if (citation.publisher) {
                sourceInfo = citation.publisher
              }
              
              // Create list item
              const item = document.createElement('div')
              item.className = `citation-item p-2 rounded cursor-pointer transition-colors ${isSelected ? activeBgColor : hoverBgColor} ${textColor}`
              item.setAttribute('data-index', index.toString())
              item.setAttribute('tabindex', '0') // Make focusable
              
              // Build the item content
              const citationNumber = citations.findIndex(c => c.key === citation.key) + 1
              item.innerHTML = `
                <div class="flex items-center justify-between">
                  <div class="font-medium text-sm truncate flex-1">${title}</div>
                  <div class="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 bg-opacity-10 ${mutedTextColor}">[${citationNumber}]</div>
                </div>
                <div class="flex flex-col mt-1">
                  <div class="text-xs truncate ${mutedTextColor}">${authors} ${year}</div>
                  ${sourceInfo ? `<div class="text-xs italic truncate ${mutedTextColor}">${sourceInfo}</div>` : ''}
                </div>
              `
              
              // Handle click
              item.addEventListener('click', () => {
                insertCitation(citation, citationNumber - 1)
              })
              
              // Handle hover (update selection)
              item.addEventListener('mouseenter', () => {
                selectedIndex = index
                highlightSelected()
              })
              
              list.appendChild(item)
            })
            
            highlightSelected()
          }
          
          // Highlight the selected item
          const highlightSelected = () => {
            const items = list.querySelectorAll('.citation-item')
            items.forEach((item, idx) => {
              if (idx === selectedIndex) {
                item.classList.add(activeBgColor)
                item.classList.remove(hoverBgColor)
                // Scroll into view if needed
                if (item.scrollIntoView) {
                  item.scrollIntoView({ block: 'nearest' })
                }
        } else {
                item.classList.remove(activeBgColor)
                item.classList.add(hoverBgColor)
              }
            })
          }
          
          // Search functionality
          searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase()
            filteredCitations = citations.filter(
              citation => 
                (citation.title || '').toLowerCase().includes(query) || 
                citation.key.toLowerCase().includes(query) || 
                (citation.authors || []).some(author => author.toLowerCase().includes(query)) ||
                (citation.journal || '').toLowerCase().includes(query) ||
                (citation.publisher || '').toLowerCase().includes(query)
            )
            selectedIndex = 0
            renderCitationList()
          })
          
          // Keyboard navigation
          container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (filteredCitations.length > 0) {
                selectedIndex = (selectedIndex + 1) % filteredCitations.length
                highlightSelected()
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              if (filteredCitations.length > 0) {
                selectedIndex = (selectedIndex - 1 + filteredCitations.length) % filteredCitations.length
                highlightSelected()
              }
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (filteredCitations.length > 0) {
                const citation = filteredCitations[selectedIndex]
                const citationIndex = citations.findIndex(c => c.key === citation.key)
                insertCitation(citation, citationIndex)
              }
            } else if (e.key === 'Escape') {
              e.preventDefault()
              popup.hide()
            }
          })
          
          // Initial render
          renderCitationList()
          
          // Set focus on search input
          setTimeout(() => searchInput.focus(), 10)
          
          return container
        }
        
        // Create the citation picker UI
        const citationPickerEl = createCitationPicker()
        
        // Helper function to safely handle tippy instances
        const createSafeTippyHandler = (tippyInstance: any) => {
          return {
            hide: () => {
              try {
                // Try different ways to access the hide method
                if (typeof tippyInstance.hide === 'function') {
                  tippyInstance.hide()
                } else if (Array.isArray(tippyInstance) && tippyInstance[0] && typeof tippyInstance[0].hide === 'function') {
                  tippyInstance[0].hide()
                } else if (tippyInstance._tippy && typeof tippyInstance._tippy.hide === 'function') {
                  tippyInstance._tippy.hide()
                } else if (tippyInstance[0] && tippyInstance[0]._tippy && typeof tippyInstance[0]._tippy.hide === 'function') {
                  tippyInstance[0]._tippy.hide()
                } else if (tippyInstance.popper) {
                  // Last resort: hide by CSS
                  tippyInstance.popper.style.display = 'none'
                  
                  // Clean up element
                  setTimeout(() => {
                    citationPickerEl.remove()
                  }, 100)
                }
              } catch (e) {
                logger.warn('Error hiding tippy instance:', e)
                // Ensure element is removed even if tippy methods fail
                citationPickerEl.remove()
              }
            }
          }
        }
        
        // Position it at the cursor position
        const tippyInstance = tippy('body', {
          getReferenceClientRect: () => {
            // Try to get position from editor range
            if (range && range.from !== undefined) {
              const pos = range.from
              const domPos = editor.view.coordsAtPos(pos)
              if (domPos) {
                return new DOMRect(
                  domPos.left,
                  domPos.bottom,
                  0,
                  0
                )
              }
            }
            
            // Fallback: get selection position
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              return selection.getRangeAt(0).getBoundingClientRect()
            }
            
            // Last resort: editor element position
            return editor.view.dom.getBoundingClientRect()
          },
          appendTo: () => document.body,
          content: citationPickerEl,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'command-palette',
          animation: 'scale-subtle',
          duration: 100,
          onHide() {
            citationPickerEl.remove()
          }
        })
        
        // Create a safe wrapper for the tippy instance
        const popup = createSafeTippyHandler(tippyInstance)
        
        // Update insertCitation to use the safe wrapper
        const insertCitation = (citation: any, index: number) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'citation',
              attrs: {
                citationKey: citation.key,
                citationNumber: index + 1
              }
            })
            .run()
          
          // Hide and destroy the popup
          popup.hide()
        }
        
        // Add document click listener to close on outside click
        const handleDocClick = (e: MouseEvent) => {
          if (!citationPickerEl.contains(e.target as Node)) {
            popup.hide()
            document.removeEventListener('click', handleDocClick)
          }
        }
        
        // Add with slight delay to avoid closing immediately
        setTimeout(() => document.addEventListener('click', handleDocClick), 100)
      },
    },
    {
      title: 'Bibliography',
      category: 'References',
      icon: FileText,
      keywords: ['references', 'bibliography', 'citations', 'works cited'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'bibliography',
            attrs: {
              style: 'apa',
              title: 'References'
            }
          } as any)
          .run();
      },
    },
    {
      title: 'Vibe',
      category: 'Advanced',
      icon: SparklesIcon,
      keywords: ['vibe', 'agent', 'ai', 'assistant', 'help', 'task'],
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'vibe',
            attrs: {
              query: '',
              isActive: false
            }
          } as any)
          .run();
      },
    },
    // Sub Nota command defined separately for clarity
  ];
}

/**
 * Creates the sub nota command with proper popup management
 */
function createSubNotaCommand(): CommandItem {
  return {
    title: 'New Sub Nota',
    category: 'Advanced',
    icon: FilePlus,
    keywords: ['page', 'new', 'create', 'nota', 'subnota'],
    command: safeExecuteCommand(({ editor, range }: CommandArgs) => {
      // Get the current nota ID from the router
      const currentRoute = router.currentRoute.value;
      let parentId = null;
      
      if (currentRoute.params.id && typeof currentRoute.params.id === 'string') {
        parentId = currentRoute.params.id;
      }
      
      // Create popup manager
      const popupManager = new PopupManager();
      
      // Handle sub nota creation success
      const handleSuccess = (newNotaId: string, title: string) => {
        // Hide popup first (will trigger cleanup)
        popupManager.hide();
        
        // Wait a tick to ensure cleanup is complete before modifying editor
        setTimeout(() => {
          // Insert the page link
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'pageLink',
              attrs: {
                href: `/nota/${newNotaId}`,
                title,
              },
            })
            .run();
          
          // Trigger content save
          const transaction = editor.state.tr;
          editor.view.dispatch(transaction);
          
          // Show success message
          const parentContext = document.querySelector(`#nota-${parentId}`) 
            ? ` under "${document.querySelector(`#nota-${parentId} .nota-title`)?.textContent?.trim() || ''}"` 
            : '';
          
          toast(`"${title}" created successfully${parentContext}`);
          
          // Highlight the newly created link
          highlightElement(`a[href="/nota/${newNotaId}"]`);
        }, 20);
      };
      
      // Create the popup with the dialog
      popupManager.createPopup(
        SubNotaDialog, 
        {
          parentId,
          onSuccess: handleSuccess,
          onCancel: () => popupManager.hide()
        }, 
        editor,
        getCursorCoords(editor, range)
      );
    }),
  };
}

/**
 * Combines all commands and filters by query
 */
export default {
  items: ({ query }: { query: string }) => {
    // Combine all commands
    const commands: CommandItem[] = [
      ...createBasicCommands(),
      ...createAdvancedCommands(),
      createSubNotaCommand(),
    ];
    
    // Return all items if no query
    if (!query) {
      return commands;
    }
    
    // Filter by query
    const normalizedQuery = query.toLowerCase().trim();
    
    return commands.filter(item => {
      // Check title
      if (item.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check keywords
      return item.keywords.some(keyword => 
        keyword.toLowerCase().includes(normalizedQuery)
      );
    });
  },

  render: () => {
    let component: VueRenderer | null = null;
    let popup: any = null;

    return {
      onStart: (props: { editor: Editor; clientRect: () => DOMRect }) => {
        component = new VueRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        // Use the correct typing for tippy
        // @ts-ignore - Tippy typing issues with body selector
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'command-palette',
        });
      },

      onUpdate: (props: { editor: Editor; clientRect: () => DOMRect }) => {
        component?.updateProps(props);

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.[0].hide();
          return true;
        }

        // Make sure we properly handle the Enter key by passing the event to the component
        if (component?.ref && typeof component.ref.onKeyDown === 'function') {
          return component.ref.onKeyDown(props.event);
        }
        
        return false;
      },

      onExit: () => {
        popup?.[0].destroy();
        component?.destroy();
      },
    };
  },
}