import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appOrigin = 'https://pwa-artifact.invalid'
const configuredBase = process.env.VITE_DEPLOY_BASE || '/bashnota/'
const appBase = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`
const html = readFileSync('dist/index.html', 'utf8')
const manifestLinks = [...html.matchAll(/<link\s+rel=["']manifest["']\s+href=["']([^"']+)["']/g)]
  .map((match) => match[1])

assert.deepEqual(
  manifestLinks,
  [`${appBase}manifest.webmanifest`],
  'the production shell must expose exactly one base-scoped manifest',
)

const manifestPath = resolve('dist/manifest.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
assert.equal(manifest.start_url, appBase, 'the installed app must start inside the deployment base')
assert.equal(manifest.scope, appBase, 'the service worker scope must cover the deployment base')
assert.equal(manifest.display, 'standalone', 'the manifest must request standalone display')
assert.ok(manifest.icons?.length, 'the manifest must provide at least one install icon')

for (const icon of manifest.icons) {
  const iconUrl = new URL(icon.src, `${appOrigin}${appBase}manifest.webmanifest`)
  assert.equal(iconUrl.origin, appOrigin, `manifest icon must remain same-origin: ${icon.src}`)
  assert.ok(
    iconUrl.pathname.startsWith(appBase),
    `manifest icon must remain inside ${appBase}: ${icon.src}`,
  )
  const artifactPath = resolve('dist', iconUrl.pathname.slice(appBase.length))
  assert.ok(existsSync(artifactPath), `manifest icon is missing from the build: ${artifactPath}`)
}

const robots = readFileSync(resolve('dist/robots.txt'), 'utf8')
assert.match(robots, /^User-agent:\s*\*/m, 'the build must contain a global robots.txt policy')
assert.match(robots, /^Allow:\s*\/$/m, 'robots.txt must permit public routes')

console.log('production PWA artifact gate passed')
