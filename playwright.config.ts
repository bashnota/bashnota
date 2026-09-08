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
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('PLAYWRIGHT_PORT must be an integer between 1024 and 65535')
}

export default defineConfig({
  testDir: './e2e/playwright',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}/bashnota/`,
    browserName: 'chromium',
    launchOptions: chrome ? { executablePath: chrome } : undefined,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/bashnota/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
