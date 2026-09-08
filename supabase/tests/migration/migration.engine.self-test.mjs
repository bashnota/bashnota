import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalContent, canonicalCount, canonicalTimestamp, MigrationDataError, parseLosslessJson, publicAuditEvent, sha256, stableJson } from '../../../scripts/legacy-migration/canonical.mjs'
import { identityRequirements, transformExport } from '../../../scripts/legacy-migration/transform.mjs'
import { FileTarget } from '../../../scripts/legacy-migration/file-target.mjs'
import { ChainedAuditFile, CheckpointFile, runMigration } from '../../../scripts/legacy-migration/runner.mjs'
import { assembleExport } from '../../../scripts/legacy-migration/export.mjs'

const fixtureUrl = new URL('./fixtures/legacy-export.json', import.meta.url)
const sourceText = await readFile(fixtureUrl, 'utf8')
const source = JSON.parse(sourceText)
const provisioned = [
  { sourceUid: 'legacy-alice', supabaseUserId: '00000000-0000-4000-8000-000000000001', provider: 'email', providerUid: 'alice@example.test', email: 'alice@example.test' },
  { sourceUid: 'legacy-bob', supabaseUserId: '00000000-0000-4000-8000-000000000002', provider: 'email', providerUid: 'bob@example.test', email: 'bob@example.test' },
]

const first = transformExport(source, provisioned)
const assembled = assembleExport({ watermark: source.watermark, authExport: { users: source.authUsers.map(user => ({ ...user, localId: user.uid, uid: undefined })) }, collections: source.collections, storageManifest: source.storageManifest })
assert.deepEqual(assembled.authUsers.map(user => [user.uid, user.provider]), [['legacy-alice', 'email'], ['legacy-bob', 'email']])
assert.deepEqual(assembled.collections, source.collections, 'offline export assembler must retain every exact collection deterministically')
const second = transformExport(JSON.parse(sourceText), [...provisioned].reverse())
assert.equal(first.manifestHash, second.manifestHash, 'canonical transform must be deterministic')
assert.equal(stableJson(first), stableJson(second), 'input and identity ordering must not alter output')
assert.deepEqual(first.orphans, [])
assert.deepEqual(first.quarantined, [])

const kinds = new Set(first.records.map(item => item.kind))
for (const kind of ['identity', 'legacy_nota', 'publication', 'publication_edge', 'nota_vote', 'nota_viewer', 'metric_bucket', 'comment', 'comment_vote', 'newsletter']) {
  assert.ok(kinds.has(kind), `fixture must exercise ${kind}`)
}

const publicationRecords = first.records.filter(item => item.kind === 'publication')
assert.deepEqual(publicationRecords.map(item => item.payload.id), ['pub-root', 'pub-child'], 'parents must precede children regardless of source order')
assert.deepEqual(publicationRecords[0].payload.published_nota_citations.map(item => item.title), ['First', 'Second'], 'citation order must be retained')
assert.equal(publicationRecords[0].payload.source_published_at_raw, '{"_nanoseconds":9000,"_seconds":1754006400}')
assert.equal(publicationRecords[0].payload.published_at, '2025-08-01T00:00:00.000009Z')

const commentRecords = first.records.filter(item => item.kind === 'comment')
assert.deepEqual(commentRecords.map(item => item.payload.id), ['comment-root', 'comment-reply'], 'comment parents must precede replies')
const notaVote = first.records.find(item => item.kind === 'nota_vote').payload
assert.equal(notaVote.updated_at, '2026-08-12T08:00:00.000000Z', 'newer dedicated vote must win without using migration time')
const commentVote = first.records.find(item => item.kind === 'comment_vote').payload
assert.equal(commentVote.created_at, '2026-08-12T10:00:00.000000Z', 'embedded comment vote timestamp must derive deterministically from its source comment')
const rawTimestampVariant = structuredClone(source)
rawTimestampVariant.collections.notaVotes[0].updatedAt = '2026-08-12T08:00:00.000000Z'
const rawVariantVote = transformExport(rawTimestampVariant, provisioned).records.find(item => item.kind === 'nota_vote')
assert.notEqual(rawVariantVote.sourceHash, first.records.find(item => item.kind === 'nota_vote').sourceHash, 'equivalent UTC instants with different raw vote representations retain different audit provenance')

