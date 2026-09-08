import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { Editor } from '@/features/editor/pm/editor'
import { getEditorExtensions } from '@/features/editor/components/extensions'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import type { Block } from '@/features/nota/types/blocks'
import {
  persistedCustomBlockData,
  persistedInlineBlockData,
  persistedNodeText,
  persistedTableBlockData,
} from '@/features/editor/pm/persistedBlockConversion'

const notaId = 'nota-persistence-boundary'
const base = {
  notaId,
  createdAt: new Date('2026-08-13T00:00:00.000Z'),
  updatedAt: new Date('2026-08-13T00:00:00.000Z'),
  version: 1,
}

const blockSamples: Block[] = [
  { ...base, id: '1', order: 0, type: 'text', content: 'ordinary text' },
  { ...base, id: '2', order: 1, type: 'heading', level: 2, content: 'heading' },
  {
    ...base,
    id: '3',
    order: 2,
    type: 'code',
    language: 'python',
    content: 'print("kept")',
    output: { stdout: 'kept\n' },
    sessionId: 'session-3',
    isExecuting: false,
    executionTime: 17,
    error: 'historic error',
  },
  { ...base, id: '4', order: 3, type: 'math', latex: 'x^2', displayMode: true },
  { ...base, id: '5', order: 4, type: 'table', headers: ['A'], rows: [['B']] },
  { ...base, id: '6', order: 5, type: 'image', src: '/kept.png', alt: 'kept image' },
  { ...base, id: '7', order: 6, type: 'quote', content: 'quoted' },
  { ...base, id: '8', order: 7, type: 'list', listType: 'ordered', items: ['one'] },
  { ...base, id: '9', order: 8, type: 'horizontalRule' },
  { ...base, id: '10', order: 9, type: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'video' },
  { ...base, id: '11', order: 10, type: 'drawio', diagramData: '<mxGraphModel />', width: 300, height: 200 },
  { ...base, id: '12', order: 11, type: 'citation', citationKey: 'smith2020', citationData: { title: 'Paper' } },
  { ...base, id: '13', order: 12, type: 'bibliography', citations: ['smith2020'] },
  {
    ...base,
    id: '14',
    order: 13,
    type: 'subfigure',
    images: [{ src: 'a.png', caption: 'A' }],
    layout: 'horizontal',
  },
  {
    ...base,
    id: '15',
    order: 14,
    type: 'notaTable',
    tableData: [{ id: 'row', cells: { name: 'kept' } }],
    columns: ['name'],
  },
  {
    ...base,
    id: '16',
    order: 15,
    type: 'aiGeneration',
    prompt: 'retain this prompt',
    generatedContent: 'retained AI output',
    model: 'model-kept',
    timestamp: new Date('2026-08-13T01:02:03.000Z'),
  },
  {
    ...base,
    id: '17',
    order: 16,
    type: 'executableCodeBlock',
    language: 'javascript',
    content: 'console.log("kept")',
    output: { stdout: 'kept' },
    sessionId: 'session-exec',
    isExecuting: false,
    executionTime: 23,
    error: 'stored error',
    kernelPreferences: { kernel: 'node' },
  },
  {
    ...base,
    id: '18',
    order: 17,
    type: 'confusionMatrix',
    matrixData: { matrix: [[7, 1], [2, 8]], labels: ['cat', 'dog'] },
    title: 'Matrix',
    source: 'jupyter',
    filePath: '/matrix.json',
    stats: { accuracy: 0.8, precision: 0.7, recall: 0.6, f1Score: 0.65 },
  },
  {
    ...base,
    id: '19',
    order: 18,
    type: 'theorem',
    title: 'Theorem',
    content: 'Statement',
    proof: 'Proof',
    theoremType: 'lemma',
    number: '4',
    tags: ['kept'],
  },
  {
    ...base,
    id: '20',
    order: 19,
    type: 'pipeline',
    title: 'Pipeline',
    description: 'kept description',
    nodes: [{ id: 'n1', type: 'code', label: 'N1', position: { x: 0, y: 1 } }],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    config: { concurrency: 2 },
  },
  {
    ...base,
    id: '21',
    order: 20,
    type: 'mermaid',
    content: 'graph TD; A-->B',
    config: { theme: 'forest', flowchart: { useMaxWidth: false, htmlLabels: true } },
  },
  {
    ...base,
    id: '22',
    order: 21,
    type: 'subNotaLink',
    targetNotaId: 'target',
    targetNotaTitle: 'Target',
  },
]

function createLiveEditor(content?: any, options: Record<string, unknown> = {}) {
  return new Editor({
    content: content ?? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'valid prior document' }] }] },
    extensions: getEditorExtensions(),
    ...options,
  })
}

