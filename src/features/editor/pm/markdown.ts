/**
 * Minimal markdown boundary built directly on prosemirror-markdown.
 *
 * TipTap's Markdown extension was only registered in the editor extension
 * list; no application code consumed its storage or commands. Keeping this
 * small, explicit boundary gives callers a dependency-free way to parse and
 * serialise the standard ProseMirror markdown document format as the editor
 * migration proceeds.
 */
import MarkdownIt from 'markdown-it'
import {
  MarkdownParser,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown'
import { Slice } from 'prosemirror-model'
import { Plugin, PluginKey } from 'prosemirror-state'
import type { Node as ProseMirrorNode } from 'prosemirror-model'
import type { Schema } from 'prosemirror-model'
import type { ParseSpec } from 'prosemirror-markdown'

/** Parse standard Markdown into ProseMirror's standard document schema. */
export function parseMarkdown(markdown: string): ProseMirrorNode {
  return defaultMarkdownParser.parse(markdown)
}

/** Serialise a standard ProseMirror document as Markdown. */
export function serializeMarkdown(document: ProseMirrorNode): string {
  return defaultMarkdownSerializer.serialize(document)
}

/**
 * Parse Markdown against the live editor schema. It reuses the official
 * prosemirror-markdown token table, while allowing TipTap's current schema to
 * supply its existing paragraph, heading, list, and mark node instances.
 */
export function parseMarkdownForSchema(schema: Schema, markdown: string) {
  return liveMarkdownParser(schema).parse(markdown)
}

/**
 * Token mappings for the live TipTap schema. prosemirror-markdown's default
 * schema uses snake_case names, while TipTap uses camelCase (bulletList,
 * listItem, hardBreak, horizontalRule). The legacy Markdown extension used
 * `breaks: true` and `linkify: true`, so the tokenizer intentionally keeps
 * both behaviours. Fenced blocks become paragraphs because this editor has
 * disabled TipTap's stock codeBlock in favour of executableCodeBlock.
 */
const liveSchemaTokens: Record<string, ParseSpec> = {
  blockquote: { block: 'blockquote' },
  paragraph: { block: 'paragraph' },
  list_item: { block: 'listItem' },
  bullet_list: { block: 'bulletList' },
  ordered_list: {
    block: 'orderedList',
    // TipTap's OrderedList node uses `start`, unlike prosemirror-schema-list's
    // `order`; mapping the source attribute verbatim keeps `3.` lists stable.
    getAttrs: (token) => ({ start: Number(token.attrGet('start')) || 1 }),
  },
  heading: { block: 'heading', getAttrs: (token) => ({ level: Number(token.tag.slice(1)) }) },
  code_block: { block: 'paragraph', noCloseToken: true },
  fence: { block: 'paragraph', noCloseToken: true },
  hr: { node: 'horizontalRule' },
  image: {
    node: 'image',
    getAttrs: (token) => ({
      src: token.attrGet('src'),
      title: token.attrGet('title') || null,
      alt: token.children?.[0]?.content || null,
    }),
  },
  hardbreak: { node: 'hardBreak' },
  em: { mark: 'italic' },
  strong: { mark: 'bold' },
  link: { mark: 'link', getAttrs: (token) => ({ href: token.attrGet('href'), title: token.attrGet('title') || null }) },
  code_inline: { mark: 'code', noCloseToken: true },
}

/** Build a parser for the actual editor schema, not the basic demo schema. */
export function liveMarkdownParser(schema: Schema) {
  // The app intentionally does not register every stock StarterKit node (for
  // example Image). Do not ask MarkdownParser to resolve an absent type; this
  // keeps ordinary paste working in the live schema and lets unsupported
  // Markdown fall back to the browser's normal clipboard parser.
  const supportedTokens = Object.fromEntries(
    Object.entries(liveSchemaTokens).filter(([, spec]) => {
      if (spec.block || spec.node) return !!schema.nodes[spec.block ?? spec.node!]
      return !!schema.marks[spec.mark!]
    }),
  ) as Record<string, ParseSpec>

  return new MarkdownParser(
    schema,
    new MarkdownIt({ html: false, breaks: true, linkify: true }),
    supportedTokens,
  )
}

/**
 * Preserve the old extension's `transformPastedText: true` behaviour with a
 * raw ProseMirror plugin. Schemas that intentionally omit a Markdown node
 * (such as the old codeBlock in favour of executableCodeBlock) fall back to
 * ProseMirror's normal clipboard handling rather than losing a paste.
 */
export const markdownPastePluginKey = new PluginKey('prosemirror-markdown-paste')

export function markdownPastePlugin(): Plugin {
  return new Plugin({
    key: markdownPastePluginKey,
    props: {
      handlePaste(view, event) {
        const markdown = event.clipboardData?.getData('text/plain')
        if (!markdown) return false

        try {
          const parsed = parseMarkdownForSchema(view.state.schema, markdown)
          view.dispatch(
            view.state.tr
              .replaceSelection(new Slice(parsed.content, 0, 0))
              .scrollIntoView(),
          )
          return true
        } catch {
          return false
        }
      },
    },
  })
}
