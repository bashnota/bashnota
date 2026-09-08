/**
 * Phase 0 spike test suite for the ProseMirror core primitives.
 *
 * Covers, per the acceptance criteria:
 *  - the node spec round-trips through parseDOM and toDOM;
 *  - the VueNodeView mounts and unmounts without leaking;
 *  - attribute updates propagate to the mounted Vue component;
 *  - the plugin/command registry runs a registered command.
 *
 * These exercise the raw ProseMirror path used by the live editor.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import { EditorState, NodeSelection, Plugin } from 'prosemirror-state'
import type { Command } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

import { VueNodeView } from '../VueNodeView'
import { defineNode } from '../defineNode'
import type { NodeDefinition } from '../defineNode'
import { useEditor } from '../useEditor'
import { EditorRegistry } from '../registry'
import { youtubeDefinition } from '@/features/editor/components/blocks/youtube-block/youtube.node'

/** A schema wrapping the ported youtube spec plus the minimum to hold it. */
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
      [youtubeDefinition.name]: youtubeDefinition.spec,
    },
  })
}

/** Track view/DOM created per test so we can tear them down. */
const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('defineNode — parseDOM/toDOM round-trip', () => {
  it('serialises a node to DOM and parses it back with attributes intact', () => {
    const schema = makeSchema()
    const node = schema.nodes.youtube.create({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
    })

    // toDOM
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement
    expect(dom.tagName).toBe('DIV')
    expect(dom.getAttribute('data-type')).toBe('youtube')
    expect(dom.getAttribute('videoId')).toBe('dQw4w9WgXcQ')
    expect(dom.getAttribute('url')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // parseDOM (round-trip)
    const container = document.createElement('div')
    container.appendChild(dom)
    const parsed = DOMParser.fromSchema(schema).parse(container)

    expect(parsed.firstChild?.type.name).toBe('youtube')
    expect(parsed.firstChild?.attrs.videoId).toBe('dQw4w9WgXcQ')
    expect(parsed.firstChild?.attrs.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  it('applies attribute defaults when the DOM omits them', () => {
    const schema = makeSchema()
    const container = document.createElement('div')
    container.innerHTML = '<div data-type="youtube"></div>'
    const parsed = DOMParser.fromSchema(schema).parse(container)

    expect(parsed.firstChild?.type.name).toBe('youtube')
    // Missing attributes fall back to the declared defaults (null).
    expect(parsed.firstChild?.attrs.url).toBeNull()
    expect(parsed.firstChild?.attrs.videoId).toBeNull()
  })
})

/** A tiny probe component that renders its node's videoId and counts lifecycle. */
function makeProbe(counts: { mounted: number; unmounted: number }) {
  return defineComponent({
    name: 'ProbeView',
    props: {
      node: { type: Object, required: true },
      selected: { type: Boolean, default: false },
      updateAttributes: { type: Function, required: true },
    },
    mounted() {
      counts.mounted += 1
    },
    unmounted() {
      counts.unmounted += 1
    },
    setup(props) {
      return () =>
        h(
          'span',
          { class: 'probe', 'data-selected': String(props.selected) },
          String((props.node as { attrs: { videoId: string } }).attrs.videoId),
        )
    },
  })
}

/** Build an EditorView whose youtube nodes are served by VueNodeView. */
function mountEditor(component: ReturnType<typeof makeProbe>) {
  const schema = makeSchema()
  const doc = schema.node('doc', null, [schema.node('youtube', { url: 'u', videoId: 'first-id' })])
  const place = document.createElement('div')
  document.body.appendChild(place)
  const state = EditorState.create({ schema, doc })
  const view = new EditorView(place, {
    state,
    nodeViews: {
      youtube: (node, view, getPos) =>
        new VueNodeView({ node, view, getPos, component }),
    },
  })
  cleanups.push(() => {
    view.destroy()
    place.remove()
  })
  return { view, place, schema }
}

describe('VueNodeView — mount / update / unmount', () => {
  it('mounts the Vue component into the node-view DOM', () => {
    const counts = { mounted: 0, unmounted: 0 }
    const { place } = mountEditor(makeProbe(counts))

    const probe = place.querySelector('.probe')
    expect(probe).not.toBeNull()
    expect(probe?.textContent).toBe('first-id')
    expect(counts.mounted).toBe(1)
    expect(counts.unmounted).toBe(0)
  })

  it('propagates attribute updates to the mounted component', async () => {
    const counts = { mounted: 0, unmounted: 0 }
    const { view, place } = mountEditor(makeProbe(counts))

    // Update the youtube node's videoId via a ProseMirror transaction.
    const pos = 0
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        url: 'u',
        videoId: 'second-id',
      }),
    )
    await nextTick()

    expect(place.querySelector('.probe')?.textContent).toBe('second-id')
    // Same view instance — no remount happened for a same-type attribute change.
    expect(counts.mounted).toBe(1)
  })

  it('unmounts the Vue component (no leak) when the view is destroyed', () => {
    const counts = { mounted: 0, unmounted: 0 }
    const { view } = mountEditor(makeProbe(counts))

    expect(counts.unmounted).toBe(0)
    view.destroy()
    expect(counts.unmounted).toBe(1)
  })

  it('reflects selection state through the reactive prop', async () => {
    const counts = { mounted: 0, unmounted: 0 }
    const { view, place, schema } = mountEditor(makeProbe(counts))

    view.focus()
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, 0)))
    await nextTick()

    // selectNode adds the standard highlight class synchronously.
    const wrapper = place.querySelector('.pm-vue-node-view')
    expect(wrapper?.classList.contains('ProseMirror-selectednode')).toBe(true)
    // and the reactive `selected` prop reaches the component.
    expect(place.querySelector('.probe')?.getAttribute('data-selected')).toBe('true')
    // sanity: the schema still recognises the node type
    expect(schema.nodes.youtube).toBeDefined()
  })
})

