import { db, type NotaDB } from '@/db'
import type { Nota } from '@/features/nota/types/nota'
import type { Block, NotaBlockStructure } from '@/features/nota/types/blocks'
import { restoredProseMirrorNode } from '@/features/editor/pm/persistedBlockConversion'

export const BACKUP_FORMAT = 'bashnota-backup' as const
export const BACKUP_VERSION = 1 as const

export const BLOCK_TABLES = {
  textBlocks: 'text',
  headingBlocks: 'heading',
  codeBlocks: 'code',
  mathBlocks: 'math',
  tableBlocks: 'table',
  imageBlocks: 'image',
  quoteBlocks: 'quote',
  listBlocks: 'list',
  horizontalRuleBlocks: 'horizontalRule',
  youtubeBlocks: 'youtube',
  drawIoBlocks: 'drawio',
  citationBlocks: 'citation',
  bibliographyBlocks: 'bibliography',
  subfigureBlocks: 'subfigure',
  notaTableBlocks: 'notaTable',
  aiGenerationBlocks: 'aiGeneration',
  executableCodeBlocks: 'executableCodeBlock',
  confusionMatrixBlocks: 'confusionMatrix',
  theoremBlocks: 'theorem',
  pipelineBlocks: 'pipeline',
  mermaidBlocks: 'mermaid',
  subNotaLinkBlocks: 'subNotaLink',
} as const

export type BlockTableName = keyof typeof BLOCK_TABLES
export type BackupRow = Record<string, unknown>

export interface BashNotaBackupArchive {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  notas: BackupRow[]
  blockStructures: BackupRow[]
  blocks: Record<BlockTableName, BackupRow[]>
}

export class BackupArchiveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupArchiveError'
  }
}

type BackupDatabase = Pick<NotaDB, 'notas' | 'blockStructures' | 'transaction'> & {
  [K in BlockTableName]: NotaDB[K]
}

export interface BackupNotaAuthority {
  getAllNotas(): Promise<Nota[]>
  saveNota(nota: Nota): Promise<void>
  deleteNota(id: string): Promise<void>
}

const blockTableNames = Object.keys(BLOCK_TABLES) as BlockTableName[]

function isRecord(value: unknown): value is BackupRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertRecordArray(value: unknown, path: string): asserts value is BackupRow[] {
  if (!Array.isArray(value)) throw new BackupArchiveError(`${path} must be an array.`)
  value.forEach((row, index) => {
    if (!isRecord(row)) throw new BackupArchiveError(`${path}[${index}] must be an object.`)
  })
}

function requiredString(row: BackupRow, field: string, path: string): string {
  const value = row[field]
  if (typeof value !== 'string' || value.length === 0) {
    throw new BackupArchiveError(`${path}.${field} must be a non-empty string.`)
  }
  return value
}

function validKey(value: unknown): value is string | number {
  return (typeof value === 'string' && value.length > 0)
    || (typeof value === 'number' && Number.isFinite(value))
}

function keyIdentity(value: string | number): string {
  return `${typeof value}:${JSON.stringify(value)}`
}

function assertDate(value: unknown, path: string): void {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new BackupArchiveError(`${path} must be an ISO date string.`)
  }
}

function assertString(value: unknown, path: string): void {
  if (typeof value !== 'string') throw new BackupArchiveError(`${path} must be a string.`)
}

function assertStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BackupArchiveError(`${path} must be an array of strings.`)
  }
}

function assertOptionalBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new BackupArchiveError(`${path} must be a boolean when present.`)
  }
}

function validateStructureMetadata(
  structure: BackupRow,
  path: string,
  expectedNotaId: string,
  requireId: boolean,
): void {
  if (requireId && !validKey(structure.id)) {
    throw new BackupArchiveError(`${path}.id must be a string or number.`)
  }
  if (requiredString(structure, 'notaId', path) !== expectedNotaId) {
    throw new BackupArchiveError(`${path}.notaId must match nota "${expectedNotaId}".`)
  }
  if (!Array.isArray(structure.blockOrder) || structure.blockOrder.some((id) => typeof id !== 'string')) {
    throw new BackupArchiveError(`${path}.blockOrder must be an array of composite block ids.`)
  }
  if (!Number.isInteger(structure.version) || (structure.version as number) < 1) {
    throw new BackupArchiveError(`${path}.version must be a positive integer.`)
  }
  assertDate(structure.lastModified, `${path}.lastModified`)
}

