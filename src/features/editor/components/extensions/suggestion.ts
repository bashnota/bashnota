import { Editor, VueRenderer, type Range } from '@tiptap/vue-3'
import { useCitationPicker } from '@/features/editor/composables/useCitationPicker'
import { useSubNotaDialog } from '@/features/editor/composables/useSubNotaDialog'
import tippy, { type Instance, type Props } from 'tippy.js'
import CommandsList from '@/features/editor/components/blocks/CommandsList.vue'
import type { CitationEntry } from '@/features/nota/types/nota'
import 'tippy.js/dist/tippy.css'
import router from '@/router'
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
  FileText,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
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
   * Updates the props of the rendered Vue component
   */
  updateProps(props: Record<string, any>): void {
    if (this.renderer) {
      this.renderer.updateProps(props);
    }
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
      toast('An error occurred while executing the command', {
        description: 'Error'
      });
      return null;
    }
  };
}

/**
 * Safely inserts content with range validation
 */
function safeInsertContent(editor: Editor, range: Range, content: any, contentType: string = 'content') {
  try {
    // Validate range before proceeding
    const { from, to } = range;
    const docSize = editor.state.doc.content.size;
    
    if (from < 0 || to > docSize || from > to) {
      console.warn(`Invalid range for ${contentType} insertion:`, range, 'Document size:', docSize);
      return false;
    }
    
    return editor
      .chain()
      .focus()
      .setTextSelection(from)
      .deleteRange(range)
      .insertContent(content)
      .run();
  } catch (error) {
    console.error(`Error inserting ${contentType}:`, error);
    return false;
  }
}

/**
 * Creates basic text format commands
 */
