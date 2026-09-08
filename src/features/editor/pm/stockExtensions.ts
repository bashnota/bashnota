import {
  baseKeymap,
  chainCommands,
  exitCode,
  lift,
  newlineInCode,
  selectParentNode,
  setBlockType,
  toggleMark,
  wrapIn,
} from 'prosemirror-commands'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { history, redo, undo } from 'prosemirror-history'
import {
  InputRule,
  inputRules,
  smartQuotes,
  textblockTypeInputRule,
  wrappingInputRule,
} from 'prosemirror-inputrules'
import { keymap } from 'prosemirror-keymap'
import type { Attrs, MarkSpec, Node as PMNode, NodeSpec, Schema } from 'prosemirror-model'
import { marks as basicMarks, nodes as basicNodes } from 'prosemirror-schema-basic'
import { liftListItem, sinkListItem, splitListItem, wrapInList } from 'prosemirror-schema-list'
import {
  CellSelection,
  TableView,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  fixTables,
  goToNextCell,
  mergeCells,
  setCellAttr,
  splitCell,
  tableEditing,
  tableNodes,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from 'prosemirror-tables'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { Command, EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { NodeViewConstructor } from 'prosemirror-view'
import type { CommandFactory, EditorConfiguration } from './types'
import type { Editor } from './editor'

const heading: NodeSpec = {
  content: 'inline*',
  group: 'block',
  defining: true,
  attrs: { level: { default: 1 } },
  parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
  toDOM: (node) => [`h${node.attrs.level}`, 0],
}

const strike: MarkSpec = {
  parseDOM: [
    { tag: 's' },
    { tag: 'del' },
    { tag: 'strike' },
    { style: 'text-decoration', consuming: false, getAttrs: (value) => String(value).includes('line-through') ? null : false },
  ],
  toDOM: () => ['s', 0],
}

const safeProtocols = new Set([
  'http', 'https', 'ftp', 'ftps', 'mailto', 'tel', 'callto', 'sms', 'cid', 'xmpp',
])

export function isSafeLinkUri(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length === 0) return false
  const compact = uri.replace(/[\u0000-\u0020\u00a0\u1680\u180e\u2000-\u2029\u205f\u3000]/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase()
  return scheme ? safeProtocols.has(scheme) : !compact.startsWith('//')
}

function normalizeLinkHref(value: string): string {
  return /^www\./i.test(value) ? `http://${value}` : value
}

function isLinkablePaste(value: string): boolean {
  const href = normalizeLinkHref(value)
  return isSafeLinkUri(href) && /^(?:(?:https?|ftp|ftps):\/\/|(?:mailto|tel|callto|sms|cid|xmpp):|www\.)\S+$/i.test(value)
}

function linkCandidates(text: string): Array<{ from: number; to: number; href: string }> {
  const candidates: Array<{ from: number; to: number; href: string }> = []
  const pattern = /(?:https?:\/\/|www\.)[^\s<>]+(?=\s)/gi
  for (const match of text.matchAll(pattern)) {
    const value = match[0].replace(/[.,!?;:]+$/, '').replace(/\)$/, '')
    const href = normalizeLinkHref(value)
    if (match.index !== undefined && isSafeLinkUri(href)) {
      candidates.push({ from: match.index, to: match.index + value.length, href })
    }
  }
  return candidates
}

const link: MarkSpec = {
  inclusive: true,
  attrs: {
    href: { default: null },
    target: { default: '_blank' },
    rel: { default: 'noopener noreferrer nofollow' },
    class: { default: 'nota-link' },
  },
  parseDOM: [{
    tag: 'a[href]',
    getAttrs: (dom) => {
      const element = dom as HTMLElement
      const href = element.getAttribute('href')
      if (!isSafeLinkUri(href)) return false
      return {
        href,
        target: element.getAttribute('target') ?? '_blank',
        rel: element.getAttribute('rel') ?? 'noopener noreferrer nofollow',
        class: element.getAttribute('class') ?? 'nota-link',
      }
    },
  }],
  toDOM: (mark) => ['a', {
    ...mark.attrs,
    href: isSafeLinkUri(mark.attrs.href) ? mark.attrs.href : '',
  }, 0],
}

const bulletList: NodeSpec = {
  group: 'block list',
  content: 'listItem+',
  parseDOM: [{ tag: 'ul:not([data-type="taskList"])' }],
  toDOM: () => ['ul', 0],
}

const orderedList: NodeSpec = {
  group: 'block list',
  content: 'listItem+',
  attrs: { start: { default: 1 } },
  parseDOM: [{
    tag: 'ol',
    getAttrs: (dom) => ({ start: (dom as HTMLElement).hasAttribute('start') ? Number((dom as HTMLElement).getAttribute('start')) : 1 }),
  }],
  toDOM: (node) => ['ol', node.attrs.start === 1 ? {} : { start: node.attrs.start }, 0],
}

const listItem: NodeSpec = {
  defining: true,
  content: 'paragraph block*',
  parseDOM: [{ tag: 'li:not([data-type="taskItem"])' }],
  toDOM: () => ['li', 0],
}

const taskList: NodeSpec = {
  group: 'block list',
  content: 'taskItem+',
  parseDOM: [{ tag: 'ul[data-type="taskList"]' }],
  toDOM: () => ['ul', { 'data-type': 'taskList' }, 0],
}

const taskItem: NodeSpec = {
  content: 'paragraph block*',
  defining: true,
  attrs: { checked: { default: false } },
  parseDOM: [{
    tag: 'li[data-type="taskItem"]',
    getAttrs: (dom) => ({ checked: ['', 'true'].includes((dom as HTMLElement).getAttribute('data-checked') ?? '') }),
  }],
  toDOM: (node) => [
    'li',
    { 'data-type': 'taskItem', 'data-checked': String(node.attrs.checked) },
    ['label', { contenteditable: 'false' }, ['input', { type: 'checkbox', checked: node.attrs.checked ? 'checked' : null }], ['span']],
    ['div', 0],
  ],
}

const pmTableSpecs = tableNodes({ tableGroup: 'block', cellContent: 'block+', cellAttributes: {} })

export const stockNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  paragraph: basicNodes.paragraph,
  text: basicNodes.text,
  hardBreak: { ...basicNodes.hard_break, linebreakReplacement: true },
  image: basicNodes.image,
  heading,
  blockquote: basicNodes.blockquote,
  horizontalRule: basicNodes.horizontal_rule,
  bulletList,
  orderedList,
  listItem,
  taskList,
  taskItem,
  table: { ...pmTableSpecs.table, content: 'tableRow+' },
  tableRow: { ...pmTableSpecs.table_row, content: '(tableCell | tableHeader)*' },
  tableCell: pmTableSpecs.table_cell,
  tableHeader: pmTableSpecs.table_header,
}

