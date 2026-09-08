import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  browserTreeShutdownConfirmed,
  removeTemporaryDirectory,
  runBrowserAndCollectStdout,
} from './browserHarnessCleanup'
import {
  buildRouteReadinessProbe,
  findMissingRequiredRouteAssets,
  prepareRouteHarnessShell,
  resolveRouteAssetRequest,
} from './initialRouteAssetHarness.mjs'

const chrome = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((candidate) => candidate && existsSync(candidate))
if (!chrome) throw new Error('Chrome/Chromium is required for initial route network assertions')

const dist = new URL('../dist/', import.meta.url)
const base = '/bashnota'
const namedHeavy = /\/(?:d3-chart|katex|vue-flow)-[^/]+\.(?:js|css)(?:\?|$)/i
const editorChunk = /\/editor-[^/]+\.js(?:\?|$)/i
const deferredFeatureAsset = /\/assets\/(?:webllm-|editor-|d3-chart-|katex-|vue-flow-|heavy-style-|EditorAppShell-|KaTeX_)/i
const routeCases = [
  { route: '/', readySelector: 'main', required: [/\/HomeView-[^/]+\.js$/] },
  { route: '/login', readySelector: '#email', required: [/\/LoginView-[^/]+\.js$/] },
  {
    route: '/settings/unified-editor',
    readySelector: 'h3',
    readyText: 'Editor Settings',
    required: [/\/SettingsView-[^/]+\.js$/, /\/UnifiedEditorSettings-[^/]+\.js$/],
    // This is intentionally longer than the removed 1.2-second snapshot. The
    // route must become ready from rendered content, not from elapsed time.
    delayedAsset: /\/(?:SettingsView|UnifiedEditorSettings)-[^/]+\.js$/,
    delayMs: 1_600,
  },
  { route: '/p/published-nota', readySelector: 'main', required: [/\/PublicNotaView-[^/]+\.js$/] },
]

// Fresh CI runners can spend most of the old 30-second budget starting
// Chromium after Playwright and PWA browser journeys. Keep the assertion
// bounded while leaving enough time for the route readiness report itself.
const routeBrowserTimeoutMs = 60_000
const requests = []
const routeReports = new Map()
const routeReportWaiters = new Map()
let activeRouteCase = null

const builtShell = readFileSync(new URL('index.html', dist), 'utf8')
const externalMarkupResources = Array.from(builtShell.matchAll(
  /<(?:link|script|img)\b[^>]*(?:href|src)=["'](https?:\/\/[^"']+)["'][^>]*>/gi,
), match => match[1])
if (externalMarkupResources.length) {
  throw new Error(`Production HTML references external subresources: ${externalMarkupResources.join(', ')}`)
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost')
  const requestPath = requestUrl.pathname
  if (requestPath === `${base}/__route-gate-report` && request.method === 'POST') {
    const token = requestUrl.searchParams.get('token')
    if (!token || !routeReportWaiters.has(token)) {
      response.writeHead(404, { 'cache-control': 'no-store' })
      response.end()
      return
    }
    const chunks = []
    let reportBytes = 0
    request.on('data', (chunk) => {
      reportBytes += chunk.length
      if (reportBytes <= 64 * 1024) chunks.push(chunk)
    })
    request.on('end', () => {
      if (reportBytes > 64 * 1024) {
        response.writeHead(413, { 'cache-control': 'no-store' })
        response.end()
        return
      }
      try {
        routeReports.set(token, JSON.parse(Buffer.concat(chunks).toString('utf8')))
        response.writeHead(204, { 'cache-control': 'no-store' })
        response.end()
        routeReportWaiters.get(token)?.()
      } catch {
        response.writeHead(400, { 'cache-control': 'no-store' })
        response.end()
      }
    })
    return
  }
  const plan = resolveRouteAssetRequest({
    accept: request.headers.accept,
    appBase: base,
    distDirectory: dist.pathname,
    method: request.method,
    requestPath,
  })
  requests.push({ path: requestPath, status: plan.status, filePath: plan.filePath })
  response.writeHead(plan.status, {
    'content-type': plan.contentType,
    'cache-control': 'no-store',
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  const send = () => {
    if (!plan.filePath) {
      response.end(plan.body)
      return
    }
    let body = readFileSync(plan.filePath)
    if (plan.isShell && activeRouteCase) {
      const probe = buildRouteReadinessProbe(activeRouteCase)
      body = Buffer.from(prepareRouteHarnessShell(body.toString('utf8'), probe))
    }
    response.end(body)
  }
  const delay = activeRouteCase?.delayedAsset?.test(requestPath) ? activeRouteCase.delayMs : 0
  if (delay) setTimeout(send, delay)
  else send()
})

const port = await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => resolve(server.address().port))
})

