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
        keywords: ['math', 'equation', 'latex', 'formula'],
        command: ({ editor, range }: CommandArgs) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'mathBlock',
              attrs: {
                latex: '\\frac{1}{2}',
              },
            })
            .run()
        },
      },

      // Code Blocks
      {
        title: 'Python Code Block',
        category: 'Code Blocks',
        icon: FileCode,
        keywords: ['py', 'python', 'code', 'script'],
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
              content: [{ type: 'text', text: '# Your Python code here' }],
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
        keywords: ['subfig', 'figures', 'multiple', 'images'],
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
        title: 'New Page',
        category: 'Advanced',
        icon: FilePlus,
        keywords: ['page', 'new', 'create', 'nota'],
        command: ({ editor, range }: CommandArgs) => {
          const createNewPage = async () => {
            const store = useNotaStore()
            const currentRoute = router.currentRoute.value
            const parentId = currentRoute.params.id as string

            const title = prompt('Enter page title:')
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
              console.error('Failed to create page:', error)
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
    ]

    return !query
      ? items
      : items
          .filter((item) => {
            const searchQuery = query.toLowerCase()
            return (
              item.title.toLowerCase().includes(searchQuery) ||
              item.keywords.some((keyword) => keyword.toLowerCase().includes(searchQuery))
            )
          })
          .slice(0, 10)
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
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component?.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