function validateCitation(value: unknown, path: string): void {
  if (!isRecord(value)) throw new BackupArchiveError(`${path} must be an object.`)
  requiredString(value, 'id', path)
  requiredString(value, 'key', path)
  requiredString(value, 'title', path)
  assertStringArray(value.authors, `${path}.authors`)
  assertString(value.year, `${path}.year`)
  assertDate(value.createdAt, `${path}.createdAt`)
  for (const field of ['journal', 'volume', 'number', 'pages', 'publisher', 'url', 'doi']) {
    if (value[field] !== undefined) assertString(value[field], `${path}.${field}`)
  }
}

function validateCanonicalSnapshot(value: unknown, path: string, notaId: string): void {
  if (!isRecord(value)) throw new BackupArchiveError(`${path} must be an object.`)
  if (value.format !== 'normalized-blocks-v1') {
    throw new BackupArchiveError(`${path}.format must be "normalized-blocks-v1".`)
  }
  if (!Number.isInteger(value.structureVersion) || (value.structureVersion as number) < 1) {
    throw new BackupArchiveError(`${path}.structureVersion must be a positive integer.`)
  }
  assertDate(value.capturedAt, `${path}.capturedAt`)
  if (!Array.isArray(value.blockOrder) || value.blockOrder.some((id) => typeof id !== 'string')) {
    throw new BackupArchiveError(`${path}.blockOrder must be an array of composite block ids.`)
  }
  assertRecordArray(value.blocks, `${path}.blocks`)

  const candidates = new Map<string, Array<{ identity: string; order: number }>>()
  const identities = new Set<string>()
  value.blocks.forEach((block, index) => {
    const blockPath = `${path}.blocks[${index}]`
    if (!Object.values(BLOCK_TABLES).includes(block.type as typeof BLOCK_TABLES[BlockTableName])) {
      throw new BackupArchiveError(`${blockPath}.type is not a supported block type.`)
    }
    if (!validKey(block.id)) throw new BackupArchiveError(`${blockPath}.id must be a string or number.`)
    if (requiredString(block, 'notaId', blockPath) !== notaId) {
      throw new BackupArchiveError(`${blockPath}.notaId must match version nota "${notaId}".`)
    }
    if (!Number.isInteger(block.order) || (block.order as number) < 0) {
      throw new BackupArchiveError(`${blockPath}.order must be a non-negative integer.`)
    }
    if (!Number.isInteger(block.version) || (block.version as number) < 1) {
      throw new BackupArchiveError(`${blockPath}.version must be a positive integer.`)
    }
    assertDate(block.createdAt, `${blockPath}.createdAt`)
    assertDate(block.updatedAt, `${blockPath}.updatedAt`)
    validateTypedPayload(block, blockPath)
    const identity = `${block.type}:${keyIdentity(block.id)}`
    if (identities.has(identity)) throw new BackupArchiveError(`${path} contains duplicate typed block key "${identity}".`)
    identities.add(identity)
    const compositeId = `${block.type}:${String(block.id)}`
    if (candidates.has(compositeId)) {
      throw new BackupArchiveError(`${path} contains ambiguous numeric/string keys for block "${compositeId}".`)
    }
    candidates.set(compositeId, [...(candidates.get(compositeId) ?? []), { identity, order: block.order as number }])
  })

  const ordered = new Set<string>()
  ;(value.blockOrder as string[]).forEach((compositeId, order) => {
    const matches = (candidates.get(compositeId) ?? []).filter((candidate) => candidate.order === order)
    if (matches.length !== 1) {
      throw new BackupArchiveError(`${path}.blockOrder[${order}] does not resolve to exactly one typed block.`)
    }
    ordered.add(matches[0].identity)
  })
  if (ordered.size !== value.blocks.length) {
    throw new BackupArchiveError(`${path} does not order every canonical block exactly once.`)
  }
}