export const stockMarks: Record<string, MarkSpec> = {
  bold: basicMarks.strong,
  italic: basicMarks.em,
  strike,
  code: basicMarks.code,
  link,
}

function ancestorDepth(state: EditorState, names: string[]): number {
  for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
    if (names.includes(state.selection.$from.node(depth).type.name)) return depth
  }
  return -1
}

function addMark(name: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    const type = state.schema.marks[name]
    if (!type) return false
    if (!dispatch) return true
    const { empty, from, to } = state.selection
    const mark = type.create(attrs)
    dispatch(empty ? state.tr.addStoredMark(mark) : state.tr.addMark(from, to, mark))
    return true
  }
}

function removeMark(name: string): Command {
  return (state, dispatch) => {
    const type = state.schema.marks[name]
    if (!type) return false
    if (dispatch) dispatch(state.tr.removeMark(state.selection.from, state.selection.to, type))
    return true
  }
}

function toggleList(listName: 'bulletList' | 'orderedList' | 'taskList', itemName: 'listItem' | 'taskItem'): Command {
  return (state, dispatch) => {
    const listType = state.schema.nodes[listName]
    const itemType = state.schema.nodes[itemName]
    if (!listType || !itemType) return false
    const depth = ancestorDepth(state, ['bulletList', 'orderedList', 'taskList'])
    if (depth >= 0) {
      const current = state.selection.$from.node(depth)
      if (current.type === listType) return liftListItem(itemType)(state, dispatch)
      if (current.type.name !== 'taskList' && listName !== 'taskList') {
        if (dispatch) dispatch(state.tr.setNodeMarkup(state.selection.$from.before(depth), listType))
        return true
      }
    }
    if (state.selection.$from.parent.type !== state.schema.nodes.paragraph) {
      let combined = state.tr
      let converted = state
      const changed = setBlockType(state.schema.nodes.paragraph)(state, (tr) => {
        combined = tr
        converted = state.apply(tr)
      })
      if (!changed) return false
      const wrapped = wrapInList(listType)(converted, (tr) => {
        for (const step of tr.steps) combined.step(step)
      })
      if (wrapped && dispatch) dispatch(combined)
      return wrapped
    }
    return wrapInList(listType)(state, dispatch)
  }
}

