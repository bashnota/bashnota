import { db } from '@/db'
import { dbAdapter, runDatabaseAuthorityTransition } from './databaseAdapter'
import { clearDirectoryHandle, getDirectoryHandle } from './directoryHandleStorage'
import { FileSystemBackend } from './fileSystemBackend'
import type { IStorageBackend, StorageBackendType } from './storageService'

export type DataDeletionAuthority = 'filesystem' | 'memory' | 'indexeddb' | 'browser-storage'

export interface DataDeletionPlan {
  activeBackend: StorageBackendType | 'legacy-indexeddb'
  filesystem: null | { directoryName: string; fileNames: string[] }
  authorities: Array<{ id: DataDeletionAuthority; label: string; detail: string }>
}

export interface DataDeletionResult {
  id: DataDeletionAuthority
  label: string
  status: 'cleared' | 'failed'
  detail: string
}

export interface DataDeletionReport {
  complete: boolean
  results: DataDeletionResult[]
}

const preparedFilesystemBackends = new WeakMap<DataDeletionPlan, FileSystemBackend>()

async function configuredFilesystemBackend(): Promise<FileSystemBackend | null> {
  const active = dbAdapter?.getStorageService().getBackend()
  if (active?.type === 'filesystem') return active as FileSystemBackend
  const persistedHandle = await getDirectoryHandle()
  if (!persistedHandle) return null
  const backend = new FileSystemBackend()
  await backend.initializeWithDirectoryHandle(persistedHandle)
  return backend
}

export async function prepareDataDeletion(): Promise<DataDeletionPlan> {
  const activeBackend = dbAdapter
    ? dbAdapter.getStorageService().getBackendType()
    : 'legacy-indexeddb'
  const filesystemBackend = await configuredFilesystemBackend()
  const filesystem = filesystemBackend
    ? {
        directoryName: filesystemBackend.getDirectoryHandle()?.name ?? 'configured directory',
        fileNames: await filesystemBackend.listManagedFileNames(),
      }
    : null
  const authorities: DataDeletionPlan['authorities'] = []
  if (filesystem) authorities.push({
    id: 'filesystem',
    label: 'Filesystem directory',
    detail: `${filesystem.fileNames.length} BashNota file${filesystem.fileNames.length === 1 ? '' : 's'} in “${filesystem.directoryName}”`,
  })
  if (activeBackend === 'memory') authorities.push({
    id: 'memory', label: 'Memory storage', detail: 'The active in-memory nota library',
  })
  authorities.push({
    id: 'indexeddb', label: 'IndexedDB databases', detail: `${db.tables.length} nota and canonical-content tables`,
  })
  authorities.push({
    id: 'browser-storage', label: 'Browser settings and caches', detail: 'Local settings, session data, and Cache Storage entries',
  })
  const plan: DataDeletionPlan = { activeBackend, filesystem, authorities }
  if (filesystemBackend) preparedFilesystemBackends.set(plan, filesystemBackend)
  return plan
}

async function attempt(
  id: DataDeletionAuthority,
  label: string,
  action: () => Promise<string>,
): Promise<DataDeletionResult> {
  try {
    return { id, label, status: 'cleared', detail: await action() }
  } catch (error) {
    return {
      id,
      label,
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function clearAllDexieTables(): Promise<string> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  const remaining = await Promise.all(db.tables.map((table) => table.count()))
  if (remaining.some((count) => count !== 0)) throw new Error('One or more IndexedDB tables still contain data.')
  return `Cleared and verified ${db.tables.length} tables.`
}

async function clearBrowserStorage(): Promise<string> {
  localStorage.clear()
  sessionStorage.clear()
  if (typeof caches !== 'undefined') {
    const names = await caches.keys()
    const deleted = await Promise.all(names.map((name) => caches.delete(name)))
    if (deleted.some((value) => !value)) throw new Error('One or more Cache Storage entries could not be deleted.')
  }
  if (localStorage.length || sessionStorage.length) throw new Error('Browser settings or session data remain.')
  return 'Cleared and verified browser settings, session data, and caches.'
}

export async function deleteAllData(plan: DataDeletionPlan): Promise<DataDeletionReport> {
  return runDatabaseAuthorityTransition(async () => {
    const results: DataDeletionResult[] = []
    if (plan.filesystem) {
      results.push(await attempt('filesystem', 'Filesystem directory', async () => {
        const backend = preparedFilesystemBackends.get(plan)
        if (!backend) throw new Error('The inspected filesystem authorization expired. Review the file list again.')
        if (backend.getDirectoryHandle()?.name !== plan.filesystem!.directoryName) {
          throw new Error('The configured directory changed after confirmation.')
        }
        await backend.deleteManagedFiles(plan.filesystem!.fileNames)
        await clearDirectoryHandle()
        return `Deleted ${plan.filesystem!.fileNames.length} authorized file${plan.filesystem!.fileNames.length === 1 ? '' : 's'} from “${plan.filesystem!.directoryName}” and removed saved access.`
      }))
    }

    if (plan.activeBackend === 'memory') {
      results.push(await attempt('memory', 'Memory storage', async () => {
        const backend = dbAdapter?.getStorageService().getBackend() as IStorageBackend | undefined
        if (!backend || backend.type !== 'memory') throw new Error('The active storage authority changed after confirmation.')
        await backend.clearAll()
        if ((await backend.listNotas()).length) throw new Error('The memory backend still contains notas.')
        return 'Cleared and verified the active in-memory nota library.'
      }))
    }

    results.push(await attempt('indexeddb', 'IndexedDB databases', clearAllDexieTables))
    results.push(await attempt('browser-storage', 'Browser settings and caches', clearBrowserStorage))
    return { complete: results.every((result) => result.status === 'cleared'), results }
  })
}