function validateNotaMetadata(nota: BackupRow, path: string, includeVersions: boolean): string {
  const id = requiredString(nota, 'id', path)
  requiredString(nota, 'title', path)
  if (nota.parentId !== null && nota.parentId !== undefined && typeof nota.parentId !== 'string') {
    throw new BackupArchiveError(`${path}.parentId must be a string or null.`)
  }
  assertDate(nota.createdAt, `${path}.createdAt`)
  assertDate(nota.updatedAt, `${path}.updatedAt`)
  assertStringArray(nota.tags, `${path}.tags`)
  assertOptionalBoolean(nota.favorite, `${path}.favorite`)
  assertOptionalBoolean(nota.isPublished, `${path}.isPublished`)
  if (nota.publishedAt !== undefined && nota.publishedAt !== null) assertDate(nota.publishedAt, `${path}.publishedAt`)
  if (nota.blockStructureId !== undefined && !validKey(nota.blockStructureId)) {
    throw new BackupArchiveError(`${path}.blockStructureId must be a string or number when present.`)
  }
  if (nota.blockStructure !== undefined) {
    if (!isRecord(nota.blockStructure)) throw new BackupArchiveError(`${path}.blockStructure must be an object.`)
    validateStructureMetadata(nota.blockStructure, `${path}.blockStructure`, id, false)
  }
  if (nota.citations !== undefined) {
    if (!Array.isArray(nota.citations)) throw new BackupArchiveError(`${path}.citations must be an array.`)
    nota.citations.forEach((citation, index) => validateCitation(citation, `${path}.citations[${index}]`))
  }
  if (!includeVersions && nota.versions !== undefined) {
    throw new BackupArchiveError(`${path}.versions is not allowed inside historical metadata.`)
  }
  return id
}

function validateVersions(nota: BackupRow, path: string, notaId: string): void {
  if (nota.versions === undefined) return
  if (!Array.isArray(nota.versions)) throw new BackupArchiveError(`${path}.versions must be an array.`)
  const versionIds = new Set<string>()
  nota.versions.forEach((value, index) => {
    const versionPath = `${path}.versions[${index}]`
    if (!isRecord(value)) throw new BackupArchiveError(`${versionPath} must be an object.`)
    const versionId = requiredString(value, 'id', versionPath)
    if (versionIds.has(versionId)) throw new BackupArchiveError(`${path}.versions contains duplicate id "${versionId}".`)
    versionIds.add(versionId)
    if (requiredString(value, 'notaId', versionPath) !== notaId) {
      throw new BackupArchiveError(`${versionPath}.notaId must match nota "${notaId}".`)
    }
    requiredString(value, 'versionName', versionPath)
    assertDate(value.createdAt, `${versionPath}.createdAt`)
    if (!isRecord(value.nota)) throw new BackupArchiveError(`${versionPath}.nota must be an object.`)
    const historicalId = validateNotaMetadata(value.nota, `${versionPath}.nota`, false)
    if (historicalId !== notaId) throw new BackupArchiveError(`${versionPath}.nota.id must match nota "${notaId}".`)
    if (value.canonicalContent !== undefined) {
      validateCanonicalSnapshot(value.canonicalContent, `${versionPath}.canonicalContent`, notaId)
    }
  })
}

