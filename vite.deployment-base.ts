const defaultDeploymentBase = '/bashnota/'

export function resolveDeploymentBase(configuredBase?: string): string {
  const candidate = configuredBase?.trim() || defaultDeploymentBase

  if (!candidate.startsWith('/')) {
    throw new Error('VITE_DEPLOY_BASE must be an absolute URL path beginning with "/"')
  }
  if (/[?#\\\s]/.test(candidate) || candidate.includes('//')) {
    throw new Error(
      'VITE_DEPLOY_BASE must not contain whitespace, a query, a fragment, a backslash, or repeated slashes',
    )
  }

  for (const segment of candidate.split('/')) {
    let decoded: string
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      throw new Error('VITE_DEPLOY_BASE contains invalid percent encoding')
    }
    if (decoded === '.' || decoded === '..') {
      throw new Error('VITE_DEPLOY_BASE must not contain traversal segments')
    }
  }

  return candidate.endsWith('/') ? candidate : `${candidate}/`
}
