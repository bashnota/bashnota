import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const expectedCommand =
  'node scripts/jupyter-security-gate.self-test.mjs && vite-node e2e/jupyter-auth.browser.ts'
const expectedStep = `- name: Token-authenticated Jupyter browser security
        run: npm run test:jupyter-security`

function assertContract({
  packageJson,
  workflow,
  browserGate,
  securitySource,
  jupyterServiceSource,
  codeExecutionSource,
  aiSidebar,
}) {
  assert.equal(JSON.parse(packageJson).scripts?.['test:jupyter-security'], expectedCommand)
  assert.ok(
    workflow.includes(expectedStep),
    'Quality CI must run the Jupyter browser security gate',
  )

  assert.match(browserGate, /transformWithEsbuild/)
  assert.match(browserGate, /jupyterSecuritySourcePath/)
  assert.match(browserGate, /assertCrossOriginTokenPolicy/)
  assert.match(browserGate, /mutatedPolicyModule/)
  assert.match(browserGate, /jupyterSecuritySource\.replace\(originPredicate, 'false'\)/)
  assert.match(browserGate, /from '\/jupyterSecurity\.js'/)
  assert.match(browserGate, /getJupyterRequestUrl\(sameServer, '\/api'\)/)
  assert.match(browserGate, /getJupyterFetchOptions\(sameServer\)/)
  assert.match(browserGate, /getJupyterWebSocketUrl\(sameServer, 'kernel-id'\)/)
  assert.match(browserGate, /getJupyterWebSocketUrl\(crossServer, 'kernel-id'\)/)
  assert.doesNotMatch(browserGate, /rejectCrossOriginTokenExecution/)
  assert.match(browserGate, /HttpOnly; SameSite=Strict; Path=\//)
  assert.match(browserGate, /crossOriginCookiePresented/)
  assert.match(browserGate, /crossOriginProtectedUpgradeAttempts !== 0/)
  assert.match(browserGate, /cross-origin-token-failed-closed/)
  assert.match(browserGate, /requestUrl\.includes\('token='\)/)
  assert.match(browserGate, /result\.stdout\.includes\(token\)/)
  assert.match(
    browserGate,
    /sameOriginAuthorizationRequests !== 1 \|\| !sameOriginChannelAuthenticated/,
  )

  assert.match(securitySource, /Authorization: `token \$\{server\.token\}`/)
  assert.match(securitySource, /credentials: 'include'/)
  assert.match(securitySource, /redirect: 'error'/)
  assert.match(securitySource, /target\.origin !== base\.origin/)
  assert.match(securitySource, /new URL\(appOrigin\)\.origin !== serverOrigin/)
  assert.match(securitySource, /same-origin HTTPS reverse proxy/)
  assert.match(jupyterServiceSource, /return getJupyterWebSocketUrl\(server, kernelId\)/)
  assert.match(codeExecutionSource, /return getJupyterWebSocketUrl\(serverConfig, kernelId\)/)
  assert.doesNotMatch(aiSidebar, /console\.error/)
}

const [
  packageJson,
  workflow,
  browserGate,
  securitySource,
  jupyterServiceSource,
  codeExecutionSource,
  aiSidebar,
] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  readFile(new URL('../e2e/jupyter-auth.browser.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/features/jupyter/services/jupyterSecurity.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/features/jupyter/services/jupyterService.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/codeExecutionService.ts', import.meta.url), 'utf8'),
  readFile(
    new URL('../src/features/ai/components/components/AIAssistantSidebar.vue', import.meta.url),
    'utf8',
  ),
])

const contract = {
  packageJson,
  workflow,
  browserGate,
  securitySource,
  jupyterServiceSource,
  codeExecutionSource,
  aiSidebar,
}
assertContract(contract)
assert.throws(() =>
  assertContract({ ...contract, packageJson: packageJson.replace(expectedCommand, 'true') }),
)
assert.throws(
  () =>
    assertContract({
      ...contract,
      workflow: workflow.replace('run: npm run test:jupyter-security', 'run: true'),
    }),
  /Quality CI/,
)
assert.throws(() =>
  assertContract({
    ...contract,
    browserGate: browserGate.replace("from '/jupyterSecurity.js'", "from '/fixture.js'"),
  }),
)
assert.throws(() =>
  assertContract({
    ...contract,
    browserGate: browserGate.replace(
      "getJupyterWebSocketUrl(crossServer, 'kernel-id')",
      'void crossServer',
    ),
  }),
)
assert.throws(() =>
  assertContract({
    ...contract,
    browserGate: browserGate.replace("requestUrl.includes('token=')", 'false'),
  }),
)
assert.throws(() =>
  assertContract({
    ...contract,
    securitySource: securitySource.replace("credentials: 'include'", "credentials: 'omit'"),
  }),
)
assert.throws(() =>
  assertContract({
    ...contract,
    securitySource: securitySource.replace('new URL(appOrigin).origin !== serverOrigin', 'false'),
  }),
)
assert.throws(() =>
  assertContract({ ...contract, aiSidebar: `${aiSidebar}\nconsole.error(error)` }),
)

console.log('Jupyter security gate contract self-test passed')
