import type { JupyterServer } from '@/features/jupyter/types/jupyter'

type Confirmer = (message: string) => boolean

const confirmedRemoteServers = new Set<string>()

const CROSS_ORIGIN_TOKEN_EXECUTION_ERROR =
  'Token-authenticated Jupyter execution requires the Jupyter server to share this app origin. Configure a same-origin HTTPS reverse proxy, then connect through that proxy.'

function serverUrl(server: JupyterServer): URL {
  const raw = /^https?:\/\//i.test(server.ip) ? server.ip : `http://${server.ip}`
  const url = new URL(raw)
  if (server.port) url.port = server.port
  return url
}

export function isLocalJupyterServer(server: JupyterServer): boolean {
  const hostname = serverUrl(server)
    .hostname.replace(/^\[|\]$/g, '')
    .toLowerCase()
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function getJupyterBaseUrl(server: JupyterServer): string {
  const url = serverUrl(server)
  if (!isLocalJupyterServer(server) && url.protocol !== 'https:') {
    throw new Error('Remote Jupyter servers require HTTPS (and WSS for execution).')
  }
  return url.origin
}

export function getJupyterHeaders(server: JupyterServer): Record<string, string> {
  return server.token ? { Authorization: `token ${server.token}` } : {}
}

export function getJupyterRequestUrl(server: JupyterServer, path: string): string {
  const base = new URL(getJupyterBaseUrl(server))
  const target = new URL(path, `${base.origin}/`)
  if (target.origin !== base.origin) {
    throw new Error('Jupyter requests must stay on the confirmed server origin.')
  }
  return target.toString()
}

export function getJupyterFetchOptions(
  server: JupyterServer,
  options: RequestInit = {},
): RequestInit {
  const headers = new Headers(options.headers)
  for (const [name, value] of Object.entries(getJupyterHeaders(server))) {
    headers.set(name, value)
  }

  return {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors',
    redirect: 'error',
  }
}

export function assertJupyterWebSocketAuthenticationSupported(
  server: JupyterServer,
  appOrigin = globalThis.location?.origin,
): void {
  if (!server.token) return

  const serverOrigin = getJupyterBaseUrl(server)
  if (!appOrigin || new URL(appOrigin).origin !== serverOrigin) {
    throw new Error(CROSS_ORIGIN_TOKEN_EXECUTION_ERROR)
  }
}

export function confirmJupyterConnection(
  server: JupyterServer,
  confirm: Confirmer = (message) => window.confirm(message),
): void {
  if (isLocalJupyterServer(server)) return
  const origin = getJupyterBaseUrl(server)
  if (confirmedRemoteServers.has(origin)) return
  if (
    !confirm(`Connect to remote Jupyter server ${origin}? The server can receive notebook data.`)
  ) {
    throw new Error('Remote Jupyter connection was not confirmed.')
  }
  confirmedRemoteServers.add(origin)
}

export function confirmJupyterExecution(
  server: JupyterServer,
  confirm: Confirmer = (message) => window.confirm(message),
): void {
  confirmJupyterConnection(server, confirm)
  assertJupyterWebSocketAuthenticationSupported(server)
  const location = isLocalJupyterServer(server) ? 'your local computer' : getJupyterBaseUrl(server)
  if (
    !confirm(
      `Run this code with Jupyter on ${location}? That kernel has the authority of its Jupyter process.`,
    )
  ) {
    throw new Error('Jupyter code execution was not confirmed.')
  }
}

export function getJupyterWebSocketUrl(server: JupyterServer, kernelId: string): string {
  confirmJupyterConnection(server)
  assertJupyterWebSocketAuthenticationSupported(server)
  const base = new URL(getJupyterBaseUrl(server))
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:'
  base.pathname = `/api/kernels/${encodeURIComponent(kernelId)}/channels`
  return base.toString()
}

export function resetJupyterConfirmationsForTest(): void {
  confirmedRemoteServers.clear()
}
