/**
 * Stable node ids, implemented as a plain ProseMirror plugin.
 *
 * IDs are written into node attributes, so serialising a document to JSON and
 * loading it again preserves them. Pasted copies deliberately have their ids
 * cleared so the next transaction gives the copy a fresh id rather than
 * creating two executable blocks with the same execution identity.
 */
import { Fragment, Slice } from 'prosemirror-model'
import { Plugin, PluginKey } from 'prosemirror-state'
import type { Node as ProseMirrorNode } from 'prosemirror-model'
import type { EditorState, Transaction } from 'prosemirror-state'

export interface StableIdPluginOptions {
  /** Node types that require ids. */
  types: readonly string[]
  /** Attribute used to store the id. Defaults to `id`. */
  attributeName?: string
  /** Injectable for deterministic tests. Defaults to crypto.randomUUID(). */
  createId?: () => string
}

export const stableIdPluginKey = new PluginKey('stable-node-ids')

function clearIdsFromSlice(
  slice: Slice,
  types: ReadonlySet<string>,
  attributeName: string,
): Slice {
  const clear = (content: Fragment): Fragment => {
    const children: ProseMirrorNode[] = []
    content.forEach((node) => {
      const childContent = node.content.size ? clear(node.content) : node.content
      if (!types.has(node.type.name)) {
        children.push(childContent === node.content ? node : node.copy(childContent))
        return
      }
      children.push(
        node.type.create(
          { ...node.attrs, [attributeName]: null },
          childContent,
          node.marks,
        ),
      )
    })
    return Fragment.fromArray(children)
  }

  return new Slice(clear(slice.content), slice.openStart, slice.openEnd)
}

/**
 * Assign an id to each missing or duplicated target node. Existing unique ids
 * are left untouched, which is the stability guarantee across document reloads.
 */
function assignStableIds(
  state: EditorState,
  types: ReadonlySet<string>,
  attributeName: string,
  createId: () => string,
): Transaction | null {
  // Reserve every persisted id before generating anything. A newly inserted
  // node appears before existing content during a transaction often enough
  // that a one-pass walk can otherwise generate an id owned by a *later*
  // persisted node, forcing the durable id to change on reload.
  const reserved = new Set<string>()
  state.doc.descendants((node) => {
    if (!types.has(node.type.name)) return
    const value = node.attrs[attributeName]
    if (typeof value === 'string' && value.length > 0) reserved.add(value)
  })

  const seen = new Set<string>()
  const tr = state.tr

  state.doc.descendants((node, pos) => {
    if (!types.has(node.type.name)) return

    const value = node.attrs[attributeName]
    const id = typeof value === 'string' && value.length > 0 ? value : null
    if (id && !seen.has(id)) {
      seen.add(id)
      return
    }

    const generatedId = createId()
    let nextId = generatedId
    let collision = 1
    // A caller can inject a deterministic generator in tests. Keep the plugin
    // terminating (and ids unique) even if that generator returns a collision.
    while (reserved.has(nextId) || seen.has(nextId)) {
      nextId = `${generatedId}-${collision++}`
    }
    seen.add(nextId)
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, [attributeName]: nextId })
  })

  return tr.steps.length ? tr.setMeta('addToHistory', false) : null
}

/** Build the stable-id plugin for the requested node types. */
export function stableIdPlugin(options: StableIdPluginOptions): Plugin {
  const types = new Set(options.types)
  const attributeName = options.attributeName ?? 'id'
  const createId = options.createId ?? (() => crypto.randomUUID())

  return new Plugin({
    key: stableIdPluginKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null
      return assignStableIds(newState, types, attributeName, createId)
    },
    view(view) {
      // The first document is already present when an EditorView is created,
      // before appendTransaction can observe a change. Initialise its missing
      // ids here, then rely on appendTransaction for all later edits.
      const tr = assignStableIds(view.state, types, attributeName, createId)
      if (tr) view.dispatch(tr)
      return {}
    },
    props: {
      transformPasted(slice) {
        return clearIdsFromSlice(slice, types, attributeName)
      },
    },
  })
}