function expectedPayload(block: Block): Record<string, unknown> {
  const { id, order, notaId: _notaId, createdAt, updatedAt, version, ...payload } = block as any
  void id
  void order
  void _notaId
  void createdAt
  void updatedAt
  void version
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function reversePayload(node: any, originalType: Block['type']): Record<string, unknown> {
  const custom = persistedCustomBlockData(node)
  if (custom) return custom
  if (node.type === 'paragraph') {
    return persistedInlineBlockData(node) ?? { type: 'text', content: persistedNodeText(node) }
  }
  if (node.type === 'heading') {
    return { type: 'heading', level: node.attrs?.level || 1, content: persistedNodeText(node) }
  }
  if (node.type === 'table') return persistedTableBlockData(node)
  if (node.type === 'blockquote') return { type: 'quote', content: persistedNodeText(node) }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return {
      type: 'list',
      listType: node.type === 'orderedList' ? 'ordered' : 'unordered',
      items: node.content?.map(persistedNodeText) || [],
    }
  }
  if (node.type === 'horizontalRule') return { type: 'horizontalRule' }
  if (node.type === 'drawio') {
    return {
      type: 'drawio',
      diagramData: node.attrs?.diagramData || '',
      width: node.attrs?.width,
      height: node.attrs?.height,
    }
  }
  if (node.type === 'subNotaLink') {
    return {
      type: 'subNotaLink',
      targetNotaId: node.attrs?.targetNotaId || '',
      targetNotaTitle: node.attrs?.targetNotaTitle || 'Untitled Nota',
    }
  }
  throw new Error(`No reverse-persistence assertion for ${originalType} -> ${node.type}`)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('block-store to live-schema persistence boundary', () => {
  it('inventories every emitted block node against the live editor schema', () => {
    const store = useBlockStore()
    const editor = createLiveEditor()

    for (const block of blockSamples) {
      const json = { type: 'doc', content: [store.convertBlockToTiptap(block)] }
      const document = editor.schema.nodeFromJSON(json)
      expect(() => document.check(), `${block.type} emitted invalid live-schema JSON`).not.toThrow()
      const normalized = document.toJSON().content?.[0]
      const expected = expectedPayload(block)
      const reversed = reversePayload(normalized, block.type)
      const relevantReversed = Object.fromEntries(
        Object.keys(expected).map((key) => [key, reversed[key]]),
      )
      expect(relevantReversed, `${block.type} payload was silently normalized away`).toEqual(expected)
    }
  })

  it('hydrates and refreshes mixed text and compatibility records without losing payload', () => {
    const store = useBlockStore()
    const mixed = blockSamples.filter((block) => ['text', 'code', 'aiGeneration', 'mermaid'].includes(block.type))
    const content = {
      type: 'doc',
      content: mixed.map((block) => store.convertBlockToTiptap(block)),
    }
    const firstEditor = createLiveEditor()

    expect(firstEditor.commands.setContent(content)).toBe(true)
    expect(firstEditor.getText()).toContain('ordinary text')
    expect(firstEditor.getText()).toContain('print("kept")')
    expect(firstEditor.getText()).toContain('retained AI output')

    const refreshedContent = firstEditor.getJSON()
    const refreshedEditor = createLiveEditor()
    expect(refreshedEditor.commands.setContent(refreshedContent)).toBe(true)

    const refreshed = refreshedEditor.getJSON().content ?? []
    expect(refreshed.find((node) => node.type === 'codeBlock')?.attrs).toMatchObject({
      language: 'python',
      output: { stdout: 'kept\n' },
      sessionId: 'session-3',
      isExecuting: false,
      executionTime: 17,
      error: 'historic error',
    })
    expect(refreshed.find((node) => node.type === 'aiGeneration')).toMatchObject({
      attrs: {
        prompt: 'retain this prompt',
        model: 'model-kept',
        timestamp: new Date('2026-08-13T01:02:03.000Z'),
      },
      content: [{ type: 'text', text: 'retained AI output' }],
    })
    expect(refreshed.find((node) => node.type === 'mermaid')?.attrs).toMatchObject({
      content: 'graph TD; A-->B',
      config: { theme: 'forest', flowchart: { useMaxWidth: false, htmlLabels: true } },
    })

    const htmlRefreshed = new Editor({
      content: refreshedEditor.getHTML(),
      extensions: getEditorExtensions(),
    }).getJSON().content ?? []
    expect(htmlRefreshed.find((node) => node.type === 'codeBlock')).toMatchObject({
      attrs: { language: 'python', output: { stdout: 'kept\n' }, sessionId: 'session-3' },
      content: [{ type: 'text', text: 'print("kept")' }],
    })
    expect(htmlRefreshed.find((node) => node.type === 'aiGeneration')).toMatchObject({
      attrs: {
        prompt: 'retain this prompt',
        model: 'model-kept',
        timestamp: '2026-08-13T01:02:03.000Z',
      },
      content: [{ type: 'text', text: 'retained AI output' }],
    })
    expect(htmlRefreshed.find((node) => node.type === 'mermaid')?.attrs).toMatchObject({
      content: 'graph TD; A-->B',
      config: { theme: 'forest', flowchart: { useMaxWidth: false, htmlLabels: true } },
    })
  })

  it('refuses an invalid load without rewriting block order or scheduling autosave', () => {
    const rewriteBlockOrder = vi.fn()
    const autosave = vi.fn()
    const onContentError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const editor = createLiveEditor(undefined, {
      onUpdate: () => {
        rewriteBlockOrder([])
        autosave()
      },
      onContentError,
    })
    const before = editor.getJSON()

    expect(editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'removedExperimentalBlock', attrs: { payload: 'must not erase prior data' } }],
    })).toBe(false)

    expect(editor.getJSON()).toEqual(before)
    expect(rewriteBlockOrder).not.toHaveBeenCalled()
    expect(autosave).not.toHaveBeenCalled()
    expect(onContentError).toHaveBeenCalledWith(expect.objectContaining({ operation: 'setContent' }))
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
