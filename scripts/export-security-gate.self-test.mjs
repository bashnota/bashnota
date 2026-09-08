import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const expectedPackageCommand = 'node scripts/export-security-gate.self-test.mjs && vite-node e2e/export-security.browser.ts'
const expectedCiStep = `- name: Generated export browser security
        run: npm run test:export-security`

function assertGateContract(packageJson, workflow, browserTest, browserHarness) {
  const parsedPackage = JSON.parse(packageJson)
  assert.equal(
    parsedPackage.scripts?.['test:export-security'],
    expectedPackageCommand,
    'The export security command must run its structural contract and the real Chrome fixture.',
  )
  assert.ok(workflow.includes(expectedCiStep), 'Quality CI must run the generated export browser security command.')
  assert.match(browserTest, /<img src="assets\/linked-evil\.svg"/, 'The browser fixture must cover an allowed-shape relative SVG link.')
  assert.match(browserTest, /<img src="assets\/payload\.html"/, 'The browser fixture must cover an allowed-shape relative HTML link.')
  assert.match(browserTest, /allowedAssetUrls: new Set\(\['assets\/image_0\.png'\]\)/, 'The browser fixture must prove exact generated-asset provenance.')
  assert.match(browserTest, /katex\.renderToString\('\\\\sqrt\{x\} \+ \\\\overrightarrow\{AB\}'/, 'The browser fixture must render genuine KaTeX SVG geometry.')
  assert.match(browserTest, /await stopChildProcess\(server\)/, 'The browser fixture must await server shutdown before profile cleanup.')
  assert.match(browserTest, /await runBrowserAndCollectStdout\(chrome,/, 'The browser fixture must retain and await the Chrome process boundary.')
  assert.match(browserTest, /const BROWSER_COMPLETION_TIMEOUT_MS = 90_000/, 'The browser fixture must allow bounded cold-browser startup on CI.')
  assert.match(browserTest, /browserOutput\.trimEnd\(\)\.endsWith\('<\/html>'\)/, 'The browser fixture must detect a complete serialized DOM before stopping Chrome.')
  assert.match(browserTest, /timeoutMs: BROWSER_COMPLETION_TIMEOUT_MS/, 'The browser fixture must apply its bounded CI completion timeout.')
  assert.match(browserTest, /browserShutdownConfirmed = false/, 'The browser fixture must retain its profile when tree shutdown is unconfirmed.')
  assert.match(browserTest, /serverStopped && browserShutdownConfirmed/, 'The browser fixture must gate profile cleanup on confirmed browser shutdown.')
  assert.match(browserTest, /removeTemporaryDirectory\(tempDirectory\)/, 'The browser fixture must use bounded temporary-profile cleanup.')
  assert.match(browserHarness, /spawnProcess\('taskkill', \['\/PID', String\(pid\), '\/T', '\/F'\]/, 'Windows browser shutdown must terminate the complete process tree.')
  assert.match(browserHarness, /await waitForClose\(closed, 2_000\)/, 'Browser shutdown must await a bounded stdio-close boundary.')
}

const [packageJson, workflow, browserTest, browserHarness] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  readFile(new URL('../e2e/export-security.browser.ts', import.meta.url), 'utf8'),
  readFile(new URL('../e2e/browserHarnessCleanup.ts', import.meta.url), 'utf8'),
])

assertGateContract(packageJson, workflow, browserTest, browserHarness)
assert.throws(
  () => assertGateContract(packageJson.replace(expectedPackageCommand, 'true'), workflow, browserTest, browserHarness),
  /real Chrome fixture/,
)
assert.throws(
  () => assertGateContract(packageJson, workflow.replace('run: npm run test:export-security', 'run: true'), browserTest, browserHarness),
  /Quality CI/,
)
assert.throws(
  () => assertGateContract(packageJson, workflow, browserTest.replace('<img src="assets/linked-evil.svg"', '<img src="/assets/linked-evil.svg"'), browserHarness),
  /relative SVG link/,
)
assert.throws(
  () => assertGateContract(packageJson, workflow, browserTest.replace('BROWSER_COMPLETION_TIMEOUT_MS = 90_000', 'BROWSER_COMPLETION_TIMEOUT_MS = 30_000'), browserHarness),
  /cold-browser startup/,
)

console.log('Export security gate contract self-test passed.')
