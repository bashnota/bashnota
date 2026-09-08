/**
 * SubNotaLink node — ported onto the raw-ProseMirror primitives.
 *
 * Like-for-like port of the former `Node.create`. `toDOM` reproduces the original
 * `renderHTML` (a `span[data-type="sub-nota-link"]` carrying the four data-*
 * attributes plus a text fallback); the three commands are passed through TipTap
 * unchanged so existing call sites keep working.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

export interface SubNotaLinkOptions {
  HTMLAttributes: Record<string, unknown>
}

interface SubNotaLinkAttributes {
  targetNotaId: string
  targetNotaTitle: string
  displayText?: string
  linkStyle?: 'inline' | 'button' | 'card'
}

export const subNotaLinkNodeDefinition: NodeDefinition = {
  name: 'subNotaLink',
  group: 'block',
  selectable: true,
  atom: true,
  content: '', // Empty content since it's an atom
  attrs: {
    targetNotaId: {
      default: null,
      parseHTML: (element) => element.getAttribute('data-target-nota-id'),
    },
    targetNotaTitle: {
      default: null,
      parseHTML: (element) => element.getAttribute('data-target-nota-title'),
    },
    displayText: {
      default: null,
      parseHTML: (element) => element.getAttribute('data-display-text'),
    },
    linkStyle: {
      default: 'inline',
      parseHTML: (element) => element.getAttribute('data-link-style') || 'inline',
    },
  },
  parseDOM: [{ tag: 'span[data-type="sub-nota-link"]' }],
  toDOM: (node) => {
    const a = node.attrs
    return [
      'span',
      {
        'data-type': 'sub-nota-link',
        'data-target-nota-id': a.targetNotaId,
        'data-target-nota-title': a.targetNotaTitle,
        'data-display-text': a.displayText,
        'data-link-style': a.linkStyle,
      },
      a.displayText || a.targetNotaTitle || 'Sub Nota Link',
    ]
  },
}

export const subNotaLinkDefinition = defineNode(subNotaLinkNodeDefinition)

export const SubNotaLink = subNotaLinkDefinition
