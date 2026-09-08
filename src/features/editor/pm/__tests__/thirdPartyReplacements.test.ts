import { afterEach, describe, expect, it, vi } from 'vitest'
import { DOMParser, DOMSerializer, Schema, Slice } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Editor } from '../editor'
import { nextTick } from 'vue'

// This suite exercises the assembled schema/plugins, not executable-code UI.
// The in-house VueNodeView mounts synchronously (unlike TipTap's deferred Vue
// renderer), so keep the block's Pinia/Jupyter side effects out of this test.
vi.mock(
  '@/features/editor/components/blocks/executable-code-block/ExecutableCodeBlock.vue',
  () => ({
    default: { name: 'ExecutableCodeBlockSchemaStub', render: () => null },
  }),
)

import {
  liveMarkdownParser,
  markdownPastePluginKey,
  parseMarkdown,
  serializeMarkdown,
} from '../markdown'
import { stableIdPlugin } from '../uniqueId'
import { getEditorExtensions } from '@/features/editor/components/extensions'
import {
  createDrawIoMessageHandler,
  DEFAULT_DRAWIO_DIAGRAM,
  DRAWIO_ORIGIN,
  drawIoDefinition,
} from '@/features/editor/components/blocks/drawio-block/drawio.node'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

function idSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
      text: { group: 'inline' },
      executableCodeBlock: {
        group: 'block',
        atom: true,
        attrs: { id: { default: null }, language: { default: 'python' } },
        toDOM: (node) => ['pre', { 'data-id': node.attrs.id }, ['code', 0]],
      },
    },
  })
}

function mountWithStableIds(schema: Schema, doc = schema.node('doc', null, [
  schema.node('executableCodeBlock'),
])) {
  const place = document.createElement('div')
  document.body.appendChild(place)
  const view = new EditorView(place, {
    state: EditorState.create({
      schema,
      doc,
      plugins: [stableIdPlugin({ types: ['executableCodeBlock'], createId: () => 'stable-id' })],
    }),
  })
  cleanups.push(() => {
    view.destroy()
    place.remove()
  })
  return view
}

function mountLiveEditor(content?: Record<string, unknown>) {
  const place = document.createElement('div')
  document.body.appendChild(place)
  const editor = new Editor({
    element: place,
    extensions: getEditorExtensions(),
    content,
  })
  cleanups.push(() => {
    editor.destroy()
    place.remove()
  })
  return { editor, place }
}

describe('prosemirror-markdown replacement', () => {
  it('serialises and parses standard Markdown as a lossless document round-trip', () => {
    const original = '# Heading\n\nA paragraph with **strong text**.\n'

    const parsed = parseMarkdown(original)
    const markdown = serializeMarkdown(parsed)
    const reloaded = parseMarkdown(markdown)

    expect(reloaded.toJSON()).toEqual(parsed.toJSON())
    expect(markdown).toContain('# Heading')
    expect(markdown).toContain('**strong text**')
  })

  it('parses through the actual live editor schema with application camelCase node names', () => {
    const { editor } = mountLiveEditor()

    const parsedDocument = liveMarkdownParser(editor.schema).parse(
      '# Heading\n\n- First\n- Second\n\n3. Third\n4. Fourth\n\nhttps://example.com\nline two\n\n```js\nconst x = 1\n```',
    )

    expect(parsedDocument.child(0).type.name).toBe('heading')
    expect(parsedDocument.child(1).type.name).toBe('bulletList')
    expect(parsedDocument.child(1).child(0).type.name).toBe('listItem')
    expect(parsedDocument.child(2).type.name).toBe('orderedList')
    expect(parsedDocument.child(2).attrs.start).toBe(3)
    expect(parsedDocument.child(3).type.name).toBe('paragraph')
    expect(parsedDocument.child(3).textContent).toContain('line two')
    expect(parsedDocument.child(4).type.name).toBe('paragraph')
    expect(parsedDocument.child(4).textContent).toBe('const x = 1')
    expect(parsedDocument.child(3).firstChild?.marks.some((mark) => mark.type.name === 'link')).toBe(true)
    expect(parsedDocument.child(3).content.childCount).toBeGreaterThan(1) // breaks:true → hardBreak
  })

  it('runs the registered markdown paste plugin in the assembled editor', () => {
    const { editor } = mountLiveEditor()
    const pasteEvent = {
      clipboardData: { getData: vi.fn(() => '# Pasted heading') },
    } as unknown as ClipboardEvent
    const plugin = editor.state.plugins.find((candidate) => candidate.spec.key === markdownPastePluginKey)
    const handled = plugin?.props.handlePaste?.call(plugin, editor.view, pasteEvent, Slice.empty) === true

    expect(handled).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('heading')
    expect(editor.state.doc.firstChild?.textContent).toBe('Pasted heading')
  })
})

