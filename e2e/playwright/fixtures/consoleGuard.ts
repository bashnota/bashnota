import {
  expect,
  test as base,
  type ConsoleMessage,
  type TestInfo,
} from '@playwright/test'

export { expect }
export type { Locator, Page } from '@playwright/test'

export interface ConsoleAllowRule {
  level: 'error' | 'warning' | 'pageerror'
  pattern: RegExp
  reason: string
}

interface BrowserDiagnostic {
  level: ConsoleAllowRule['level']
  message: string
  location?: string
}

interface ConsoleGuardFixtures {
  consolePolicy: { allow: ConsoleAllowRule[] }
}

const diagnosticFromConsole = (message: ConsoleMessage): BrowserDiagnostic | null => {
  const level = message.type()
  if (level !== 'error' && level !== 'warning') return null

  const location = message.location()
  const source = location.url
    ? `${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0}`
    : undefined

  return { level, message: message.text(), location: source }
}

const isAllowed = (diagnostic: BrowserDiagnostic, rules: ConsoleAllowRule[]) =>
  rules.some(
    (rule) => rule.level === diagnostic.level && rule.pattern.test(diagnostic.message),
  )

const attachDiagnostics = async (testInfo: TestInfo, diagnostics: BrowserDiagnostic[]) => {
  if (diagnostics.length === 0) return
  await testInfo.attach('browser-console.json', {
    body: Buffer.from(JSON.stringify(diagnostics, null, 2)),
    contentType: 'application/json',
  })
}

export const test = base.extend<ConsoleGuardFixtures>({
  consolePolicy: [{ allow: [] }, { option: true }],
  page: async ({ page, consolePolicy }, use, testInfo) => {
    const diagnostics: BrowserDiagnostic[] = []
    const onConsole = (message: ConsoleMessage) => {
      const diagnostic = diagnosticFromConsole(message)
      if (diagnostic) diagnostics.push(diagnostic)
    }
    const onPageError = (error: Error) => {
      diagnostics.push({ level: 'pageerror', message: error.stack ?? error.message })
    }

    page.on('console', onConsole)
    page.on('pageerror', onPageError)

    await use(page)

    page.off('console', onConsole)
    page.off('pageerror', onPageError)

    const unexpected = diagnostics.filter(
      (diagnostic) => !isAllowed(diagnostic, consolePolicy.allow),
    )
    await attachDiagnostics(testInfo, diagnostics)

    if (unexpected.length > 0) {
      const summary = unexpected
        .map(
          ({ level, message, location }) =>
            `[${level}] ${message}${location ? `\n  at ${location}` : ''}`,
        )
        .join('\n\n')
      throw new Error(`Unexpected browser diagnostics:\n\n${summary}`)
    }
  },
})
