/**
 * parseDOM / toDOM round-trip tests for the 12 custom block nodes ported onto the
 * ProseMirror primitives (Phase 2).
 *
 * Each node's `defineNode` spec is mounted in a hand-built Schema (raw-ProseMirror
 * path — no TipTap), a node is created with every attribute set, serialised with
 * DOMSerializer and parsed back with DOMParser. The assertion is that every
 * attribute survives the round-trip.
 *
 * Structured attributes are JSON-encoded by their node definitions, so the same
 * state survives both document JSON persistence and HTML parse/serialise flows.
 */
import { describe, expect, it, vi } from 'vitest'
import { DOMParser, DOMSerializer, Schema } from 'prosemirror-model'
import type { Node as PMNode } from 'prosemirror-model'

import {
  citationDefinition,
  bibliographyDefinition,
} from '@/features/editor/components/blocks/citation-block/CitationExtension'
import { mathDefinition } from '@/features/editor/components/blocks/math-block/math-extension'
import { theoremDefinition } from '@/features/editor/components/blocks/theorem-block/theorem-extension'
import { confusionMatrixDefinition } from '@/features/editor/components/blocks/confusion-matrix/ConfusionMatrixExtension'
import { pipelineDefinition } from '@/features/editor/components/blocks/pipeline/PipelineExtension'
import { subfigureDefinition } from '@/features/editor/components/blocks/subfigure-block/subfigure-extension'
import { notaTableDefinition } from '@/features/editor/components/blocks/table-block/TableExtension'
import { notaTitleDefinition } from '@/features/editor/components/extensions/NotaTitleExtension'
import { pageLinkDefinition } from '@/features/editor/components/extensions/PageLinkExtension'
import { subNotaLinkDefinition } from '@/features/editor/components/extensions/SubNotaLinkExtension'
import { youtubeDefinition } from '@/features/editor/components/blocks/youtube-block/youtube.node'

/** One schema holding every ported node plus the minimum to contain them. */
function makeSchema() {
  const defs = [
    citationDefinition,
    bibliographyDefinition,
    mathDefinition,
    theoremDefinition,
    confusionMatrixDefinition,
    pipelineDefinition,
    subfigureDefinition,
    notaTableDefinition,
    notaTitleDefinition,
    pageLinkDefinition,
    subNotaLinkDefinition,
    youtubeDefinition,
  ]
  const nodes: Record<string, unknown> = {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
  }
  for (const def of defs) nodes[def.name] = def.spec
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Schema({ nodes: nodes as any })
}

const schema = makeSchema()

/** Serialise a node to DOM and parse it straight back, returning the parsed node. */
function roundTrip(node: PMNode, { inline = false } = {}): PMNode {
  const top = inline ? schema.node('paragraph', null, [node]) : node
  const dom = DOMSerializer.fromSchema(schema).serializeNode(top) as HTMLElement
  const container = document.createElement('div')
  container.appendChild(dom)
  const parsed = DOMParser.fromSchema(schema).parse(container)
  const first = parsed.firstChild!
  return inline ? first.firstChild! : first
}

