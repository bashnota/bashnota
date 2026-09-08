import { chmod, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { classifyRetry, publicAuditEvent, sha256, stableJson } from './canonical.mjs'

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export class ChainedAuditFile {
  constructor(path, runId, { lockTimeoutMs = 5_000, staleLockMs = 30_000 } = {}) {
    this.path = path; this.runId = runId; this.previousHash = ''; this.sequence = 0
    this.entries = new Map(); this.lockPath = `${path}.lock`; this.lockTimeoutMs = lockTimeoutMs; this.staleLockMs = staleLockMs
  }

  async acquireLock() {
    const started = Date.now()
    const token = `${process.pid}-${sha256(`${this.runId}\0${Date.now()}\0${Math.random()}`)}`
    while (true) {
      try {
        const handle = await open(this.lockPath, 'wx', 0o600)
        try { await handle.writeFile(stableJson({ pid: process.pid, token, createdAt: new Date().toISOString() }), 'utf8'); await handle.sync() } finally { await handle.close() }
        return token
      } catch (error) {
        if (error.code !== 'EEXIST') throw error
        let stale = false
        try {
          const [metadata, lockStat] = await Promise.all([readFile(this.lockPath, 'utf8'), stat(this.lockPath)])
          let owner
          try { owner = JSON.parse(metadata) } catch { owner = null }
          if (Number.isSafeInteger(owner?.pid) && owner.pid > 0) {
            try { process.kill(owner.pid, 0) } catch (signalError) { if (signalError.code === 'ESRCH') stale = true }
          } else if (Date.now() - lockStat.mtimeMs > this.staleLockMs) stale = true
        } catch (readError) { if (readError.code === 'ENOENT') continue }
        if (stale) {
          const stalePath = `${this.lockPath}.stale.${token}`
          try { await rename(this.lockPath, stalePath); await unlink(stalePath) } catch (recoveryError) { if (recoveryError.code !== 'ENOENT') throw recoveryError }
          continue
        }
        if (Date.now() - started >= this.lockTimeoutMs) throw Object.assign(new Error('audit file is locked by another live writer'), { code: 'ELOCKED' })
        await wait(10)
      }
    }
  }

  async releaseLock(token) {
    try {
      const owner = JSON.parse(await readFile(this.lockPath, 'utf8'))
      if (owner.token !== token) throw new Error('audit lock ownership changed unexpectedly')
      await unlink(this.lockPath)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }

  async load() {
    this.previousHash = ''; this.sequence = 0; this.entries = new Map()
    let text = ''
    try { text = await readFile(this.path, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
    for (const line of text.split('\n').filter(Boolean)) {
      const entry = JSON.parse(line)
      const expected = sha256(`${entry.previousHash ?? ''}\0${entry.runId}\0${entry.sequence}\0${entry.idempotencyKey}\0${stableJson(entry.event)}`)
      if (entry.runId !== this.runId || entry.sequence !== this.sequence + 1 || entry.previousHash !== (this.previousHash || null)
        || typeof entry.idempotencyKey !== 'string' || !/^[0-9a-f]{64}$/.test(entry.idempotencyKey) || entry.eventHash !== expected) {
        throw new Error('audit chain verification failed')
      }
      const prior = this.entries.get(entry.idempotencyKey)
      if (prior && prior.eventJson !== stableJson(entry.event)) throw new Error('audit idempotency key has divergent content')
      this.entries.set(entry.idempotencyKey, { eventJson: stableJson(entry.event), eventHash: entry.eventHash })
      this.sequence = entry.sequence; this.previousHash = entry.eventHash
    }
  }

  async initialize() {
    await mkdir(dirname(this.path), { recursive: true })
    const token = await this.acquireLock()
    try {
      await this.load()
      const handle = await open(this.path, 'a', 0o600); await handle.close(); await chmod(this.path, 0o600)
    } finally { await this.releaseLock(token) }
  }

  async append(event, idempotencyKey = sha256(stableJson(publicAuditEvent(event)))) {
    const redacted = publicAuditEvent(event)
    if (!/^[0-9a-f]{64}$/.test(idempotencyKey)) throw new Error('audit idempotency key must be a sha256 hash')
    const token = await this.acquireLock()
    try {
      await this.load()
      const existing = this.entries.get(idempotencyKey)
      if (existing) {
        if (existing.eventJson !== stableJson(redacted)) throw Object.assign(new Error('audit idempotency key has divergent content'), { code: '23505' })
        return existing.eventHash
      }
      const sequence = this.sequence + 1
      const previousHash = this.previousHash || null
      const eventHash = sha256(`${previousHash ?? ''}\0${this.runId}\0${sequence}\0${idempotencyKey}\0${stableJson(redacted)}`)
      const handle = await open(this.path, 'a', 0o600)
      try { await handle.appendFile(`${stableJson({ runId: this.runId, sequence, previousHash, idempotencyKey, event: redacted, eventHash })}\n`, 'utf8'); await handle.sync() } finally { await handle.close() }
      this.sequence = sequence; this.previousHash = eventHash
      this.entries.set(idempotencyKey, { eventJson: stableJson(redacted), eventHash })
      return eventHash
    } finally { await this.releaseLock(token) }
  }
}

export class CheckpointFile {
  constructor(path) { this.path = path }
  async read(binding) {
    try {
      const value = JSON.parse(await readFile(this.path, 'utf8'))
      for (const key of ['runId', 'manifestHash', 'sourceWatermarkHash', 'identityPlanHash']) {
        if (value[key] !== binding[key]) throw new Error(`checkpoint ${key} does not match this run`)
      }
      return value
    } catch (error) { if (error.code === 'ENOENT') return null; throw error }
  }
  async write(value) {
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${process.pid}.tmp`
    await writeFile(temporary, `${stableJson(value)}\n`, { mode: 0o600 })
    await chmod(temporary, 0o600); await rename(temporary, this.path); await chmod(this.path, 0o600)
  }
}

export async function runMigration({ manifest, target, runId, mode = 'apply', batchSize = 100, requestsPerSecond = 20, maxRetries = 3, checkpoint, audit, beforeStart }) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('batchSize must be between 1 and 500')
  if (!Number.isFinite(requestsPerSecond) || requestsPerSecond <= 0 || requestsPerSecond > 100) throw new Error('requestsPerSecond must be between 0 and 100')
  if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 || maxRetries > 8) throw new Error('maxRetries must be between 0 and 8')
  if (manifest.orphans.length || manifest.quarantined.length) {
    const result = { status: 'no-go', manifestHash: manifest.manifestHash, orphanCount: manifest.orphans.length, quarantineCount: manifest.quarantined.length }
    if (mode === 'dry-run') return result
    throw new Error('migration source has unresolved or quarantined records')
  }
  const binding = { runId, manifestHash: manifest.manifestHash, sourceWatermarkHash: manifest.sourceWatermarkHash, identityPlanHash: manifest.identityPlanHash }
  const existing = checkpoint ? await checkpoint.read(binding) : null
  const startSequence = existing?.nextSequence ?? 1
  const dryRun = mode === 'dry-run'
  const emit = async event => {
    const redacted = publicAuditEvent(event)
    const logical = event.phase === 'record' && event.status === 'applied'
      ? { phase: event.phase, status: event.status, kind: event.kind, keyHash: event.keyHash, sourceHash: event.sourceHash }
      : redacted
    const idempotencyKey = sha256(stableJson({ runId, event: logical }))
    let auditAttempt = 0
    while (true) {
      auditAttempt += 1
      try {
        await audit?.append(redacted, idempotencyKey)
        await target.appendAudit?.(runId, idempotencyKey, redacted)
        return
      } catch (error) {
        if (classifyRetry(error) !== 'transient' || auditAttempt > maxRetries) throw error
        await wait(Math.min(25 * (2 ** (auditAttempt - 1)), 250))
      }
    }
  }
  await target.preflight?.(manifest)
  await target.startRun({ runId, manifest, dryRun })
  try { await beforeStart?.({ heartbeat: () => target.heartbeat?.(runId) }) } catch (error) {
    await target.finishRun({ runId, status: 'failed', counters: { applied: 0, skipped: 0 } })
    throw error
  }
  await emit({ phase: 'run', status: dryRun ? 'dry-run' : 'started', count: manifest.records.length })
  if (dryRun) {
    await target.finishRun({ runId, status: 'completed', counters: { validated: manifest.records.length } })
    return { status: 'dry-run', manifestHash: manifest.manifestHash, validated: manifest.records.length, applied: 0, skipped: 0 }
  }

  let applied = 0, skipped = 0
  const interval = 1000 / requestsPerSecond
  try {
    for (let batchStart = startSequence - 1; batchStart < manifest.records.length; batchStart += batchSize) {
      const batch = manifest.records.slice(batchStart, batchStart + batchSize)
      for (let offset = 0; offset < batch.length; offset += 1) {
        const record = batch[offset], sequence = batchStart + offset + 1
        let reservation = await target.reserve({ runId, sequence, record })
        if (reservation === 'already_applied' || reservation === 'already_applied_by_run') {
          if (reservation === 'already_applied_by_run') {
            await target.complete(record, { runId })
            await emit({ phase: 'record', kind: record.kind, keyHash: record.keyHash, sourceHash: record.sourceHash, status: 'applied' })
          }
          skipped += 1
          continue
        }
        let attempt = 0
        let durableApplied = false
        while (true) {
          attempt += 1
          try {
            if (!durableApplied) await target.apply(record, { runId })
            await target.complete(record, { runId })
            applied += 1
            await emit({ phase: 'record', kind: record.kind, keyHash: record.keyHash, sourceHash: record.sourceHash, status: 'applied' })
            break
          } catch (error) {
            const errorClass = classifyRetry(error)
            if (errorClass !== 'transient' || attempt > maxRetries) {
              await target.fail(record, errorClass, { runId })
              await emit({ phase: 'record', kind: record.kind, keyHash: record.keyHash, sourceHash: record.sourceHash, status: 'failed', attempt, errorClass })
              throw error
            }
            await emit({ phase: 'record', kind: record.kind, keyHash: record.keyHash, sourceHash: record.sourceHash, status: 'retry', attempt, errorClass })
            await wait(Math.min(25 * (2 ** (attempt - 1)), 250))
            reservation = await target.reserve({ runId, sequence, record })
            durableApplied = reservation === 'already_applied' || reservation === 'already_applied_by_run'
          }
        }
        if (interval >= 1) await wait(interval)
      }
      const nextSequence = batchStart + batch.length + 1
      await checkpoint?.write({ version: 1, ...binding, nextSequence, applied, skipped })
      await emit({ phase: 'checkpoint', status: 'saved', checkpoint: nextSequence, count: applied })
    }
    const reconciliation = await target.reconcile(manifest, { runId })
    if (reconciliation.status !== 'pass') throw Object.assign(new Error('post-migration reconciliation failed'), { reconciliation })
    await emit({ phase: 'run', status: 'completed', count: applied })
    await target.finishRun({ runId, status: 'completed', counters: { applied, skipped } })
    return { status: 'completed', manifestHash: manifest.manifestHash, applied, skipped, reconciliation }
  } catch (error) {
    await target.finishRun({ runId, status: 'failed', counters: { applied, skipped } })
    throw error
  }
}
