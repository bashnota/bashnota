#!/usr/bin/env node
import { readFile, writeFile, chmod, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { identityRequirements, transformExport } from './transform.mjs'
import { classifyRetry, parseLosslessJson, sha256, stableJson } from './canonical.mjs'
import { FileTarget } from './file-target.mjs'
import { ChainedAuditFile, CheckpointFile, runMigration } from './runner.mjs'
import { createMigrationClient, inspectSupabaseIdentities, provisionSupabaseIdentities, SupabaseTarget } from './supabase-target.mjs'

const failRedacted = error => { console.error(stableJson({ status: 'failed', errorClass: classifyRetry(error) })); process.exit(1) }
process.on('uncaughtException', failRedacted)
process.on('unhandledRejection', failRedacted)

const values = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index]
  if (!name?.startsWith('--') || process.argv[index + 1] === undefined) throw new Error('arguments must be --name value pairs')
  values.set(name.slice(2), process.argv[index + 1])
}
const required = name => { const value = values.get(name); if (!value) throw new Error(`--${name} is required`); return value }
const integer = (name, fallback) => {
  if (!values.has(name)) return fallback
  const raw = values.get(name)
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error(`--${name} must be a canonical nonnegative integer`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) throw new Error(`--${name} exceeds the safe integer range`)
  return value
}
const mode = values.get('mode') ?? 'dry-run'
const environment = values.get('environment') ?? 'local'
if (!['dry-run', 'apply', 'resume', 'rollback'].includes(mode)) throw new Error('--mode must be dry-run, apply, resume, or rollback')
if (!['local', 'staging', 'production'].includes(environment)) throw new Error('--environment must be local, staging, or production')
const runId = required('run-id')

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
let productionApproval
if (environment === 'production') {
  productionApproval = parseLosslessJson(await readFile(resolve(required('approval-file')), 'utf8'), 'production approval')
  if (productionApproval.productionRunId !== runId || productionApproval.c0Approved !== true || typeof productionApproval.reconciliationMarker !== 'string' || productionApproval.reconciliationMarker.trim().length === 0) {
    throw new Error('production approval file does not authorize this exact run')
  }
  if (mode !== 'rollback' && !values.has('identity-map')) throw new Error('production runs require an approved complete identity map')
}
let target
if (mode === 'dry-run') target = new FileTarget()
else {
  if (!url || !serviceKey) throw new Error('SUPABASE_URL and a server-side SUPABASE_SERVICE_ROLE_KEY are required')
  target = new SupabaseTarget(createMigrationClient(url, serviceKey))
}
if (mode === 'rollback') {
  await target.rollback(runId)
  console.log(stableJson({ status: 'rolled-back', runIdHash: sha256(runId), productionCutover: false }))
  process.exit(0)
}

const source = parseLosslessJson(await readFile(resolve(required('source')), 'utf8'), 'legacy migration export')
const requirements = identityRequirements(source)
let preprovisioned = []
if (values.has('identity-map')) preprovisioned = parseLosslessJson(await readFile(resolve(values.get('identity-map')), 'utf8'), 'identity map')
const auditPath = resolve(required('audit'))
const checkpointPath = resolve(required('checkpoint'))
const reportPath = resolve(required('report'))
const controls = {
  batchSize: integer('batch-size', 100), requestsPerSecond: integer('requests-per-second', 20), maxRetries: integer('max-retries', 3),
}
let identities
if (mode === 'dry-run' && preprovisioned.length === 0) {
  identities = requirements.map((item, index) => ({ sourceUid: item.sourceUid, supabaseUserId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, provider: item.provider, providerUid: item.providerUid ?? sha256(item.sourceUid).slice(0, 32), email: item.email }))
} else if (mode === 'dry-run') identities = preprovisioned
else identities = await inspectSupabaseIdentities(target.client, requirements, { preprovisioned })
const manifest = transformExport(source, identities)
if (manifest.orphans.length || manifest.quarantined.length) throw new Error('migration source failed preflight validation')
if (productionApproval && (productionApproval.manifestHash !== manifest.manifestHash
  || productionApproval.sourceWatermarkHash !== manifest.sourceWatermarkHash
  || productionApproval.identityPlanHash !== manifest.identityPlanHash)) {
  throw new Error('production approval hashes do not match the exact transformed source')
}
const checkpoint = new CheckpointFile(checkpointPath)
await checkpoint.read({ runId, manifestHash: manifest.manifestHash, sourceWatermarkHash: manifest.sourceWatermarkHash, identityPlanHash: manifest.identityPlanHash })
const audit = new ChainedAuditFile(auditPath, runId); await audit.initialize()
await mkdir(dirname(reportPath), { recursive: true })

const provision = mode === 'dry-run' ? undefined : async ({ heartbeat }) => {
  const provisioned = await provisionSupabaseIdentities(target.client, requirements, { preprovisioned: identities, heartbeat })
  const provisionedManifest = transformExport(source, provisioned)
  if (provisionedManifest.manifestHash !== manifest.manifestHash) throw new Error('identity provisioning changed the approved migration manifest')
}

const started = performance.now()
const result = await runMigration({
  manifest, target, runId, mode: mode === 'dry-run' ? 'dry-run' : 'apply',
  ...controls, checkpoint, audit, beforeStart: provision,
})
const report = {
  version: 1, environment, mode, status: result.status, runIdHash: sha256(runId),
  sourceWatermarkHash: manifest.sourceWatermarkHash, identityPlanHash: manifest.identityPlanHash, manifestHash: manifest.manifestHash,
  sourceCounts: manifest.sourceCounts, authCount: manifest.authCount, targetRecordCount: manifest.records.length,
  recordCounts: Object.fromEntries([...new Set(manifest.records.map(item => item.kind))].sort().map(kind => [kind, manifest.records.filter(item => item.kind === kind).length])),
  sampleKeyHashes: manifest.records.map(item => item.keyHash).sort().slice(0, 5),
  storageManifestCount: manifest.storageManifest.length, orphanCount: manifest.orphans.length,
  quarantineCount: manifest.quarantined.length, elapsedMs: Math.round(performance.now() - started),
  applied: result.applied ?? 0, skipped: result.skipped ?? 0, productionCutover: false,
  reconciliation: result.reconciliation ?? null,
}
await writeFile(reportPath, `${stableJson(report)}\n`, { mode: 0o600 }); await chmod(reportPath, 0o600)
console.log(stableJson(report))
