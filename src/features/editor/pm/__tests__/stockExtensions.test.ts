import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '../editor'
import { DOMParser as PMDOMParser, DOMSerializer, Slice } from 'prosemirror-model'
import { getStockExtensions } from '../stockExtensions'
import { getEditorExtensions } from '@/features/editor/components/extensions'

const editors: Editor[] = []

function createEditor(content: NonNullable<ConstructorParameters<typeof Editor>[0]>['content'] = '<p></p>') {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const editor = new Editor({ element, extensions: getStockExtensions(), content })
  editors.push(editor)
  return editor
}

function typeText(editor: Editor, text: string) {
  for (const character of text) {
    const { from, to } = editor.state.selection
    let handled = false
    editor.view.someProp('handleTextInput', (handler) => {
      if (handler(editor.view, from, to, character)) {
        handled = true
        return true
      }
      return false
    })
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(character, from, to))
  }
}

function pressKey(editor: Editor, key: string, modifiers: KeyboardEventInit = {}) {
  const invoke = (event: KeyboardEvent) => {
    let handled = false
    editor.view.someProp('handleKeyDown', (handler) => {
      if (handler(editor.view, event)) {
        handled = true
        return true
      }
      return false
    })
    return handled
  }
  if (invoke(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }))) return true
  if (modifiers.ctrlKey && !modifiers.metaKey) {
    return invoke(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers, ctrlKey: false, metaKey: true }))
  }
  return false
}

function textPosition(editor: Editor, text: string, offset = text.length) {
  let position = -1
  editor.state.doc.descendants((node, pos) => {
    if (position < 0 && node.isText && node.text === text) position = pos + offset
  })
  expect(position).toBeGreaterThan(0)
  return position
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy())
  document.body.innerHTML = ''
})

