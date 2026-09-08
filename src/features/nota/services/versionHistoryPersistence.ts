import { db } from '@/db'
import type { Block, NotaBlockStructure } from '@/features/nota/types/blocks'
import type {
  CanonicalBlockSnapshot,
  CanonicalNotaContentSnapshot,
} from '@/features/nota/types/nota'
import { restoredProseMirrorNode } from '@/features/editor/pm/persistedBlockConversion'

const SNAPSHOT_FORMAT = 'normalized-blocks-v1' as const

function compositeId(block: Pick<CanonicalBlockSnapshot, 'id' | 'type'>): string {
  return `${block.type}:${String(block.id)}`
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function serializeBlock(block: Block, order: number): CanonicalBlockSnapshot {
  const serialized = jsonClone(block) as unknown as CanonicalBlockSnapshot
  serialized.order = order
  serialized.createdAt = block.createdAt instanceof Date
    ? block.createdAt.toISOString()
    : String(block.createdAt)
  serialized.updatedAt = block.updatedAt instanceof Date
    ? block.updatedAt.toISOString()
    : String(block.updatedAt)
  return serialized
}

function deserializeBlock(block: CanonicalBlockSnapshot): Block {
  const deserialized = {
    ...jsonClone(block),
    createdAt: new Date(block.createdAt),
    updatedAt: new Date(block.updatedAt),
  } as Block
  if (deserialized.type === 'aiGeneration') {
    deserialized.timestamp = new Date(deserialized.timestamp)
  }
  return deserialized
}

export function validateCanonicalSnapshot(
  notaId: string,
  snapshot: CanonicalNotaContentSnapshot,
): void {
  if (snapshot?.format !== SNAPSHOT_FORMAT) {
    throw new Error(`unsupported canonical content format: ${String(snapshot?.format)}`)
  }
  if (!Array.isArray(snapshot.blockOrder) || !Array.isArray(snapshot.blocks)) {
    throw new Error('canonical content is missing its block order or block records')
  }
  if (snapshot.structureId !== undefined
    && typeof snapshot.structureId !== 'string'
    && typeof snapshot.structureId !== 'number') {
    throw new Error('canonical content has an invalid block structure id')
  }

  const ids = snapshot.blocks.map((block) => {
    if (!block || block.id == null || typeof block.type !== 'string') {
      throw new Error('canonical content contains a block without an id or type')
    }
    if (block.notaId !== notaId) {
      throw new Error(`canonical block ${compositeId(block)} belongs to another nota`)
    }
    // This also rejects a type for which no canonical table exists before any
    // destructive statement in restoreCanonicalContent can run.
    db.getBlockTable(block.type)
    if (block.proseMirrorNode !== undefined) restoredProseMirrorNode(block as unknown as Block)
    return compositeId(block)
  })

  if (new Set(ids).size !== ids.length || new Set(snapshot.blockOrder).size !== snapshot.blockOrder.length) {
    throw new Error('canonical content contains duplicate block identifiers')
  }
  if (ids.length !== snapshot.blockOrder.length || ids.some((id, index) => id !== snapshot.blockOrder[index])) {
    throw new Error('canonical block records do not exactly match the saved block order')
  }
}

/** Capture live normalized block rows in their canonical composite order. */
export async function captureCanonicalContent(notaId: string): Promise<CanonicalNotaContentSnapshot> {
  const structures = await db.blockStructures.where('notaId').equals(notaId).toArray()
  if (structures.length !== 1) {
    throw new Error(
      structures.length === 0
        ? 'no canonical block structure exists for this nota'
        : 'multiple canonical block structures exist for this nota',
    )
  }

  const structure = structures[0] as unknown as NotaBlockStructure
  const rows = await db.getAllBlocksForNota(notaId) as Block[]
  const byId = new Map(rows.map((block) => [compositeId(block as unknown as CanonicalBlockSnapshot), block]))
  const blocks = structure.blockOrder.map((id, index) => {
    const block = byId.get(id)
    if (!block) throw new Error(`canonical block order references missing block ${id}`)
    return serializeBlock(block, index)
  })

  const snapshot: CanonicalNotaContentSnapshot = {
    format: SNAPSHOT_FORMAT,
    blockOrder: [...structure.blockOrder],
    blocks,
    ...(structure.id != null ? { structureId: structure.id } : {}),
    structureVersion: structure.version,
    capturedAt: new Date().toISOString(),
  }
  validateCanonicalSnapshot(notaId, snapshot)
  return snapshot
}

/**
 * Replace the live canonical rows. The caller owns the encompassing Dexie
 * transaction so metadata, rows, and order commit or roll back together.
 */
export async function restoreCanonicalContent(
  notaId: string,
  snapshot: CanonicalNotaContentSnapshot,
): Promise<{ blocks: Block[]; structure: NotaBlockStructure }> {
  validateCanonicalSnapshot(notaId, snapshot)

  const existingStructures = await db.blockStructures.where('notaId').equals(notaId).toArray()
  const structureId = snapshot.structureId ?? existingStructures[0]?.id

  await db.deleteAllBlocksForNota(notaId)
  for (const block of snapshot.blocks) {
    await db.getBlockTable(block.type).put(deserializeBlock(block) as never)
  }

  await db.blockStructures.where('notaId').equals(notaId).delete()
  const structure: NotaBlockStructure = {
    ...(structureId != null ? { id: structureId } : {}),
    notaId,
    blockOrder: [...snapshot.blockOrder],
    version: snapshot.structureVersion,
    lastModified: new Date(snapshot.capturedAt),
  }
  const persistedStructure = {
    ...structure,
    lastModified: structure.lastModified.toISOString(),
  }
  if (structureId != null) {
    await db.blockStructures.put(persistedStructure as unknown as NotaBlockStructure)
  } else {
    structure.id = await db.blockStructures.add(persistedStructure as unknown as NotaBlockStructure)
  }

  return {
    blocks: snapshot.blocks.map(deserializeBlock),
    structure,
  }
}

/**
 * Validate every snapshot before opening the transaction, then hydrate a set of
 * filesystem notas as one canonical Dexie change. This prevents a corrupt file
 * late in a directory scan from partially replacing the browser cache.
 */
export async function restoreCanonicalContents(
  entries: ReadonlyArray<{ notaId: string; snapshot: CanonicalNotaContentSnapshot }>,
): Promise<void> {
  for (const { notaId, snapshot } of entries) validateCanonicalSnapshot(notaId, snapshot)

  await db.transaction('rw', db.tables, async () => {
    for (const { notaId, snapshot } of entries) {
      await restoreCanonicalContent(notaId, snapshot)
    }
  })
}
