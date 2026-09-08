import { afterEach, describe, expect, it, vi } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState, PluginKey, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

import { Suggestion } from '../suggestionPlugin'
import type { SuggestionProps } from '../suggestionPlugin'

function makeSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
      text: { group: 'inline' },
    },
  })
}

function flushSuggestionLifecycle() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('Suggestion', () => {
  it('captures navigation keys before editor keymaps while the chooser is active', async () => {
    const key = new PluginKey('suggestion-keyboard-capture')
    const onKeyDown = vi.fn(() => true)
    const schema = makeSchema()
    let view: EditorView
    const editor = {
      isEditable: true,
      get view() { return view },
      get state() { return view.state },
    }
    const plugin = Suggestion({
      editor,
      pluginKey: key,
      char: '/',
      render: () => ({ onKeyDown }),
    })
    const place = document.createElement('div')
    document.body.appendChild(place)
    view = new EditorView(place, {
      state: EditorState.create({
        schema,
        doc: schema.node('doc', null, [schema.node('paragraph')]),
        plugins: [plugin],
      }),
    })
    cleanups.push(() => {
      view.destroy()
      place.remove()
    })

    view.dispatch(view.state.tr.insertText('/'))
    await flushSuggestionLifecycle()
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    view.dom.dispatchEvent(event)

    expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({
      view,
      event,
      range: { from: 1, to: 2 },
    }))
    expect(event.defaultPrevented).toBe(true)
  })

  it('triggers on the configured character and filters items as the query changes', async () => {
    const key = new PluginKey('suggestion-trigger-filter')
    const items = vi.fn(({ query }: { query: string }) =>
      ['heading', 'help', 'image'].filter((item) => item.startsWith(query)),
    )
    const onStart = vi.fn()
    const onUpdate = vi.fn()
    const schema = makeSchema()
    let view: EditorView
    const editor = {
      isEditable: true,
      get view() {
        return view
      },
      get state() {
        return view.state
      },
    }
    const plugin = Suggestion({
      editor,
      pluginKey: key,
      char: '/',
      items,
      render: () => ({ onStart, onUpdate }),
    })
    const place = document.createElement('div')
    document.body.appendChild(place)
    view = new EditorView(place, {
      state: EditorState.create({
        schema,
        doc: schema.node('doc', null, [schema.node('paragraph')]),
        plugins: [plugin],
      }),
    })
    cleanups.push(() => {
      view.destroy()
      place.remove()
    })

    view.dispatch(view.state.tr.insertText('/'))
    await flushSuggestionLifecycle()

    expect(key.getState(view.state)).toMatchObject({
      active: true,
      range: { from: 1, to: 2 },
      query: '',
    })
    expect(items).toHaveBeenLastCalledWith({ editor, query: '' })
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(place.querySelector('.suggestion')).not.toBeNull()

    view.dispatch(view.state.tr.insertText('he'))
    await flushSuggestionLifecycle()

    expect(key.getState(view.state)).toMatchObject({
      active: true,
      range: { from: 1, to: 4 },
      query: 'he',
    })
    expect(items).toHaveBeenLastCalledWith({ editor, query: 'he' })
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('supplies the active range to command selection and dismisses when the match is removed', async () => {
    const key = new PluginKey('suggestion-select-dismiss')
    const command = vi.fn()
    const onExit = vi.fn()
    let latestProps: SuggestionProps | undefined
    const schema = makeSchema()
    let view: EditorView
    const editor = {
      isEditable: true,
      get view() {
        return view
      },
      get state() {
        return view.state
      },
    }
    const plugin = Suggestion({
      editor,
      pluginKey: key,
      char: '/',
      command,
      render: () => ({
        onStart: (props) => {
          latestProps = props
        },
        onExit,
      }),
    })
    const place = document.createElement('div')
    document.body.appendChild(place)
    view = new EditorView(place, {
      state: EditorState.create({
        schema,
        doc: schema.node('doc', null, [schema.node('paragraph')]),
        plugins: [plugin],
      }),
    })
    cleanups.push(() => {
      view.destroy()
      place.remove()
    })

    view.dispatch(view.state.tr.insertText('/table'))
    await flushSuggestionLifecycle()

    expect(latestProps).toBeDefined()
    latestProps!.command({ name: 'table' })
    expect(command).toHaveBeenCalledWith({
      editor,
      range: { from: 1, to: 7 },
      props: { name: 'table' },
    })

    // A non-empty selection is not a valid suggestion context, so the plugin
    // deactivates and hands the previous props to the renderer's exit hook.
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 2)),
    )
    await flushSuggestionLifecycle()

    expect(key.getState(view.state)).toMatchObject({ active: false })
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenLastCalledWith(
      expect.objectContaining({ range: { from: 1, to: 7 }, query: 'table' }),
    )
  })
})
