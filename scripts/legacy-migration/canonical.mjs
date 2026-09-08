import { createHash } from 'node:crypto'

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
  }
  return value
}

export const stableJson = value => JSON.stringify(stableValue(value))
export const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex')
export const opaqueKey = (kind, key) => sha256(`${kind}\0${key}`)

export class MigrationDataError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'MigrationDataError'
    this.details = details
  }
}

export class LosslessJsonError extends MigrationDataError {
  constructor(message, details = {}) {
    super(message, details)
    this.name = 'LosslessJsonError'
  }
}

export function assertLosslessJsonValue(value, label = 'JSON value', seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw new LosslessJsonError(`${label} contains a number that cannot round-trip losslessly`)
    }
    return value
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new LosslessJsonError(`${label} contains a cycle`)
    seen.add(value)
    value.forEach((item, index) => assertLosslessJsonValue(item, `${label}[${index}]`, seen))
    seen.delete(value)
    return value
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    if (seen.has(value)) throw new LosslessJsonError(`${label} contains a cycle`)
    seen.add(value)
    for (const [key, item] of Object.entries(value)) assertLosslessJsonValue(item, `${label}.${key}`, seen)
    seen.delete(value)
    return value
  }
  throw new LosslessJsonError(`${label} contains a non-JSON value`)
}

export function parseLosslessJson(text, label = 'JSON document') {
  if (typeof text !== 'string') throw new LosslessJsonError(`${label} must be text`)
  for (let index = 0; index < text.length;) {
    if (text[index] === '"') {
      index += 1
      while (index < text.length) {
        if (text[index] === '\\') { index += 2; continue }
        if (text[index] === '"') { index += 1; break }
        index += 1
      }
      continue
    }
    if (text[index] === '-' || /\d/.test(text[index])) {
      const token = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0]
      if (token) {
        const number = Number(token)
        const integerToken = /^-?(?:0|[1-9]\d*)$/.test(token)
        if (!Number.isFinite(number) || integerToken && !Number.isSafeInteger(number)
          || !integerToken && JSON.stringify(number) !== token) {
          throw new LosslessJsonError(`${label} contains a non-canonical or lossy number`, { offset: index })
        }
        index += token.length
        continue
      }
    }
    index += 1
  }
  let parsed
  try { parsed = JSON.parse(text) } catch (error) {
    throw new MigrationDataError(`${label} is not valid JSON`, { cause: error.name })
  }
  assertLosslessJsonValue(parsed, label)
  return parsed
}

export function canonicalTimestamp(value, label) {
  if (value && typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0
    if (Number.isSafeInteger(seconds) && Number.isInteger(nanoseconds) && nanoseconds >= 0 && nanoseconds < 1_000_000_000) {
      const date = new Date(seconds * 1000)
      if (!Number.isNaN(date.valueOf())) {
        const prefix = date.toISOString().slice(0, 19)
        return { utc: `${prefix}.${String(Math.floor(nanoseconds / 1000)).padStart(6, '0')}Z`, raw: stableJson(value) }
      }
    }
  }
  if (typeof value === 'string' && value.trim() === value) {
    const match = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,9}))?(?:Z|[+-]\d{2}:\d{2})$/)
    if (!match) throw new MigrationDataError(`${label} must be an RFC3339 timestamp with an explicit offset`)
    const date = new Date(value)
    if (!Number.isNaN(date.valueOf())) {
      const microseconds = String(match[1] ?? '').padEnd(6, '0').slice(0, 6)
      return { utc: `${date.toISOString().slice(0, 19)}.${microseconds}Z`, raw: value }
    }
  }
  throw new MigrationDataError(`${label} must represent a valid timestamp`)
}

export function optionalTimestamp(value, label) {
  return value == null ? { utc: null, raw: value == null ? null : stableJson(value) } : canonicalTimestamp(value, label)
}

export function canonicalCount(value, label, fallback = undefined) {
  if (value === undefined && fallback !== undefined) return canonicalCount(fallback, label)
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value).toString()
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) return BigInt(value).toString()
  throw new MigrationDataError(`${label} must be a canonical nonnegative integer`)
}

export function canonicalContent(value, label, { allowText = false } = {}) {
  if (value == null) return { content: null, quarantineText: null }
  if (typeof value === 'string') {
    try {
      return { content: stableValue(parseLosslessJson(value, label)), quarantineText: null }
    } catch (error) {
      if (error instanceof LosslessJsonError) return { content: null, quarantineText: value }
      if (allowText) return { content: value, quarantineText: null }
      return { content: null, quarantineText: value }
    }
  }
  if (typeof value === 'object') {
    try { assertLosslessJsonValue(value, label); return { content: stableValue(value), quarantineText: null } } catch (error) {
      if (error instanceof LosslessJsonError) return { content: null, quarantineText: stableJson({ rejected: 'lossy-json' }) }
      throw error
    }
  }
  throw new MigrationDataError(`${label} has an unsupported content representation`)
}

export function classifyRetry(error) {
  const code = String(error?.code ?? error?.status ?? '')
  const message = String(error?.message ?? error ?? '')
  if (['40001', '40P01', '55P03', '57014', '429', '500', '502', '503', '504'].includes(code)
    || /network|fetch failed|timeout|temporar|connection reset/i.test(message)) return 'transient'
  if (code === '23505' || /already exists|duplicate|conflict/i.test(message)) return 'conflict'
  return 'permanent'
}

export function publicAuditEvent(event) {
  const allowed = ['phase', 'kind', 'keyHash', 'sourceHash', 'status', 'attempt', 'errorClass', 'elapsedMs', 'count', 'checkpoint']
  const result = {}
  for (const key of allowed) if (event[key] !== undefined) result[key] = event[key]
  return result
}
