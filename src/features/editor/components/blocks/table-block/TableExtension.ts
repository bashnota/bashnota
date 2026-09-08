/**
 * Nota-table node — ported onto the raw-ProseMirror primitives.
 *
 * `tableData` uses JSON in `data-table-data`, matching the export service's
 * existing contract and making raw ProseMirror HTML round-trips reversible. The
 * configured `class: 'data-table'` still comes from the registration site.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

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

function emptyTableData(): TableData {
  return {
    id: '',
    name: 'Untitled',
    columns: [],
    rows: [],
  }
}

function parseTableData(element: HTMLElement): TableData {
  const value = element.getAttribute('data-table-data') ?? element.getAttribute('tableData')
  if (!value) return emptyTableData()
  try {
    return JSON.parse(value) as TableData
  } catch {
    return emptyTableData()
  }
}

export const notaTableNodeDefinition: NodeDefinition = {
  name: 'notaTable',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,
  attrs: {
    tableData: {
      default: emptyTableData(),
      parseHTML: parseTableData,
    },
    columns: {
      default: [],
      parseHTML: (element) => {
        try {
          return JSON.parse(element.getAttribute('data-columns') || '[]')
        } catch {
          return []
        }
      },
    },
  },
  parseDOM: [{ tag: 'div[data-type="data-table"]' }],
  toDOM: (node) => [
    'div',
    {
      'data-type': 'data-table',
      'data-table-data': JSON.stringify(node.attrs.tableData),
      'data-columns': JSON.stringify(node.attrs.columns || []),
      class: 'data-table',
    },
    ['div', { class: 'data-table-content' }],
  ],
}

export const notaTableDefinition = defineNode(notaTableNodeDefinition)

export const TableExtension = notaTableDefinition