try {
  const missingAssetResponse = await fetch(`http://127.0.0.1:${port}${base}/assets/SettingsView-missing.js`)
  if (missingAssetResponse.status !== 404 || missingAssetResponse.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Unknown JavaScript assets must return a non-HTML 404 response.')
  }
  const navigationResponse = await fetch(`http://127.0.0.1:${port}${base}/direct/deep/link`, {
    headers: { Accept: 'text/html' },
  })
  if (!navigationResponse.ok || !navigationResponse.headers.get('content-type')?.startsWith('text/html')) {
    throw new Error('Direct SPA navigation routes must return the application shell.')
  }

  for (const routeCase of routeCases) {
    const { route, required } = routeCase
    const url = `http://127.0.0.1:${port}${base}${route}`
    const start = requests.length
    const profile = mkdtempSync(join(tmpdir(), 'bashnota-route-assets-'))
    const routeToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const reportCompletion = new Promise((resolve) => routeReportWaiters.set(routeToken, resolve))
    activeRouteCase = {
      ...routeCase,
      reportUrl: `${base}/__route-gate-report?token=${routeToken}`,
    }
    let dom = ''
    let cleanupFailures = []
    let browserShutdownConfirmed = true
    let primaryFailure
    try {
      try {
        const result = await runBrowserAndCollectStdout(chrome, [
          '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
          '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, url,
        ], {
          completionSignal: reportCompletion,
          timeoutMs: routeBrowserTimeoutMs,
        })
        const report = routeReports.get(routeToken)
        if (!report) throw new Error(`${route} signaled completion without a route report.`)
        const assets = escapeAttribute(report.resourcePaths?.join('|') ?? '')
        const error = report.error ? ` data-route-error="${escapeAttribute(report.error)}"` : ''
        dom = `<body data-route-ready="${report.ready === true}" data-route-assets="${assets}"${error}></body>`
        cleanupFailures = result.cleanupFailures
        browserShutdownConfirmed = browserTreeShutdownConfirmed(cleanupFailures)
      } catch (error) {
        primaryFailure = error
        browserShutdownConfirmed = !(error instanceof Error && error.name === 'BrowserProcessTreeShutdownError')
      }

      if (!primaryFailure) {
        const all = requests.slice(start)
        const routeError = dom.match(/data-route-error="([^"]*)"/)?.[1]
        if (routeError) throw new Error(`${route} failed before rendering its readiness marker: ${routeError}`)
        if (!/data-route-ready="true"/.test(dom)) {
          throw new Error(`${route} did not render ${routeCase.readySelector} before the browser deadline.`)
        }
        const timing = dom.match(/data-route-assets="([^"]*)"/)?.[1] ?? ''
        const assetRequests = timing.split('|').filter((path) => /\/assets\/.*\.(?:js|css)(?:\?|$)/.test(path))
        const uniqueAssetRequests = [...new Set(assetRequests)]
        const loadedAssetBytes = uniqueAssetRequests.reduce((total, path) => {
          const served = all.find(record => record.path === path && record.status === 200 && record.filePath)
          return total + (served?.filePath ? statSync(served.filePath).size : 0)
        }, 0)
        const externalResources = (routeReports.get(routeToken)?.subresourceUrls ?? []).filter((resourceUrl) => {
          try {
            return new URL(resourceUrl).origin !== new URL(url).origin
          } catch {
            return true
          }
        })
        if (externalResources.length) {
          throw new Error(`${route} loaded external resources: ${externalResources.join(', ')}`)
        }
        const forbidden = assetRequests.filter((path) => namedHeavy.test(path) || editorChunk.test(path))
        if (forbidden.length) throw new Error(`${route} fetched editor-only assets after router startup: ${forbidden.join(', ')}`)
        const backgroundHeavy = all.filter((requestRecord) => deferredFeatureAsset.test(requestRecord.path))
        if (backgroundHeavy.length) {
          throw new Error(`${route} service-worker install fetched deferred feature assets: ${backgroundHeavy.map(({ path }) => path).join(', ')}`)
        }
        const backgroundStyles = all.filter(({ path }) => /\/assets\/[^/]+\.css(?:\?|$)/.test(path) && !assetRequests.includes(path))
        if (backgroundStyles.length) {
          throw new Error(`${route} service-worker install fetched non-route stylesheets: ${backgroundStyles.map(({ path }) => path).join(', ')}`)
        }
        const missingRequired = findMissingRequiredRouteAssets({
          assetDirectory: join(dist.pathname, 'assets'),
          requestRecords: all,
          required,
          resourcePaths: assetRequests,
        })
        if (missingRequired.length) {
          throw new Error(`${route} route resource manifest is missing successfully served and loaded ${missingRequired.join(', ')}; browser received ${assetRequests.join(', ')}`)
        }
        if (route.startsWith('/p/') && assetRequests.some((path) => /NotaContentViewer/i.test(path))) {
          throw new Error(`${route} fetched the public reader before published content became available`)
        }
        console.log(`${route}: ${uniqueAssetRequests.length} route assets, ${loadedAssetBytes} bytes; ${uniqueAssetRequests.join(', ') || 'no route assets'}; public viewer=${route.startsWith('/p/') ? 'deferred-until-content' : 'n/a'}`)
      }
    } catch (error) {
      primaryFailure ??= error
    } finally {
      routeReportWaiters.delete(routeToken)
      routeReports.delete(routeToken)
      if (browserShutdownConfirmed) {
        try {
          removeTemporaryDirectory(profile)
        } catch (error) {
          cleanupFailures.push(error)
        }
      }
    }

    const failures = [primaryFailure, ...cleanupFailures].filter(Boolean)
    if (!browserShutdownConfirmed) {
      failures.push(new Error(`${route} browser process tree did not shut down; profile retained at ${profile}`))
    }
    if (failures.length === 1) throw failures[0]
    if (failures.length > 1) {
      const message = primaryFailure instanceof Error
        ? primaryFailure.message
        : `${route} browser gate failed during cleanup`
      throw new AggregateError(failures, message)
    }
  }
  activeRouteCase = null
  console.log('Initial route browser network assertions passed')
} finally {
  await new Promise((resolve) => server.close(resolve))
}
