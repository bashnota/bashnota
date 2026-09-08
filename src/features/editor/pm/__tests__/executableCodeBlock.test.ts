import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { Editor } from '../editor'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import { getEditorExtensions } from '@/features/editor/components/extensions'

vi.mock(
  '@/features/editor/components/blocks/executable-code-block/ExecutableCodeBlock.vue',
  async () => {
    const { defineComponent, h } = await import('vue')
    return {
      default: defineComponent({
        name: 'ExecutableCodeBlockProbe',
        props: {
          node: { type: Object, required: true },
        },
        setup(props) {
          return () =>
            h(
              'span',
              { class: 'executable-code-probe' },
              String(props.node.attrs.language),
            )
        },
      }),
    }
  },
)

import {
  ExecutableCodeBlockExtension,
  executableCodeBlockDefinition,
} from '@/features/editor/components/blocks/executable-code-block/ExecutableCodeBlockExtension'

function makeSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        group: 'block',
        content: 'inline*',
        parseDOM: [{ tag: 'p' }],
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
      [executableCodeBlockDefinition.name]: executableCodeBlockDefinition.spec,
    },
  })
}

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

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
    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(character, from, to))
    }
  }
}

describe('executableCodeBlock raw-ProseMirror schema', () => {
  it('round-trips code content and every execution attribute through DOM', () => {
    const schema = makeSchema()
    const attrs = {
      language: 'typescript',
      executable: false,
      output: '<strong>42</strong>',
      kernelName: 'deno',
      serverID: 'localhost:8888',
      sessionId: 'session-42',
      id: 'block-42',
      isExecuting: true,
      executionTime: 42,
      error: 'stored error',
      kernelPreferences: { kernel: 'deno' },
    }
    const node = schema.node(
      'executableCodeBlock',
      attrs,
      schema.text('const answer = 42\n'),
    )

    const dom = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement
    expect(dom.matches('div[data-type="executableCodeBlock"]')).toBe(true)
    expect(dom.querySelector('code')?.className).toBe('language-typescript')
    expect(dom.querySelector('code')?.textContent).toBe('const answer = 42\n')
    expect(dom.querySelector('.export-code-output')?.getAttribute('data-output'))
      .toBe('<strong>42</strong>')

    const container = document.createElement('div')
    container.appendChild(dom)
    const parsed = DOMParser.fromSchema(schema).parse(container).firstChild!

    expect(parsed.type.name).toBe('executableCodeBlock')
    expect(parsed.attrs).toEqual(attrs)
    expect(parsed.textContent).toBe('const answer = 42\n')
    expect(parsed.type.spec.atom).toBe(true)
    expect(parsed.type.spec.code).toBe(true)
    expect(parsed.type.spec.marks).toBe('')
    expect(parsed.type.spec.content).toBe('text*')
  })

  it('keeps defaults when persisted execution attributes are absent', () => {
    const schema = makeSchema()
    const container = document.createElement('div')
    container.innerHTML =
      '<div data-type="executableCodeBlock"><pre><code>print(1)</code></pre><div style="display:none"></div></div>'
    const parsed = DOMParser.fromSchema(schema).parse(container).firstChild!

    expect(parsed.attrs).toEqual({
      language: 'python',
      executable: true,
      output: null,
      kernelName: null,
      serverID: null,
      sessionId: null,
      id: null,
      isExecuting: false,
      executionTime: null,
      error: null,
      kernelPreferences: null,
    })
    expect(parsed.textContent).toBe('print(1)')
  })
})

describe('executableCodeBlock live ProseMirror editor', () => {
  it('registers the schema and reactively updates its Vue node view', async () => {
    const place = document.createElement('div')
    document.body.appendChild(place)
    const editor = new Editor({
      element: place,
      extensions: getEditorExtensions(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'executableCodeBlock',
            attrs: { language: 'python', id: 'live-block' },
            content: [{ type: 'text', text: 'print(1)' }],
          },
        ],
      },
    })
    cleanups.push(() => {
      editor.destroy()
      place.remove()
    })

    expect(editor.schema.nodes.paragraph).toBeDefined()
    expect(editor.schema.nodes.executableCodeBlock.spec.atom).toBe(true)
    expect(place.querySelector('.pm-vue-node-view')).not.toBeNull()
    expect(place.querySelector('.executable-code-probe')?.textContent).toBe('python')

    const node = editor.state.doc.firstChild!
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(0, undefined, {
        ...node.attrs,
        language: 'javascript',
        output: 'updated',
      }),
    )
    await nextTick()

    expect(place.querySelector('.executable-code-probe')?.textContent)
      .toBe('javascript')
    expect(editor.state.doc.firstChild?.attrs.output).toBe('updated')
    expect(editor.getHTML()).toContain('class="code-block"')
  })

  it('keeps fenced insertion and toolbar commands on the raw editor', () => {
    const place = document.createElement('div')
    document.body.appendChild(place)
    const editor = new Editor({
      element: place,
      extensions: getEditorExtensions(),
      content: '<p></p>',
    })
    cleanups.push(() => {
      editor.destroy()
      place.remove()
    })

    typeText(editor, '```js ')
    expect(editor.state.doc.firstChild?.type.name).toBe('executableCodeBlock')
    expect(editor.state.doc.firstChild?.attrs.language).toBe('js')

    expect(editor.commands.toggleCodeBlock()).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('paragraph')
    expect(editor.commands.setCodeBlock({ language: 'python' })).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('executableCodeBlock')
    expect(editor.state.doc.firstChild?.attrs.language).toBe('python')
  })
})
