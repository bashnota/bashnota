import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import {
  browserTreeShutdownConfirmed,
  removeTemporaryDirectory,
  runBrowserAndCollectStdout,
  stopChildProcess,
  throwIfBrowserHarnessFailed,
} from './browserHarnessCleanup'

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter((candidate): candidate is string => Boolean(candidate))
const chrome = chromeCandidates.find(existsSync)
if (!chrome) throw new Error('Chrome/Chromium is required for the malicious export browser test')
// The deadline includes process spawn, Chrome's first-run profile/database work,
// Linux DBus discovery, page load, and DOM serialization. A cold hosted runner
// has spent more than 30 seconds before emitting any stdout, so retain one
// bounded attempt while allowing three times that observed cold-start window.
const BROWSER_COMPLETION_TIMEOUT_MS = 90_000

const dom = new JSDOM('<!doctype html><html><body></body></html>')
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  DOMParser: dom.window.DOMParser,
  Node: dom.window.Node,
  NodeFilter: dom.window.NodeFilter,
})

const { buildHtmlPage } = await import('../src/features/editor/services/export/templates/defaultTemplate')
const { finalizeExportHtml, markGeneratedKatex, sanitizeExportSourceHtml } = await import('../src/features/editor/services/export/sanitizeExportHtml')
const { default: katex } = await import('katex')
const attackMarker = 'EXPORT_ATTACK_EXECUTED'
const body = `
  <p>safe body</p>
  <script>document.documentElement.dataset.pwned='${attackMarker}'</script>
  <svg onload="location='/exfil-svg'"><script>location='/exfil-script'</script></svg>
  <img src="/exfil-image" onerror="location='/exfil-error'">
  <img src="assets/linked-evil.svg" onerror="location='/exfil-linked-asset-error'">
  <img src="assets/payload.html" onerror="location='/exfil-linked-html-error'">
  <img src="../assets/image_9.png" onerror="location='/exfil-parent-asset-error'">
  <img src="data:image/png;base64,PGh0bWw+PHNjcmlwdD5sb2NhdGlvbj0nL2V4ZmlsLWRhdGEtaW1hZ2UnPC9zY3JpcHQ+PC9odG1sPg==" onerror="location='/exfil-polyglot-error'">
  <div class="output"><strong onclick="location='/exfil-output-event'">stored output</strong><img src="/exfil-output-fetch"></div>
  <meta http-equiv="refresh" content="0;url=/exfil-navigation">
  <a href="javascript:location='/exfil-link'">unsafe URL</a>
  <div class="fixed inset-0 z-50 pointer-events-auto theorem">overlay attempt</div>
  <span class="citation-interactive" data-citation-json='{"title":"<img src=/exfil-citation onerror=location=/exfil-citation-event>"}'>[1]</span>
  <table class="nota-data-table"><tbody><tr><td>safe table</td></tr></tbody></table>
  <span class="katex mord">safe math</span>
  <img src="assets/image_0.png" alt="safe image">
`
const transformedDocument = new DOMParser().parseFromString(sanitizeExportSourceHtml(body), 'text/html')
const generatedMath = document.createElement('div')
generatedMath.innerHTML = katex.renderToString('\\sqrt{x} + \\overrightarrow{AB}', { throwOnError: false })
markGeneratedKatex(generatedMath)
transformedDocument.body.appendChild(generatedMath)
const transformedBody = finalizeExportHtml(transformedDocument.body.innerHTML, {
  allowedAssetUrls: new Set(['assets/image_0.png']),
})
const html = buildHtmlPage(`</title><script>location='/exfil-title'</script>`, transformedBody)

