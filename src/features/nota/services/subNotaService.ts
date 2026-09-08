import { nanoid } from 'nanoid'
import { TextSelection } from 'prosemirror-state'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Editor } from '@/features/editor/pm'

export interface LinkedSubNotaCreationOptions {
  parentId: string
  title: string
  editor: Editor
  range?: { from: number; to: number }
}

/**
 * Prepare the parent link without dispatching it, then commit parent content
 * and child metadata/content as one authority transition. The editor changes
 * only after durability succeeds, so a failed create leaves the parent intact.
 */
export async function createLinkedSubNota({
  parentId,
  title,
  editor,
  range,
}: LinkedSubNotaCreationOptions) {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) throw new Error('Title cannot be empty.')
  if (!parentId.trim()) throw new Error('Parent nota is unavailable.')

  const childId = nanoid()
  const initialDoc = editor.state.doc
  const nodeType = editor.state.schema.nodes.subNotaLink
  if (!nodeType) throw new Error('Sub-nota links are unavailable in this editor.')

  const link = nodeType.create({
    targetNotaId: childId,
    targetNotaTitle: normalizedTitle,
    displayText: normalizedTitle,
    linkStyle: 'inline',
  })
  let transaction = editor.state.tr
  if (range) {
    transaction = transaction.delete(range.from, range.to)
    transaction = transaction.setSelection(TextSelection.near(transaction.doc.resolve(range.from)))
  }
  transaction = transaction.replaceSelectionWith(link).scrollIntoView()
  const parentDocument = transaction.doc.toJSON()

  const child = await useNotaStore().createLinkedSubNota(
    parentId,
    childId,
    normalizedTitle,
    parentDocument,
  )
  if (editor.state.doc !== initialDoc) {
    throw new Error('The parent nota changed while the sub-nota was being created. Reload to view the committed link.')
  }
  editor.view.dispatch(transaction)
  return child
}