assert.deepEqual(identityRequirements(source).map(item => item.sourceUid), ['legacy-alice', 'legacy-bob'])
await assert.rejects(async () => transformExport(source, provisioned.map((item, index) => index ? { ...item, supabaseUserId: provisioned[0].supabaseUserId } : item)), /two source identities map to one Supabase account/)
await assert.rejects(async () => transformExport(source, provisioned.map((item, index) => index ? { ...item, email: 'wrong@example.test' } : item)), /invalid canonical target mapping/)
assert.equal(canonicalCount('9007199254740993', 'large'), '9007199254740993')
assert.throws(() => canonicalCount(9007199254740992, 'unsafe'), MigrationDataError)
assert.equal(canonicalTimestamp('2026-08-10T10:30:00-07:00', 'offset').utc, '2026-08-10T17:30:00.000000Z')
assert.equal(canonicalTimestamp('2026-08-10T10:30:00.123456789Z', 'nanos').utc, '2026-08-10T10:30:00.123456Z')
assert.throws(() => canonicalTimestamp('08/10/2026 10:30', 'locale'), MigrationDataError)
assert.throws(() => parseLosslessJson('{"nested":{"unsafe":9007199254740993}}', 'unsafe fixture'), /lossy number/)
assert.throws(() => parseLosslessJson('{"nested":[0.10000000000000001]}', 'rounded fixture'), /lossy number/)
assert.deepEqual(canonicalContent('{"nested":{"unsafe":9007199254740993}}', 'content'), { content: null, quarantineText: '{"nested":{"unsafe":9007199254740993}}' })
const unsafeObjectContent = structuredClone(source)
unsafeObjectContent.collections.publishedNotas[0].content = { nested: { unsafe: Number.MAX_SAFE_INTEGER + 1 } }
assert.equal(transformExport(unsafeObjectContent, provisioned).quarantined.length, 1, 'programmatic unsafe nested content must be quarantined')

const auditEvent = publicAuditEvent({ phase: 'apply', keyHash: sha256('key'), email: 'not-allowed@example.test', content: 'secret', status: 'ok' })
assert.deepEqual(Object.keys(auditEvent).sort(), ['keyHash', 'phase', 'status'])
assert.ok(!stableJson(first).includes('profile-images/legacy-alice'), 'storage paths must be hashed in the canonical manifest')

const cyclic = JSON.parse(sourceText)
cyclic.collections.publishedNotas[0].publishedSubPages = ['pub-root']
cyclic.collections.publishedNotas[0].parentId = 'pub-root'
cyclic.collections.publishedNotas[1].publishedSubPages = ['pub-child']
cyclic.collections.publishedNotas[1].parentId = 'pub-child'
cyclic.collections.publishedNotas[1].isSubPage = true
const cycleManifest = transformExport(cyclic, provisioned)
assert.ok(cycleManifest.orphans.some(item => item.type === 'publication-parent-cycle'), 'cycles must fail closed without recursive looping')
const ambiguousVote = structuredClone(source)
ambiguousVote.collections.notaVotes[0].voteType = 'dislike'
ambiguousVote.collections.notaVotes[0].updatedAt = '2026-08-10T08:00:00Z'
assert.ok(transformExport(ambiguousVote, provisioned).orphans.some(item => item.type === 'nota-vote-conflict'), 'an older conflicting dedicated vote must block cutover')

