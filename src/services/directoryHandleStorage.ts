/**
 * Directory Handle Storage - Persist FileSystemDirectoryHandle in IndexedDB
 * 
 * Uses IndexedDB to store the FileSystemDirectoryHandle so it can be retrieved
 * across page loads without requiring user interaction each time.
 */

import { logger } from './logger'

const DB_NAME = 'bashnota-fs-handles'
const STORE_NAME = 'directory-handles'
const HANDLE_KEY = 'primary-directory'

/**
 * Open the IndexedDB database for storing directory handles
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    
    request.onerror = () => {
      reject(new Error('Failed to open directory handle database'))
    }
    
    request.onsuccess = () => {
      resolve(request.result)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (db && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Save a directory handle to IndexedDB
 */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(handle, HANDLE_KEY)
      
      request.onsuccess = () => {
        logger.info('[DirectoryHandleStorage] Directory handle saved')
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('Failed to save directory handle'))
      }
      
      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('[DirectoryHandleStorage] Failed to save directory handle:', error)
    throw error
  }
}

/**
 * Retrieve a directory handle from IndexedDB
 */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(HANDLE_KEY)
      
      request.onsuccess = () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined
        resolve(handle || null)
      }
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve directory handle'))
      }
      
      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('[DirectoryHandleStorage] Failed to retrieve directory handle:', error)
    return null
  }
}

/**
 * Remove the stored directory handle
 */
export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(HANDLE_KEY)
      
      request.onsuccess = () => {
        logger.info('[DirectoryHandleStorage] Directory handle cleared')
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('Failed to clear directory handle'))
      }
      
      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('[DirectoryHandleStorage] Failed to clear directory handle:', error)
    throw error
  }
}

/**
 * Check if we have permission to access a directory handle
 */
export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // Check if we have permission
    const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
    
    if (permission === 'granted') {
      return true
    }
    
    // Try to request permission (will only work if triggered by user gesture)
    const requestedPermission = await (handle as any).requestPermission({ mode: 'readwrite' })
    return requestedPermission === 'granted'
  } catch (error) {
    logger.warn('[DirectoryHandleStorage] Failed to verify permission:', error)
    return false
  }
}
