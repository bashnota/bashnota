import { Editor, VueRenderer, type Range } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandsList from '@/components/editor/blocks/CommandsList.vue'
import 'tippy.js/dist/tippy.css'
import router from '@/router'
import { useNotaStore } from '@/stores/nota'
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
} from 'lucide-vue-next'

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
        keywords: ['h2', 'subtitle', 'heading2', 'heading 2'],
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
        title: 'Single Image',
        category: 'Images',
        icon: ImageIcon,
        keywords: ['img', 'image', 'picture', 'photo'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setImage({ src: '' }).run()
        },
      },
      {
        title: 'Figure with Subfigures',
        category: 'Images',
        icon: ImagesIcon,
        keywords: ['subfig', 'figures', 'multiple', 'images', 'imgs'],
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setSubfigures().run()
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
          const createNewPage = async () => {
            const store = useNotaStore()
            const currentRoute = router.currentRoute.value
            const parentId = currentRoute.params.id as string

            const title = prompt('Enter Nota title:')
            if (!title) return

            try {
              const newPage = await store.createItem(title, parentId)
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                  type: 'pageLink',
                  attrs: {
                    href: `/nota/${newPage.id}`,
                    title: title,
                  },
                })
                .run()

              router.push(`/nota/${newPage.id}`)
            } catch (error) {
              console.error('Failed to create nota:', error)
            }
          }

          createNewPage()
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
            .setMermaid(
              `graph TD
    A[Client] --> B[Load Balancer]
    B --> C[Server1]
    B --> D[Server2]`,
            )
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
    ]

    if (!query) {
      return items
    }

    return items.filter(item => {
      return item.title.toLowerCase().includes(query.toLowerCase())
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
            console.warn('Error updating tippy instance:', e)
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
            console.warn('Error cleaning up tippy instance:', e)
          }
        }
        
        if (component) {
          component.destroy()
        }
      },
    }
  },
}
