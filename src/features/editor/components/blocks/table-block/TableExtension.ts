import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TableBlock from '@/features/editor/components/blocks/table-block/TableBlock.vue'
import { v4 as uuidv4 } from 'uuid'

export interface TableColumn {
  id: string
  title: string
  type: 'text' | 'number' | 'select' | 'date'
  options?: string[]
}

export interface TableData {
  id: string
  name: string
  columns: TableColumn[]
  rows: Array<{
    id: string
    cells: Record<string, any>
  }>
}

export const TableExtension = Node.create({
  name: 'notaTable',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      tableData: {
        default: {
          id: '',
          name: 'Untitled',
          columns: [],
          rows: []
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="data-table"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'data-table' }, HTMLAttributes),
      ['div', { class: 'data-table-content' }],
    ]
  },

  addNodeView() {
    // @ts-ignore
    return VueNodeViewRenderer(TableBlock)
  },

  addCommands() {
    return {
      insertNotaTable:
        (notaId: string) =>
        ({ chain }) => {
          const tableId = uuidv4()
          const columnId = uuidv4()

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                tableData: {
                  id: tableId,
                  name: 'Untitled',
                  columns: [
                    {
                      id: columnId,
                      title: 'Title',
                      type: 'text',
                    },
                  ],
                  rows: [
                    {
                      id: uuidv4(),
                      cells: {
                        [columnId]: '',
                      },
                    },
                  ],
                }
              },
            })
            .run()
        },
    }
  },
})