describe('block node round-trips — every attribute preserved', () => {
  it('citation preserves every attribute', () => {
    const attrs = {
      citationKey: 'smith2020',
      citationNumber: '3',
      citationStyle: 'author-year',
      citationFormat: 'long',
      citationStatus: 'resolved',
      citationData: { title: 'Stored citation' },
    }
    const parsed = roundTrip(schema.node('citation', attrs), { inline: true })
    expect(parsed.type.name).toBe('citation')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('pageLink preserves every attribute', () => {
    const attrs = { href: '/nota/abc123', title: 'My Page' }
    const parsed = roundTrip(schema.node('pageLink', attrs), { inline: true })
    expect(parsed.type.name).toBe('pageLink')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('youtube preserves every attribute', () => {
    const attrs = { url: 'https://youtu.be/dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'Stored title' }
    const parsed = roundTrip(schema.node('youtube', attrs))
    expect(parsed.type.name).toBe('youtube')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('math preserves every attribute', () => {
    const attrs = { latex: 'E = mc^2', displayMode: true }
    const parsed = roundTrip(schema.node('math', attrs))
    expect(parsed.type.name).toBe('math')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('theorem preserves every attribute', () => {
    const attrs = {
      title: 'Pythagoras',
      content: 'a^2 + b^2 = c^2',
      proof: 'left as an exercise',
      type: 'lemma',
      number: 7,
      tags: ['geometry'],
    }
    const parsed = roundTrip(schema.node('theorem', attrs))
    expect(parsed.type.name).toBe('theorem')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('confusionMatrix preserves every attribute', () => {
    const attrs = {
      data: [
        [5, 1],
        [2, 8],
      ],
      labels: ['cat', 'dog'],
      title: 'My Matrix',
      source: 'jupyter',
      filePath: '/path/to/file.json',
      stats: { accuracy: 0.9 },
      matrixData: { matrix: [[5, 1], [2, 8]], labels: ['cat', 'dog'] },
    }
    const parsed = roundTrip(schema.node('confusionMatrix', attrs))
    expect(parsed.type.name).toBe('confusionMatrix')
    expect(parsed.attrs).toEqual(attrs)
  })

  it('subfigure preserves every attribute', () => {
    const attrs = {
      subfigures: [
        { src: 'a.png', caption: 'Fig A' },
        { src: 'b.png', caption: 'Fig B' },
      ],
      layout: 'grid',
      unifiedSize: false,
      objectFit: 'cover',
      isLocked: true,
      caption: 'Main caption',
      label: 'Figure 1',
      gridColumns: 3,
    }
    const parsed = roundTrip(schema.node('subfigure', attrs))
    expect(parsed.type.name).toBe('subfigure')
    expect(parsed.attrs).toEqual(attrs)
  })

  it('subNotaLink preserves every attribute', () => {
    const attrs = {
      targetNotaId: 'nota-42',
      targetNotaTitle: 'Target Nota',
      displayText: 'See also',
      linkStyle: 'button',
    }
    const parsed = roundTrip(schema.node('subNotaLink', attrs))
    expect(parsed.type.name).toBe('subNotaLink')
    expect(parsed.attrs).toMatchObject(attrs)
  })

  it('notaTitle preserves its title (parsed from textContent)', () => {
    // The title attribute serialises to `data-title` and an inline content hole,
    // and parses back from the element's textContent — verbatim original behaviour.
    const node = schema.node('notaTitle', { title: 'My Document' }, schema.text('My Document'))
    const parsed = roundTrip(node)
    expect(parsed.type.name).toBe('notaTitle')
    expect(parsed.attrs.title).toBe('My Document')
  })
})

describe('block node round-trips — structured attributes', () => {
  it('pipeline preserves every attribute', () => {
    const attrs = {
      id: 'pipeline-fixed-1',
      nodes: [{ id: 'node-1', type: 'code', data: { source: 'print(1)' } }],
      edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
      viewport: { x: 12, y: -4, zoom: 1.25 },
      title: 'My Pipeline',
      kernelMode: 'shared',
      sharedKernelName: 'kernel-a',
      executionOrder: 'sequential',
      stopOnError: false,
      description: 'Stored pipeline description',
      config: { retries: 2 },
    }
    const parsed = roundTrip(schema.node('pipeline', attrs))
    expect(parsed.type.name).toBe('pipeline')
    expect(parsed.attrs).toEqual(attrs)
  })

  it('bibliography preserves every attribute', () => {
    const attrs = {
      style: 'mla',
      title: 'Works Cited',
      sortBy: 'author',
      groupBy: 'type',
      showType: false,
      showDOI: false,
      showURL: false,
      citations: ['smith2020'],
    }
    const parsed = roundTrip(schema.node('bibliography', attrs))
    expect(parsed.type.name).toBe('bibliography')
    expect(parsed.attrs).toEqual(attrs)
  })

  it('notaTable preserves every attribute', () => {
    const attrs = {
      tableData: {
        id: 't1',
        name: 'Sales',
        columns: [{ id: 'c1', title: 'Region', type: 'text' }],
        rows: [{ id: 'r1', cells: { c1: 'West' } }],
      },
      columns: ['c1'],
    }
    const parsed = roundTrip(schema.node('notaTable', attrs))
    expect(parsed.type.name).toBe('notaTable')
    expect(parsed.attrs).toEqual(attrs)
  })
})
