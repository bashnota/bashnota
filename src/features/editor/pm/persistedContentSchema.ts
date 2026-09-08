import { Schema, type MarkType, type NodeType } from 'prosemirror-model'

import { bibliographyDefinition, citationDefinition } from '@/features/editor/components/blocks/citation-block/CitationExtension'
import { confusionMatrixDefinition } from '@/features/editor/components/blocks/confusion-matrix/ConfusionMatrixExtension'
import { drawIoDefinition } from '@/features/editor/components/blocks/drawio-block/drawio.node'
import { executableCodeBlockDefinition } from '@/features/editor/components/blocks/executable-code-block/ExecutableCodeBlockExtension'
import { mathDefinition } from '@/features/editor/components/blocks/math-block/math-extension'
import { pipelineDefinition } from '@/features/editor/components/blocks/pipeline/PipelineExtension'
import { subfigureDefinition } from '@/features/editor/components/blocks/subfigure-block/subfigure-extension'
import { notaTableDefinition } from '@/features/editor/components/blocks/table-block/TableExtension'
import { theoremDefinition } from '@/features/editor/components/blocks/theorem-block/theorem-extension'
import { youtubeDefinition } from '@/features/editor/components/blocks/youtube-block/youtube.node'
import { notaTitleDefinition } from '@/features/editor/components/extensions/NotaTitleExtension'
import { pageLinkDefinition } from '@/features/editor/components/extensions/PageLinkExtension'
import { subNotaLinkDefinition } from '@/features/editor/components/extensions/SubNotaLinkExtension'
import { persistedBlockCompatibilityDefinitions } from './persistedBlockCompatibility'
import { stockMarks, stockNodes } from './stockExtensions'

/**
 * Persistence validation uses the same concrete NodeSpecs as the live editor,
 * but deliberately excludes plugins and Vue node views. Constructing the
 * schema synchronously here avoids a store/editor import cycle and guarantees
 * that invalid content is rejected before any IndexedDB mutation starts.
 */
const customDefinitions = [
  executableCodeBlockDefinition,
  pageLinkDefinition,
  notaTableDefinition,
  mathDefinition,
  youtubeDefinition,
  subfigureDefinition,
  drawIoDefinition,
  citationDefinition,
  bibliographyDefinition,
  theoremDefinition,
  confusionMatrixDefinition,
  pipelineDefinition,
  subNotaLinkDefinition,
  ...persistedBlockCompatibilityDefinitions,
  notaTitleDefinition,
]

export const persistedContentSchema = new Schema({
  nodes: {
    ...stockNodes,
    ...Object.fromEntries(customDefinitions.map(({ name, spec }) => [name, spec])),
  },
  marks: stockMarks,
})

function rejectUnknownAttrs(
  input: unknown,
  type: NodeType | MarkType,
  path: string,
): void {
  if (input === undefined) return
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${path} must be an object`)
  }
  const allowed = new Set(Object.keys(type.spec.attrs ?? {}))
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new Error(`${path}.${key} is not a declared schema attribute`)
  }
}

/** Reject attributes that ProseMirror would otherwise silently discard. */
export function assertDeclaredSchemaAttrs(value: any, path = 'doc'): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const nodeType = typeof value.type === 'string' ? persistedContentSchema.nodes[value.type] : undefined
  if (nodeType) rejectUnknownAttrs(value.attrs, nodeType, `${path}.attrs`)
  if (Array.isArray(value.marks)) {
    value.marks.forEach((mark: any, index: number) => {
      const markType = typeof mark?.type === 'string' ? persistedContentSchema.marks[mark.type] : undefined
      if (markType) rejectUnknownAttrs(mark.attrs, markType, `${path}.marks[${index}].attrs`)
    })
  }
  if (Array.isArray(value.content)) {
    value.content.forEach((child: unknown, index: number) =>
      assertDeclaredSchemaAttrs(child, `${path}.content[${index}]`),
    )
  }
}