function createTableNode(schema: Schema, rows: number, cols: number, withHeaderRow: boolean): PMNode {
  const rowNodes: PMNode[] = []
  for (let row = 0; row < rows; row += 1) {
    const cellType = withHeaderRow && row === 0 ? schema.nodes.tableHeader : schema.nodes.tableCell
    const cells = Array.from({ length: cols }, () => cellType.createAndFill()).filter((cell): cell is PMNode => cell !== null)
    rowNodes.push(schema.nodes.tableRow.createChecked(null, cells))
  }
  return schema.nodes.table.createChecked(null, rowNodes)
}

const commandFactories: Record<string, CommandFactory> = {
  setBold: () => addMark('bold'),
  unsetBold: () => removeMark('bold'),
  toggleBold: () => (state, dispatch) => toggleMark(state.schema.marks.bold)(state, dispatch),
  setItalic: () => addMark('italic'),
  unsetItalic: () => removeMark('italic'),
  toggleItalic: () => (state, dispatch) => toggleMark(state.schema.marks.italic)(state, dispatch),
  setStrike: () => addMark('strike'),
  unsetStrike: () => removeMark('strike'),
  toggleStrike: () => (state, dispatch) => toggleMark(state.schema.marks.strike)(state, dispatch),
  setCode: () => addMark('code'),
  unsetCode: () => removeMark('code'),
  toggleCode: () => (state, dispatch) => toggleMark(state.schema.marks.code)(state, dispatch),
  setParagraph: () => (state, dispatch) => setBlockType(state.schema.nodes.paragraph)(state, dispatch),
  setHeading: (attrs: { level: number }) => (state, dispatch) => setBlockType(state.schema.nodes.heading, attrs)(state, dispatch),
  toggleHeading: (attrs: { level: number }) => (state, dispatch) => {
    const active = state.selection.$from.parent.type === state.schema.nodes.heading && state.selection.$from.parent.attrs.level === attrs.level
    return setBlockType(active ? state.schema.nodes.paragraph : state.schema.nodes.heading, active ? undefined : attrs)(state, dispatch)
  },
  setBlockquote: () => (state, dispatch) => wrapIn(state.schema.nodes.blockquote)(state, dispatch),
  toggleBlockquote: () => (state, dispatch) => (ancestorDepth(state, ['blockquote']) >= 0 ? lift : wrapIn(state.schema.nodes.blockquote))(state, dispatch),
  unsetBlockquote: () => lift,
  setHorizontalRule: () => (state, dispatch) => {
    const paragraph = state.schema.nodes.paragraph.create()
    const hr = state.schema.nodes.horizontalRule.create()
    if (dispatch) {
      const tr = state.tr.replaceSelectionWith(hr)
      const mappedSelection = tr.mapping.map(state.selection.from)
      let hrPosition = -1
      tr.doc.descendants((node, pos) => {
        if (node.type === state.schema.nodes.horizontalRule && (hrPosition < 0 || Math.abs(pos - mappedSelection) < Math.abs(hrPosition - mappedSelection))) hrPosition = pos
      })
      if (hrPosition < 0) return false
      if (hrPosition + hr.nodeSize === tr.doc.content.size) tr.insert(hrPosition + hr.nodeSize, paragraph)
      dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tr.doc.content.size, hrPosition + hr.nodeSize + 1)))).scrollIntoView())
    }
    return true
  },
  setHardBreak: () => (state, dispatch) => {
    if (exitCode(state, dispatch)) return true
    if (state.selection.$from.parent.type.spec.isolating) return false
    if (dispatch) dispatch(state.tr.replaceSelectionWith(state.schema.nodes.hardBreak.create()).scrollIntoView())
    return true
  },
  toggleBulletList: () => toggleList('bulletList', 'listItem'),
  toggleOrderedList: () => toggleList('orderedList', 'listItem'),
  toggleTaskList: () => toggleList('taskList', 'taskItem'),
  splitListItem: (name: string) => (state, dispatch) => splitListItem(state.schema.nodes[name])(state, dispatch),
  sinkListItem: (name: string) => (state, dispatch) => sinkListItem(state.schema.nodes[name])(state, dispatch),
  liftListItem: (name: string) => (state, dispatch) => liftListItem(state.schema.nodes[name])(state, dispatch),
  undo: () => undo,
  redo: () => redo,
  enter: () => baseKeymap.Enter,
  setLink: (attrs: Attrs) => (state, dispatch) => isSafeLinkUri(attrs.href) ? addMark('link', attrs)(state, dispatch) : false,
  toggleLink: (attrs: Attrs) => (state, dispatch) => isSafeLinkUri(attrs.href) ? toggleMark(state.schema.marks.link, attrs)(state, dispatch) : false,
  unsetLink: () => removeMark('link'),
  extendMarkRange: (name: string) => (state, dispatch) => {
    const type = state.schema.marks[name]
    if (!type) return false
    const marks = state.selection.$from.marks()
    const mark = marks.find((candidate) => candidate.type === type)
    if (!mark) return false
    let from = state.selection.$from.parentOffset
    let to = from
    const parent = state.selection.$from.parent
    while (from > 0 && mark.isInSet(parent.childBefore(from).node?.marks ?? [])) from -= parent.childBefore(from).node?.nodeSize ?? 0
    while (to < parent.content.size && mark.isInSet(parent.childAfter(to).node?.marks ?? [])) to += parent.childAfter(to).node?.nodeSize ?? 0
    const start = state.selection.$from.start()
    if (dispatch) dispatch(state.tr.setSelection(TextSelection.create(state.doc, start + from, start + to)))
    return true
  },
  insertTable: (options: { rows?: number; cols?: number; withHeaderRow?: boolean } = {}) => (state, dispatch) => {
    const table = createTableNode(state.schema, options.rows ?? 3, options.cols ?? 3, options.withHeaderRow ?? true)
    if (dispatch) dispatch(state.tr.replaceSelectionWith(table).scrollIntoView())
    return true
  },
  addColumnBefore: () => addColumnBefore,
  addColumnAfter: () => addColumnAfter,
  deleteColumn: () => deleteColumn,
  addRowBefore: () => addRowBefore,
  addRowAfter: () => addRowAfter,
  deleteRow: () => deleteRow,
  deleteTable: () => deleteTable,
  mergeCells: () => mergeCells,
  splitCell: () => splitCell,
  toggleHeaderColumn: () => toggleHeaderColumn,
  toggleHeaderRow: () => toggleHeaderRow,
  toggleHeaderCell: () => toggleHeaderCell,
  setCellAttribute: (name: string, value: unknown) => setCellAttr(name, value),
  goToNextCell: () => goToNextCell(1),
  goToPreviousCell: () => goToNextCell(-1),
  fixTables: () => (state, dispatch) => {
    const tr = fixTables(state)
    if (tr && dispatch) dispatch(tr)
    return Boolean(tr)
  },
  setCellSelection: ({ anchorCell, headCell = anchorCell }: { anchorCell: number; headCell?: number }) => (state, dispatch) => {
    if (dispatch) dispatch(state.tr.setSelection(CellSelection.create(state.doc, anchorCell, headCell)))
    return true
  },
}

