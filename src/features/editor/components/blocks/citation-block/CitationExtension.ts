/**
 * Citation + Bibliography nodes — ported onto the raw-ProseMirror primitives.
 *
 * Like-for-like port of the two former `Node.create` definitions. The declarative
 * NodeDefinition is the single source of truth: `defineNode` builds the raw-PM
 * spec exercised by the round-trip tests and registered in the live editor.
 *
 * `toDOM` is the sole serializer in both paths. Bibliography attributes use
 * explicit data-* keys so raw ProseMirror HTML parsing is reversible.
 * The exported symbols (CitationExtension, BibliographyExtension) are unchanged so
 * every existing import site keeps working.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

function dataAttribute(element: HTMLElement, dataName: string, legacyName: string): string | null {
  return element.getAttribute(dataName) ?? element.getAttribute(legacyName)
}

function booleanDataAttribute(
  element: HTMLElement,
  dataName: string,
  legacyName: string,
  fallback: boolean,
): boolean {
  const value = dataAttribute(element, dataName, legacyName)
  return value == null ? fallback : value === 'true'
}

// ---------------------------------------------------------------------------
// Citation (inline node)
// ---------------------------------------------------------------------------
export const citationNodeDefinition: NodeDefinition = {
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,
  attrs: {
    citationKey: {
      default: null,
      parseHTML: (element) => element.getAttribute('data-citation-key'),
    },
    citationNumber: {
      default: null,
      parseHTML: (element) => element.getAttribute('data-citation-number'),
    },
    citationStyle: {
      default: 'numeric',
      parseHTML: (element) => element.getAttribute('data-citation-style'),
    },
    citationFormat: {
      default: 'short',
      parseHTML: (element) => element.getAttribute('data-citation-format'),
    },
    citationStatus: {
      default: 'missing',
      parseHTML: (element) => element.getAttribute('data-citation-status'),
    },
    citationData: {
      default: {},
      parseHTML: (element) => {
        try {
          return JSON.parse(element.getAttribute('data-citation-data') || '{}')
        } catch {
          return {}
        }
      },
    },
  },
  parseDOM: [{ tag: 'span[data-type="citation"]' }],
  toDOM: (node) => {
    const a = node.attrs
    const status = a.citationStatus || 'missing'
    return [
      'span',
      {
        'data-type': 'citation',
        class: `citation-reference citation-${status}`,
        'data-citation-key': a.citationKey || '',
        'data-citation-number': a.citationNumber || '?',
        'data-citation-style': a.citationStyle || 'numeric',
        'data-citation-format': a.citationFormat || 'short',
        'data-citation-status': status,
        'data-citation-data': JSON.stringify(a.citationData || {}),
      },
      `[${a.citationNumber || '?'}]`,
    ]
  },
}

export const citationDefinition = defineNode(citationNodeDefinition)

export const CitationExtension = citationDefinition

// ---------------------------------------------------------------------------
// Bibliography (block node)
// ---------------------------------------------------------------------------
export const bibliographyNodeDefinition: NodeDefinition = {
  name: 'bibliography',
  group: 'block',
  content: '',
  atom: true,
  draggable: true,
  attrs: {
    style: {
      default: 'apa',
      parseHTML: (element) => dataAttribute(element, 'data-style', 'style') ?? 'apa',
    },
    title: {
      default: 'References',
      parseHTML: (element) => dataAttribute(element, 'data-title', 'title') ?? 'References',
    },
    sortBy: {
      default: 'citation-number',
      parseHTML: (element) => dataAttribute(element, 'data-sort-by', 'sortBy') ?? 'citation-number',
    },
    groupBy: {
      default: 'none',
      parseHTML: (element) => dataAttribute(element, 'data-group-by', 'groupBy') ?? 'none',
    },
    showType: {
      default: true,
      parseHTML: (element) => booleanDataAttribute(element, 'data-show-type', 'showType', true),
    },
    showDOI: {
      default: true,
      parseHTML: (element) => booleanDataAttribute(element, 'data-show-doi', 'showDOI', true),
    },
    showURL: {
      default: true,
      parseHTML: (element) => booleanDataAttribute(element, 'data-show-url', 'showURL', true),
    },
    citations: {
      default: [],
      parseHTML: (element) => {
        try {
          return JSON.parse(element.getAttribute('data-citations') || '[]')
        } catch {
          return []
        }
      },
    },
  },
  parseDOM: [{ tag: 'div[data-type="bibliography"]' }],
  toDOM: (node) => {
    const a = node.attrs
    return [
      'div',
      {
        'data-type': 'bibliography',
        class: 'bibliography-block',
        'data-style': a.style,
        'data-title': a.title,
        'data-sort-by': a.sortBy,
        'data-group-by': a.groupBy,
        'data-show-type': a.showType,
        'data-show-doi': a.showDOI,
        'data-show-url': a.showURL,
        'data-citations': JSON.stringify(a.citations || []),
      },
    ]
  },
}

export const bibliographyDefinition = defineNode(bibliographyNodeDefinition)

export const BibliographyExtension = bibliographyDefinition
