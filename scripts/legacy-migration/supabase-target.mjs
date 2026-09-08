import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { canonicalCount, canonicalTimestamp, sha256, stableJson, stableValue } from './canonical.mjs'

const throwError = result => { if (result.error) throw result.error; return result.data }
const without = (object, ...keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))
const COUNT_FIELDS = new Set(['view_count', 'unique_viewers', 'like_count', 'dislike_count', 'clone_count', 'comment_count', 'reply_count'])
const comparable = (value, key) => {
  if (value == null) return value
  if (COUNT_FIELDS.has(key)) return canonicalCount(value, key)
  if (key.endsWith('_at')) return canonicalTimestamp(value, key).utc
  return stableValue(value)
}
const matches = (expected, actual) => Object.entries(expected).every(([key, value]) => stableJson(comparable(value, key)) === stableJson(comparable(actual?.[key], key)))

export function createMigrationClient(url, serviceRoleKey) {
  if (!url || !serviceRoleKey || serviceRoleKey.startsWith('sb_publishable_')) throw new Error('Supabase migration requires a server-side service-role credential')
  if (typeof window !== 'undefined') throw new Error('Supabase migration target cannot run in a browser')
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

const isMissingAuthUser = error => error && (error.status === 404 || error.code === 'user_not_found')

export async function inspectSupabaseIdentities(client, requirements, { preprovisioned = [] } = {}) {
  const supplied = new Map()
  for (const item of preprovisioned) {
    if (!item || typeof item.sourceUid !== 'string' || supplied.has(item.sourceUid)) throw new Error('identity map contains duplicate or invalid source UIDs')
    supplied.set(item.sourceUid, item)
  }
  const authEmailOwners = new Map()
  for (let page = 1; page <= 10_000; page += 1) {
    const listed = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (listed.error) throw listed.error
    for (const user of listed.data.users) if (user.email) authEmailOwners.set(user.email.toLowerCase(), user.id)
    if (listed.data.users.length < 1000) break
    if (page === 10_000) throw new Error('Auth preflight exceeded its bounded account scan')
  }
  const result = []
  for (const requirement of requirements) {
    if (!requirement.emailVerified || requirement.disabled) throw new Error('all migration identities must be enabled with verified email')
    const existingMap = throwError(await client.from('identity_map').select('firebase_uid,supabase_user_id,provider_links').eq('firebase_uid', requirement.sourceUid).maybeSingle())
    const planned = throwError(await client.from('legacy_identity_provisioning').select('*').eq('source_uid', requirement.sourceUid).maybeSingle())
    let account = supplied.get(requirement.sourceUid)
    if (existingMap) {
      const providerUid = existingMap.provider_links[requirement.provider]?.uid
      if (!providerUid) throw new Error('existing identity map does not match the source provider')
      account = { sourceUid: requirement.sourceUid, supabaseUserId: existingMap.supabase_user_id, provider: requirement.provider, providerUid, email: requirement.email }
    } else if (planned) {
      account = { sourceUid: requirement.sourceUid, supabaseUserId: planned.supabase_user_id, provider: planned.provider, providerUid: planned.provider_uid, email: requirement.email }
    } else if (account) account = { ...account, sourceUid: requirement.sourceUid, email: requirement.email }
    else {
      if (requirement.provider !== 'email') throw new Error('Google identities must be preprovisioned and reconciled through the external provider harness')
      const targetId = randomUUID()
      account = { sourceUid: requirement.sourceUid, supabaseUserId: targetId, provider: 'email', providerUid: targetId, email: requirement.email }
    }
    if (account.provider !== requirement.provider || account.email?.toLowerCase() !== requirement.email
      || typeof account.providerUid !== 'string' || account.providerUid === '') throw new Error('planned identity does not match the verified source identity')
    if (planned && (planned.supabase_user_id !== account.supabaseUserId || planned.provider !== account.provider
      || planned.provider_uid !== account.providerUid || planned.verified_email_hash !== sha256(requirement.email))) throw new Error('immutable identity provisioning plan conflicts with the source')
    const planOwner = throwError(await client.from('legacy_identity_provisioning').select('source_uid').eq('supabase_user_id', account.supabaseUserId).maybeSingle())
    if (planOwner && planOwner.source_uid !== requirement.sourceUid) throw new Error('target Supabase identity is already planned for a different source UID')
    const fetched = await client.auth.admin.getUserById(account.supabaseUserId)
    if (fetched.error && !isMissingAuthUser(fetched.error)) throw fetched.error
    if (!fetched.error) {
      const user = fetched.data.user
      const identity = user.identities?.find(item => item.provider === requirement.provider)
      if (!user.email_confirmed_at || user.email?.toLowerCase() !== requirement.email || !identity
        || (identity.identity_data?.sub ?? user.id) !== account.providerUid) throw new Error('planned Supabase account does not match the verified provider identity')
    } else {
      if (requirement.provider !== 'email') throw new Error('external Google identity mapping points to a missing Supabase account')
      const emailOwner = authEmailOwners.get(requirement.email)
      if (emailOwner && emailOwner !== account.supabaseUserId) throw new Error('verified email is already owned by another Supabase account')
    }
    result.push(account)
  }
  return result
}

export async function provisionSupabaseIdentities(client, requirements, { preprovisioned = [], heartbeat } = {}) {
  const supplied = new Map(preprovisioned.map(item => [item.sourceUid, item]))
  const result = []
  for (const requirement of requirements) {
    await heartbeat?.()
    if (!requirement.emailVerified || requirement.disabled) throw new Error('all migration identities must be enabled with verified email')
    const existingMap = throwError(await client.from('identity_map').select('firebase_uid,supabase_user_id,provider_links').eq('firebase_uid', requirement.sourceUid).maybeSingle())
    if (existingMap) {
      const providerUid = existingMap.provider_links[requirement.provider]?.uid
      if (!providerUid) throw new Error('existing identity map does not match the source provider')
      const plan = throwError(await client.from('legacy_identity_provisioning').select('*').eq('source_uid', requirement.sourceUid).maybeSingle())
      if (!plan) throwError(await client.from('legacy_identity_provisioning').insert({ source_uid: requirement.sourceUid, supabase_user_id: existingMap.supabase_user_id, provider: requirement.provider, provider_uid: providerUid, verified_email_hash: sha256(requirement.email), state: 'linked' }))
      else if (plan.supabase_user_id !== existingMap.supabase_user_id || plan.provider_uid !== providerUid || plan.verified_email_hash !== sha256(requirement.email)) throw new Error('identity provisioning plan conflicts with the immutable identity map')
      else if (plan.state !== 'linked') throwError(await client.from('legacy_identity_provisioning').update({ state: 'linked' }).eq('source_uid', requirement.sourceUid))
      result.push({ sourceUid: requirement.sourceUid, supabaseUserId: existingMap.supabase_user_id, provider: requirement.provider, providerUid, email: requirement.email })
      continue
    }
    let account = supplied.get(requirement.sourceUid)
    const planned = throwError(await client.from('legacy_identity_provisioning').select('*').eq('source_uid', requirement.sourceUid).maybeSingle())
    if (planned && (planned.provider !== requirement.provider || planned.verified_email_hash !== sha256(requirement.email)
      || account && (planned.supabase_user_id !== account.supabaseUserId || planned.provider_uid !== account.providerUid))) {
      throw new Error('immutable identity provisioning plan conflicts with the source or external provider mapping')
    }
    if (!planned) {
      if (!account && requirement.provider !== 'email') throw new Error('Google identities must be preprovisioned and reconciled through the external provider harness')
      account ??= { supabaseUserId: randomUUID(), providerUid: null }
      if (requirement.provider === 'email') account.providerUid = account.supabaseUserId
      throwError(await client.from('legacy_identity_provisioning').insert({ source_uid: requirement.sourceUid, supabase_user_id: account.supabaseUserId, provider: requirement.provider, provider_uid: account.providerUid, verified_email_hash: sha256(requirement.email), state: 'planned' }))
    } else account = { supabaseUserId: planned.supabase_user_id, providerUid: planned.provider_uid }
    let fetched = await client.auth.admin.getUserById(account.supabaseUserId)
    if (fetched.error) {
      if (requirement.provider !== 'email') throw fetched.error
      if (!isMissingAuthUser(fetched.error)) throw fetched.error
      fetched = await client.auth.admin.createUser({ id: account.supabaseUserId, email: requirement.email, email_confirm: true, password: `${randomBytes(24).toString('base64url')}Aa1!`, user_metadata: { display_name: requirement.displayName ?? '' } })
    }
    const canonicalAccount = throwError(fetched).user
    const identity = canonicalAccount.identities?.find(item => item.provider === requirement.provider)
    if (!canonicalAccount.email_confirmed_at || !identity || (identity.identity_data?.sub ?? canonicalAccount.id) !== account.providerUid) throw new Error('provisioned Supabase account does not match the verified provider identity')
    throwError(await client.from('legacy_identity_provisioning').update({ state: 'provisioned' }).eq('source_uid', requirement.sourceUid))
    result.push({ sourceUid: requirement.sourceUid, supabaseUserId: account.supabaseUserId, provider: requirement.provider, providerUid: account.providerUid, email: requirement.email })
  }
  return result
}

function targetKey(record) {
  const payload = record.payload
  if (record.kind === 'identity') return { sourceUid: payload.source_uid, userId: payload.supabase_user_id, provider: payload.provider }
  if (record.kind === 'publication' || record.kind === 'comment') return { id: payload.id, expectedCounts: payload.expected_counts }
  if (record.kind === 'publication_edge') return { parentId: payload.parent_id, childId: payload.child_id }
  if (record.kind === 'nota_vote') return { notaId: payload.nota_id, userId: payload.user_id }
  if (record.kind === 'nota_viewer') return { notaId: payload.nota_id, userId: payload.user_id }
  if (record.kind === 'metric_bucket') return { notaId: payload.nota_id, bucketKind: payload.bucket_kind, bucketKey: payload.bucket_key }
  if (record.kind === 'comment_vote') return { commentId: payload.comment_id, userId: payload.user_id }
  if (payload.id) return { id: payload.id }
  if (payload.user_id && record.kind === 'newsletter') return { userId: payload.user_id }
  return { keyHash: record.keyHash }
}

function targetRows(record) {
  const payload = record.payload
  if (record.kind === 'legacy_nota') return { existingRow: { ...payload, source_hash: record.sourceHash }, insertRow: { ...payload, source_hash: record.sourceHash } }
  const existingRow = record.kind === 'newsletter'
    ? { ...without(payload, 'expected_counts', 'source_uid'), firebase_uid: payload.source_uid }
    : without(payload, 'expected_counts')
  const insertRow = structuredClone(existingRow)
  if (record.kind === 'publication') Object.assign(insertRow, { like_count: '0', dislike_count: '0', comment_count: '0' })
  if (record.kind === 'comment') Object.assign(insertRow, { like_count: '0', dislike_count: '0', reply_count: '0' })
  return { existingRow, insertRow }
}

const migrationTargetHash = record => sha256(stableJson({ kind: record.kind, targetKey: targetKey(record), expectedRow: targetRows(record).existingRow }))

export class SupabaseTarget {
  constructor(client) { this.client = client; this.leaseOwner = randomUUID() }
  async preflight(manifest) {
    for (const record of manifest.records) {
      const rows = targetRows(record)
      const status = throwError(await this.client.rpc('preflight_legacy_migration_target', {
        p_entity_kind: record.kind, p_target_key: targetKey(record), p_expected_row: rows.existingRow,
      }))
      if (status === 'conflict') throw Object.assign(new Error('pre-existing migration target conflicts with source'), { code: '23505' })
      if (status !== 'absent' && status !== 'matching') throw new Error('migration target preflight returned an invalid status')
    }
  }
  async startRun({ runId, manifest, dryRun }) {
    throwError(await this.client.rpc('start_legacy_migration_run', {
      p_run_id: runId, p_source_watermark: manifest.watermark, p_manifest_hash: manifest.manifestHash,
      p_identity_plan_hash: manifest.identityPlanHash, p_tool_version: 'migration007-v3', p_dry_run: dryRun,
      p_lease_owner: this.leaseOwner,
    }))
  }
  async reserve({ runId, sequence, record }) {
    return throwError(await this.client.rpc('reserve_legacy_migration_record', {
      p_run_id: runId, p_sequence: sequence, p_entity_kind: record.kind, p_source_key_hash: record.keyHash,
      p_source_hash: record.sourceHash, p_target_key: targetKey(record), p_target_hash: migrationTargetHash(record),
      p_lease_owner: this.leaseOwner,
    }))
  }
  async heartbeat(runId) { throwError(await this.client.rpc('assert_legacy_migration_run_lease', { p_run_id: runId, p_lease_owner: this.leaseOwner })) }
  async apply(record, { runId } = {}) {
    const rows = targetRows(record)
    return throwError(await this.client.rpc('apply_legacy_migration_target', {
      p_run_id: runId, p_entity_kind: record.kind, p_source_key_hash: record.keyHash,
      p_target_key: targetKey(record), p_insert_row: rows.insertRow, p_existing_row: rows.existingRow,
      p_lease_owner: this.leaseOwner,
    }))
  }
  async complete(record, { runId } = {}) { throwError(await this.client.rpc('complete_legacy_migration_record', {
    p_run_id: runId, p_entity_kind: record.kind, p_source_key_hash: record.keyHash, p_source_hash: record.sourceHash,
    p_target_hash: migrationTargetHash(record), p_lease_owner: this.leaseOwner,
  })) }
  async fail(record, errorClass, { runId } = {}) { throwError(await this.client.rpc('fail_legacy_migration_record', {
    p_run_id: runId, p_entity_kind: record.kind, p_source_key_hash: record.keyHash, p_error_class: errorClass,
    p_lease_owner: this.leaseOwner,
  })) }
  async appendAudit(runId, idempotencyKey, event) { return throwError(await this.client.rpc('append_legacy_migration_audit', {
    p_run_id: runId, p_idempotency_key: idempotencyKey, p_event: event, p_lease_owner: this.leaseOwner,
  })) }
  async reconcile(manifest, { runId } = {}) {
    if (runId) await this.heartbeat(runId)
    const database = throwError(await this.client.rpc('reconcile_legacy_migration'))
    const expected = Object.fromEntries([...new Set(manifest.records.map(item => item.kind))].map(kind => {
      const records = manifest.records.filter(item => item.kind === kind).sort((a, b) => a.keyHash.localeCompare(b.keyHash))
      return [kind, { count: records.length, hash: sha256(records.map(item => item.sourceHash).join('')) }]
    }))
    const entityPass = Object.entries(expected).every(([kind, value]) => Number(database.entities[kind]?.count) === value.count && database.entities[kind]?.hash === value.hash)
    const storagePass = manifest.storageManifest.every(item => /^[0-9a-f]{64}$/.test(item.contentHash) && /^[0-9a-f]{64}$/.test(item.pathHash))
    let targetMismatches = 0
    const readOne = async (table, filters) => {
      let query = this.client.from(table).select('*')
      for (const [key, value] of Object.entries(filters)) query = query.eq(key, value)
      const result = await query.maybeSingle()
      if (result.error) throw result.error
      return result.data
    }
    for (let index = 0; index < manifest.records.length; index += 1) {
      if (runId && index % 50 === 0) await this.heartbeat(runId)
      const record = manifest.records[index]
      const p = record.payload
      let actual, expectedRow
      if (record.kind === 'identity') {
        const mapping = await readOne('identity_map', { firebase_uid: p.source_uid })
        const privateProfile = await readOne('private_profiles', { user_id: p.supabase_user_id })
        const profile = await readOne('profiles', { user_id: p.supabase_user_id })
        const provisioning = await readOne('legacy_identity_provisioning', { source_uid: p.source_uid })
        const identityOkay = matches({ firebase_uid: p.source_uid, supabase_user_id: p.supabase_user_id, source_hash: record.sourceHash, provider_links: { [p.provider]: { uid: p.provider_uid, verified_email: p.verified_email } } }, mapping)
          && matches({ user_id: p.supabase_user_id, firebase_uid: p.source_uid, email: p.verified_email, display_name: p.display_name || null, created_at: p.created_at, updated_at: p.updated_at, source_created_at_raw: p.source_created_at_raw, source_updated_at_raw: p.source_updated_at_raw }, privateProfile)
          && matches({ user_id: p.supabase_user_id, user_tag: p.user_tag, photo_url: p.photo_url, updated_at: p.profile_updated_at }, profile)
          && matches({ user_tag: p.user_tag, user_id: p.supabase_user_id, created_at: p.tag_created_at }, await readOne('user_tags', { user_id: p.supabase_user_id }))
          && matches({ supabase_user_id: p.supabase_user_id, provider: p.provider, provider_uid: p.provider_uid, verified_email_hash: sha256(p.verified_email), state: 'linked' }, provisioning)
        if (!identityOkay) targetMismatches += 1
        continue
      }
      if (record.kind === 'legacy_nota') { actual = await readOne('legacy_notas', { id: p.id }); expectedRow = { ...p, source_hash: record.sourceHash } }
      if (record.kind === 'publication') { actual = await readOne('published_notas', { id: p.id }); expectedRow = without(p, 'expected_counts') }
      if (record.kind === 'publication_edge') { actual = await readOne('published_nota_edges', { parent_id: p.parent_id, child_id: p.child_id }); expectedRow = p }
      if (record.kind === 'nota_vote') { actual = await readOne('nota_votes', { nota_id: p.nota_id, user_id: p.user_id }); expectedRow = p }
      if (record.kind === 'nota_viewer') { actual = await readOne('nota_viewers', { nota_id: p.nota_id, user_id: p.user_id }); expectedRow = p }
      if (record.kind === 'metric_bucket') { actual = await readOne('nota_view_aggregates', { nota_id: p.nota_id, bucket_kind: p.bucket_kind, bucket_key: p.bucket_key }); expectedRow = p }
      if (record.kind === 'comment') { actual = await readOne('comments', { id: p.id }); expectedRow = without(p, 'expected_counts') }
      if (record.kind === 'comment_vote') { actual = await readOne('comment_votes', { comment_id: p.comment_id, user_id: p.user_id }); expectedRow = p }
      if (record.kind === 'newsletter') { actual = await readOne('newsletter_subscriptions', { user_id: p.user_id }); expectedRow = { ...without(p, 'source_uid'), firebase_uid: p.source_uid } }
      if (!actual || !expectedRow || !matches(expectedRow, actual)) targetMismatches += 1
    }
    if (runId) await this.heartbeat(runId)
    return { status: entityPass && targetMismatches === 0 && storagePass && database.publicationCounterMismatches === 0 && database.commentCounterMismatches === 0 && database.orphanCount === 0 && database.publicUrlMismatches === 0 && database.missingTargetRows === 0 && database.unexplainedTargetRows === 0 && database.cutoverDisabled === true ? 'pass' : 'fail', entities: database.entities, targetMismatches, targetVerifiedHash: targetMismatches === 0 ? manifest.manifestHash : null, database, storage: { count: manifest.storageManifest.length, hash: sha256(stableJson(stableValue(manifest.storageManifest))), status: storagePass ? 'manifest-only-pass' : 'fail' } }
  }
  async finishRun({ runId, status, counters }) { throwError(await this.client.rpc('finish_legacy_migration_run', {
    p_run_id: runId, p_status: status, p_counters: counters, p_lease_owner: this.leaseOwner,
  })) }
  async rollback(runId) {
    const started = throwError(await this.client.rpc('start_legacy_migration_rollback', { p_run_id: runId, p_lease_owner: this.leaseOwner }))
    if (started === 'already_rolled_back') return
    while (true) {
      const result = throwError(await this.client.rpc('rollback_next_legacy_migration_record', { p_run_id: runId, p_lease_owner: this.leaseOwner }))
      if (result === 'done') break
      if (!['deleted', 'retained', 'unapplied'].includes(result)) throw new Error('migration rollback returned an invalid record status')
    }
    throwError(await this.client.rpc('mark_legacy_migration_rolled_back', { p_run_id: runId, p_lease_owner: this.leaseOwner }))
  }
}