function taskItemNodeView(editor: Editor): NodeViewConstructor {
  return (node, _view, getPos) => {
    const dom = document.createElement('li')
    const label = document.createElement('label')
    const checkbox = document.createElement('input')
    const checkmark = document.createElement('span')
    const contentDOM = document.createElement('div')
    label.contentEditable = 'false'
    checkbox.type = 'checkbox'
    checkbox.addEventListener('mousedown', (event) => event.preventDefault())
    checkbox.addEventListener('change', () => {
      const pos = getPos()
      if (!editor.isEditable || typeof pos !== 'number') {
        checkbox.checked = Boolean(node.attrs.checked)
        return
      }
      const current = editor.state.doc.nodeAt(pos)
      if (current) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, checked: checkbox.checked }))
    })
    label.append(checkbox, checkmark)
    dom.append(label, contentDOM)
    const sync = (value: boolean) => {
      dom.dataset.type = 'taskItem'
      dom.dataset.checked = String(value)
      checkbox.checked = value
    }
    sync(Boolean(node.attrs.checked))
    return {
      dom,
      contentDOM,
      update(updatedNode) {
        if (updatedNode.type.name !== 'taskItem') return false
        node = updatedNode
        sync(Boolean(updatedNode.attrs.checked))
        return true
      },
    }
  }
}

