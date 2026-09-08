import { describe, expect, it } from 'vitest'

import { resolveDeploymentBase } from './vite.deployment-base'

describe('deployment base', () => {
  it.each([
    [undefined, '/bashnota/'],
    ['', '/bashnota/'],
    ['/', '/'],
    ['/notebooks', '/notebooks/'],
    ['/nested/notebooks/', '/nested/notebooks/'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(resolveDeploymentBase(input)).toBe(expected)
  })

  it.each([
    'notebooks',
    'https://example.com/notebooks/',
    '/notebooks//preview',
    '/notebooks?preview=1',
    '/notebooks#preview',
    '/notebooks/../admin',
    '/notebooks/%2e%2e/admin',
    '/notebooks\\preview',
    '/notebook preview',
    '/notebooks/%zz',
  ])('rejects unsafe or ambiguous base %s', (input) => {
    expect(() => resolveDeploymentBase(input)).toThrow(/VITE_DEPLOY_BASE/)
  })
})
