import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandsList from '@/components/editor/CommandsList.vue'
import 'tippy.js/dist/tippy.css'
import router from '@/router'
import { useNotaStore } from '@/stores/nota'
import Link from '@tiptap/extension-link'

export default {
  items: ({ query }: { query: string }) => {
    const items = [
      {
        title: 'Text',
        icon: '¶',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Heading 1',
        icon: 'H1',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
        },
      },
      {
        title: 'Heading 2',
        icon: 'H2',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
        },
      },
      {
        title: 'Bullet List',
        icon: '•',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
      },
      {
        title: 'Numbered List',
        icon: '1.',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        },
      },
      {
        title: 'Python Code',
        icon: 'Py',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'python' }).run()
        },
      },
      {
        title: 'JavaScript Code',
        icon: 'JS',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'javascript' }).run()
        },
      },
      {
        title: 'TypeScript Code',
        icon: 'TS',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'typescript' }).run()
        },
      },
      {
        title: 'R Code',
        icon: 'R',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'r' }).run()
        },
      },
      {
        title: 'SQL Code',
        icon: 'SQL',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'sql' }).run()
        },
      },
      {
        title: 'Shell Script',
        icon: '$',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'bash' }).run()
        },
      },
      {
        title: 'Table',
        icon: '⊞',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3 }).run()
        },
      },
      {
        title: 'New Page',
        icon: '📄',
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
      {
        title: 'Python Code Block',
        icon: '🐍',
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
      {
        title: 'R Code Block',
        icon: 'R',
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'executableCodeBlock',
              attrs: {
                language: 'r',
                executeable: true,
              },
              content: [{ type: 'text', text: '# Your R code here' }],
            })
            .run()
        },
      },
    ]

    if (!query) return items

    return items
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
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

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
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
