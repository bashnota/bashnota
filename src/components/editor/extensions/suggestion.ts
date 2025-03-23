import { Editor, VueRenderer, type Range } from '@tiptap/vue-3'
import tippy from 'tippy.js'
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
  ImageIcon,
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

type CommandArgs = {
  editor: Editor
  range: Range
  props: any
}

export default {
  items: ({ query }: { query: string }) => {
    const items = [
      // Basic Blocks
      {
        title: 'Text',
        category: 'Basic Blocks',
        icon: TextIcon,
        keywords: ['text', 'paragraph', 'p'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Heading 1',
        category: 'Basic Blocks',
        icon: Heading1,
        keywords: ['h1', 'title', 'heading1', 'heading 1'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        category: 'Basic Blocks',
        icon: Heading2,
        keywords: ['h2', 'heading2', 'heading 2'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        },
      },
      {
        title: 'Heading 3',
        category: 'Basic Blocks',
        icon: Heading3,
        keywords: ['h3', 'heading3', 'heading 3'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
        },
      },
      {
        title: 'Bullet List',
        category: 'Basic Blocks',
        icon: List,
        keywords: ['ul', 'list', 'bullet', 'unordered'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Numbered List',
        category: 'Basic Blocks',
        icon: ListOrdered,
        keywords: ['ol', 'ordered', 'numbered', 'list'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
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
            })
            .run()
        },
      },
      {
        title: 'Blockquote',
        category: 'Basic Blocks',
        icon: Quote,
        keywords: ['quote', 'blockquote', 'bq'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setBlockquote()
            .run()
        },
      },
      {
        title: 'Horizontal Rule',
        category: 'Basic Blocks',
        icon: Minus,
        keywords: ['hr', 'rule', 'line', 'divider'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setHorizontalRule()
            .run()
        },
      },
      {
        title: 'Task List',
        category: 'Basic Blocks',
        icon: SquareCheck,
        keywords: ['task', 'todo', 'list', 'checkbox'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleTaskList()
            .run()
        },
      },

      // Code Blocks
      {
        title: 'Code Block',
        category: 'Code Blocks',
        icon: FileCode,
        keywords: ['py', 'python', 'code', 'script', 'exe'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'executableCodeBlock',
              attrs: {
                language: 'python',
                executeable: true,
              },
              content: [{ type: 'text', text: 'print("Hello, Bashers!")' }],
            })
            .run()
        },
      },

      // Images
      {
        title: 'Figure with Subfigures',
        category: 'Images',
        icon: ImagesIcon,
        keywords: ['subfig', 'figures', 'multiple', 'images', 'imgs'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setSubfigure().run()
        },
      },

      // Media
      {
        title: 'YouTube Video',
        category: 'Media',
        icon: VideoIcon,
        keywords: ['yt', 'video', 'youtube', 'embed'],
        command: ({ editor, range }: CommandArgs) => {
          const url = prompt('Enter YouTube URL:')
          if (!url) return

          editor.chain().focus().deleteRange(range).setYoutube(url).run()
        },
      },

      // Advanced
      {
        title: 'Table',
        category: 'Advanced',
        icon: Table2,
        keywords: ['table', 'grid', 'matrix'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run()
        },
      },
      {
        title: 'New Sub Nota',
        category: 'Advanced',
        icon: FilePlus,
        keywords: ['page', 'new', 'create', 'nota', 'subnota'],
        command: ({ editor, range }: CommandArgs) => {
          // Get the current nota ID from the router
          const currentRoute = router.currentRoute.value
          // Make sure we have a valid parentId
          let parentId = null
          if (currentRoute.params.id && typeof currentRoute.params.id === 'string') {
            parentId = currentRoute.params.id
          }
          
          // Add debugging to verify parentId
          console.log(`Creating sub nota with parentId: ${parentId}`)
          
          // Create Vue renderer for the dialog
          let subNotaDialogRenderer: VueRenderer | null = null
          let popupInstance: any = null
          let isDestroying = false  // Add a guard flag to prevent recursive calls
          
          // Helper to safely destroy the popup
          const destroyPopup = () => {
            // Prevent recursive calls
            if (isDestroying) {
              return;
            }
            
            isDestroying = true;
            
            try {
              // First set references to local variables to avoid operating on nullified references
              const currentPopup = popupInstance;
              const currentRenderer = subNotaDialogRenderer;
              
              // Clear the references immediately to prevent circular references
              popupInstance = null;
              subNotaDialogRenderer = null;
              
              // Now destroy the instances using the local references
              if (currentPopup) {
                try {
                  // Try different approaches to destroy/hide the popup
                  if (typeof currentPopup.hide === 'function') {
                    currentPopup.hide();
                  }
                  
                  if (typeof currentPopup.destroy === 'function') {
                    currentPopup.destroy();
                  } else if (Array.isArray(currentPopup) && currentPopup[0] && typeof currentPopup[0].destroy === 'function') {
                    currentPopup[0].destroy();
                  } else if (currentPopup.popper && currentPopup.popper.parentNode) {
                    // Manual DOM cleanup as last resort
                    currentPopup.popper.parentNode.removeChild(currentPopup.popper);
                  }
                } catch (e) {
                  logger.warn('Error cleaning up popup:', e);
                }
              }
              
              // Destroy the renderer after the popup
              if (currentRenderer) {
                try {
                  currentRenderer.destroy();
                } catch (e) {
                  logger.warn('Error destroying renderer:', e);
                }
              }
            } finally {
              isDestroying = false;
            }
          }
          
          // Handle successful sub nota creation
          const handleSuccess = async (newNotaId: string, title: string) => {
            // Instead of directly calling destroyPopup(), hide the popup first
            // which will trigger onHide in a controlled way
            let didHide = false;
            
            if (popupInstance && typeof popupInstance.hide === 'function' && !isDestroying) {
              didHide = true;
              popupInstance.hide();
            }
            
            // If we couldn't hide properly, use the destroyPopup as fallback
            if (!didHide) {
              destroyPopup();
            }
            
            // Only proceed with the following actions after a slight delay
            // to ensure destruction process has completed
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
                    title: title,
                  },
                })
                .run()
              
              // Trigger save
              const transaction = editor.state.tr
              editor.view.dispatch(transaction)
              
              // Show success toast
              toast(`"${title}" created successfully!`)
              
              // Show additional information in the UI
              setTimeout(() => {
                const linkElement = document.querySelector(`a[href="/nota/${newNotaId}"]`)
                if (linkElement) {
                  linkElement.classList.add('newly-created')
                  setTimeout(() => {
                    linkElement.classList.remove('newly-created')
                  }, 2000)
                }
              }, 100)
            }, 10); // Small delay to ensure cleanup completes first
          }
          
          // Handle dialog cancellation
          const handleCancel = () => {
            // Instead of calling destroyPopup() directly, 
            // just hide the popup which will trigger onHide once
            if (popupInstance && typeof popupInstance.hide === 'function' && !isDestroying) {
              popupInstance.hide();
            } else {
              // Fallback if hide is not available
              destroyPopup();
            }
          }
          
          // Create the dialog component
          subNotaDialogRenderer = new VueRenderer(SubNotaDialog, {
            props: {
              parentId,
              onSuccess: handleSuccess,
              onCancel: handleCancel
            },
            editor
          })
          
          // @ts-ignore
          popupInstance = tippy('body', {
            getReferenceClientRect: () => {
              // Get position based on editor cursor
              if (range && typeof range.from === 'number') {
                const nodePos = range.from
                const domPos = editor.view.coordsAtPos(nodePos)
                if (domPos) {
                  return new DOMRect(
                    domPos.left,
                    domPos.bottom,
                    0,
                    0
                  )
                }
              }
              
              // Fallback: editor element position
              return editor.view.dom.getBoundingClientRect()
            },
            appendTo: () => document.body,
            content: subNotaDialogRenderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'command-palette',
            animation: 'scale',
            duration: 150,
            maxWidth: 'none',   // Prevent auto-sizing issues
            popperOptions: {    // More robust positioning
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
            onHide: function() {
              // Only call destroyPopup if it's not already being destroyed
              if (!isDestroying) {
                // Use setTimeout to break the call stack
                setTimeout(() => {
                  destroyPopup();
                }, 0);
              }
            }
          })
        },
      },
      {
        title: 'Database Table',
        category: 'Advanced',
        icon: DatabaseIcon,
        keywords: ['db', 'database', 'data', 'table'],
        command: ({ editor, range }: CommandArgs) => {
          const notaId = router.currentRoute.value.params.id as string
          editor.chain().focus().deleteRange(range).insertDataTable(notaId).run()
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
            .run()
        },
      },
      {
        title: 'Scatter Plot',
        category: 'Advanced',
        icon: ChartScatter,
        keywords: ['scatter', 'plot', 'chart', 'graph'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setScatterPlot({
              title: 'Scatter Plot',
              apiUrl: '',
            })
            .run()
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
            .run()
        },
      },
      {
        title: 'AI Generation',
        description: 'Insert an inline AI generation block',
        icon: SparklesIcon,
        command: ({ editor, range }: CommandArgs) => {
          if (editor.can().insertInlineAIGeneration?.()) {
            editor.chain().focus().deleteRange(range).insertInlineAIGeneration().run()
          } else {
            editor.chain().focus().deleteRange(range).insertContent({
              type: 'aiGeneration',
            }).run()
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
            })
            .run()
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
            })
            .run()
        },
      },
    ]

    if (!query) {
      return items
    }

    return items.filter(item => {
      const matchesTitle = item.title.toLowerCase().includes(query.toLowerCase())
      const matchesKeywords = item.keywords?.some(keyword => 
        keyword.toLowerCase().includes(query.toLowerCase())
      )
      return matchesTitle || matchesKeywords
    })
  },

  render: () => {
    let component: VueRenderer
    let popup: any

    return {
      onStart: (props: any) => {
        component = new VueRenderer(CommandsList, {
          props,
          editor: props.editor,
        })

        // @ts-ignore
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'command-palette',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        // Check if popup exists and has setProps method
        if (popup) {
          try {
            if (typeof popup.setProps === 'function') {
              popup.setProps({
                getReferenceClientRect: props.clientRect,
              })
            } else if (Array.isArray(popup) && popup[0] && typeof popup[0].setProps === 'function') {
              // Handle case where tippy returns an array
              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              })
            } else if (popup._tippy && typeof popup._tippy.setProps === 'function') {
              // Try accessing through _tippy property
              popup._tippy.setProps({
                getReferenceClientRect: props.clientRect,
              })
            } else {
              // If setProps is not available, recreate the popup
              if (typeof popup.destroy === 'function') {
                popup.destroy()
              } else if (popup.hideWithInteractivity) {
                popup.unmount && popup.unmount()
              }
              
              // @ts-ignore
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'command-palette',
              })
            }
          } catch (e) {
            logger.warn('Error updating tippy instance:', e)
          }
        }
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          // Check if popup exists and has hide method
          if (popup) {
            if (typeof popup.hide === 'function') {
              popup.hide()
            } else if (popup.popper) {
              // Alternative approach if hide is not available
              popup.popper.style.display = 'none'
            }
          }
          return true
        }

        return component.ref?.onKeyDown(props.event)
      },

      onExit() {
        if (popup) {
          // Try different methods to hide/destroy the popup
          try {
            // First try to hide it if the method exists
            if (typeof popup.hide === 'function') {
              popup.hide()
            }
            
            // Then try to destroy it using various possible methods
            if (typeof popup.destroy === 'function') {
              popup.destroy()
            } else if (popup.hideWithInteractivity && typeof popup.unmount === 'function') {
              popup.unmount()
            } else if (popup._tippy && typeof popup._tippy.destroy === 'function') {
              popup._tippy.destroy()
            } else if (popup.popper) {
              // Manual DOM removal as last resort
              if (popup.popper.parentNode) {
                popup.popper.parentNode.removeChild(popup.popper)
              }
            } else if (Array.isArray(popup) && popup[0] && typeof popup[0].destroy === 'function') {
              // Sometimes tippy returns an array of instances
              popup[0].destroy()
            }
          } catch (e) {
            logger.warn('Error cleaning up tippy instance:', e)
          }
        }
        
        if (component) {
          component.destroy()
        }
      },
    }
  },
}