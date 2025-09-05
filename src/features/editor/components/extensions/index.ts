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
import { MarkdownExtension } from './MarkdownExtension'
import GlobalDragHandle from './DragHandlePlugin'

import {
  ExecutableCodeBlockExtension
} from '@/features/editor/components/blocks/executable-code-block/ExecutableCodeBlockExtension'
import {
  TableExtension
} from '@/features/editor/components/blocks/table-block/TableExtension'
import {
  MathExtension
} from '@/features/editor/components/blocks/math-block'
import {
  Youtube
} from '@/features/editor/components/blocks/youtube-block/youtube-extension'
import {
  SubfigureExtension
} from '@/features/editor/components/blocks'
import {
  CitationExtension,
  BibliographyExtension
} from '@/features/editor/components/blocks/citation-block/CitationExtension'
import {
  TheoremExtension
} from '@/features/editor/components/blocks/theorem-block'
import {
  ConfusionMatrixExtension
} from '@/features/editor/components/blocks/confusion-matrix'
import {
  PipelineExtension
} from '@/features/editor/components/blocks/pipeline/PipelineExtension'
import { SubNotaLink } from './SubNotaLinkExtension'
import { SubNotaLinkSlashCommand } from './SubNotaLinkSlashCommand'
// SubNotaLinkService is now imported lazily to avoid Pinia initialization issues
import { NotaTitleExtension } from './NotaTitleExtension'

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
    MathExtension.configure({
      HTMLAttributes: {
        class: 'math-block',
      },
    }),
    GlobalDragHandle.configure({
      dragHandleWidth: 24,
      shouldShow: () => true,
    }),
    MarkdownExtension,
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
    CitationExtension,
    BibliographyExtension,
    TheoremExtension,
    ConfusionMatrixExtension,
    PipelineExtension,
    SubNotaLink,
    SubNotaLinkSlashCommand,
    NotaTitleExtension,
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
    TableExtension.configure({
      HTMLAttributes: {
        class: 'data-table',
      },
    }),
    MathExtension.configure({
      HTMLAttributes: {
        class: 'math-block',
      },
    }),
    MarkdownExtension,
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
    TheoremExtension,
    ConfusionMatrixExtension,
    PipelineExtension,
    SubNotaLink,
  ]
}









