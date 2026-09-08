import { readonly, ref } from 'vue'
import type { StorageBackendType } from './storageService'

const requestedBackend = ref<StorageBackendType | null>(null)
const activeBackend = ref<StorageBackendType | null>(null)
const startupError = ref<string | null>(null)
const authorityStatus = ref<'idle' | 'resolving' | 'ready' | 'failed'>('idle')

export function beginStorageAuthorityResolution(requested: StorageBackendType | undefined): void {
  requestedBackend.value = requested ?? null
  activeBackend.value = null
  startupError.value = null
  authorityStatus.value = 'resolving'
}

export function reportStorageAuthorityReady(
  requested: StorageBackendType | undefined,
  active: StorageBackendType,
): void {
  requestedBackend.value = requested ?? active
  activeBackend.value = active
  startupError.value = null
  authorityStatus.value = 'ready'
}

export function reportStorageAuthorityFailure(
  requested: StorageBackendType | undefined,
  error: unknown,
): void {
  requestedBackend.value = requested ?? null
  activeBackend.value = null
  startupError.value = error instanceof Error ? error.message : String(error)
  authorityStatus.value = 'failed'
}

export function setActiveStorageAuthority(active: StorageBackendType): void {
  requestedBackend.value = active
  activeBackend.value = active
  startupError.value = null
  authorityStatus.value = 'ready'
}

export function isStorageAuthorityUnavailable(): boolean {
  return authorityStatus.value === 'resolving' || authorityStatus.value === 'failed'
}

export function useStorageAuthority() {
  return {
    requestedBackend: readonly(requestedBackend),
    activeBackend: readonly(activeBackend),
    startupError: readonly(startupError),
    authorityStatus: readonly(authorityStatus),
  }
}