if (/class="[^"]*\b(?:fixed|inset-0|z-50|pointer-events-auto)\b/.test(html)) {
  throw new Error('Export sanitizer retained application overlay classes')
}
if (html.includes(attackMarker) || /(?:src|href)="\/(?:exfil)/.test(html) || /(?:linked-evil|payload\.html|\.\.\/assets)/.test(html)) {
  throw new Error('Export sanitizer retained an executable payload or unsafe resource URL')
}
if (!html.includes('<svg') || !html.includes('<path')) throw new Error('Export sanitizer removed generated KaTeX SVG geometry')

const port = await new Promise<number>((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address()
    if (!address || typeof address === 'string') return reject(new Error('Could not reserve a browser-test port'))
    const selected = address.port
    probe.close(error => error ? reject(error) : resolve(selected))
  })
})

const tempDirectory = mkdtempSync(join(tmpdir(), 'bashnota-export-security-'))
const fixturePath = join(tempDirectory, 'index.html')
const logPath = join(tempDirectory, 'requests.log')
const readyPath = join(tempDirectory, 'ready')
const profilePath = join(tempDirectory, 'chrome-profile')
writeFileSync(fixturePath, html)
writeFileSync(logPath, '')

const serverPath = fileURLToPath(new URL('./export-security-server.mjs', import.meta.url))
const server = spawn(process.execPath, [serverPath, fixturePath, logPath, readyPath, String(port)], {
  stdio: 'ignore',
})

let testFailure: unknown
let browserShutdownConfirmed = true
const cleanupFailures: unknown[] = []
try {
  const deadline = Date.now() + 5_000
  while (!existsSync(readyPath) && Date.now() < deadline) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20)
  if (!existsSync(readyPath)) throw new Error('Export security fixture server did not start')

  const browserResult = await runBrowserAndCollectStdout(chrome, [
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
    '--no-default-browser-check', '--virtual-time-budget=1000', `--user-data-dir=${profilePath}`,
    '--dump-dom', `http://127.0.0.1:${port}/index.html`,
  ], {
    isOutputComplete: browserOutput => browserOutput.trimEnd().endsWith('</html>'),
    timeoutMs: BROWSER_COMPLETION_TIMEOUT_MS,
  })
  const output = browserResult.stdout
  cleanupFailures.push(...browserResult.cleanupFailures)
  browserShutdownConfirmed = browserTreeShutdownConfirmed(browserResult.cleanupFailures)

  if (!output.includes('<p>safe body</p>') || !output.includes('stored output') || !output.includes('safe table') || !output.includes('safe math') || !output.includes('<svg')) {
    throw new Error(`Safe export content was not rendered by Chrome:\n${output}`)
  }
  if (output.includes(attackMarker) || /data-pwned=/.test(output)) {
    throw new Error('A stored export payload executed in Chrome')
  }

  const requests = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
  if (requests.some(request => request.includes('/exfil'))) {
    throw new Error(`A stored export payload navigated or fetched in Chrome: ${requests.join(', ')}`)
  }
  if (requests.some(request => request.includes('linked-evil') || request.includes('payload.html') || request.includes('image_9.png'))) {
    throw new Error('An unregistered linked asset survived export sanitization and was fetched by Chrome')
  }
  if (!requests.includes('/assets/image_0.png')) throw new Error('The safe local export image was not fetched')

  console.log('Malicious export browser assertions passed')
} catch (error) {
  testFailure = error
  if (error instanceof Error && error.name === 'BrowserProcessTreeShutdownError') {
    browserShutdownConfirmed = false
  }
}

let serverStopped = false
try {
  await stopChildProcess(server)
  serverStopped = true
} catch (error) {
  cleanupFailures.push(error)
}
if (serverStopped && browserShutdownConfirmed) {
  try {
    removeTemporaryDirectory(tempDirectory)
  } catch (error) {
    cleanupFailures.push(error)
  }
} else if (!browserShutdownConfirmed) {
  cleanupFailures.push(new Error(`Retained browser profile after unconfirmed process-tree shutdown: ${tempDirectory}`))
}

throwIfBrowserHarnessFailed(testFailure, cleanupFailures)
