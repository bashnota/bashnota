import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { chromium } from '@playwright/test'
import { resolveBrowserExecutable } from './browserExecutable'

const executablePath = resolveBrowserExecutable('the executable-output sandbox browser test')
const fixture = readFileSync(new URL('./iframe-output-sandbox.fixture.html', import.meta.url), 'utf8')
const server = createServer((request, response) => {
  if (request.url !== '/') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': 'text/html; charset=utf-8',
  })
  response.end(fixture)
})

await new Promise<void>((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Iframe security fixture did not bind a TCP port')

const failures: unknown[] = []
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  browser = await chromium.launch({ executablePath, headless: true })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#result')?.textContent?.startsWith('{'), undefined, {
    timeout: 30_000,
  })

  const rawResult = await page.locator('#result').textContent()
  if (!rawResult) throw new Error('Sandbox result was not rendered by Chromium')
  const observed = JSON.parse(rawResult)
  const expected = {
    storage: 'SecurityError',
    dom: 'SecurityError',
    api: 'SecurityError',
    parentApiCalls: 0,
    safeHtmlRendered: true,
    isolatedScriptRan: true,
    sandbox: 'allow-scripts',
  }
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    throw new Error(`Opaque-origin assertions failed:\nexpected ${JSON.stringify(expected)}\nreceived ${JSON.stringify(observed)}`)
  }
  console.log('Opaque-origin executable-output browser assertions passed')
} catch (error) {
  failures.push(error)
} finally {
  if (browser) {
    try {
      await browser.close()
    } catch (error) {
      failures.push(error)
    }
  }
  try {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  } catch (error) {
    failures.push(error)
  }
}

if (failures.length > 0) throw new AggregateError(failures, 'Iframe sandbox browser test or cleanup failed')
