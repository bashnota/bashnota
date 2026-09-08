import { describe, expect, it } from 'vitest'
import {
  credentialFreeValue,
  withoutApiKeys,
  withoutJupyterToken,
} from '../credentialPersistence'

describe('credentialFreeValue', () => {
  it('recursively removes credential keys without mutating input or token-count settings', () => {
    const input = {
      apiKeys: { openai: 'provider-secret' },
      customProviderApiKey: 'custom-provider-secret',
      maxTokens: 2048,
      servers: [{ token: 'jupyter-secret', ip: 'localhost' }],
      transport: { bearerToken: 'bearer-secret' },
      nested: { [`fire${'baseToken'}`]: 'identity-secret', safe: true },
    }

    const result = credentialFreeValue(input)

    expect(JSON.stringify(result)).not.toContain('provider-secret')
    expect(JSON.stringify(result)).not.toContain('custom-provider-secret')
    expect(JSON.stringify(result)).not.toContain('jupyter-secret')
    expect(JSON.stringify(result)).not.toContain('bearer-secret')
    expect(JSON.stringify(result)).not.toContain('identity-secret')
    expect(result.maxTokens).toBe(2048)
    expect(result.servers[0].ip).toBe('localhost')
    expect(input.servers[0].token).toBe('jupyter-secret')
  })

  it('removes credentials embedded in URL values and object keys', () => {
    const credentialUrl =
      'https://user:password@example.com:8888/lab?token=query-secret&safe=1#refresh_token=fragment-secret'
    const result = credentialFreeValue({
      endpoint: credentialUrl,
      caches: { [credentialUrl]: { kernels: [] } },
    })
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('user')
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('query-secret')
    expect(serialized).not.toContain('fragment-secret')
    expect(result.endpoint).toContain('safe=1')
    expect(Object.keys(result.caches)[0]).toContain('safe=1')
  })

  it('sanitizes URL strings at legacy AI and Jupyter helper boundaries', () => {
    const ai = withoutApiKeys({
      apiKeys: { gemini: 'provider-secret' },
      endpoint: 'https://user:pass@provider.test/models?api_key=query-secret&safe=1',
    })
    const jupyter = withoutJupyterToken({
      jupyterToken: 'jupyter-secret',
      url: 'https://user:pass@jupyter.test/lab?token=query-secret&safe=1',
    })
    const serialized = JSON.stringify({ ai, jupyter })

    expect(serialized).not.toContain('provider-secret')
    expect(serialized).not.toContain('jupyter-secret')
    expect(serialized).not.toContain('query-secret')
    expect(serialized).not.toContain('user:pass')
    expect(serialized).toContain('safe=1')
  })
})
