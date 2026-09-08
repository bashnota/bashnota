import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const chrome = process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM === '1' ? undefined : [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)))
const port = Number(process.env.PLAYWRIGHT_PWA_PORT ?? 4174)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PLAYWRIGHT_PWA_PORT must be an integer between 1024 and 65535')
}

export default defineConfig({
  testDir: './e2e/pwa',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/pwa-junit.xml' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}/bashnota/`,
    browserName: 'chromium',
    launchOptions: chrome ? { executablePath: chrome } : undefined,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/bashnota/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