function corePlugins(schema: Schema, editor: Editor, options: { placeholder: boolean; resizableTables: boolean }): Plugin[] {
  const plugins: Plugin[] = [
    inputRules({
      rules: [
        ...smartQuotes,
        new InputRule(/--$/, '—'),
        new InputRule(/\.\.\.$/, '…'),
        textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (match) => ({ level: match[1].length })),
        wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
        wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulletList),
        wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.orderedList, (match) => ({ start: Number(match[1]) })),
        wrappingInputRule(/^\s*\[([ x])?\]\s$/i, schema.nodes.taskItem, (match) => ({ checked: match[1]?.toLowerCase() === 'x' })),
        new InputRule(/^(?:---|—-|___\s|\*\*\*\s)$/, (state, _match, start) => {
          const $start = state.doc.resolve(start)
          const tr = state.tr.replaceWith($start.before(), $start.after(), [schema.nodes.horizontalRule.create(), schema.nodes.paragraph.create()])
          return tr.setSelection(TextSelection.near(tr.doc.resolve($start.before() + 2)))
        }),
      ],
    }),
    keymap({
      'Mod-z': undo,
      'Shift-Mod-z': redo,
      'Mod-y': redo,
      Enter: chainCommands(splitListItem(schema.nodes.listItem), splitListItem(schema.nodes.taskItem), newlineInCode, baseKeymap.Enter),
      Tab: chainCommands(sinkListItem(schema.nodes.listItem), sinkListItem(schema.nodes.taskItem), goToNextCell(1)),
      'Shift-Tab': chainCommands(liftListItem(schema.nodes.listItem), liftListItem(schema.nodes.taskItem), goToNextCell(-1)),
      'Mod-b': () => editor.commands.toggleBold(),
      'Mod-i': () => editor.commands.toggleItalic(),
      'Mod-Shift-s': () => editor.commands.toggleStrike(),
      'Mod-e': () => editor.commands.toggleCode(),
      'Mod-Alt-0': () => editor.commands.setParagraph(),
      'Mod-Alt-1': () => editor.commands.toggleHeading({ level: 1 }),
      'Mod-Alt-2': () => editor.commands.toggleHeading({ level: 2 }),
      'Mod-Alt-3': () => editor.commands.toggleHeading({ level: 3 }),
      'Mod-Alt-4': () => editor.commands.toggleHeading({ level: 4 }),
      'Mod-Alt-5': () => editor.commands.toggleHeading({ level: 5 }),
      'Mod-Alt-6': () => editor.commands.toggleHeading({ level: 6 }),
      'Shift-Enter': () => editor.commands.setHardBreak(),
      'Mod-Enter': () => editor.commands.setHardBreak(),
      'Mod-Shift-7': () => editor.commands.toggleOrderedList(),
      'Mod-Shift-8': () => editor.commands.toggleBulletList(),
      'Mod-Shift-b': () => editor.commands.toggleBlockquote(),
      Backspace: baseKeymap.Backspace,
      Delete: baseKeymap.Delete,
      'Alt-ArrowUp': selectParentNode,
    }),
    keymap(baseKeymap),
    history(),
    dropCursor(),
    gapCursor(),
    ...(options.resizableTables ? [columnResizing({ View: TableView })] : []),
    tableEditing({ allowTableNodeSelection: true }),
    new Plugin({
      key: new PluginKey('autolink'),
      appendTransaction(transactions, oldState, newState) {
        if (!transactions.some((transaction) => transaction.docChanged) || oldState.doc.eq(newState.doc)) return null
        const tr = newState.tr
        const type = newState.schema.marks.link
        newState.doc.descendants((node, pos) => {
          if (!node.isText || node.marks.some((mark) => mark.type === type || mark.type === newState.schema.marks.code)) return
          for (const candidate of linkCandidates(node.text ?? '')) {
            const from = pos + candidate.from
            const to = pos + candidate.to
            if (!newState.doc.rangeHasMark(from, to, type)) tr.addMark(from, to, type.create({ href: candidate.href }))
          }
        })
        return tr.steps.length ? tr : null
      },
    }),
    new Plugin({
      key: new PluginKey('linkOnPaste'),
      props: {
        handlePaste(view, event) {
          const text = event.clipboardData?.getData('text/plain')?.trim() ?? ''
          if (view.state.selection.empty || !isLinkablePaste(text)) return false
          view.dispatch(view.state.tr.addMark(view.state.selection.from, view.state.selection.to, schema.marks.link.create({ href: normalizeLinkHref(text) })))
          return true
        },
      },
    }),
  ]

  if (options.placeholder) {
    plugins.push(new Plugin({
      key: new PluginKey('placeholder'),
      props: {
        decorations(state) {
          if (!editor.isEditable) return null
          const decorations: Decoration[] = []
          const emptyEditor = state.doc.childCount === 1 && state.doc.firstChild?.content.size === 0
          state.doc.descendants((node, pos) => {
            if (node.isTextblock && node.content.size === 0) {
              const hasCursor = state.selection.from >= pos && state.selection.to <= pos + node.nodeSize
              if (hasCursor) decorations.push(Decoration.node(pos, pos + node.nodeSize, {
                class: `is-empty${emptyEditor ? ' is-editor-empty' : ''}`,
                'data-placeholder': 'Type "/" for commands ...',
              }))
            }
            return false
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    }))
  }
  return plugins
}

export function getStockExtensions(options: { placeholder?: boolean; resizableTables?: boolean } = {}): EditorConfiguration {
  const resolved = {
    placeholder: options.placeholder !== false,
    resizableTables: options.resizableTables !== false,
  }
  return {
    nodes: stockNodes,
    marks: stockMarks,
    commands: commandFactories,
    plugins: (schema, editor) => corePlugins(schema, editor, resolved),
    nodeViews: (editor) => ({ taskItem: taskItemNodeView(editor) }),
  }
}
