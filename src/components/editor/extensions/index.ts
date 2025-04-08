// src/components/editor/extensions/index.ts
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
// @ts-ignore
import UniqueId from 'tiptap-unique-id'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import drawIoExtension from '@rcode-link/tiptap-drawio'
import Document from '@tiptap/extension-document'

// Import custom extensions
import { PageLink } from './PageLinkExtension'
import { ExecutableCodeBlockExtension } from './ExecutableCodeBlockExtension'
import { TableExtension } from './TableExtension'
import { MathExtension } from './MathExtension'
import { MarkdownExtension } from './MarkdownExtension'
import { Mermaid } from './mermaid'
import { Youtube } from './youtube'
import { SubfigureExtension } from '../blocks'
import GlobalDragHandle from './DragHandlePlugin'
import { InlineAIGenerationExtension } from './InlineAIGenerationExtension'
import { CitationExtension, BibliographyExtension } from './CitationExtension'
import { VibeExtension } from './VibeExtension'

// Import command-related extensions
import SlashCommands from './Commands'
import suggestion from './suggestion'

/**
 * Get all extensions for the full editor
 */
export function getEditorExtensions() {
  return [
    Markdown.configure({
      transformPastedText: true,
      transformCopiedText: false,
      breaks: true,
      tightLists: true,
      tightListClass: 'tight',
      bulletListMarker: '-',
      linkify: true,
      html: false,
    }),
    StarterKit.configure({
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    UniqueId.configure({
      attributeName: 'id',
      types: ['executableCodeBlock'],
      createId: () => crypto.randomUUID(),
    }),
    ExecutableCodeBlockExtension.configure({
      HTMLAttributes: {
        class: 'code-block',
      },
      languageClassPrefix: 'language-',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'nota-link',
      },
    }),
    PageLink,
    Table.configure({
      allowTableNodeSelection: true,
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({
      placeholder: 'Type "/" for commands ...',
    }),
    SlashCommands.configure({
      suggestion,
    }),
    TableExtension.configure({
      HTMLAttributes: {
        class: 'data-table',
      },
    }),
    MathExtension,
    GlobalDragHandle.configure({
      dragHandleWidth: 24,
      shouldShow: () => true,
    }),
    MarkdownExtension,
    Mermaid.configure({
      HTMLAttributes: {
        class: 'mermaid-block',
      },
    }),
    Youtube,
    SubfigureExtension,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    drawIoExtension.configure({
      openDialog: 'dblclick',
    }),
    Blockquote,
    HorizontalRule,
    InlineAIGenerationExtension,
    CitationExtension,
    BibliographyExtension,
    VibeExtension,
  ]
}

/**
 * Get extensions for the viewer (read-only mode)
 */
export function getViewerExtensions() {
  return [
    StarterKit.configure({
      document: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
    }),
    Document.extend({
      content: 'block+',
    }),
    ExecutableCodeBlockExtension.configure({
      HTMLAttributes: {
        class: 'code-block',
      },
      languageClassPrefix: 'language-',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'nota-link',
      },
    }),
    PageLink,
    Table.configure({
      resizable: false,
    }),
    TableRow,
    TableCell,
    TableHeader,
    MathExtension,
    MarkdownExtension,
    Mermaid.configure({
      HTMLAttributes: {
        class: 'mermaid-block',
      },
    }),
    Youtube,
    SubfigureExtension,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    drawIoExtension,
    Blockquote,
    HorizontalRule,
    CitationExtension,
    BibliographyExtension.configure({
      HTMLAttributes: {
        class: 'bibliography-block',
      },
    }),
  ]
}