describe('direct Vue node-view assembly', () => {
  it('uses an inline outer wrapper for an inline node definition', () => {
    const inlineDefinition: NodeDefinition = {
      name: 'inlineProbe',
      group: 'inline',
      inline: true,
      atom: true,
      attrs: {
        label: {
          default: '',
          parseHTML: (element) => element.getAttribute('data-label') || '',
        },
      },
      parseDOM: [{ tag: 'span[data-type="inline-probe"]' }],
      toDOM: (node) => [
        'span',
        { 'data-type': 'inline-probe', 'data-label': node.attrs.label },
        node.attrs.label,
      ],
    }
    const component = defineComponent({
      name: 'InlineProbeView',
      props: {
        node: { type: Object, required: true },
      },
      setup(props) {
        return () => h('span', { class: 'inline-probe-view' }, String(props.node.attrs.label))
      },
    })
    const definition = defineNode(inlineDefinition)
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
        text: { group: 'inline' },
        [definition.name]: definition.spec,
      },
    })
    const place = document.createElement('div')
    document.body.appendChild(place)
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'inlineProbe', attrs: { label: 'inline' } }],
      }],
    })
    const view = new EditorView(place, {
      state: EditorState.create({ schema, doc }),
      nodeViews: {
        inlineProbe: (node, view, getPos) => new VueNodeView({
          node,
          view,
          getPos,
          component,
          as: 'span',
        }),
      },
    })
    cleanups.push(() => {
      view.destroy()
      place.remove()
    })

    const wrapper = place.querySelector('.pm-vue-node-view')
    expect(wrapper?.tagName).toBe('SPAN')
    expect(wrapper?.parentElement?.tagName).toBe('P')
    expect(wrapper?.querySelector('.inline-probe-view')?.textContent).toBe('inline')
  })
})

describe('useEditor — lifecycle', () => {
  it('mounts an EditorView and destroys it cleanly', () => {
    const place = document.createElement('div')
    document.body.appendChild(place)

    const editor = useEditor({
      extensions: {
        nodes: {
          doc: { content: 'block+' },
          paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] },
          text: { group: 'inline' },
        },
      },
    })
    const view = editor.value!.mount(place)
    expect(editor.value!.view).toBe(view)
    expect(place.querySelector('.ProseMirror')).not.toBeNull()

    editor.value!.destroy()
    expect(place.querySelector('.ProseMirror')).toBeNull()
    // idempotent
    editor.value!.destroy()
    place.remove()
  })
})

describe('EditorRegistry — plugins and commands', () => {
  it('collects plugins in order', () => {
    const a = new Plugin({})
    const b = new Plugin({})
    const registry = new EditorRegistry()
    registry.addPlugin(a).addPlugins([b])
    expect(registry.getPlugins()).toEqual([a, b])
  })

  it('runs a registered command against a view', () => {
    const schema = makeSchema()
    const place = document.createElement('div')
    document.body.appendChild(place)
    const doc = schema.node('doc', null, [schema.node('paragraph')])
    const view = new EditorView(place, {
      state: EditorState.create({ schema, doc }),
    })
    cleanups.push(() => {
      view.destroy()
      place.remove()
    })

    let ran = false
    const insertYoutube: Command = (state, dispatch) => {
      const node = state.schema.nodes.youtube.create({ url: 'u', videoId: 'vid' })
      if (dispatch) {
        ran = true
        dispatch(state.tr.replaceSelectionWith(node))
      }
      return true
    }

    const registry = new EditorRegistry()
    registry.addCommand('insertYoutube', insertYoutube)

    expect(registry.getCommandNames()).toContain('insertYoutube')
    const result = registry.runCommand('insertYoutube', view)
    expect(result).toBe(true)
    expect(ran).toBe(true)
    // the youtube node is now in the document
    let found = false
    view.state.doc.descendants((n) => {
      if (n.type.name === 'youtube') found = true
    })
    expect(found).toBe(true)

    // unknown command → false, no throw
    expect(registry.runCommand('nope', view)).toBe(false)
  })
})
