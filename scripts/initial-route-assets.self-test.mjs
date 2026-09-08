import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import {
  acceptsHtmlResponse,
  buildRouteReadinessProbe,
  findMissingRequiredRouteAssets,
  prepareRouteHarnessShell,
  resolveRouteAssetRequest,
} from '../e2e/initialRouteAssetHarness.mjs'

const DIST_DIRECTORY = new URL('../dist/', import.meta.url)
const ASSETS_DIRECTORY = new URL('../dist/assets/', import.meta.url)
const ENTRY_BUDGET_BYTES = 400_000
const PRELOAD_BUDGET_BYTES = 0
const INITIAL_STYLESHEET_BUDGET_BYTES = 150_000
const LARGEST_LAZY_CHUNK_BUDGET_BYTES = 5_000_000
const HEAVY_ASSET = /(?:^|\/)(?:editor|d3-chart|katex|vue-flow)-/i
const PRECACHE_FORBIDDEN = /(?:^|\/)(?:editor|d3-chart|katex|vue-flow|webllm|heavy-style)-|(?:^|\/)EditorAppShell-|(?:^|\/)KaTeX_/i
const representativeRoutes = ['/', '/login', '/p/published-nota', '/settings']

const html = await readFile(new URL('index.html', DIST_DIRECTORY), 'utf8')
const serviceWorker = await readFile(new URL('sw.js', DIST_DIRECTORY), 'utf8')
const browserGate = await readFile(new URL('../e2e/initial-route-assets.browser.mjs', import.meta.url), 'utf8')
const assets = await readdir(ASSETS_DIRECTORY)
const entryMatches = [...html.matchAll(/<script type="module" crossorigin src="\/bashnota\/assets\/([^\"]+\.js)"><\/script>/g)]
const preloadMatches = [...html.matchAll(/<link rel="modulepreload" crossorigin href="\/bashnota\/assets\/([^\"]+)">/g)]
const stylesheetMatches = [...html.matchAll(/<link rel="stylesheet" crossorigin href="\/bashnota\/assets\/([^\"]+\.css)">/g)]

assert.equal(entryMatches.length, 1, 'The initial document must have exactly one application entry script.')

const entry = entryMatches[0][1]
const entryBytes = (await stat(new URL(`assets/${entry}`, DIST_DIRECTORY))).size
const preloadBytes = await Promise.all(preloadMatches.map(async ([, asset]) => (
  (await stat(new URL(`assets/${asset}`, DIST_DIRECTORY))).size
)))
const stylesheetBytes = await Promise.all(stylesheetMatches.map(async ([, asset]) => (
  (await stat(new URL(`assets/${asset}`, DIST_DIRECTORY))).size
)))
const initialAssets = [entry, ...preloadMatches.map(([, asset]) => asset), ...stylesheetMatches.map(([, asset]) => asset)]
const precacheAssets = [...serviceWorker.matchAll(/\burl\s*:\s*["']([^"']+)["']/g)].map((match) => match[1])

assert.ok(entryBytes <= ENTRY_BUDGET_BYTES, `Entry ${entry} is ${entryBytes} bytes; budget is ${ENTRY_BUDGET_BYTES}.`)
assert.ok(preloadBytes.reduce((total, bytes) => total + bytes, 0) <= PRELOAD_BUDGET_BYTES,
  `Modulepreloads total ${preloadBytes.reduce((total, bytes) => total + bytes, 0)} bytes; budget is ${PRELOAD_BUDGET_BYTES}.`)
assert.ok(stylesheetBytes.reduce((total, bytes) => total + bytes, 0) <= INITIAL_STYLESHEET_BUDGET_BYTES,
  `Initial stylesheets total ${stylesheetBytes.reduce((total, bytes) => total + bytes, 0)} bytes; budget is ${INITIAL_STYLESHEET_BUDGET_BYTES}.`)
assert.deepEqual(initialAssets.filter((asset) => HEAVY_ASSET.test(asset)), [],
  `Initial graph must not contain editor, D3, KaTeX, or Vue Flow assets: ${initialAssets.join(', ')}`)
assert.deepEqual(precacheAssets.filter((asset) => PRECACHE_FORBIDDEN.test(asset)), [],
  `PWA install precache must exclude deferred feature assets: ${precacheAssets.filter((asset) => PRECACHE_FORBIDDEN.test(asset)).join(', ')}`)
