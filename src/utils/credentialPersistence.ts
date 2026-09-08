import { redactSensitiveString } from './redactSensitiveData'

export function withoutApiKeys<T extends { apiKeys?: Record<string, string> }>(
  settings: T,
): Omit<T, 'apiKeys'> {
  const { apiKeys: _memoryOnly, ...persistable } = settings
  return credentialFreeValue(persistable)
}

export function withoutJupyterToken<T extends { jupyterToken?: string }>(
  settings: T,
): Omit<T, 'jupyterToken'> {
  const { jupyterToken: _memoryOnly, ...persistable } = settings
  return credentialFreeValue(persistable)
}

const CREDENTIAL_KEY =
  /^(?:authorization|.*api[-_]?keys?|.*token|secret|credential)$/i

const URL_CREDENTIAL_KEY =
  /^(?:authorization|auth|key|.*api[-_]?keys?|.*token|secret|credential)$/i

function credentialFreeString(value: string): string {
  if (!/^(?:https?|wss?):\/\//i.test(value)) return redactSensitiveString(value)

  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''

    for (const key of [...url.searchParams.keys()]) {
      if (URL_CREDENTIAL_KEY.test(key)) url.searchParams.delete(key)
    }

    if (url.hash.includes('=')) {
      const fragment = new URLSearchParams(url.hash.slice(1))
      for (const key of [...fragment.keys()]) {
        if (URL_CREDENTIAL_KEY.test(key)) fragment.delete(key)
      }
      const safeFragment = fragment.toString()
      url.hash = safeFragment ? `#${safeFragment}` : ''
    } else {
      url.hash = redactSensitiveString(url.hash)
    }

    return redactSensitiveString(url.toString())
  } catch {
    return redactSensitiveString(value)
  }
}

/**
 * Produces a detached value that is safe to cross a durable/export boundary.
 * Exact key matching intentionally preserves non-secret settings such as
 * `maxTokens`, while covering legacy provider and nested Jupyter shapes.
 */
export function credentialFreeValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => credentialFreeValue(item)) as T
  }

  if (value && typeof value === 'object') {
    const persistable: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (!CREDENTIAL_KEY.test(key)) {
        persistable[credentialFreeString(key)] = credentialFreeValue(nestedValue)
      }
    }
    return persistable as T
  }

  return (typeof value === 'string' ? credentialFreeString(value) : value) as T
}

export function credentialFreeSettings<
  T extends {
    ai: { apiKeys?: Record<string, string> }
    integrations: { jupyterToken?: string }
  },
>(settings: T): T {
  return {
    ...settings,
    ai: { ...withoutApiKeys(settings.ai), apiKeys: {} },
    integrations: { ...withoutJupyterToken(settings.integrations), jupyterToken: '' },
  }
}
