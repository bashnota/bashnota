/**
 * defineNode — declarative node spec → ProseMirror NodeSpec.
 *
 * This is the raw-ProseMirror replacement for TipTap's `Node.create({ ... })`.
 * TipTap's `addAttributes` → `attrs`, `parseHTML` → `parseDOM`, `renderHTML` →
 * `toDOM`. This part of the migration is mechanical (per the porting brief) and
 * lives here so every block declares its schema the same way.
 *
 * All types come from the direct ProseMirror packages used by the live editor.
 */
import type {
  DOMOutputSpec,
  Node as ProseMirrorNode,
  NodeSpec,
  ParseRule,
} from 'prosemirror-model'

/**
 * One attribute of a node. Mirrors a single entry of TipTap's `addAttributes`.
 * - `default`      — the value when the attribute is absent.
 * - `parseHTML`    — read the value off the DOM element during parsing.
 *                    Defaults to reading the attribute by its own key name.
 * - `renderHTML`   — emit DOM attributes for this value during serialisation.
 *                    Defaults to `{ [key]: value }`, omitted when the value is
 *                    null/undefined (matches TipTap's mergeAttributes).
 */
export interface AttrDefinition {
  default: unknown
  parseHTML?: (element: HTMLElement) => unknown
  renderHTML?: (value: unknown) => Record<string, string> | null
}

/**
 * Declarative node definition. A superset of what a block needs, kept
 * intentionally close to TipTap's option names so the port reads like a
 * translation rather than a rewrite.
 */
export interface NodeDefinition {
  name: string
  group?: string
  content?: string
  /** Mark expression accepted by this node's inline content. */
  marks?: string
  inline?: boolean
  atom?: boolean
  /** ProseMirror `code`: enables code-block whitespace and editing semantics. */
  code?: boolean
  selectable?: boolean
  draggable?: boolean
  defining?: boolean
  /** ProseMirror `isolating`: the node's boundaries block cross-node editing. */
  isolating?: boolean
  attrs?: Record<string, AttrDefinition>
  /** Raw ProseMirror parse rules (a `tag` selector plus optional matchers). */
  parseDOM: readonly ParseRule[]
  /** Build the DOM output spec for a node instance. */
  toDOM: (node: ProseMirrorNode) => DOMOutputSpec
}

export interface DefinedNode {
  name: string
  spec: NodeSpec
}

/**
 * Attach a `getAttrs` to a parse rule that reads every declared attribute using
 * its `parseHTML` hook (or, by default, the DOM attribute of the same name).
 * Any `getAttrs` the caller already provided is layered on top so bespoke rules
 * keep working.
 */
function wrapParseRule(
  rule: ParseRule,
  attrs: Record<string, AttrDefinition>,
): ParseRule {
  const attrEntries = Object.entries(attrs)
  if (attrEntries.length === 0) return rule

  const originalGetAttrs = rule.getAttrs
  const originalTag = 'tag' in rule ? rule.tag : undefined

  return {
    ...rule,
    getAttrs(domOrNode: HTMLElement | string) {
      // Style rules receive a string; attribute reading only applies to element
      // (tag) rules, so bail out to the original behaviour for anything else.
      if (typeof domOrNode === 'string' || !originalTag) {
        return originalGetAttrs
          ? (originalGetAttrs as (v: HTMLElement | string) => false | Record<string, unknown> | null)(domOrNode)
          : null
      }

      const element = domOrNode

      // Mirror TipTap's injectExtensionAttributesToParseRule exactly: the rule's
      // own getAttrs runs FIRST (so a rule that reconstructs attributes from child
      // DOM, like subfigure, still contributes), then each attribute's parseHTML
      // runs and WINS — but only when it yields a non-null value, so a bare
      // getAttribute miss never clobbers what the rule derived from children.
      let base: Record<string, unknown> = {}
      if (originalGetAttrs) {
        const extra = (originalGetAttrs as (v: HTMLElement) => false | Record<string, unknown> | null)(element)
        // A rule that explicitly rejects the element must still be able to say no.
        if (extra === false) return false
        base = extra ?? {}
      }

      const parsed: Record<string, unknown> = { ...base }
      for (const [key, def] of attrEntries) {
        const value = def.parseHTML
          ? def.parseHTML(element)
          : element.getAttribute(key)
        if (value !== null && value !== undefined) parsed[key] = value
      }

      return parsed
    },
  }
}

/**
 * Convert a declarative {@link NodeDefinition} into a ProseMirror `NodeSpec`.
 * The returned `{ name, spec }` is fed straight into a `Schema`'s `nodes` map
 * (raw ProseMirror path, used by the test suite) and is also the single source
 * of truth the TipTap adapter reads from (live-editor path).
 */
export function defineNode(def: NodeDefinition): DefinedNode {
  const attrs: Record<string, { default: unknown }> = {}
  for (const [key, attr] of Object.entries(def.attrs ?? {})) {
    attrs[key] = { default: attr.default }
  }

  const parseDOM = def.parseDOM.map((rule) => wrapParseRule(rule, def.attrs ?? {}))

  const spec: NodeSpec = {
    inline: def.inline ?? false,
    atom: def.atom ?? false,
    selectable: def.selectable ?? true,
    draggable: def.draggable ?? false,
    attrs,
    parseDOM: parseDOM as NodeSpec['parseDOM'],
    toDOM: def.toDOM,
  }

  if (def.group) spec.group = def.group
  if (def.content !== undefined) spec.content = def.content
  if (def.marks !== undefined) spec.marks = def.marks
  if (def.code) spec.code = true
  if (def.defining) spec.defining = true
  if (def.isolating) spec.isolating = true
  if (def.draggable) spec.draggable = true

  return { name: def.name, spec }
}