function createBasicCommands(): CommandItem[] {
  return [
    {
      title: 'Text',
      category: 'Text & Formatting',
      icon: TextIcon,
      keywords: ['text', 'paragraph', 'p'],
      description: 'Regular paragraph text',
      command: createSimpleCommand('Paragraph'),
    },
    {
      title: 'Heading 1',
      category: 'Text & Formatting',
      icon: Heading1,
      keywords: ['h1', 'heading', 'title', 'large'],
      description: 'Large heading for document titles',
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      category: 'Text & Formatting',
      icon: Heading2,
      keywords: ['h2', 'heading', 'subtitle'],
      description: 'Medium heading for sections',
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      category: 'Text & Formatting',
      icon: Heading3,
      keywords: ['h3', 'heading', 'subsection'],
      description: 'Small heading for subsections',
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      category: 'Lists',
      icon: List,
      keywords: ['bullet', 'list', 'unordered', 'ul'],
      description: 'Unordered list with bullet points',
      command: createSimpleCommand('BulletList'),
    },
    {
      title: 'Ordered List',
      category: 'Lists',
      icon: ListOrdered,
      keywords: ['ordered', 'list', 'numbered', 'ol'],
      description: 'Numbered list for sequential items',
      command: createSimpleCommand('OrderedList'),
    },
    {
      title: 'Task List',
      category: 'Lists',
      icon: SquareCheck,
      keywords: ['task', 'list', 'todo', 'checkbox', 'checklist'],
      description: 'Interactive checklist for tasks',
      command: createSimpleCommand('TaskList'),
    },
    {
      title: 'Code Block',
      category: 'Code & Development',
      icon: FileCode,
      keywords: ['code', 'pre', 'codeblock', 'syntax'],
      description: 'Syntax-highlighted code block',
      command: createSimpleCommand('CodeBlock'),
    },
    {
      title: 'Blockquote',
      category: 'Text & Formatting',
      icon: Quote,
      keywords: ['quote', 'blockquote', 'citation'],
      description: 'Highlighted quote or excerpt',
      command: createSimpleCommand('Blockquote'),
    },
    {
      title: 'Horizontal Rule',
      category: 'Text & Formatting',
      icon: Minus,
      keywords: ['hr', 'rule', 'line', 'divider', 'separator'],
      description: 'Visual divider line',
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
    // Math & Academic Content
    {
      title: 'Math Block',
      category: 'Math & Academic',
      icon: FunctionSquare,
      keywords: ['math', 'equation', 'latex', 'formula', '$', '$$'],
      description: 'Embed mathematical equations using LaTeX syntax',
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setMath({ 
            latex: 'ⵟ(a,b) = \\frac{(a \\cdot b)^2}{||a - b||^2}, \\forall a,b \\in \\mathbb{R}^n, a \\neq b' 
          })
          .run();
      },
    },
    {
      title: 'Theorem',
      category: 'Math & Academic',
      icon: FunctionSquare,
      keywords: ['theorem', 'lemma', 'proposition', 'corollary', 'definition', 'proof', 'math'],
      description: 'Structured theorem with proof section',
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
      title: 'Citation',
      category: 'Academic & References',
      icon: BookIcon,
      keywords: ['cite', 'citation', 'reference', 'bib', 'bibtex'],
      description: 'Insert citation reference with interactive picker',
      command: ({ editor, range }: CommandArgs) => {
        // Get current nota ID from router
        const currentRoute = router.currentRoute.value
        const notaId = currentRoute.params.id as string
        
        // Use the citation picker composable
        const { openCitationPicker } = useCitationPicker()
        
        openCitationPicker(
          notaId,
          (citation: CitationEntry, index: number) => {
            // Insert the citation
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
          },
          () => {
            // Cleanup callback - nothing needed since dialog handles itself
          }
        )
      },
    },
    {
      title: 'Bibliography',
      category: 'Academic & References',
      icon: FileText,
      keywords: ['references', 'bibliography', 'citations', 'works cited'],
      description: 'Auto-generated bibliography from your citations',
      command: ({ editor, range }: CommandArgs) => {
        safeInsertContent(editor, range, {
          type: 'bibliography',
          attrs: {
            style: 'apa',
            title: 'References'
          }
        } as any, 'bibliography');
      },
    },

    // Media & Visual Content
    {
      title: 'Figure with Subfigures',
      category: 'Media & Visual',
      icon: ImagesIcon,
      keywords: ['subfig', 'figures', 'multiple', 'images', 'imgs'],
      description: 'Multiple images arranged as subfigures',
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).setSubfigure().run();
      },
    },
    {
      title: 'YouTube Video',
      category: 'Media & Visual',
      icon: VideoIcon,
      keywords: ['yt', 'video', 'youtube', 'embed'],
      description: 'Embed YouTube video with player controls',
      command: ({ editor, range }: CommandArgs) => {
        const url = prompt('Enter YouTube URL:');
        if (!url) return;

        editor.chain().focus().deleteRange(range).setYoutube(url).run();
      },
    },

    // Tables & Data
    {
      title: 'Table',
      category: 'Tables & Data',
      icon: Table2,
      keywords: ['table', 'grid', 'matrix'],
      description: 'Standard table with rows and columns',
      command: ({ editor, range }: CommandArgs) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run();
      },
    },
    {
      title: 'Database Table',
      category: 'Tables & Data',
      icon: DatabaseIcon,
      keywords: ['db', 'database', 'data', 'table'],
      description: 'Dynamic table connected to database',
      command: ({ editor, range }: CommandArgs) => {
        const notaId = router.currentRoute.value.params.id as string;
        editor.chain().focus().deleteRange(range).insertNotaTable(notaId).run();
      },
    },
    {
      title: 'Confusion Matrix',
      category: 'Data Science',
      icon: ChartScatter,
      keywords: ['confusion', 'matrix', 'classification', 'ml', 'machine learning', 'accuracy', 'precision', 'recall'],
      description: 'Interactive confusion matrix with CSV upload and performance metrics',
      command: ({ editor, range }: CommandArgs) => {
        safeInsertContent(editor, range, {
          type: 'confusionMatrix',
          attrs: {
            title: 'Confusion Matrix',
            matrixData: null,
            labels: null,
            source: 'upload',
            filePath: null,
            stats: null
          }
        } as any, 'confusion matrix');
      },
    },

    // Diagrams & Visualization
    {
      title: 'Mermaid Diagram',
      category: 'Diagrams & Visualization',
      icon: ChartPieIcon,
      keywords: ['diagram', 'chart', 'mermaid', 'flow'],
      description: 'Create flowcharts and diagrams with Mermaid syntax',
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .run();
      },
    },
    {
      title: 'Draw.io Diagram',
      category: 'Diagrams & Visualization',
      icon: PenTool,
      keywords: ['draw.io', 'draw', 'diagram', 'chart', 'graph'],
      description: 'Interactive diagram editor with Draw.io integration',
      command: ({ editor, range }: CommandArgs) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertDrawIo()
          .run();
      },
    },

    // Code & Development
    {
      title: 'Execution Pipeline',
      category: 'Code & Development',
      icon: ChartPieIcon,
      keywords: ['pipeline', 'execution', 'workflow', 'code', 'flow'],
      description: 'Visual execution pipeline connecting multiple code blocks',
      command: ({ editor, range }: CommandArgs) => {
        try {
          // Validate range before proceeding
          const { from, to } = range;
          const docSize = editor.state.doc.content.size;
          
          if (from < 0 || to > docSize || from > to) {
            console.warn('Invalid range for pipeline insertion:', range, 'Document size:', docSize);
            return;
          }
          
          // Use a safer approach by setting selection first
          editor
            .chain()
            .focus()
            .setTextSelection(from)
            .deleteRange(range)
            .insertPipeline()
            .run();
        } catch (error) {
          console.error('Error inserting pipeline:', error);
          // Fallback: try to insert at current cursor position
          try {
            editor
              .chain()
              .focus()
              .insertPipeline()
              .run();
          } catch (fallbackError) {
            console.error('Fallback pipeline insertion also failed:', fallbackError);
          }
        }
      },
    },

    // AI & Automation
    {
      title: 'AI Assistant',
      category: 'AI & Automation',
      icon: SparklesIcon,
      keywords: ['ai', 'assistant', 'generate', 'chat'],
      description: 'Open AI assistant for content generation and help',
      command: ({ editor, range }: CommandArgs) => {
        // Emit a custom event to toggle the AI sidebar
        editor.emit('toggle-ai-sidebar', () => {})
        editor.chain().focus().deleteRange(range).run()
      },
    },

    // Navigation & Organization
    {
      title: 'New Sub Nota',
      category: 'Navigation & Organization',
      icon: FilePlus,
      keywords: ['page', 'new', 'create', 'nota', 'subnota'],
      description: 'Create a new linked sub-document within current nota',
      command: safeExecuteCommand(({ editor, range }: CommandArgs) => {
        // Get the current nota ID from the router
        const currentRoute = router.currentRoute.value;
        let parentId: string | null = null;
        
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
            // Insert the sub-nota link using the proper command
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setSubNotaLink({
                targetNotaId: newNotaId,
                targetNotaTitle: title,
                displayText: title,
                linkStyle: 'inline'
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
            highlightElement(`span[data-target-nota-id="${newNotaId}"]`);
          }, 20);
        };
        
        // Use the subnota dialog composable
        const { openSubNotaDialog } = useSubNotaDialog()
        
        if (parentId) {
          openSubNotaDialog(
            parentId,
            handleSuccess,
            () => {
              // Cleanup callback - nothing needed since dialog handles itself
            }
          )
        };
      }),
    },
  ];
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

  // Citation suggestion
  citationSuggestion: {
    items: ({ query }: { query: string }) => {
      // Get the current nota ID from the route
      const notaId = router.currentRoute.value.params.id as string

      return [
        {
          title: 'Search Citations',
          searchQuery: query,
          notaId, // Pass notaId to be available in onExit
        },
      ]
    },
    
    render: () => {
      return {
        onStart: (props: any) => {
          const { openCitationPicker } = useCitationPicker()
          openCitationPicker(
            props.item.notaId,
            (citation: CitationEntry) => {
              props.command({ id: citation.id, label: citation.id })
            },
            () => {
              // Close callback - nothing needed
            }
          )
        },

        onUpdate(props: any) {
          // Update handled by reactive state in composable
        },

        onExit() {
          // Exit handled by dialog state
        },
      }
    },
    
    command: ({ editor, range, props }: CommandArgs) => {
      editor
        .chain()
        .focus()
        .run()
    },
  },

  // Sub-nota suggestion
  subNotaSuggestion: {
    items: ({ query }: { query: string }) => {
      // ... existing code ...
    },
  },
}