assert.deepEqual(
  precacheAssets.filter((asset) => asset.endsWith('.css')).sort(),
  stylesheetMatches.map(([, asset]) => `assets/${asset}`).sort(),
  'PWA precache must contain only the HTML shell stylesheet; lazy route/feature CSS is runtime-cached.',
)
for (const coreAsset of ['index.html', '404.html', 'registerSW.js', `assets/${entry}`,
  ...stylesheetMatches.map(([, asset]) => `assets/${asset}`)]) {
  assert.ok(precacheAssets.includes(coreAsset), `PWA precache must retain core shell asset ${coreAsset}.`)
}
for (const fontWeight of ['400', '500']) {
  assert.ok(
    precacheAssets.some((asset) => new RegExp(`^assets/fira-code-latin-${fontWeight}-normal-.*\\.woff2$`).test(asset)),
    `PWA precache must retain the self-hosted Fira Code ${fontWeight} font for offline use.`,
  )
}
assert.match(serviceWorker, /bashnota-deferred-features/,
  'PWA must runtime-cache deferred feature assets after their first request.')
assert.match(serviceWorker, /CacheFirst\(\{cacheName:["']bashnota-deferred-features["']/,
  'Deferred feature runtime caching must use CacheFirst so a feature works offline after first use.')
assert.match(serviceWorker, /CacheableResponsePlugin\(\{statuses:\[200\]\}\)/,
  'Same-origin deferred feature caching must accept successful responses only, never opaque status 0.')
for (const runtimePattern of ['editor-', 'vue-flow-', 'KaTeX_', '\\.css']) {
  assert.ok(serviceWorker.includes(runtimePattern),
    `Deferred feature runtime route must cover ${runtimePattern}.`)
}
const emittedMatcherSource = serviceWorker.match(
  /registerRoute\((\(function\(\{url:[A-Za-z_$][\w$]*\}\)\{return .*?\}\)),new [A-Za-z_$][\w$]*\.CacheFirst/,
)?.[1]
assert.ok(emittedMatcherSource, 'Generated service worker must contain the deferred feature route callback.')
const emittedMatcher = Function('self', `return ${emittedMatcherSource}`)({
  location: { origin: 'https://bashnota.example' },
})
assert.equal(emittedMatcher({
  url: new URL('https://bashnota.example/bashnota/assets/editor-runtime.js'),
}), true, 'Generated runtime route must match a same-origin deferred editor asset.')
assert.equal(emittedMatcher({
  url: new URL('https://cdn.example/assets/editor-runtime.js'),
}), false, 'Generated runtime route must reject the same path from a cross-origin host.')
assert.match(browserGate, /await runBrowserAndCollectStdout\(chrome,/,
  'The route browser gate must await the shared Chrome process-tree boundary.')
assert.match(browserGate, /browserTreeShutdownConfirmed\(cleanupFailures\)/,
  'Temporary profiles may be removed only after confirmed browser-tree shutdown.')
assert.match(browserGate, /removeTemporaryDirectory\(profile\)/,
  'Confirmed browser profiles must use bounded transient-error cleanup.')
assert.match(browserGate, /new AggregateError\(failures, message\)/,
  'Route assertions must remain primary when cleanup also fails.')
assert.doesNotMatch(browserGate, /\bexecFile(?:Sync|Async)?\b/,
  'The route browser gate must not return to self-close-based execFile handling.')
assert.doesNotMatch(browserGate, /setTimeout\([^)]*1200|},1200\)/,
  'Route readiness must not return to a fixed 1.2-second snapshot.')
assert.match(browserGate, /delayMs: 1_600/,
  'The settings route must retain a slow lazy-chunk regression longer than the removed snapshot.')

const harnessDirectory = await mkdtemp(join(tmpdir(), 'bashnota-route-harness-'))
try {
  await writeFile(join(harnessDirectory, 'index.html'), '<!doctype html><body><div id="app"></div></body>')
  await writeFile(join(harnessDirectory, 'known.js'), 'export const known = true')

  const missingChunk = resolveRouteAssetRequest({
    accept: '*/*',
    appBase: '/bashnota',
    distDirectory: harnessDirectory,
    requestPath: '/bashnota/assets/SettingsView-missing.js',
  })
  assert.equal(missingChunk.status, 404,
    'A missing lazy chunk must return 404 instead of the SPA shell.')
  assert.equal(missingChunk.filePath, null,
    'A missing lazy chunk must not resolve to index.html.')
  assert.match(missingChunk.contentType, /^text\/javascript/,
    'A missing JavaScript chunk must retain JavaScript MIME rather than text/html.')

  const directNavigation = resolveRouteAssetRequest({
    accept: 'text/html,application/xhtml+xml',
    appBase: '/bashnota',
    distDirectory: harnessDirectory,
    requestPath: '/bashnota/settings/unified-editor',
  })
  assert.equal(directNavigation.status, 200)
  assert.equal(directNavigation.filePath, join(harnessDirectory, 'index.html'),
    'A direct SPA navigation must still resolve to index.html.')

  for (const method of ['POST', 'DELETE']) {
    for (const requestPath of ['/bashnota/known.js', '/bashnota/settings/unified-editor']) {
      const rejectedMethod = resolveRouteAssetRequest({
        accept: 'text/html, */*',
        appBase: '/bashnota',
        distDirectory: harnessDirectory,
        method,
        requestPath,
      })
      assert.equal(rejectedMethod.status, 405, `${method} must not serve ${requestPath}.`)
      assert.equal(rejectedMethod.filePath, null)
    }
  }

  assert.equal(acceptsHtmlResponse('TEXT/HTML; Q=0.7, application/json'), true,
    'HTML Accept parsing must be case-insensitive and honor a positive quality.')
  assert.equal(acceptsHtmlResponse('text/html;q=0, */*;q=1'), false,
    'An explicit HTML rejection must override a less-specific wildcard.')
  const rejectedHtml = resolveRouteAssetRequest({
    accept: 'text/html;q=0, application/json',
    appBase: '/bashnota',
    distDirectory: harnessDirectory,
    requestPath: '/bashnota/settings/unified-editor',
  })
  assert.equal(rejectedHtml.status, 404, 'A navigation that rejects HTML must not receive the SPA shell.')

  for (const requestPath of ['/bashnota/../secret.js', '/bashnota/%2e%2e%2fsecret.js']) {
    const traversal = resolveRouteAssetRequest({
      accept: '*/*',
      appBase: '/bashnota',
      distDirectory: harnessDirectory,
      requestPath,
    })
    assert.equal(traversal.status, 404, `Traversal request ${requestPath} must be rejected.`)
    assert.equal(traversal.filePath, null)
  }

  const settingsPattern = /\/SettingsView-[^/]+\.js$/
  const claimedPath = '/bashnota/assets/SettingsView-claimed.js'
  const falsePositive = findMissingRequiredRouteAssets({
    assetDirectory: join(harnessDirectory, 'assets'),
    requestRecords: [{ path: claimedPath, status: 404, filePath: null }],
    required: [settingsPattern],
    resourcePaths: [claimedPath],
  })
  assert.deepEqual(falsePositive, [settingsPattern],
    'A requested lazy-chunk name must not pass without a successful file response.')

  const assetDirectory = join(harnessDirectory, 'assets')
  const servedPath = join(assetDirectory, 'SettingsView-served.js')
  await mkdir(assetDirectory)
  await writeFile(servedPath, 'export const settings = true')
  assert.deepEqual(findMissingRequiredRouteAssets({
    assetDirectory,
    requestRecords: [{ path: '/bashnota/assets/SettingsView-served.js', status: 200, filePath: servedPath }],
    required: [settingsPattern],
    resourcePaths: ['/bashnota/assets/SettingsView-served.js'],
  }), [], 'A chunk passes only when Chrome loaded it and the server served it from the asset directory.')

  const instrumentedShell = prepareRouteHarnessShell(
    '<head><link rel="stylesheet" href="https://cdn.example/font.css"><link rel="stylesheet" href="/bashnota/assets/app.css"></head><body></body>',
    '<script>window.probe=true</script>',
  )
  assert.match(instrumentedShell, /cdn\.example/,
    'The route harness must preserve external resources so the browser gate can reject them.')
  assert.match(instrumentedShell, /\/bashnota\/assets\/app\.css/,
    'The route harness must preserve audited first-party stylesheets.')
  assert.match(instrumentedShell, /window\.probe=true/)

  const readinessProbe = buildRouteReadinessProbe({
    auditWindowMs: 150,
    readySelector: 'h3',
    readyText: 'Editor Settings',
    pollIntervalMs: 5,
  })
  const resourceEntries = [{ name: 'https://example.test/bashnota/assets/SettingsView-served.js' }]
  const dom = new JSDOM(`<!doctype html><body>${readinessProbe}</body>`, {
    beforeParse(window) {
      Object.defineProperty(window.performance, 'getEntriesByType', {
        value: () => resourceEntries,
      })
    },
    runScripts: 'dangerously',
    url: 'https://example.test/bashnota/settings/unified-editor',
  })
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(dom.window.document.body.dataset.routeReady, undefined,
    'Elapsed time alone must not mark a route ready before its content renders.')
  const heading = dom.window.document.createElement('h3')
  heading.textContent = 'Editor Settings'
  dom.window.document.body.append(heading)
  setTimeout(() => {
    resourceEntries.push({ name: 'https://example.test/bashnota/assets/heavy-style-late.css' })
  }, 100)
  await new Promise((resolve) => setTimeout(resolve, 75))
  assert.equal(dom.window.document.body.dataset.routeReady, undefined,
    'Rendered content must remain under audit until the post-render window ends.')
  await new Promise((resolve) => setTimeout(resolve, 125))
  assert.equal(dom.window.document.body.dataset.routeReady, 'true',
    'Rendered route content must become ready after the finite settle passes.')
  assert.match(dom.window.document.body.dataset.routeAssets, /SettingsView-served\.js/)
  assert.match(dom.window.document.body.dataset.routeAssets, /heavy-style-late\.css/,
    'A heavy stylesheet loaded 100ms after render readiness must remain visible to the audit.')
  dom.window.close()
} finally {
  await rm(harnessDirectory, { recursive: true, force: true })
}

const editorChunks = await Promise.all(assets
  .filter((asset) => /^editor-.*\.js$/i.test(asset))
  .map(async (asset) => ({ asset, bytes: (await stat(join(ASSETS_DIRECTORY.pathname, asset))).size })))
const largestEditorChunk = editorChunks.sort((left, right) => right.bytes - left.bytes)[0]
const lazyChunks = await Promise.all(assets
  .filter((asset) => asset.endsWith('.js') && asset !== entry)
  .map(async (asset) => ({ asset, bytes: (await stat(join(ASSETS_DIRECTORY.pathname, asset))).size })))
const largestLazyChunk = lazyChunks.sort((left, right) => right.bytes - left.bytes)[0]

assert.ok(largestEditorChunk, 'The editor must remain emitted as a lazy chunk.')
assert.ok(largestEditorChunk.bytes > 500_000, 'The editor report must identify the substantial deferred payload.')
assert.ok(largestLazyChunk, 'The production build must retain at least one lazy chunk.')
assert.ok(largestLazyChunk.bytes <= LARGEST_LAZY_CHUNK_BUDGET_BYTES,
  `Largest lazy chunk ${largestLazyChunk.asset} is ${largestLazyChunk.bytes} bytes; budget is ${LARGEST_LAZY_CHUNK_BUDGET_BYTES}.`)

for (const route of representativeRoutes) {
  assert.deepEqual(initialAssets.filter((asset) => HEAVY_ASSET.test(asset)), [],
    `${route} shares the SPA entry graph and must not preload editor assets.`)
}

console.log(`Initial entry: ${entry} = ${entryBytes} bytes (budget ${ENTRY_BUDGET_BYTES})`)
console.log(`Initial modulepreloads: ${preloadBytes.length} files = ${preloadBytes.reduce((total, bytes) => total + bytes, 0)} bytes (budget ${PRELOAD_BUDGET_BYTES})`)
console.log(`Initial route stylesheets: ${stylesheetBytes.reduce((total, bytes) => total + bytes, 0)} bytes (budget ${INITIAL_STYLESHEET_BUDGET_BYTES})`)
console.log(`Deferred editor chunks: ${editorChunks.length}; largest ${largestEditorChunk.asset} = ${largestEditorChunk.bytes} bytes`)
console.log(`Largest lazy chunk: ${largestLazyChunk.asset} = ${largestLazyChunk.bytes} bytes (budget ${LARGEST_LAZY_CHUNK_BUDGET_BYTES})`)
console.log(`PWA precache: ${precacheAssets.length} core assets; deferred feature payloads excluded and runtime-cached on first use`)
console.log(`Static artifact accounting verified for ${representativeRoutes.join(', ')}; browser network enforcement runs via test:initial-route-assets.`)
