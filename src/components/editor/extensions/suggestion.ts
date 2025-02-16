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
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Heading 1',
        category: 'Basic Blocks',
        icon: Heading1,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        category: 'Basic Blocks',
        icon: Heading2,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        },
      },
      {
        title: 'Heading 3',
        category: 'Basic Blocks',
        icon: Heading3,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
        },
      },
      {
        title: 'Bullet List',
        category: 'Basic Blocks',
        icon: List,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Numbered List',
        category: 'Basic Blocks',
        icon: ListOrdered,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: 'Math Block',
        category: 'Basic Blocks',
        icon: FunctionSquare,
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
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setNotaImage({ src: '' }).run()
        },
      },
      {
        title: 'Figure with Subfigures',
        category: 'Images',
        icon: ImagesIcon,
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).setNotaImageSubfigureContainer().run()
        },
      },

      // Add this new section before the Advanced category
      {
        title: 'YouTube Video',
        category: 'Media',
        icon: VideoIcon,
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
        command: ({ editor, range }: CommandArgs) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run()
        },
      },
      {
        title: 'New Page',
        category: 'Advanced',
        icon: FilePlus,
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
        command: ({ editor, range }: CommandArgs) => {
          const notaId = router.currentRoute.value.params.id as string
          editor.chain().focus().deleteRange(range).insertDataTable(notaId).run()
        },
      },
      {
        title: 'Mermaid Diagram',
        category: 'Advanced',
        icon: DatabaseIcon,
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
        description: 'Add a scatter plot visualization',
        icon: ChartScatter,
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
      : items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
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
