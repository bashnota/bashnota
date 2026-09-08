import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const ALLOWED_SKIPPED_TESTS = new Map([
  ['src/services/cloud/__tests__/supabaseImageStorage.integration.test.ts', 1],
  ['src/features/nota/stores/__tests__/notaPublishing.integration.test.ts', 1],
])

function decodeXml(value) {
  return value
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function attribute(tag, name) {
  return decodeXml(tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? '')
}

export function inspectJUnit(xml, allowedSkippedTests = ALLOWED_SKIPPED_TESTS) {
  const root = xml.match(/<testsuites\b[^>]*>/)?.[0]
  if (!root) throw new Error('JUnit report has no <testsuites> root')

  const totals = {
    tests: Number(attribute(root, 'tests')),
    failures: Number(attribute(root, 'failures')),
    errors: Number(attribute(root, 'errors')),
    durationSeconds: Number(attribute(root, 'time')),
  }
  if (Object.values(totals).some((value) => !Number.isFinite(value))) {
    throw new Error('JUnit report contains a non-numeric summary')
  }

  const skippedByFile = new Map()
  const testcasePattern = /<testcase\b[^>]*>[\s\S]*?<\/testcase>/g
  for (const testcase of xml.match(testcasePattern) ?? []) {
    if (!/<skipped\s*\/?\s*>/.test(testcase)) continue
    const openingTag = testcase.match(/<testcase\b[^>]*>/)?.[0] ?? ''
    const file = attribute(openingTag, 'classname')
    skippedByFile.set(file, (skippedByFile.get(file) ?? 0) + 1)
  }

  const unexpectedSkips = []
  for (const [file, count] of skippedByFile) {
    const allowance = allowedSkippedTests.get(file) ?? 0
    if (count > allowance) unexpectedSkips.push(`${file}: ${count} skipped (allowed ${allowance})`)
  }

  return { totals, skippedByFile, unexpectedSkips }
}

export async function enforceJUnitPolicy(reportPath) {
  const result = inspectJUnit(await readFile(reportPath, 'utf8'))
  console.log(
    `Test summary: ${result.totals.tests} tests in ${result.totals.durationSeconds.toFixed(3)}s; `
      + `${result.totals.failures} failures, ${result.totals.errors} errors, `
      + `${[...result.skippedByFile.values()].reduce((sum, count) => sum + count, 0)} allowed skips.`,
  )
  if (result.unexpectedSkips.length > 0) {
    throw new Error(`Unexpectedly skipped tests:\n${result.unexpectedSkips.join('\n')}`)
  }
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await enforceJUnitPolicy(process.argv[2] ?? 'test-results/vitest-junit.xml')
}
