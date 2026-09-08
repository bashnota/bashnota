const REDACTED = '[REDACTED]'

const sensitiveKey =
  /(?:authorization|api[-_]?key|token|secret|credential)/i

const stringPatterns: Array<[RegExp, string]> = [
  [/(\b(?:https?|wss?):\/\/)[^/\s@]+@/gi, '$1[REDACTED]@'],
  [/\b(Bearer|token)\s+[A-Za-z0-9._~+\/-]+=*/gi, '$1 [REDACTED]'],
  [
    /([?&#](?:api[-_]?key|key|[a-z0-9_-]*token|auth)=)[^&#\s]*/gi,
    '$1[REDACTED]',
  ],
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, REDACTED],
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}\b/g, REDACTED],
  [/\b(?:gsk_|hf_|xai-)[A-Za-z0-9_-]{16,}\b/g, REDACTED],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, REDACTED],
]

export function redactSensitiveString(value: string): string {
  return stringPatterns.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    value,
  )
}

function redactObject(value: object, seen: WeakMap<object, unknown>): unknown {
  const cached = seen.get(value)
  if (cached) return cached

  if (value instanceof Error) {
    const redacted = new Error(redactSensitiveString(value.message))
    redacted.name = value.name
    redacted.stack = value.stack ? redactSensitiveString(value.stack) : undefined
    seen.set(value, redacted)
    const cause = (value as Error & { cause?: unknown }).cause
    if (cause !== undefined) {
      ;(redacted as Error & { cause?: unknown }).cause = redactSensitiveData(cause, seen)
    }
    for (const [key, nested] of Object.entries(value)) {
      ;(redacted as unknown as Record<string, unknown>)[key] = sensitiveKey.test(key)
        ? REDACTED
        : redactSensitiveData(nested, seen)
    }
    return redacted
  }

  if (Array.isArray(value)) {
    const redacted: unknown[] = []
    seen.set(value, redacted)
    value.forEach((item) => redacted.push(redactSensitiveData(item, seen)))
    return redacted
  }

  const redacted: Record<string, unknown> = {}
  seen.set(value, redacted)
  for (const [key, nested] of Object.entries(value)) {
    redacted[key] = sensitiveKey.test(key) ? REDACTED : redactSensitiveData(nested, seen)
  }
  return redacted
}

export function redactSensitiveData(
  value: unknown,
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (typeof value === 'string') return redactSensitiveString(value)
  if (value && typeof value === 'object') return redactObject(value, seen)
  return value
}

export function redactLogArguments(args: unknown[]): unknown[] {
  return args.map((argument) => redactSensitiveData(argument))
}