describe('official ProseMirror stock extensions', () => {
  it('boots the live editor extension registry', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const editor = new Editor({ element, extensions: getEditorExtensions(), content: '<p>live</p>' })
    editors.push(editor)

    expect(editor.state.doc.childCount).toBeGreaterThan(0)
    expect(editor.schema.nodes.table.spec.tableRole).toBe('table')
    expect(editor.schema.nodes.executableCodeBlock.spec.code).toBe(true)
  })

  it('provides the stock schema and ProseMirror plugin stack', () => {
    const editor = createEditor()

    expect(Object.keys(editor.schema.nodes)).toEqual(expect.arrayContaining([
      'doc', 'paragraph', 'heading', 'blockquote', 'horizontalRule', 'image',
      'bulletList', 'orderedList', 'listItem', 'table', 'tableRow', 'tableCell',
      'tableHeader', 'taskList', 'taskItem',
    ]))
    expect(Object.keys(editor.schema.marks)).toEqual(expect.arrayContaining(['bold', 'italic', 'strike', 'code', 'link']))

    const pluginKeys = editor.state.plugins.map((plugin) => (plugin as unknown as { key: string }).key)
    expect(pluginKeys.some((key) => key.startsWith('history$'))).toBe(true)
    expect(pluginKeys.some((key) => key.startsWith('selectingCells$'))).toBe(true)
    expect(pluginKeys.some((key) => key.startsWith('placeholder$'))).toBe(true)
  })

  it('round-trips basic, list, link, image, and table DOM through the schema', () => {
    const editor = createEditor()
    const source = document.createElement('div')
    source.innerHTML = [
      '<blockquote><p><strong>quoted</strong> <a href="https://example.com">link</a></p></blockquote>',
      '<ul><li><p>item</p></li></ul>',
      '<img src="image.png" alt="diagram">',
      '<table><tbody><tr><th><p>head</p></th><td><p>cell</p></td></tr></tbody></table>',
      '<hr>',
    ].join('')

    const parsed = PMDOMParser.fromSchema(editor.schema).parse(source)
    const target = document.createElement('div')
    target.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(parsed.content))

    expect(target.querySelector('blockquote strong')?.textContent).toBe('quoted')
    expect(target.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
    expect(target.querySelector('ul li')?.textContent).toBe('item')
    expect(target.querySelector('img')?.getAttribute('alt')).toBe('diagram')
    expect(target.querySelectorAll('table th, table td')).toHaveLength(2)
    expect(target.querySelector('hr')).not.toBeNull()
  })

  it('decorates an empty paragraph with the local placeholder', () => {
    const editor = createEditor()
    const paragraph = editor.view.dom.querySelector('p')

    expect(paragraph?.classList.contains('is-empty')).toBe(true)
    expect(paragraph?.classList.contains('is-editor-empty')).toBe(true)
    expect(paragraph?.getAttribute('data-placeholder')).toBe('Type "/" for commands ...')
  })

  it('parses task items and updates checked state from the local checkbox node view', () => {
    const editor = createEditor({
      type: 'doc',
      content: [{
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ship it' }] }],
        }],
      }],
    })
    const checkbox = editor.view.dom.querySelector<HTMLInputElement>('li[data-type="taskItem"] input[type="checkbox"]')

    expect(checkbox).not.toBeNull()
    checkbox!.checked = true
    checkbox!.dispatchEvent(new Event('change', { bubbles: true }))

    expect(editor.getJSON().content?.[0].content?.[0].attrs?.checked).toBe(true)
    expect(editor.view.dom.querySelector('li')?.getAttribute('data-checked')).toBe('true')
  })

  it('keeps toolbar commands for marks, headings, lists, history, and tables', () => {
    const editor = createEditor('<p>hello</p>')
    editor.commands.selectAll()

    expect(editor.commands.toggleBold()).toBe(true)
    expect(editor.isActive('bold')).toBe(true)
    expect(editor.commands.setHeading({ level: 2 })).toBe(true)
    expect(editor.isActive('heading', { level: 2 })).toBe(true)
    expect(editor.commands.toggleBulletList()).toBe(true)
    expect(editor.isActive('bulletList')).toBe(true)
    expect(editor.commands.undo()).toBe(true)

    editor.commands.setContent('<p>after</p>')
    editor.commands.setTextSelection(editor.state.doc.content.size)
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })).toBe(true)
    const json = editor.getJSON()
    const table = json.content?.find((node) => node.type === 'table')
    expect(table?.content).toHaveLength(2)
    expect(table?.content?.[0].content?.[0].type).toBe('tableHeader')
    expect(table?.content?.[1].content?.[0].type).toBe('tableCell')
  })

  it('dispatches ordinary list Enter, Tab, and Shift-Tab behavior through live keymaps', () => {
    const splitEditor = createEditor('<ul><li><p>one</p></li></ul>')
    splitEditor.commands.setTextSelection(textPosition(splitEditor, 'one'))
    expect(pressKey(splitEditor, 'Enter')).toBe(true)
    expect(splitEditor.getJSON().content?.[0].content).toHaveLength(2)

    const nestingEditor = createEditor('<ul><li><p>one</p></li><li><p>two</p></li></ul>')
    nestingEditor.commands.setTextSelection(textPosition(nestingEditor, 'two'))
    expect(pressKey(nestingEditor, 'Tab')).toBe(true)
    expect(nestingEditor.getJSON().content?.[0].content?.[0].content?.some((node) => node.type === 'bulletList')).toBe(true)
    expect(pressKey(nestingEditor, 'Tab', { shiftKey: true })).toBe(true)
    expect(nestingEditor.getJSON().content?.[0].content).toHaveLength(2)
  })

  it('dispatches hard-break and heading shortcuts and horizontal-rule input rules', () => {
    const hardBreakEditor = createEditor('<p>ab</p>')
    hardBreakEditor.commands.setTextSelection(textPosition(hardBreakEditor, 'ab', 1))
    expect(pressKey(hardBreakEditor, 'Enter', { shiftKey: true })).toBe(true)
    expect(hardBreakEditor.getJSON().content?.[0].content?.map((node) => node.type)).toEqual(['text', 'hardBreak', 'text'])

    const headingEditor = createEditor('<p>heading</p>')
    headingEditor.commands.setTextSelection(textPosition(headingEditor, 'heading'))
    expect(pressKey(headingEditor, '3', { ctrlKey: true, altKey: true })).toBe(true)
    expect(headingEditor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 3 } })

    const deepHeadingEditor = createEditor('<p>heading</p>')
    deepHeadingEditor.commands.setTextSelection(textPosition(deepHeadingEditor, 'heading'))
    expect(pressKey(deepHeadingEditor, '6', { ctrlKey: true, altKey: true })).toBe(true)
    expect(deepHeadingEditor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 6 } })

    const alternateHardBreakEditor = createEditor('<p>ab</p>')
    alternateHardBreakEditor.commands.setTextSelection(textPosition(alternateHardBreakEditor, 'ab', 1))
    expect(pressKey(alternateHardBreakEditor, 'Enter', { ctrlKey: true })).toBe(true)
    expect(alternateHardBreakEditor.getJSON().content?.[0].content?.map((node) => node.type)).toEqual(['text', 'hardBreak', 'text'])

    const hrEditor = createEditor()
    typeText(hrEditor, '---')
    expect(hrEditor.getJSON().content?.map((node) => node.type)).toEqual(['horizontalRule', 'paragraph'])
    expect(hrEditor.state.selection.$from.parent.type.name).toBe('paragraph')

    const hrCommandEditor = createEditor('<p>beforeafter</p>')
    hrCommandEditor.commands.setTextSelection(textPosition(hrCommandEditor, 'beforeafter', 6))
    expect(hrCommandEditor.commands.setHorizontalRule()).toBe(true)
    expect(hrCommandEditor.getJSON().content).toMatchObject([
      { type: 'paragraph', content: [{ text: 'before' }] },
      { type: 'horizontalRule' },
      { type: 'paragraph', content: [{ text: 'after' }] },
    ])
  })

  it('dispatches the local task-item input rule and task-item keymaps', () => {
    const editor = createEditor()
    typeText(editor, '[ ] ')

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: 'taskList',
      content: [{ type: 'taskItem', attrs: { checked: false } }],
    })
    typeText(editor, 'first')
    expect(pressKey(editor, 'Enter')).toBe(true)
    expect(editor.getJSON().content?.[0].content).toHaveLength(2)
  })

  it('autolinks typed URLs, links pasted onto selections, and rejects unsafe schemes', () => {
    const editor = createEditor()
    typeText(editor, 'visit https://example.com ')
    const typed = editor.getJSON().content?.[0].content?.find((node) => node.text === 'https://example.com')
    expect(typed?.marks?.[0]).toMatchObject({ type: 'link', attrs: { href: 'https://example.com' } })

    editor.commands.setContent('<p>selected</p>')
    editor.commands.setTextSelection({ from: 1, to: 9 })
    const pasteEvent = {
      clipboardData: { getData: () => 'https://openai.com' },
    } as unknown as ClipboardEvent
    let pasteHandled = false
    editor.view.someProp('handlePaste', (handler) => {
      if (handler(editor.view, pasteEvent, Slice.empty)) {
        pasteHandled = true
        return true
      }
      return false
    })
    expect(pasteHandled).toBe(true)
    expect(editor.getJSON().content?.[0].content?.[0].marks?.[0].attrs?.href).toBe('https://openai.com')

    expect(editor.commands.setLink({ href: 'javascript:alert(1)' })).toBe(false)
    const unsafePaste = {
      clipboardData: { getData: () => 'javascript:alert(1)' },
    } as unknown as ClipboardEvent
    let unsafePasteHandled = false
    editor.view.someProp('handlePaste', (handler) => {
      if (handler(editor.view, unsafePaste, Slice.empty)) unsafePasteHandled = true
      return false
    })
    expect(unsafePasteHandled).toBe(false)
    const plainPaste = {
      clipboardData: { getData: () => 'not a URL' },
    } as unknown as ClipboardEvent
    let plainPasteHandled = false
    editor.view.someProp('handlePaste', (handler) => {
      if (handler(editor.view, plainPaste, Slice.empty)) plainPasteHandled = true
      return false
    })
    expect(plainPasteHandled).toBe(false)
    const unsafe = document.createElement('div')
    unsafe.innerHTML = '<p><a href="javascript:alert(1)">unsafe</a></p>'
    const parsed = PMDOMParser.fromSchema(editor.schema).parse(unsafe)
    expect(parsed.firstChild?.firstChild?.marks).toHaveLength(0)
  })

  it('preserves stored marks when a chained command inserts plain text', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const onUpdate = vi.fn()
    const editor = new Editor({ element, extensions: getStockExtensions(), content: '<p></p>', onUpdate })
    editors.push(editor)
    expect(editor.chain().focus().setLink({ href: '/nota/child' }).insertContent('Child').run()).toBe(true)

    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      text: 'Child',
      marks: [{ type: 'link', attrs: { href: '/nota/child' } }],
    })
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('keeps a failed chain atomic and capability checks side-effect free', () => {
    const editor = createEditor('<p>before</p>')
    const before = editor.getJSON()

    editor.view.focus()
    expect(editor.isFocused).toBe(true)
    expect(editor.can().blur()).toBe(true)
    expect(editor.isFocused).toBe(true)
    expect(editor.can().chain().blur().run()).toBe(true)
    expect(editor.isFocused).toBe(true)

    expect(editor.chain().insertContent('changed').missingCommand().run()).toBe(false)
    expect(editor.getJSON()).toEqual(before)
    expect(editor.can().chain().selectAll().unsetAllMarks().run()).toBe(true)
    expect(editor.getJSON()).toEqual(before)
  })

  it('clears selected marks and deletes the selected node through the live facade', () => {
    const editor = createEditor('<p><strong>formatted</strong></p><p>keep</p>')
    editor.commands.setTextSelection({ from: 1, to: 10 })

    expect(editor.chain().focus().unsetAllMarks().run()).toBe(true)
    expect(editor.getJSON().content?.[0].content?.[0].marks).toBeUndefined()

    editor.commands.setTextSelection(2)
    expect(editor.chain().focus().deleteNode('paragraph').run()).toBe(true)
    expect(editor.getJSON().content).toEqual([{
      type: 'paragraph',
      content: [{ type: 'text', text: 'keep' }],
    }])
  })

  it('executes table selection, row, and column commands against official table plugins', () => {
    const editor = createEditor('<p></p>')
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })).toBe(true)
    let firstCell = -1
    editor.state.doc.descendants((node, pos) => {
      if (firstCell < 0 && ['tableCell', 'tableHeader'].includes(node.type.name)) firstCell = pos
    })
    expect(editor.commands.setCellSelection({ anchorCell: firstCell })).toBe(true)
    expect(editor.commands.addColumnAfter()).toBe(true)
    expect(editor.commands.addRowAfter()).toBe(true)

    const table = editor.getJSON().content?.find((node) => node.type === 'table')
    expect(table?.content).toHaveLength(3)
    expect(table?.content?.every((row) => row.content?.length === 3)).toBe(true)
  })
})