const taskDirectory = await mkdtemp(join(tmpdir(), 'bashnota-migration007-'))
const cliPath = fileURLToPath(new URL('../../../scripts/legacy-migration/cli.mjs', import.meta.url))
const approvalPath = join(taskDirectory, 'approval.json')
await writeFile(approvalPath, JSON.stringify({ productionRunId: 'fixture-run', c0Approved: true, reconciliationMarker: '   ' }))
const blankMarker = spawnSync(process.execPath, [cliPath, '--mode', 'dry-run', '--environment', 'production', '--run-id', 'fixture-run', '--approval-file', approvalPath], { encoding: 'utf8' })
assert.equal(blankMarker.status, 1, 'production approval must contain a nonblank reconciliation marker')
const invalidInteger = spawnSync(process.execPath, [cliPath, '--mode', 'dry-run', '--environment', 'local', '--run-id', 'fixture-run', '--source', fileURLToPath(fixtureUrl), '--audit', join(taskDirectory, 'invalid.audit'), '--checkpoint', join(taskDirectory, 'invalid.checkpoint'), '--report', join(taskDirectory, 'invalid.report'), '--batch-size', '1x'], { encoding: 'utf8' })
assert.equal(invalidInteger.status, 1, 'CLI numeric controls must reject partially parsed integers')
const auditPath = join(taskDirectory, 'audit.ndjson'), checkpointPath = join(taskDirectory, 'checkpoint.json')
const audit = new ChainedAuditFile(auditPath, 'fixture-run'); await audit.initialize()
const checkpoint = new CheckpointFile(checkpointPath)
const retryKey = first.records[2].keyHash
const target = new FileTarget({ transientFailures: { [retryKey]: 2 } })
const applied = await runMigration({ manifest: first, target, runId: 'fixture-run', batchSize: 3, requestsPerSecond: 100, maxRetries: 2, checkpoint, audit })
assert.equal(applied.status, 'completed')
assert.equal(applied.applied, 18)
assert.equal(target.calls.filter(key => key === retryKey).length, 3, 'bounded transient retry must eventually apply exactly once')
const binding = { runId: 'fixture-run', manifestHash: first.manifestHash, sourceWatermarkHash: first.sourceWatermarkHash, identityPlanHash: first.identityPlanHash }
assert.equal((await checkpoint.read(binding)).nextSequence, 19)
assert.equal((await stat(auditPath)).mode & 0o777, 0o600)
assert.equal((await stat(checkpointPath)).mode & 0o777, 0o600)
const auditText = await readFile(auditPath, 'utf8')
for (const forbidden of ['alice@example.test', 'bob@example.test', 'legacy-alice', 'profile-images', 'Hello']) assert.ok(!auditText.includes(forbidden), `audit must redact ${forbidden}`)
assert.ok(auditText.includes(first.records.find(item => item.kind === 'nota_vote').sourceHash), 'audit must bind the raw-timestamp-bearing source hash')
const resumedAudit = new ChainedAuditFile(auditPath, 'fixture-run'); await resumedAudit.initialize()
const rerun = await runMigration({ manifest: first, target, runId: 'fixture-run', batchSize: 4, requestsPerSecond: 100, checkpoint: null, audit: resumedAudit })
assert.equal(rerun.applied, 0); assert.equal(rerun.skipped, 18); assert.equal(target.records.size, 18)

const lostRunId = 'lost-response-run'
const lostCompleteRecord = first.records[0], lostAuditRecord = first.records[1]
const lostAuditKey = sha256(stableJson({ runId: lostRunId, event: {
  phase: 'record', status: 'applied', kind: lostAuditRecord.kind,
  keyHash: lostAuditRecord.keyHash, sourceHash: lostAuditRecord.sourceHash,
} }))
const lostAuditPath = join(taskDirectory, 'lost-response.audit.ndjson')
const lostResponseAudit = new ChainedAuditFile(lostAuditPath, lostRunId); await lostResponseAudit.initialize()
const lostResponseTarget = new FileTarget({
  lostCompleteResponses: { [lostCompleteRecord.keyHash]: 1 },
  lostAuditResponses: { [lostAuditKey]: 1 },
})
const lostResponseResult = await runMigration({ manifest: first, target: lostResponseTarget, runId: lostRunId, batchSize: 20, requestsPerSecond: 100, maxRetries: 2, audit: lostResponseAudit })
assert.equal(lostResponseResult.status, 'completed')
assert.ok(lostResponseTarget.completeCalls.filter(key => key === lostCompleteRecord.keyHash).length >= 2, 'lost complete response must re-reserve and confirm durable completion')
assert.ok(lostResponseTarget.auditCalls.filter(key => key === lostAuditKey).length >= 2, 'lost audit response must retry the exact idempotency key')
assert.equal(lostResponseTarget.records.size, first.records.length, 'lost responses must not duplicate targets')
assert.ok([...lostResponseTarget.journal.values()].every(item => item.state === 'applied'), 'late retry failure paths must not downgrade applied journal state')
assert.equal(lostResponseTarget.audit.size, lostResponseTarget.auditSequence.length, 'one physical audit entry exists per logical idempotency key')
const lostAuditLines = (await readFile(lostAuditPath, 'utf8')).trim().split('\n').map(JSON.parse)
assert.equal(new Set(lostAuditLines.map(item => item.idempotencyKey)).size, lostAuditLines.length, 'local audit also stores each logical event once')
const verifiedLostAudit = new ChainedAuditFile(lostAuditPath, lostRunId); await verifiedLostAudit.initialize()

