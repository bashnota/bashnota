import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig(baseConfig, {
  testDir: './e2e/jupyter-ui',
  reporter: [['list'], ['junit', { outputFile: 'test-results/jupyter-ui-junit.xml' }]],
})
