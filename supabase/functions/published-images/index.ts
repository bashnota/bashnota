import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { MAX_IMAGE_BYTES } from '../_shared/imageValidation.ts'
import { sanitizeRaster } from '../_shared/imageSanitization.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const DELETION_LEASE_MS = 15 * 60 * 1000
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : 'Image operation failed'

function decodeBase64(value: unknown): Uint8Array {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new Error('Invalid base64 image body')
  }
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization || !supabaseUrl || !publishableKey || !serviceRoleKey)
    return json(401, { error: 'Authentication required' })

  const browser = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await browser.auth.getUser()
  if (userError || !userData.user) return json(401, { error: 'Authentication required' })
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json()
    const action = body?.action
    if (action === 'upload') {
      const bytes = decodeBase64(body.base64)
      const sanitized = sanitizeRaster(bytes, body.contentType)
      const { raster } = sanitized
      const path = `${userData.user.id}/${crypto.randomUUID()}.${raster.extension}`
      const uploaded = await admin.storage.from('published-images').upload(path, sanitized.bytes, {
        contentType: raster.mime,
        cacheControl: '31536000',
        upsert: false,
      })
      if (uploaded.error) throw uploaded.error
      const registered = await admin.from('published_image_assets').insert({
        path,
        owner_id: userData.user.id,
        mime_type: raster.mime,
        byte_size: sanitized.bytes.byteLength,
        width: raster.width,
        height: raster.height,
      })
      if (registered.error) {
        await admin.storage.from('published-images').remove([path])
        throw registered.error
      }
      return json(200, {
        path,
        publicUrl: admin.storage.from('published-images').getPublicUrl(path).data.publicUrl,
      })
    }

    const requestedPaths = Array.isArray(body?.paths)
      ? [
          ...new Set(
            body.paths.filter((path: unknown): path is string => typeof path === 'string'),
          ),
        ].slice(0, 100)
      : []
    let assets = admin
      .from('published_image_assets')
      .select('path')
      .eq('owner_id', userData.user.id)
    if (action === 'delete') {
      if (requestedPaths.length === 0 || requestedPaths.length !== body.paths.length)
        return json(400, { error: 'One to 100 unique paths are required' })
      assets = assets.in('path', requestedPaths)
    } else if (action === 'cleanup') {
      const orphanCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const leaseCutoff = new Date(Date.now() - DELETION_LEASE_MS).toISOString()
      // Fresh unclaimed orphans wait for the normal grace period. An
      // interrupted explicit deletion is eligible as soon as its lease
      // expires, even when the underlying asset was uploaded recently.
      assets = assets
        .or(`and(created_at.lt.${orphanCutoff},deleting_at.is.null),deleting_at.lt.${leaseCutoff}`)
        .limit(100)
    } else return json(400, { error: 'Unknown action' })

    const candidates = await assets
    if (candidates.error) throw candidates.error
    const paths = (candidates.data ?? []).map((asset) => asset.path)
    if (action === 'delete' && paths.length !== requestedPaths.length)
      return json(403, { error: 'Deletion is restricted to owned registered images' })
    if (paths.length === 0) return json(200, { removed: [] })
    // The database claim and publication trigger interlock: once claimed, a
    // concurrent publish cannot acquire a new reference; a live reference
    // prevents the claim. Storage removal therefore cannot race publication.
    const claim = await admin.rpc('claim_unreferenced_published_images', {
      p_owner_id: userData.user.id,
      p_paths: paths,
    })
    if (claim.error) throw claim.error
    if (!Array.isArray(claim.data)) throw new Error('Invalid deletion-claim response')
    const claimed = claim.data.map((value) => {
      if (!value || typeof value !== 'object') throw new Error('Invalid deletion-claim row')
      const row = value as { claimed_path?: unknown; claimed_at?: unknown }
      if (typeof row.claimed_path !== 'string' || typeof row.claimed_at !== 'string') {
        throw new Error('Invalid deletion-claim row')
      }
      return { path: row.claimed_path, claimedAt: row.claimed_at }
    })
    const removable = claimed.map((asset) => asset.path)
    if (removable.length > 0) {
      const removed = await admin.storage.from('published-images').remove(removable)
      if (removed.error) {
        // Release only leases owned by this invocation. A delayed worker must
        // never clear a newer worker's renewed lease.
        for (const asset of claimed) {
          await admin
            .from('published_image_assets')
            .update({ deleting_at: null })
            .eq('owner_id', userData.user.id)
            .eq('path', asset.path)
            .eq('deleting_at', asset.claimedAt)
        }
        throw removed.error
      }
      // Storage deletion is idempotent. If this registry delete is interrupted
      // or fails, the lease remains and a later cleanup repeats the remove then
      // finishes metadata deletion. The lease timestamp fences stale workers.
      for (const asset of claimed) {
        const deleted = await admin
          .from('published_image_assets')
          .delete()
          .eq('owner_id', userData.user.id)
          .eq('path', asset.path)
          .eq('deleting_at', asset.claimedAt)
        if (deleted.error) throw deleted.error
      }
    }
    // A rollback or unpublish request may contain both shared and uniquely
    // referenced assets. Remove the eligible subset and leave live references
    // untouched instead of stranding an already-claimed subset behind a 409.
    return json(200, {
      removed: removable,
      preserved: paths.filter((path) => !removable.includes(path)),
    })
  } catch (error) {
    return json(400, { error: errorMessage(error) })
  }
})