const concurrentAuditPath = join(taskDirectory, 'concurrent.audit.ndjson')
const runnerModuleUrl = new URL('../../../scripts/legacy-migration/runner.mjs', import.meta.url).href
const childScript = `import { ChainedAuditFile } from ${JSON.stringify(runnerModuleUrl)}; const audit=new ChainedAuditFile(process.argv[1],process.argv[2]); await audit.initialize(); await audit.append({phase:'concurrency',status:process.argv[3]});`
const appendFromProcess = status => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--input-type=module', '-e', childScript, concurrentAuditPath, 'concurrent-run', status], { stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk })
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`audit child exited ${code}: ${stderr}`)))
})
await Promise.all([appendFromProcess('writer-a'), appendFromProcess('writer-b')])
const concurrentLines = (await readFile(concurrentAuditPath, 'utf8')).trim().split('\n').map(JSON.parse)
assert.deepEqual(concurrentLines.map(item => item.sequence), [1, 2], 'two processes cannot both append audit sequence one')
assert.equal(concurrentLines[1].previousHash, concurrentLines[0].eventHash, 'concurrent writers retain one valid hash chain')
const verifiedConcurrentAudit = new ChainedAuditFile(concurrentAuditPath, 'concurrent-run'); await verifiedConcurrentAudit.initialize()
await writeFile(`${concurrentAuditPath}.lock`, stableJson({ pid: 2_147_483_647, token: 'abandoned', createdAt: new Date(0).toISOString() }))
await verifiedConcurrentAudit.append({ phase: 'concurrency', status: 'stale-lock-recovered' })
assert.equal((await readFile(concurrentAuditPath, 'utf8')).trim().split('\n').length, 3, 'a lock owned by a dead process is safely recovered')

const checkpointRunB = new FileTarget()
await assert.rejects(() => runMigration({ manifest: first, target: checkpointRunB, runId: 'different-run', checkpoint }), /checkpoint runId/)
assert.equal(checkpointRunB.runs.size, 0, 'a checkpoint owned by run A must reject run B before run state is created')

const legacyRecord = first.records.find(item => item.kind === 'legacy_nota')
const matchingTarget = new FileTarget({ records: [legacyRecord] })
await runMigration({ manifest: first, target: matchingTarget, runId: 'matching-run', batchSize: 20, requestsPerSecond: 100 })
assert.equal(matchingTarget.journal.get(legacyRecord.keyHash).mutationKind, 'preexisting')
await matchingTarget.rollback('matching-run')
assert.ok(matchingTarget.records.has(legacyRecord.keyHash), 'rollback must retain a matching row that predates the exact run')

const conflictingRecord = { ...structuredClone(first.records[0]), sourceHash: sha256('pre-existing-conflict') }
const conflictingTarget = new FileTarget({ records: [conflictingRecord] })
await assert.rejects(() => runMigration({ manifest: first, target: conflictingTarget, runId: 'conflict-run' }), error => error.code === '23505')
assert.equal(conflictingTarget.runs.size, 0, 'target conflict must fail before a run journal is created')

const crashTarget = new FileTarget()
await crashTarget.startRun({ runId: 'crash-run', manifest: first, dryRun: false })
await crashTarget.reserve({ runId: 'crash-run', sequence: 1, record: legacyRecord })
await crashTarget.apply(legacyRecord, { runId: 'crash-run' })
await crashTarget.fail(legacyRecord, 'transient', { runId: 'crash-run' })
await crashTarget.reserve({ runId: 'crash-run', sequence: 1, record: legacyRecord })
await crashTarget.apply(legacyRecord, { runId: 'crash-run' })
await crashTarget.complete(legacyRecord, { runId: 'crash-run' })
assert.equal(crashTarget.journal.get(legacyRecord.keyHash).mutationKind, 'created', 'resume after apply-before-complete crash must retain exact-run ownership')
await crashTarget.rollback('crash-run')
assert.equal(crashTarget.records.size, 0, 'rollback removes a target created before the interrupted completion')