function validateTypedPayload(row: BackupRow, path: string): void {
  switch (row.type) {
    case 'text':
      if (typeof row.content !== 'string' && !Array.isArray(row.content)) throw new BackupArchiveError(`${path}.content must be text or inline content.`)
      break
    case 'heading':
      if (!Number.isInteger(row.level)) throw new BackupArchiveError(`${path}.level must be an integer.`)
      assertString(row.content, `${path}.content`)
      break
    case 'code':
    case 'executableCodeBlock':
      assertString(row.language, `${path}.language`)
      assertString(row.content, `${path}.content`)
      break
    case 'math': assertString(row.latex, `${path}.latex`); break
    case 'table':
      assertStringArray(row.headers, `${path}.headers`)
      if (!Array.isArray(row.rows) || row.rows.some((cells) => !Array.isArray(cells) || cells.some((cell) => typeof cell !== 'string'))) {
        throw new BackupArchiveError(`${path}.rows must be an array of string arrays.`)
      }
      break
    case 'image': assertString(row.src, `${path}.src`); break
    case 'quote': assertString(row.content, `${path}.content`); break
    case 'list':
      if (!['ordered', 'unordered', 'task'].includes(row.listType as string)) throw new BackupArchiveError(`${path}.listType is invalid.`)
      assertStringArray(row.items, `${path}.items`)
      if (row.checked !== undefined && (!Array.isArray(row.checked) || row.checked.some((value) => typeof value !== 'boolean'))) {
        throw new BackupArchiveError(`${path}.checked must be an array of booleans.`)
      }
      break
    case 'youtube': assertString(row.videoId, `${path}.videoId`); break
    case 'drawio': assertString(row.diagramData, `${path}.diagramData`); break
    case 'citation':
      assertString(row.citationKey, `${path}.citationKey`)
      if (row.citationData === undefined) throw new BackupArchiveError(`${path}.citationData is required.`)
      break
    case 'bibliography': assertStringArray(row.citations, `${path}.citations`); break
    case 'subfigure':
      if (!Array.isArray(row.images) || row.images.some((image) => !isRecord(image) || typeof image.src !== 'string')) {
        throw new BackupArchiveError(`${path}.images must contain image objects with src values.`)
      }
      if (!['horizontal', 'vertical', 'grid'].includes(row.layout as string)) throw new BackupArchiveError(`${path}.layout is invalid.`)
      break
    case 'notaTable':
      if (!Array.isArray(row.tableData)) throw new BackupArchiveError(`${path}.tableData must be an array.`)
      assertStringArray(row.columns, `${path}.columns`)
      break
    case 'aiGeneration':
      assertString(row.prompt, `${path}.prompt`)
      assertString(row.generatedContent, `${path}.generatedContent`)
      assertDate(row.timestamp, `${path}.timestamp`)
      break
    case 'theorem':
      assertString(row.title, `${path}.title`)
      assertString(row.content, `${path}.content`)
      break
    case 'pipeline':
      assertString(row.title, `${path}.title`)
      if (!Array.isArray(row.nodes) || !Array.isArray(row.edges)) throw new BackupArchiveError(`${path}.nodes and .edges must be arrays.`)
      break
    case 'mermaid': assertString(row.content, `${path}.content`); break
    case 'subNotaLink':
      assertString(row.targetNotaId, `${path}.targetNotaId`)
      assertString(row.targetNotaTitle, `${path}.targetNotaTitle`)
      break
    case 'horizontalRule':
    case 'confusionMatrix':
      break
  }
  if (row.proseMirrorNode !== undefined) {
    try {
      restoredProseMirrorNode(row as unknown as Block)
    } catch (error) {
      throw new BackupArchiveError(`${path}.proseMirrorNode is invalid: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Validate the complete archive and all cross-table references without mutation. */
export function validateBackupArchive(input: unknown): BashNotaBackupArchive {
  if (!isRecord(input)) throw new BackupArchiveError('The selected file is not a BashNota backup object.')
  if (input.format !== BACKUP_FORMAT) {
    throw new BackupArchiveError(`Unsupported backup format. Expected "${BACKUP_FORMAT}".`)
  }
  if (input.version !== BACKUP_VERSION) {
    throw new BackupArchiveError(`Unsupported backup version ${String(input.version)}. Expected version ${BACKUP_VERSION}.`)
  }
  assertDate(input.exportedAt, 'exportedAt')
  assertRecordArray(input.notas, 'notas')
  assertRecordArray(input.blockStructures, 'blockStructures')
  if (!isRecord(input.blocks)) throw new BackupArchiveError('blocks must be an object containing all typed block tables.')

  const notaIds = new Set<string>()
  input.notas.forEach((nota, index) => {
    const path = `notas[${index}]`
    const id = validateNotaMetadata(nota, path, true)
    if (notaIds.has(id)) throw new BackupArchiveError(`Duplicate nota id "${id}".`)
    notaIds.add(id)
    validateVersions(nota, path, id)
  })

  const parents = new Map<string, string>()
  input.notas.forEach((nota) => {
    const id = nota.id as string
    if (typeof nota.parentId === 'string') {
      if (!notaIds.has(nota.parentId)) {
        throw new BackupArchiveError(`Nota "${id}" refers to missing parent "${nota.parentId}".`)
      }
      parents.set(id, nota.parentId)
    }
  })
  for (const id of notaIds) {
    const seen = new Set<string>([id])
    let parent = parents.get(id)
    while (parent) {
      if (seen.has(parent)) throw new BackupArchiveError(`Nota hierarchy contains a cycle at "${parent}".`)
      seen.add(parent)
      parent = parents.get(parent)
    }
  }

  const structures = new Map<string, BackupRow>()
  const structureIds = new Map<string, string>()
  input.blockStructures.forEach((structure, index) => {
    const path = `blockStructures[${index}]`
    const notaId = requiredString(structure, 'notaId', path)
    if (!notaIds.has(notaId)) throw new BackupArchiveError(`${path} refers to missing nota "${notaId}".`)
    if (structures.has(notaId)) throw new BackupArchiveError(`Nota "${notaId}" has multiple block structures.`)
    validateStructureMetadata(structure, path, notaId, true)
    const structureIdentity = keyIdentity(structure.id as string | number)
    if (structureIds.has(structureIdentity)) {
      throw new BackupArchiveError(`${path}.id duplicates the structure for nota "${structureIds.get(structureIdentity)}".`)
    }
    structureIds.set(structureIdentity, notaId)
    structures.set(notaId, structure)
  })

  input.notas.forEach((nota, index) => {
    const structure = structures.get(nota.id as string)
    if (nota.blockStructureId !== undefined
      && (!structure || keyIdentity(structure.id as string | number) !== keyIdentity(nota.blockStructureId as string | number))) {
      throw new BackupArchiveError(`notas[${index}].blockStructureId does not identify its canonical block structure.`)
    }
    if (nota.blockStructure !== undefined) {
      if (!structure) throw new BackupArchiveError(`notas[${index}].blockStructure has no canonical structure row.`)
      const embedded = nota.blockStructure as BackupRow
      if (JSON.stringify(embedded.blockOrder) !== JSON.stringify(structure.blockOrder)
        || embedded.version !== structure.version
        || embedded.lastModified !== structure.lastModified) {
        throw new BackupArchiveError(`notas[${index}].blockStructure does not match its canonical structure row.`)
      }
    }
  })

  const blocks = {} as Record<BlockTableName, BackupRow[]>
  type BlockOwner = { identity: string; notaId: string; order: number }
  const blockOwners = new Map<string, BlockOwner[]>()
  const allBlockOwners: BlockOwner[] = []
  for (const tableName of blockTableNames) {
    const rows = input.blocks[tableName]
    assertRecordArray(rows, `blocks.${tableName}`)
    blocks[tableName] = rows
    const ids = new Set<string>()
    rows.forEach((row, index) => {
      const path = `blocks.${tableName}[${index}]`
      if (row.type !== BLOCK_TABLES[tableName]) {
        throw new BackupArchiveError(`${path}.type must be "${BLOCK_TABLES[tableName]}".`)
      }
      if (!validKey(row.id)) throw new BackupArchiveError(`${path}.id must be a string or number.`)
      const notaId = requiredString(row, 'notaId', path)
      if (!notaIds.has(notaId)) throw new BackupArchiveError(`${path} refers to missing nota "${notaId}".`)
      if (!Number.isInteger(row.order) || (row.order as number) < 0) {
        throw new BackupArchiveError(`${path}.order must be a non-negative integer.`)
      }
      if (!Number.isInteger(row.version) || (row.version as number) < 1) {
        throw new BackupArchiveError(`${path}.version must be a positive integer.`)
      }
      assertDate(row.createdAt, `${path}.createdAt`)
      assertDate(row.updatedAt, `${path}.updatedAt`)
      validateTypedPayload(row, path)
      const identity = `${tableName}:${keyIdentity(row.id)}`
      if (ids.has(identity)) throw new BackupArchiveError(`Duplicate typed id in blocks.${tableName}.`)
      ids.add(identity)
      const compositeId = `${BLOCK_TABLES[tableName]}:${String(row.id)}`
      if (blockOwners.has(compositeId)) {
        throw new BackupArchiveError(`Archive contains ambiguous numeric/string keys for block "${compositeId}".`)
      }
      const owner = { identity, notaId, order: row.order as number }
      blockOwners.set(compositeId, [...(blockOwners.get(compositeId) ?? []), owner])
      allBlockOwners.push(owner)
    })
  }

  const orderedIds = new Set<string>()
  for (const [notaId, structure] of structures) {
    for (const [order, compositeId] of (structure.blockOrder as string[]).entries()) {
      const matches = (blockOwners.get(compositeId) ?? [])
        .filter((owner) => owner.notaId === notaId && owner.order === order && !orderedIds.has(owner.identity))
      if (matches.length === 0) {
        throw new BackupArchiveError(`Nota "${notaId}" orders missing block "${compositeId}".`)
      }
      if (matches.length > 1) {
        throw new BackupArchiveError(`Nota "${notaId}" has ambiguous numeric/string keys for block "${compositeId}" at order ${order}.`)
      }
      orderedIds.add(matches[0].identity)
    }
  }
  for (const owner of allBlockOwners) {
    if (!structures.has(owner.notaId)) throw new BackupArchiveError(`Nota "${owner.notaId}" has blocks but no block structure.`)
    if (!orderedIds.has(owner.identity)) throw new BackupArchiveError(`A block in nota "${owner.notaId}" is absent from canonical block order.`)
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: input.exportedAt as string,
    notas: input.notas,
    blockStructures: input.blockStructures,
    blocks,
  }
}

function databaseTables(database: BackupDatabase) {
  return [
    database.notas,
    database.blockStructures,
    ...blockTableNames.map((tableName) => database[tableName]),
  ]
}

function canonicalDatabaseTables(database: BackupDatabase) {
  return [
    database.blockStructures,
    ...blockTableNames.map((tableName) => database[tableName]),
  ]
}

/** Capture one transactionally consistent, JSON-safe disaster-recovery archive. */
export async function createBackupArchive(
  database: BackupDatabase = db,
  notaAuthority?: BackupNotaAuthority,
): Promise<BashNotaBackupArchive> {
  const notas = notaAuthority
    ? jsonClone(await notaAuthority.getAllNotas()) as unknown as BackupRow[]
    : null
  const tables = notaAuthority ? canonicalDatabaseTables(database) : databaseTables(database)
  const archive = await database.transaction('r', tables, async () => {
    const blocks = {} as Record<BlockTableName, BackupRow[]>
    for (const tableName of blockTableNames) {
      blocks[tableName] = jsonClone(await database[tableName].toArray()) as unknown as BackupRow[]
    }
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      notas: notas ?? jsonClone(await database.notas.toArray()),
      blockStructures: jsonClone(await database.blockStructures.toArray()),
      blocks,
    }
  })
  return validateBackupArchive(archive)
}

function reviveBlock(row: BackupRow): BackupRow {
  const revived: BackupRow = {
    ...row,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  }
  if (row.type === 'aiGeneration' && typeof row.timestamp === 'string') revived.timestamp = new Date(row.timestamp)
  return revived
}

type CanonicalDatabaseSnapshot = {
  blockStructures: BackupRow[]
  blocks: Record<BlockTableName, BackupRow[]>
}

async function captureCanonicalDatabase(database: BackupDatabase): Promise<CanonicalDatabaseSnapshot> {
  const tables = canonicalDatabaseTables(database)
  return database.transaction('r', tables, async () => {
    const blocks = {} as Record<BlockTableName, BackupRow[]>
    for (const tableName of blockTableNames) {
      blocks[tableName] = jsonClone(await database[tableName].toArray()) as unknown as BackupRow[]
    }
    return {
      blockStructures: jsonClone(await database.blockStructures.toArray()) as unknown as BackupRow[],
      blocks,
    }
  })
}

async function replaceCanonicalDatabase(
  snapshot: CanonicalDatabaseSnapshot,
  database: BackupDatabase,
): Promise<void> {
  const tables = canonicalDatabaseTables(database)
  await database.transaction('rw', tables, async () => {
    for (const table of tables) await table.clear()
    await database.blockStructures.bulkAdd(snapshot.blockStructures.map((row) => ({
      ...row,
      lastModified: new Date(row.lastModified as string),
    })) as unknown as NotaBlockStructure[])
    for (const tableName of blockTableNames) {
      const table = database[tableName] as unknown as {
        bulkAdd(rows: readonly BackupRow[]): Promise<unknown>
      }
      await table.bulkAdd(snapshot.blocks[tableName].map(reviveBlock))
    }
  })
}

async function replaceAuthorityNotas(
  authority: BackupNotaAuthority,
  target: readonly BackupRow[] | readonly Nota[],
  rollbackRows: readonly Nota[],
): Promise<void> {
  const targetNotas = structuredClone(target) as unknown as Nota[]
  const targetIds = targetNotas.map((nota) => nota.id)
  const rollbackIds = rollbackRows.map((nota) => nota.id)
  try {
    for (const nota of await authority.getAllNotas()) await authority.deleteNota(nota.id)
    for (const nota of targetNotas) await authority.saveNota(nota)
  } catch (error) {
    try {
      const cleanupIds = new Set([...targetIds, ...rollbackIds, ...(await authority.getAllNotas()).map((nota) => nota.id)])
      for (const id of cleanupIds) await authority.deleteNota(id)
      for (const nota of rollbackRows) await authority.saveNota(nota)
    } catch (rollbackError) {
      throw new BackupArchiveError(
        `Authoritative nota restore failed and its rollback also failed: ${String(error)}; rollback: ${String(rollbackError)}`,
      )
    }
    throw error
  }
}

async function restoreExternalAuthority(
  archive: BashNotaBackupArchive,
  stagePinia: (archive: BashNotaBackupArchive) => void,
  database: BackupDatabase,
  authority: BackupNotaAuthority,
  rollbackPinia: () => void,
): Promise<void> {
  const notasBefore = structuredClone(await authority.getAllNotas())
  const canonicalBefore = await captureCanonicalDatabase(database)
  let authorityReplaced = false
  let canonicalReplaced = false
  try {
    await replaceAuthorityNotas(authority, archive.notas, notasBefore)
    authorityReplaced = true
    await replaceCanonicalDatabase({ blockStructures: archive.blockStructures, blocks: archive.blocks }, database)
    canonicalReplaced = true
    stagePinia(archive)
  } catch (error) {
    rollbackPinia()
    const rollbackFailures: unknown[] = []
    if (canonicalReplaced) {
      try { await replaceCanonicalDatabase(canonicalBefore, database) } catch (rollbackError) { rollbackFailures.push(rollbackError) }
    }
    if (authorityReplaced) {
      try {
        const current = await authority.getAllNotas()
        await replaceAuthorityNotas(authority, notasBefore, current)
      } catch (rollbackError) {
        rollbackFailures.push(rollbackError)
      }
    }
    if (rollbackFailures.length > 0) {
      throw new BackupArchiveError(
        `Backup restore failed and durable rollback was incomplete: ${String(error)}; rollback: ${rollbackFailures.map(String).join('; ')}`,
      )
    }
    throw error
  }
}

/** Restore into local Dexie atomically or compensate an external nota authority on failure. */
export async function restoreBackupArchive(
  input: unknown,
  stagePinia: (archive: BashNotaBackupArchive) => void,
  database: BackupDatabase = db,
  rollbackPinia: () => void = () => undefined,
  notaAuthority?: BackupNotaAuthority,
): Promise<BashNotaBackupArchive> {
  const archive = validateBackupArchive(input)
  if (notaAuthority) {
    await restoreExternalAuthority(archive, stagePinia, database, notaAuthority, rollbackPinia)
    return archive
  }
  const tables = databaseTables(database)
  try {
    await database.transaction('rw', tables, async () => {
      for (const table of tables) {
        if (await table.count() !== 0) {
          throw new BackupArchiveError('Restore requires an empty database. Export or clear the current data first.')
        }
      }
      await database.notas.bulkAdd(jsonClone(archive.notas) as unknown as Nota[])
      await database.blockStructures.bulkAdd(archive.blockStructures.map((row) => ({
        ...row,
        lastModified: new Date(row.lastModified as string),
      })) as unknown as NotaBlockStructure[])
      for (const tableName of blockTableNames) {
        const table = database[tableName] as unknown as {
          bulkAdd(rows: readonly BackupRow[]): Promise<unknown>
        }
        await table.bulkAdd(archive.blocks[tableName].map(reviveBlock))
      }
      stagePinia(archive)
    })
  } catch (error) {
    rollbackPinia()
    throw error
  }
  return archive
}
