import { existsSync } from 'node:fs'
import { chromium } from '@playwright/test'

export function resolveBrowserExecutable(purpose: string): string {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM === '1' ? chromium.executablePath() : undefined,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((candidate): candidate is string => Boolean(candidate))

  const executable = candidates.find(existsSync)
  if (!executable) {
    throw new Error(`Chrome/Chromium is required for ${purpose}; install Playwright Chromium or set CHROME_BIN`)
  }
  return executable
}