const fencedRunId = 'fenced-rollback-run'
const fencedTarget = new FileTarget({ records: [legacyRecord] })
await runMigration({ manifest: first, target: fencedTarget, runId: fencedRunId, batchSize: 20, requestsPerSecond: 100 })
const liveApplyOwner = fencedTarget.fork()
await liveApplyOwner.startRun({ runId: fencedRunId, manifest: first, dryRun: false })
const rollbackContender = fencedTarget.fork()
const beforeRejectedRollback = stableJson(fencedTarget.snapshot())
await assert.rejects(() => rollbackContender.rollback(fencedRunId), error => error.code === '55P03')
assert.equal(stableJson(fencedTarget.snapshot()), beforeRejectedRollback, 'rejected rollback cannot alter target, journal, or run state')
fencedTarget.runs.get(fencedRunId).leaseExpiresAt = Date.now() - 1
assert.equal(await rollbackContender.startRollback(fencedRunId), 'acquired', 'expired apply lease is atomically taken over for rollback')
assert.notEqual(await rollbackContender.rollbackNext(fencedRunId), 'done', 'rollback commits one resumable record transaction before interruption')
const resumedRollback = fencedTarget.fork()
await assert.rejects(() => resumedRollback.rollback(fencedRunId), error => error.code === '55P03')
fencedTarget.runs.get(fencedRunId).leaseExpiresAt = Date.now() - 1
await resumedRollback.rollback(fencedRunId)
assert.ok(fencedTarget.records.has(legacyRecord.keyHash), 'rollback retains exact matching pre-existing target')
assert.ok([...fencedTarget.records.values()].every(record => record.kind === 'identity' || record.keyHash === legacyRecord.keyHash), 'rollback deletes only exact-run created non-identity targets')
assert.ok([...fencedTarget.journal.values()].filter(item => item.kind !== 'identity').every(item => item.state === 'rolled-back'), 'crash-resumed rollback marks every non-identity provenance row')
assert.ok([...fencedTarget.journal.values()].filter(item => item.kind === 'identity').every(item => item.state === 'applied'), 'rollback retains stable identity translations for exact resume')
assert.equal(fencedTarget.runs.get(fencedRunId).state, 'rolled-back')

const otherRun = await runMigration({ manifest: first, target, runId: 'other-run', batchSize: 20, requestsPerSecond: 100 })
assert.equal(otherRun.applied, 0); assert.equal(otherRun.skipped, first.records.length)
await target.rollback('other-run')
assert.equal(target.records.size, first.records.length, 'run B rollback must not claim or delete run A targets')

const snapshot = target.snapshot()
await target.rollback('fixture-run'); assert.equal(target.records.size, first.records.filter(item => item.kind === 'identity').length, 'rollback retains stable identity translations')
target.restore(snapshot); assert.equal((await target.reconcile(first)).status, 'pass', 'rollback restore must recover an exact snapshot')
const changed = structuredClone(first); changed.records[0].sourceHash = sha256('changed-source')
await assert.rejects(() => runMigration({ manifest: changed, target, runId: 'fixture-run', batchSize: 10, requestsPerSecond: 100 }), error => error.code === '23505')

const unsafe = structuredClone(first); unsafe.orphans.push({ type: 'fixture-orphan' })
const dryTarget = new FileTarget()
const dryResult = await runMigration({ manifest: unsafe, target: dryTarget, runId: 'dry-run', mode: 'dry-run' })
assert.equal(dryResult.status, 'no-go'); assert.equal(dryTarget.records.size, 0)
let beforeStartCalls = 0
await assert.rejects(() => runMigration({ manifest: unsafe, target: new FileTarget(), runId: 'invalid-apply', beforeStart: async () => { beforeStartCalls += 1 } }), /unresolved or quarantined/)
assert.equal(beforeStartCalls, 0, 'source rejection must precede Auth/Admin provisioning callbacks')

console.log(JSON.stringify({ status: 'pass', manifestHash: first.manifestHash, records: first.records.length, kinds: kinds.size }))
