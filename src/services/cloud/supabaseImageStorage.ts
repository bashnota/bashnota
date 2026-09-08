import type { SupabaseClient } from '@supabase/supabase-js'
import { CloudError } from './types'
import { getSupabaseBrowserClient } from './supabaseBrowser'

export const PUBLISHED_IMAGE_BUCKET = 'published-images'
export interface PublishedImageAsset { path: string; publicUrl: string }
const DATA_URL = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function decodeDataUrl(dataUrl: string): { base64: string; contentType: string } {
  const match = DATA_URL.exec(dataUrl)
  if (!match) throw new CloudError('invalid', 'Only base64 PNG, JPEG, GIF, or WebP images can be published.')
  // Reject non-canonical base64 and over-limit bodies before invoking the
  // authoritative server-side decoder. The Edge Function parses the raster.
  const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0
  const byteLength = (match[2].length * 3) / 4 - padding
  if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > MAX_IMAGE_BYTES) {
    throw new CloudError('invalid', 'Published images must be non-empty and 5 MB or smaller.')
  }
  return { base64: match[2], contentType: match[1] }
}

export async function uploadPublishedImageAsset(
  dataUrl: string,
  client?: SupabaseClient,
): Promise<PublishedImageAsset> {
  const supabase = client ?? await getSupabaseBrowserClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new CloudError('unauthenticated', 'Sign in before publishing images.', userError)

  const image = decodeDataUrl(dataUrl)
  const invoked = await supabase.functions.invoke('published-images', { body: { action: 'upload', ...image } })
  if (invoked.error) throw new CloudError('invalid', 'The image failed server-side raster validation.', invoked.error)
  const asset = invoked.data as Partial<PublishedImageAsset> | null
  if (!asset || typeof asset.path !== 'string' || !asset.path.startsWith(`${userData.user.id}/`)
    || typeof asset.publicUrl !== 'string') {
    throw new CloudError('unavailable', 'The image service returned an invalid asset.')
  }
  return { path: asset.path, publicUrl: asset.publicUrl }
}

export async function uploadPublishedImage(
  dataUrl: string,
  client?: SupabaseClient,
): Promise<string> {
  return (await uploadPublishedImageAsset(dataUrl, client)).publicUrl
}

export async function deletePublishedImages(
  paths: readonly string[],
  client?: SupabaseClient,
): Promise<void> {
  const uniquePaths = [...new Set(paths)]
  if (uniquePaths.length === 0) return

  const supabase = client ?? await getSupabaseBrowserClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new CloudError('unauthenticated', 'Sign in before cleaning up published images.', userError)
  }
  if (uniquePaths.some(path => !path.startsWith(`${userData.user.id}/`))) {
    throw new CloudError('forbidden', 'Published image cleanup is restricted to the current user.')
  }

  const removed = await supabase.functions.invoke('published-images', {
    body: { action: 'delete', paths: uniquePaths },
  })
  if (removed.error) {
    throw new CloudError('unavailable', 'Uploaded images could not be cleaned up.', removed.error)
  }
}

/** Remove at most 100 server-registered, unreferenced assets older than an hour. */
export async function cleanupOrphanedPublishedImages(client?: SupabaseClient): Promise<void> {
  const supabase = client ?? await getSupabaseBrowserClient()
  const removed = await supabase.functions.invoke('published-images', { body: { action: 'cleanup' } })
  if (removed.error) throw new CloudError('unavailable', 'Orphaned images could not be cleaned up.', removed.error)
}
