import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { identityRequirements, transformExport } from '../../../scripts/legacy-migration/transform.mjs'
import { ChainedAuditFile, CheckpointFile, runMigration } from '../../../scripts/legacy-migration/runner.mjs'
import { createMigrationClient, inspectSupabaseIdentities, provisionSupabaseIdentities, SupabaseTarget } from '../../../scripts/legacy-migration/supabase-target.mjs'
import { sha256, stableJson } from '../../../scripts/legacy-migration/canonical.mjs'

const localStatus = () => {
  const output = execFileSync('npx', ['--yes', 'supabase@2.114.0', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return Object.fromEntries(output.split('\n').map(line => line.match(/^([A-Z_]+)="?([^"\n]+)"?$/)).filter(Boolean).map(match => [match[1], match[2]]))
}
const local = localStatus()
const url = process.env.SUPABASE_URL ?? local.API_URL ?? 'http://127.0.0.1:54321'
const serviceKey = local.SERVICE_ROLE_KEY ?? local.SECRET_KEY
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? local.PUBLISHABLE_KEY ?? local.ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
assert.ok(serviceKey, 'local Supabase service-role key is required')

const source = JSON.parse(await readFile(new URL('./fixtures/legacy-export.json', import.meta.url), 'utf8'))
const client = createMigrationClient(url, serviceKey)
const plannedBobId = '70000000-0000-4000-8000-000000000007'
const strandedPlan = await client.from('legacy_identity_provisioning').insert({ source_uid: 'legacy-bob', supabase_user_id: plannedBobId, provider: 'email', provider_uid: plannedBobId, verified_email_hash: sha256('bob@example.test'), state: 'planned' })
assert.ifError(strandedPlan.error)
const requirements = identityRequirements(source)
const identities = await inspectSupabaseIdentities(client, requirements)
assert.equal(identities.find(item => item.sourceUid === 'legacy-bob').supabaseUserId, plannedBobId, 'resume must finish an immutable identity plan created before Auth provisioning')
const manifest = transformExport(source, identities)
assert.deepEqual(manifest.orphans, []); assert.deepEqual(manifest.quarantined, [])

const lostCompleteRecord = manifest.records[0], lostAuditRecord = manifest.records[1]
const lostAuditKey = sha256(stableJson({ runId: 'local-rehearsal-007', event: {
  phase: 'record', status: 'applied', kind: lostAuditRecord.kind,
  keyHash: lostAuditRecord.keyHash, sourceHash: lostAuditRecord.sourceHash,
} }))
class FaultInjectingSupabaseTarget extends SupabaseTarget {
  constructor(database) { super(database); this.completeCalls = 0; this.auditCalls = 0; this.lostComplete = false; this.lostAudit = false; this.leaseChecked = false }
  async startRun(context) {
    await super.startRun(context)
    if (!this.leaseChecked && !context.dryRun) {
      this.leaseChecked = true
      const contender = new SupabaseTarget(this.client)
      await assert.rejects(() => contender.startRun(context), error => error.code === '55P03')
      assert.equal((await this.client.from('legacy_migration_journal').select('*', { count: 'exact', head: true })).count, 0, 'rejected second process cannot touch the journal')
    }
  }
  async complete(record, context) {
    if (record.keyHash === lostCompleteRecord.keyHash) this.completeCalls += 1
    await super.complete(record, context)
    if (!this.lostComplete && record.keyHash === lostCompleteRecord.keyHash) {
      this.lostComplete = true
      throw Object.assign(new Error('fixture lost completion response after commit'), { code: '503' })
    }
  }
  async appendAudit(runId, idempotencyKey, event) {
    if (idempotencyKey === lostAuditKey) this.auditCalls += 1
    const result = await super.appendAudit(runId, idempotencyKey, event)
    if (!this.lostAudit && idempotencyKey === lostAuditKey) {
      this.lostAudit = true
      throw Object.assign(new Error('fixture lost audit response after commit'), { code: '503' })
    }
    return result
  }
}
const target = new FaultInjectingSupabaseTarget(client)
const conflictingLegacy = await client.from('legacy_notas').insert({ id: 'legacy-private-1', legacy_owner_uid: 'different-owner', payload: {}, source_hash: 'f'.repeat(64) })
assert.ifError(conflictingLegacy.error)
const stateBeforeRejectedPreflight = {
  authUsers: (await client.auth.admin.listUsers()).data.users.length,
  plans: (await client.from('legacy_identity_provisioning').select('*', { count: 'exact', head: true })).count,
  runs: (await client.from('legacy_migration_runs').select('*', { count: 'exact', head: true })).count,
}
await assert.rejects(() => target.preflight(manifest), error => error.code === '23505')
assert.deepEqual({
  authUsers: (await client.auth.admin.listUsers()).data.users.length,
  plans: (await client.from('legacy_identity_provisioning').select('*', { count: 'exact', head: true })).count,
  runs: (await client.from('legacy_migration_runs').select('*', { count: 'exact', head: true })).count,
}, stateBeforeRejectedPreflight, 'rejected target preflight must leave Auth, provisioning, and run state unchanged')
assert.ifError((await client.from('legacy_notas').delete().eq('id', 'legacy-private-1')).error)
const legacyRecord = manifest.records.find(record => record.kind === 'legacy_nota')
assert.ifError((await client.from('legacy_notas').insert({ ...legacyRecord.payload, source_hash: legacyRecord.sourceHash })).error)
const taskDirectory = await mkdtemp(join(tmpdir(), 'bashnota-migration007-local-'))
const audit = new ChainedAuditFile(join(taskDirectory, 'audit.ndjson'), 'local-rehearsal-007'); await audit.initialize()
const checkpoint = new CheckpointFile(join(taskDirectory, 'checkpoint.json'))
const started = performance.now()
const first = await runMigration({
  manifest, target, runId: 'local-rehearsal-007', batchSize: 5, requestsPerSecond: 100, maxRetries: 3, checkpoint, audit,
  beforeStart: async ({ heartbeat }) => {
    const provisioned = await provisionSupabaseIdentities(client, requirements, { preprovisioned: identities, heartbeat })
    assert.equal(transformExport(source, provisioned).manifestHash, manifest.manifestHash)
  },
})
assert.equal(first.status, 'completed'); assert.equal(first.applied, manifest.records.length); assert.equal(first.reconciliation.status, 'pass')
assert.ok(target.completeCalls >= 2, 'durable complete is called again after a lost response')
assert.ok(target.auditCalls >= 2, 'durable audit append is called again with the exact idempotency key')
assert.equal((await client.from('legacy_migration_journal').select('*', { count: 'exact', head: true }).eq('state', 'failed')).count, 0, 'lost responses cannot downgrade applied rows to failed')
assert.equal((await client.from('legacy_migration_audit').select('*', { count: 'exact', head: true }).eq('run_id', 'local-rehearsal-007').eq('idempotency_key', lostAuditKey)).count, 1, 'lost audit response leaves one logical event')
assert.equal((await client.from('legacy_migration_journal').select('mutation_kind').eq('entity_kind', 'legacy_nota').single()).data.mutation_kind, 'preexisting')

assert.ifError((await client.from('published_notas').update({ title: 'corrupt-reconciliation-fixture' }).eq('id', 'pub-root')).error)
const corruptedField = await target.reconcile(manifest)
assert.equal(corruptedField.status, 'fail'); assert.equal(corruptedField.targetMismatches, 1, 'a target field mutation must fail canonical target comparison')
assert.ifError((await client.from('published_notas').update({ title: 'Root', view_count: 6 }).eq('id', 'pub-root')).error)
const corruptedCounter = await target.reconcile(manifest)
assert.equal(corruptedCounter.status, 'fail'); assert.equal(corruptedCounter.database.publicationCounterMismatches, 1, 'a target publication counter mutation must fail database reconciliation')
assert.ifError((await client.from('published_notas').update({ view_count: 5 }).eq('id', 'pub-root')).error)
assert.equal((await target.reconcile(manifest)).status, 'pass')
assert.ifError((await client.from('legacy_notas').insert({ id: 'unexplained-target', legacy_owner_uid: 'opaque', payload: {}, source_hash: 'a'.repeat(64) })).error)
assert.equal((await target.reconcile(manifest)).database.unexplainedTargetRows, 1, 'a target-only row must block cutover')
assert.ifError((await client.from('legacy_notas').delete().eq('id', 'unexplained-target')).error)
assert.ifError((await client.from('legacy_notas').delete().eq('id', 'legacy-private-1')).error)
assert.equal((await target.reconcile(manifest)).database.missingTargetRows, 1, 'a source/journal row missing from the target must block cutover')
assert.ifError((await client.from('legacy_notas').insert({ ...legacyRecord.payload, source_hash: legacyRecord.sourceHash })).error)
assert.equal((await target.reconcile(manifest)).status, 'pass')

const rerunAudit = new ChainedAuditFile(join(taskDirectory, 'audit.ndjson'), 'local-rehearsal-007'); await rerunAudit.initialize()
const rerun = await runMigration({ manifest, target, runId: 'local-rehearsal-007', batchSize: 7, requestsPerSecond: 100, checkpoint: null, audit: rerunAudit })
assert.equal(rerun.applied, 0); assert.equal(rerun.skipped, manifest.records.length, 'byte-identical rerun must not duplicate target rows or counters')
const otherRun = await runMigration({ manifest, target, runId: 'local-rehearsal-007-b', batchSize: 7, requestsPerSecond: 100, checkpoint: null, audit: null })
assert.equal(otherRun.applied, 0); assert.equal(otherRun.skipped, manifest.records.length, 'a different run may verify but cannot claim run A records')
await target.rollback('local-rehearsal-007-b')
assert.equal((await client.from('published_notas').select('*', { count: 'exact', head: true })).count, 2, 'run B rollback cannot delete run A targets')

const publication = (await client.from('published_notas').select('id,like_count,dislike_count,comment_count,unique_viewers,published_nota_citations').eq('id', 'pub-root').single()).data
assert.deepEqual({ like: publication.like_count, dislike: publication.dislike_count, comments: publication.comment_count, viewers: publication.unique_viewers }, { like: 1, dislike: 0, comments: 2, viewers: 2 })
assert.deepEqual(publication.published_nota_citations.map(item => item.title), ['First', 'Second'])
const edge = (await client.from('published_nota_edges').select('parent_id,child_id,ordinal').eq('parent_id', 'pub-root').single()).data
assert.deepEqual(edge, { parent_id: 'pub-root', child_id: 'pub-child', ordinal: 0 })
const rootComment = (await client.from('comments').select('like_count,dislike_count,reply_count').eq('id', 'comment-root').single()).data
assert.deepEqual(rootComment, { like_count: 1, dislike_count: 0, reply_count: 1 })
const rawPublication = (await client.from('published_notas').select('source_last_viewed_at_raw').eq('id', 'pub-root').single()).data
assert.equal(rawPublication.source_last_viewed_at_raw, '2026-08-12T09:00:00Z')
const rawVote = (await client.from('nota_votes').select('source_created_at_raw,source_updated_at_raw').eq('nota_id', 'pub-root').single()).data
assert.deepEqual(rawVote, { source_created_at_raw: '2026-08-10T08:00:00Z', source_updated_at_raw: '2026-08-12T08:00:00Z' })
const rawViewer = (await client.from('nota_viewers').select('source_first_viewed_at_raw').eq('nota_id', 'pub-root').eq('user_id', plannedBobId).single()).data
assert.equal(rawViewer.source_first_viewed_at_raw, '2026-08-11T09:00:00Z')
const auditRows = (await client.from('legacy_migration_audit').select('sequence,previous_hash,idempotency_key,event,event_hash').eq('run_id', 'local-rehearsal-007').order('sequence')).data
assert.ok(auditRows.length >= manifest.records.length)
for (let index = 1; index < auditRows.length; index += 1) assert.equal(auditRows[index].previous_hash, auditRows[index - 1].event_hash)
assert.equal(new Set(auditRows.map(item => item.idempotency_key)).size, auditRows.length, 'database audit chain contains one row per logical event')
assert.doesNotMatch(JSON.stringify(auditRows), /alice@example\.test|bob@example\.test|legacy-alice|Hello/)

const anonymous = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
const publicRead = await anonymous.rpc('query_publications', { p_id: 'pub-root', p_limit: 1 })
assert.ifError(publicRead.error); assert.equal(publicRead.data[0].author_tag, 'Alice')
assert.equal((await anonymous.from('legacy_notas').select('*')).error?.code, '42501')

const rollbackState = async () => ({
  run: (await client.from('legacy_migration_runs').select('state,lease_owner_hash,lease_expires_at').eq('id', 'local-rehearsal-007').single()).data,
  journal: (await client.from('legacy_migration_journal').select('entity_kind,source_key_hash,state,mutation_kind,applied_by_run_id').eq('first_run_id', 'local-rehearsal-007').order('entity_kind').order('source_key_hash')).data,
  publications: (await client.from('published_notas').select('*', { count: 'exact', head: true })).count,
  legacy: (await client.from('legacy_notas').select('*', { count: 'exact', head: true })).count,
})
const liveApplyOwner = new SupabaseTarget(client)
await liveApplyOwner.startRun({ runId: 'local-rehearsal-007', manifest, dryRun: false })
const rollbackContender = new SupabaseTarget(client)
const beforeRejectedRollback = await rollbackState()
await assert.rejects(() => rollbackContender.rollback('local-rehearsal-007'), error => error.code === '55P03')
assert.equal(stableJson(await rollbackState()), stableJson(beforeRejectedRollback), 'live apply lease rejects rollback before target, journal, or run mutation')
assert.ifError((await client.from('legacy_migration_runs').update({ lease_expires_at: new Date(0).toISOString() }).eq('id', 'local-rehearsal-007')).error)
assert.equal((await client.rpc('start_legacy_migration_rollback', { p_run_id: 'local-rehearsal-007', p_lease_owner: rollbackContender.leaseOwner })).data, 'acquired')
assert.notEqual((await client.rpc('rollback_next_legacy_migration_record', { p_run_id: 'local-rehearsal-007', p_lease_owner: rollbackContender.leaseOwner })).data, 'done', 'rollback commits one record transaction before simulated crash')
const resumedRollback = new SupabaseTarget(client)
const beforeLiveRollbackRejection = await rollbackState()
await assert.rejects(() => resumedRollback.rollback('local-rehearsal-007'), error => error.code === '55P03')
assert.equal(stableJson(await rollbackState()), stableJson(beforeLiveRollbackRejection), 'second rollback owner cannot interfere with live phased rollback')
assert.ifError((await client.from('legacy_migration_runs').update({ lease_expires_at: new Date(0).toISOString() }).eq('id', 'local-rehearsal-007')).error)
await resumedRollback.rollback('local-rehearsal-007')
await assert.rejects(() => liveApplyOwner.heartbeat('local-rehearsal-007'), error => error.code === '55P03')
assert.equal((await client.from('published_notas').select('*', { count: 'exact', head: true })).count, 0)
assert.equal((await client.from('legacy_notas').select('*', { count: 'exact', head: true })).count, 1, 'rollback retains exact matching pre-existing domain rows')
assert.equal((await client.from('identity_map').select('*', { count: 'exact', head: true })).count, 2, 'rollback retains stable inert identity translations')
assert.equal((await client.from('legacy_migration_journal').select('*', { count: 'exact', head: true }).eq('first_run_id', 'local-rehearsal-007').neq('entity_kind', 'identity').neq('state', 'rolled-back')).count, 0, 'resumed rollback completes every non-identity provenance row')
assert.equal((await client.from('legacy_migration_runs').select('state').eq('id', 'local-rehearsal-007').single()).data.state, 'rolled-back')
const restoreAudit = new ChainedAuditFile(join(taskDirectory, 'restore.ndjson'), 'local-rehearsal-007'); await restoreAudit.initialize()
const restored = await runMigration({ manifest, target, runId: 'local-rehearsal-007', batchSize: 5, requestsPerSecond: 100, checkpoint: null, audit: restoreAudit })
assert.equal(restored.applied, manifest.records.length - identities.length); assert.equal(restored.skipped, identities.length); assert.equal(restored.reconciliation.status, 'pass')

const elapsedMs = Math.round(performance.now() - started)
assert.ok(elapsedMs < 60_000, `local fixture rehearsal exceeded the 60s threshold (${elapsedMs}ms)`)
console.log(JSON.stringify({ status: 'pass', manifestHash: manifest.manifestHash, records: manifest.records.length, elapsedMs, rerunApplied: rerun.applied, rollbackRestore: 'pass', productionCutover: false }))
