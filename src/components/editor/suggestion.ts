import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandsList from '@/components/editor/CommandsList.vue'
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
} from 'lucide-vue-next'

export default {
  items: ({ query }: { query: string }) => {
    const items = [
      // Basic Blocks
      {
        title: 'Text',
        category: 'Basic Blocks',
        icon: TextIcon,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Heading 1',
        category: 'Basic Blocks',
        icon: Heading1,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        category: 'Basic Blocks',
        icon: Heading2,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        },
      },
      {
        title: 'Heading 3',
        category: 'Basic Blocks',
        icon: Heading3,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
        },
      },
      {
        title: 'Bullet List',
        category: 'Basic Blocks',
        icon: List,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Numbered List',
        category: 'Basic Blocks',
        icon: ListOrdered,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },

      // Code Blocks
      {
        title: 'Python Code Block',
        category: 'Code Blocks',
        icon: FileCode,
        command: ({ editor, range }) => {
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

      // Advanced
      {
        title: 'Table',
        category: 'Advanced',
        icon: Table2,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run()
        },
      },
      {
        title: 'New Page',
        category: 'Advanced',
        icon: FilePlus,
        command: ({ editor, range }) => {
          const createPage = async () => {
            const store = useNotaStore()
            const currentRoute = router.currentRoute.value
            const parentId = currentRoute.params.id as string

            const title = prompt('Enter page title:')
            if (!title) return

            try {
              const newPage = await store.createPage(title, parentId)
              editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent({
                  type: 'pageLink',
                  attrs: {
                    href: `/page/${newPage.id}`,
                    title: title,
                  },
                })
                .run()

              router.push(`/page/${newPage.id}`)
            } catch (error) {
              console.error('Failed to create page:', error)
            }
          }

          createPage()
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
