import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const image = process.env.CONTAINER_SMOKE_IMAGE || 'bashnota:smoke'
const container = `bashnota-smoke-${randomUUID()}`

function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', ...options })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `docker ${args[0]} failed`)
  return result.stdout?.trim() ?? ''
}

async function waitFor(url) {
  let lastError
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError || new Error(`container did not become ready at ${url}`)
}

try {
  if (!process.env.CONTAINER_SMOKE_IMAGE) {
    docker(['build', '--tag', image, '--build-arg', 'VITE_DEPLOY_BASE=/', '.'], { stdio: 'inherit' })
  }
  docker(['run', '--detach', '--rm', '--name', container, '--publish', '127.0.0.1::8080', image])
  const port = docker(['port', container, '8080/tcp']).match(/:(\d+)$/)?.[1]
  assert.ok(port, 'Docker did not publish the application port')
  const origin = `http://127.0.0.1:${port}`
  await waitFor(`${origin}/healthz`)

  const root = await fetch(`${origin}/`)
  const rootBody = await root.text()
  assert.equal(root.status, 200)
  assert.match(rootBody, /<div id="app"><\/div>/)
  assert.equal(root.headers.get('x-frame-options'), 'DENY')
  assert.equal(root.headers.get('x-content-type-options'), 'nosniff')
  assert.match(root.headers.get('content-security-policy') || '', /frame-ancestors 'none'/)
  assert.equal(root.headers.get('cache-control'), 'no-cache')

  const deepLink = await fetch(`${origin}/notas/direct-navigation`)
  assert.equal(deepLink.status, 200)
  assert.equal(await deepLink.text(), rootBody)

  const manifest = await fetch(`${origin}/manifest.webmanifest`)
  assert.equal(manifest.status, 200)
  assert.match(manifest.headers.get('content-type') || '', /^application\/manifest\+json/)
  assert.equal(manifest.headers.get('cache-control'), 'no-cache')

  const assetPath = rootBody.match(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/)?.[1]
  assert.ok(assetPath, 'built HTML did not reference a hashed asset')
  const asset = await fetch(`${origin}${assetPath}`)
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('cache-control') || '', /max-age=31536000, immutable/)

  const leakedSecrets = docker(['exec', container, 'sh', '-c', "grep -R -E 'sb_secret_[A-Za-z0-9_-]{8,}|SUPABASE_SERVICE_ROLE_KEY[[:space:]]*[:=]' /usr/share/nginx/html || true"])
  assert.equal(leakedSecrets, '', 'server-side Supabase credential marker found in frontend files')
  console.log('Production container smoke test passed.')
} finally {
  spawnSync('docker', ['stop', container], { stdio: 'ignore' })
}