describe('stableIdPlugin replacement', () => {
  it('assigns an id through the registered live editor plugin and keeps it after reload', () => {
    const { editor } = mountLiveEditor({
      type: 'doc',
      content: [{ type: 'executableCodeBlock', attrs: { id: null }, content: [{ type: 'text', text: 'print(1)' }] }],
    })
    const assignedId = editor.state.doc.firstChild?.attrs.id
    expect(typeof assignedId).toBe('string')
    expect(assignedId).not.toBe('')

    const { editor: reloaded } = mountLiveEditor(editor.getJSON())
    expect(reloaded.state.doc.firstChild?.attrs.id).toBe(assignedId)
  })

  it('keeps an assigned id when the document is serialised and reloaded', () => {
    const schema = idSchema()
    const firstView = mountWithStableIds(schema)
    const assignedId = firstView.state.doc.firstChild?.attrs.id
    expect(assignedId).toBe('stable-id')

    const persisted = firstView.state.doc.toJSON()
    firstView.destroy()
    const reloadedDocument = schema.nodeFromJSON(persisted)
    const reloadedView = mountWithStableIds(schema, reloadedDocument)

    expect(reloadedView.state.doc.firstChild?.attrs.id).toBe(assignedId)
  })

  it('repairs duplicate ids without changing the first stable id', () => {
    const schema = idSchema()
    const view = mountWithStableIds(schema, schema.node('doc', null, [
      schema.node('executableCodeBlock', { id: 'kept' }),
      schema.node('executableCodeBlock', { id: 'kept' }),
    ]))

    expect(view.state.doc.child(0).attrs.id).toBe('kept')
    expect(view.state.doc.child(1).attrs.id).toBe('stable-id')
  })

  it('never assigns a generated id that belongs to a later persisted node', () => {
    const schema = idSchema()
    const view = mountWithStableIds(schema, schema.node('doc', null, [
      schema.node('executableCodeBlock'),
      schema.node('executableCodeBlock', { id: 'stable-id' }),
    ]))

    expect(view.state.doc.child(0).attrs.id).toBe('stable-id-1')
    expect(view.state.doc.child(1).attrs.id).toBe('stable-id')
  })
})

describe('DrawIo node replacement', () => {
  it('round-trips persisted diagramData, width, and height through the ProseMirror DOM spec', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        text: { group: 'inline' },
        [drawIoDefinition.name]: drawIoDefinition.spec,
      },
    })
    const node = schema.nodes.drawio.create({
      diagramData: 'data:image/png;base64,diagram',
      width: '640',
      height: '480',
    })
    const element = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement
    const container = document.createElement('div')
    container.appendChild(element)
    const parsed = DOMParser.fromSchema(schema).parse(container)

    expect(parsed.firstChild?.type.name).toBe('drawio')
    expect(parsed.firstChild?.attrs).toMatchObject({
      diagramData: 'data:image/png;base64,diagram',
      width: '640',
      height: '480',
    })
  })

  it('accepts messages only from the diagrams.net iframe origin and source', () => {
    const postMessage = vi.fn()
    const iframeWindow = { postMessage } as unknown as Window
    const updateDiagram = vi.fn()
    const close = vi.fn()
    const handler = createDrawIoMessageHandler({
      iframeWindow,
      diagramData: () => DEFAULT_DRAWIO_DIAGRAM,
      updateDiagram,
      close,
    })
    const event = (origin: string, source: MessageEventSource | null, data: string) =>
      ({ origin, source, data }) as MessageEvent

    handler(event('https://evil.example', iframeWindow, JSON.stringify({ event: 'export', data: 'bad' })))
    handler(event(DRAWIO_ORIGIN, window, JSON.stringify({ event: 'export', data: 'bad' })))
    expect(updateDiagram).not.toHaveBeenCalled()

    handler(event(DRAWIO_ORIGIN, iframeWindow, JSON.stringify({ event: 'init' })))
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'load', xml: DEFAULT_DRAWIO_DIAGRAM }),
      DRAWIO_ORIGIN,
    )

    handler(event(DRAWIO_ORIGIN, iframeWindow, JSON.stringify({ event: 'save' })))
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ action: 'export', format: 'xmlpng', spinKey: 'saving' }),
      DRAWIO_ORIGIN,
    )

    handler(event(DRAWIO_ORIGIN, iframeWindow, JSON.stringify({ event: 'export', data: 'saved' })))
    expect(updateDiagram).toHaveBeenCalledWith('saved')
    expect(DEFAULT_DRAWIO_DIAGRAM).toContain('<mxfile')
    expect(DEFAULT_DRAWIO_DIAGRAM).toContain('<mxGraphModel')
  })

  it('inserts and updates the registered DrawIo node through the assembled editor', async () => {
    const { editor, place } = mountLiveEditor()

    expect(editor.commands.insertDrawIo()).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('drawio')
    expect(editor.state.doc.firstChild?.attrs.diagramData).toBe(DEFAULT_DRAWIO_DIAGRAM)
    expect(place.querySelector('img[data-type="drawio"]')).not.toBeNull()

    expect(editor.commands.updateAttributes('drawio', {
      diagramData: 'data:image/png;base64,updated',
      width: '640',
      height: '480',
    })).toBe(true)
    await nextTick()

    expect(editor.state.doc.firstChild?.attrs).toMatchObject({
      diagramData: 'data:image/png;base64,updated',
      width: '640',
      height: '480',
    })
    expect(place.querySelector('img[data-type="drawio"]')?.getAttribute('src')).toBe('data:image/png;base64,updated')
  })
})
