import type { Block, ProseMirrorNodeJSON } from '@/features/nota/types/blocks'

export const PERSISTED_PROSEMIRROR_NODE_VERSION = 1 as const

const blockRootTypes: Record<Block['type'], ReadonlySet<string>> = {
  text: new Set(['paragraph', 'notaTitle']),
  heading: new Set(['heading']),
  code: new Set(['codeBlock']),
  math: new Set(['math']),
  table: new Set(['table']),
  image: new Set(['paragraph']),
  quote: new Set(['blockquote']),
  list: new Set(['bulletList', 'orderedList', 'taskList']),
  horizontalRule: new Set(['horizontalRule']),
  youtube: new Set(['youtube']),
  drawio: new Set(['drawio']),
  citation: new Set(['paragraph']),
  bibliography: new Set(['bibliography']),
  subfigure: new Set(['subfigure']),
  notaTable: new Set(['notaTable']),
  aiGeneration: new Set(['aiGeneration']),
  executableCodeBlock: new Set(['executableCodeBlock']),
  confusionMatrix: new Set(['confusionMatrix']),
  theorem: new Set(['theorem']),
  pipeline: new Set(['pipeline']),
  mermaid: new Set(['mermaid']),
  subNotaLink: new Set(['subNotaLink']),
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Decode the small, versioned persistence envelope without importing the
 * ProseMirror schema. Mutation paths additionally run the full shared-schema
 * validator from persistedBlockConversion before changing state or storage.
 */
export function restoredProseMirrorEnvelope(block: Block): ProseMirrorNodeJSON | null {
  if (block.proseMirrorNode === undefined) return null
  const persisted = jsonClone(block.proseMirrorNode)
  if (
    persisted.format !== 'prosemirror-node'
    || persisted.version !== PERSISTED_PROSEMIRROR_NODE_VERSION
    || !persisted.value
  ) {
    throw new Error(`Unsupported persisted ProseMirror representation on ${block.type} block`)
  }
  if (!blockRootTypes[block.type].has(persisted.value.type)) {
    throw new Error(`Persisted ${persisted.value.type} node does not match ${block.type} block`)
  }
  return jsonClone(persisted.value)
}
