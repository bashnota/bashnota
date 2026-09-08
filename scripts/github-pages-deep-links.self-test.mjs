import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const artifactDirectory = join(process.cwd(), 'dist')
const basePath = '/bashnota/'
const shell = await readFile(join(artifactDirectory, 'index.html'), 'utf8')
const fallbackShell = await readFile(join(artifactDirectory, '404.html'), 'utf8')
const artifactRoot = resolve(artifactDirectory)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
}

function artifactPath(pathname) {
  const relativePath = decodeURIComponent(pathname.slice(basePath.length))
  const candidate = resolve(artifactDirectory, normalize(relativePath || 'index.html'))
  return candidate.startsWith(`${artifactRoot}/`) ? candidate : undefined
}

async function readArtifact(pathname) {
  const candidate = artifactPath(pathname)
  if (!candidate) return undefined
  try {
    return { body: await readFile(candidate), path: candidate }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return undefined
    throw error
  }
}

const staticHost = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://static-host.test')
  if (!requestUrl.pathname.startsWith(basePath)) {
    response.writeHead(404).end()
    return
  }

  const artifact = await readArtifact(requestUrl.pathname)
  if (artifact) {
    response.writeHead(200, { 'content-type': contentTypes[extname(artifact.path)] ?? 'application/octet-stream' }).end(artifact.body)
    return
  }

  // GitHub Pages serves its custom 404 document for unknown files. This
  // intentionally does not redirect, so location.pathname/search/hash remain
  // the destination while Vue Router boots from the actual emitted fallback.
  response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(fallbackShell)
})

await new Promise((resolve) => staticHost.listen(0, '127.0.0.1', resolve))
const address = staticHost.address()
assert.ok(address && typeof address !== 'string', 'Static test server must bind a TCP port.')

const destinations = [
  '/p/public-nota',
  '/auth/callback?code=oauth-code&next=%2Fnota%2Flocal%252Fid',
  '/auth/reset-password?token=recovery-token',
  '/settings/advanced?tab=storage',
  '/nota/local%2Ffolder%2Fnotebook%20one?focus=block%3A1#cell-2',
  '/@alice/research%2Fnotes?ref=shared#discussion',
]

const staticAssets = [
  ...new Set([...shell.matchAll(/(?:src|href)="(\/bashnota\/(?:assets\/[^"?#]+|manifest\.webmanifest|registerSW\.js))/g)].map((match) => match[1])),
  '/bashnota/sw.js',
]

try {
  assert.equal(fallbackShell, shell, 'dist/404.html must be the final generated app shell.')

  for (const destination of destinations) {
    const browserUrl = new URL(`${basePath}${destination.slice(1)}`, `http://127.0.0.1:${address.port}`)
    const response = await fetch(browserUrl)
    const deliveredShell = await response.text()

    assert.equal(response.status, 404, `Static host should use 404.html for ${destination}.`)
    assert.equal(response.url, browserUrl.href.replace(browserUrl.hash, ''), `Fallback must not redirect ${destination}.`)
    assert.equal(deliveredShell, fallbackShell, `Fallback must deliver the emitted 404 shell for ${destination}.`)
  }

  for (const asset of staticAssets) {
    const response = await fetch(new URL(asset, `http://127.0.0.1:${address.port}`))
    const deliveredAsset = Buffer.from(await response.arrayBuffer())
    const expectedAsset = await readArtifact(asset)
    assert.ok(expectedAsset, `Built artifact must contain ${asset}.`)
    assert.equal(response.status, 200, `Static asset ${asset} must not receive the SPA fallback.`)
    assert.deepEqual(deliveredAsset, expectedAsset.body, `Static host must serve the actual ${asset} bytes.`)
  }
} finally {
  await new Promise((resolve, reject) => staticHost.close((error) => (error ? reject(error) : resolve())))
}

console.log('GitHub Pages deep-link artifact self-test passed.')
