import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-sonner', () => ({ toast: vi.fn() }))

import { useJupyterStore } from '../jupyterStore'

describe('Jupyter credential persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('strips legacy tokens on load and rewrites durable storage', () => {
    localStorage.setItem(
      'jupyter-servers',
      JSON.stringify([{ ip: 'localhost', port: '8888', token: 'legacy-token' }]),
    )
    const store = useJupyterStore()

    expect(store.jupyterServers[0].token).toBe('')
    expect(localStorage.getItem('jupyter-servers')).not.toContain('legacy-token')
  })

  it('retains a new token in memory but persists a credential-free server', () => {
    const store = useJupyterStore()
    store.addServer({ ip: 'localhost', port: '8888', token: 'memory-token' })

    expect(store.jupyterServers[0].token).toBe('memory-token')
    expect(localStorage.getItem('jupyter-servers')).not.toContain('memory-token')
  })

  it('scrubs URL credentials from legacy servers and kernel cache keys', () => {
    const credentialUrl =
      'https://user:password@example.com/lab?token=query-secret&safe=1#auth=fragment-secret'
    localStorage.setItem(
      'jupyter-servers',
      JSON.stringify([{ ip: credentialUrl, port: '443', token: '' }]),
    )
    localStorage.setItem('jupyter-kernels', JSON.stringify({ [`${credentialUrl}:443`]: [] }))

    const store = useJupyterStore()
    const durableArtifacts = `${localStorage.getItem('jupyter-servers')} ${localStorage.getItem('jupyter-kernels')}`

    expect(store.jupyterServers[0].ip).not.toContain('query-secret')
    expect(durableArtifacts).not.toContain('user')
    expect(durableArtifacts).not.toContain('password')
    expect(durableArtifacts).not.toContain('query-secret')
    expect(durableArtifacts).not.toContain('fragment-secret')
    expect(durableArtifacts).toContain('safe=1')
  })

  it('deletes malformed legacy server and kernel records', () => {
    localStorage.setItem('jupyter-servers', '[{"token":"legacy-secret"}')
    localStorage.setItem('jupyter-kernels', '{"token=legacy-secret":')

    const store = useJupyterStore()

    expect(store.jupyterServers).toEqual([])
    expect(store.kernels).toEqual({})
    expect(localStorage.getItem('jupyter-servers')).toBeNull()
    expect(localStorage.getItem('jupyter-kernels')).toBeNull()
  })
})
