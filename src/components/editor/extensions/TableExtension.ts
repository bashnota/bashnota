import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TableBlock from '@/components/editor/blocks/table-block/TableBlock.vue'
import { v4 as uuidv4 } from 'uuid'

export interface TableData {
  id: string
  name: string
  columns: Array<{
    id: string
    title: string
    type: 'text' | 'number' | 'select' | 'date'
  }>
  rows: Array<{
    id: string
    cells: Record<string, any>
  }>
}

export const TableExtension = Node.create({
  name: 'dataTable',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,

  addAttributes() {
    return {
      tableId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-table-id'),
        renderHTML: (attributes) => ({
          'data-table-id': attributes.tableId,
        }),
      },
      notaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-nota-id'),
        renderHTML: (attributes) => ({
          'data-nota-id': attributes.notaId,
        }),
      },
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
      insertDataTable:
        (notaId: string) =>
        ({ chain }) => {
          const tableId = uuidv4()

          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                tableId,
                notaId,
              },
            })
            .run()
        },
    }
  },
})
