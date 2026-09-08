export interface PersistedEditOperation<TContent = unknown> {
  id: string
  type: 'insert' | 'delete' | 'update'
  position: number
  content?: TContent
  timestamp: number
  applied: boolean
}

interface EditorUpdateCaptureState {
  docChanged: boolean
  isFocused: boolean
  isApplyingPersistedContent: boolean
}

/** Capture user changes even while an earlier snapshot is being persisted. */
export function shouldCaptureEditorUpdate({
  docChanged,
  isFocused,
  isApplyingPersistedContent,
}: EditorUpdateCaptureState): boolean {
  return docChanged && isFocused && !isApplyingPersistedContent
}

/**
 * Editor transactions contain a complete document snapshot. When the queue is
 * saturated, keeping the newest snapshot is therefore sufficient to preserve
 * the user's latest document without allowing the queue to grow forever.
 */
export function enqueuePersistedEdit<TContent>(
  queue: PersistedEditOperation<TContent>[],
  operation: PersistedEditOperation<TContent>,
  maximumSize = 50,
): PersistedEditOperation<TContent>[] {
  if (maximumSize < 1) throw new Error('Edit queue capacity must be at least one.')
  if (queue.length < maximumSize) return [...queue, operation]
  return [operation]
}

interface DrainPersistedEditsOptions<TContent> {
  readQueue: () => PersistedEditOperation<TContent>[]
  writeQueue: (queue: PersistedEditOperation<TContent>[]) => void
  persist: (operation: PersistedEditOperation<TContent>) => Promise<void>
}

/**
 * Persist queued snapshots in order and acknowledge each one only after its
 * write succeeds. Reading the queue again after every await includes edits
 * that arrived while persistence was in flight. A rejected write is left in
 * place so a later drain can retry it.
 */
export async function drainPersistedEdits<TContent>({
  readQueue,
  writeQueue,
  persist,
}: DrainPersistedEditsOptions<TContent>): Promise<void> {
  writeQueue(readQueue().filter(operation => !operation.applied))

  while (true) {
    const operation = readQueue().find(candidate => !candidate.applied)
    if (!operation) return

    await persist(operation)
    operation.applied = true
    writeQueue(readQueue().filter(candidate => candidate.id !== operation.id))
  }
}
