import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const browser = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
const password = `Image-${suffix}!`
const owner = browser()
const ownerSignup = await owner.auth.signUp({
  email: `image-owner-${suffix}@example.test`,
  password,
})
assert.ifError(ownerSignup.error)
assert.ok(ownerSignup.data.user)
const ownerId = ownerSignup.data.user.id
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const simpleWebp = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vv9UAA=',
  'base64',
)
const u32le = (value) =>
  Buffer.from([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
const webpChunk = (type, payload) =>
  Buffer.concat([
    Buffer.from(type),
    u32le(payload.length),
    payload,
    payload.length & 1 ? Buffer.from([0]) : Buffer.alloc(0),
  ])
const webpContainer = (chunks) => {
  const payload = Buffer.concat([Buffer.from('WEBP'), ...chunks])
  return Buffer.concat([Buffer.from('RIFF'), u32le(payload.length), payload])
}
const extendedWebp = (flags, chunks) =>
  webpContainer([webpChunk('VP8X', Buffer.from([flags, 0, 0, 0, 0, 0, 0, 0, 0, 0])), ...chunks])
const transparentWebp = extendedWebp(0x10, [
  webpChunk('ALPH', Buffer.from([0, 0])),
  webpChunk('VP8 ', simpleWebp.subarray(20)),
])
const allowedRasterFixtures = [
  [
    'image/jpeg',
    '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAAB//8AAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AACwgAAQABAQERAP/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//dAAQAAf/aAAgBAQAAPwD8A6//2Q==',
  ],
  ['image/gif', 'R0lGODdhAQABAIAAAAAAAAAAACH5BAkAAAEALAAAAAABAAEAAAICRAEAOw=='],
  ['image/webp', simpleWebp.toString('base64')],
  ['image/webp', transparentWebp.toString('base64')],
]
const corruptPng = Buffer.from(pngBase64, 'base64')
corruptPng[45] ^= 0xff
const headerOnlyGif = Buffer.from([...Buffer.from('GIF89a'), 1, 0, 1, 0, 0, 0, 0, 0x3b]).toString(
  'base64',
)
const malformedJpegEntropy = Buffer.from([
  0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 1, 0, 1, 0, 0xff, 0xda, 0xff, 0xd9,
]).toString('base64')
const malformedWebpPayload = Buffer.alloc(30)
malformedWebpPayload.write('RIFF', 0)
malformedWebpPayload.writeUInt32LE(22, 4)
malformedWebpPayload.write('WEBP', 8)
malformedWebpPayload.write('VP8 ', 12)
malformedWebpPayload.writeUInt32LE(10, 16)
malformedWebpPayload[23] = 0x9d
malformedWebpPayload[24] = 1
malformedWebpPayload[25] = 0x2a
malformedWebpPayload.writeUInt16LE(1, 26)
malformedWebpPayload.writeUInt16LE(1, 28)
const missingAlphaWebp = extendedWebp(0x10, [webpChunk('VP8 ', simpleWebp.subarray(20))])

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`
const localSql = (sql) =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_bashnota',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-tAc',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim()

// A publishable-key caller cannot bypass the validating function by forging
// Storage object metadata, even with correctly shaped raster bytes.
const direct = await owner.storage
  .from('published-images')
  .upload(`${ownerId}/direct-${suffix}.png`, Buffer.from(pngBase64, 'base64'), {
    contentType: 'image/png',
  })
assert.ok(direct.error)

const uploaded = await owner.functions.invoke('published-images', {
  body: { action: 'upload', contentType: 'image/png', base64: pngBase64 },
})
if (uploaded.error) {
  const detail = await uploaded.error.context?.json().catch(() => null)
  assert.fail(`validated upload failed: ${JSON.stringify(detail)}`)
}
assert.match(uploaded.data.path, new RegExp(`^${ownerId}/[0-9a-f-]+\\.png$`))
assert.ifError((await owner.storage.from('published-images').download(uploaded.data.path)).error)

const convertedPaths = []
for (const [contentType, base64] of allowedRasterFixtures) {
  const converted = await owner.functions.invoke('published-images', {
    body: { action: 'upload', contentType, base64 },
  })
  assert.ifError(converted.error)
  assert.match(converted.data.path, new RegExp(`^${ownerId}/[0-9a-f-]+\\.png$`))
  convertedPaths.push(converted.data.path)
}
assert.ifError(
  (
    await owner.functions.invoke('published-images', {
      body: { action: 'delete', paths: convertedPaths },
    })
  ).error,
)

const shared = await owner.functions.invoke('published-images', {
  body: { action: 'upload', contentType: 'image/png', base64: pngBase64 },
})
assert.ifError(shared.error)
const mixedOrphan = await owner.functions.invoke('published-images', {
  body: { action: 'upload', contentType: 'image/png', base64: pngBase64 },
})
assert.ifError(mixedOrphan.error)
const publicationId = `image-publication-${suffix}`
const published = await owner.rpc('publish_nota', {
  p_id: publicationId,
  p_title: 'Shared image',
  p_content: { type: 'doc', content: [{ type: 'image', attrs: { src: shared.data.publicUrl } }] },
  p_author_name: 'Image owner',
  p_is_sub_page: false,
  p_parent_id: null,
  p_citations: [],
  p_tags: [],
  p_child_ids: [],
})
assert.ifError(published.error)

for (const body of [
  { action: 'upload', contentType: 'image/jpeg', base64: pngBase64 },
  {
    action: 'upload',
    contentType: 'image/png',
    base64: Buffer.from('<svg><script>').toString('base64'),
  },
  { action: 'upload', contentType: 'image/png', base64: `${pngBase64.slice(0, -1)}A` },
  { action: 'upload', contentType: 'image/png', base64: corruptPng.toString('base64') },
  { action: 'upload', contentType: 'image/gif', base64: headerOnlyGif },
  { action: 'upload', contentType: 'image/jpeg', base64: malformedJpegEntropy },
  { action: 'upload', contentType: 'image/webp', base64: malformedWebpPayload.toString('base64') },
  { action: 'upload', contentType: 'image/webp', base64: missingAlphaWebp.toString('base64') },
  {
    action: 'upload',
    contentType: 'image/png',
    base64: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64'),
  },
]) {
  const rejected = await owner.functions.invoke('published-images', { body })
  assert.ok(rejected.error || rejected.data?.error)
}

const attacker = browser()
assert.ifError(
  (await attacker.auth.signUp({ email: `image-attacker-${suffix}@example.test`, password })).error,
)
const crossDelete = await attacker.functions.invoke('published-images', {
  body: { action: 'delete', paths: [uploaded.data.path] },
})
assert.ok(crossDelete.error || crossDelete.data?.error)
assert.ifError((await owner.storage.from('published-images').download(uploaded.data.path)).error)

assert.ifError(
  (
    await owner.functions.invoke('published-images', {
      body: { action: 'delete', paths: [uploaded.data.path] },
    })
  ).error,
)
assert.ok((await owner.storage.from('published-images').download(uploaded.data.path)).error)

const mixed = await owner.functions.invoke('published-images', {
  body: { action: 'delete', paths: [shared.data.path, mixedOrphan.data.path] },
})
assert.ifError(mixed.error)
assert.deepEqual(mixed.data.removed, [mixedOrphan.data.path])
assert.deepEqual(mixed.data.preserved, [shared.data.path])
assert.ifError((await owner.storage.from('published-images').download(shared.data.path)).error)

const recentCleanup = await owner.functions.invoke('published-images', {
  body: { action: 'cleanup' },
})
assert.ifError(recentCleanup.error)
assert.deepEqual(recentCleanup.data.removed, [])
assert.ifError((await owner.storage.from('published-images').download(shared.data.path)).error)
assert.ok((await owner.storage.from('published-images').download(mixedOrphan.data.path)).error)

// Fault-inject a worker interruption immediately after the database claim. A
// fresh lease is preserved; once stale, browser-authenticated cleanup renews
// it, removes Storage, and finishes registry deletion.
const interrupted = await owner.functions.invoke('published-images', {
  body: { action: 'upload', contentType: 'image/png', base64: pngBase64 },
})
assert.ifError(interrupted.error)
assert.equal(
  localSql(
    `select claimed_path from public.claim_unreferenced_published_images(${sqlLiteral(ownerId)},array[${sqlLiteral(interrupted.data.path)}])`,
  ),
  interrupted.data.path,
)
const activeLeaseCleanup = await owner.functions.invoke('published-images', {
  body: { action: 'cleanup' },
})
assert.ifError(activeLeaseCleanup.error)
assert.ok(!activeLeaseCleanup.data.removed.includes(interrupted.data.path))
assert.ifError((await owner.storage.from('published-images').download(interrupted.data.path)).error)
localSql(
  `update public.published_image_assets set deleting_at=now()-interval '16 minutes' where path=${sqlLiteral(interrupted.data.path)}`,
)
const staleLeaseCleanup = await owner.functions.invoke('published-images', {
  body: { action: 'cleanup' },
})
assert.ifError(staleLeaseCleanup.error)
assert.ok(staleLeaseCleanup.data.removed.includes(interrupted.data.path))
assert.ok((await owner.storage.from('published-images').download(interrupted.data.path)).error)
assert.equal(
  localSql(
    `select count(*) from public.published_image_assets where path=${sqlLiteral(interrupted.data.path)}`,
  ),
  '0',
)

// Model interruption after Storage removal but before registry deletion. The
// stale retry treats an already-missing object as success and removes metadata.
const registryRetry = await owner.functions.invoke('published-images', {
  body: { action: 'upload', contentType: 'image/png', base64: pngBase64 },
})
assert.ifError(registryRetry.error)
assert.equal(
  localSql(
    `select claimed_path from public.claim_unreferenced_published_images(${sqlLiteral(ownerId)},array[${sqlLiteral(registryRetry.data.path)}])`,
  ),
  registryRetry.data.path,
)
localSql(
  `set session_replication_role=replica; delete from storage.objects where bucket_id='published-images' and name=${sqlLiteral(registryRetry.data.path)}; set session_replication_role=origin`,
)
localSql(
  `update public.published_image_assets set deleting_at=now()-interval '16 minutes' where path=${sqlLiteral(registryRetry.data.path)}`,
)
const registryCleanup = await owner.functions.invoke('published-images', {
  body: { action: 'cleanup' },
})
assert.ifError(registryCleanup.error)
assert.ok(registryCleanup.data.removed.includes(registryRetry.data.path))
assert.equal(
  localSql(
    `select count(*) from public.published_image_assets where path=${sqlLiteral(registryRetry.data.path)}`,
  ),
  '0',
)

console.log(
  'Publishable-key image validation, ownership, and deletion integration passed without service-role credentials.',
)
