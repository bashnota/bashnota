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
    ]

    return !query
      ? items
      : items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
  },

  render: () => {
    let component: VueRenderer
    // eslint-disable-next-line
    let popup: any

    return {
      // eslint-disable-next-line
      onStart: (props: any) => {
        component = new VueRenderer(CommandsList, {
          props,
          editor: props.editor,
        })

        // eslint-disable-next-line
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

      // eslint-disable-next-line
      onUpdate(props: any) {
        component.updateProps(props)
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      // eslint-disable-next-line
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
