import assert from 'node:assert/strict'
import { inspectJUnit } from './test-results-policy.mjs'

function report(testcases, attributes = 'tests="2" failures="0" errors="0" time="1.25"') {
  return `<?xml version="1.0"?><testsuites ${attributes}>${testcases}</testsuites>`
}

const allowedFile = 'src/services/cloud/__tests__/supabaseImageStorage.integration.test.ts'
const allowedSkip = `<testcase classname="${allowedFile}" name="emulator"><skipped/></testcase>`
const passing = '<testcase classname="src/example.test.ts" name="passes"></testcase>'

const accepted = inspectJUnit(report(allowedSkip + passing))
assert.equal(accepted.totals.tests, 2)
assert.equal(accepted.totals.durationSeconds, 1.25)
assert.deepEqual(accepted.unexpectedSkips, [])

const unexpected = inspectJUnit(
  report('<testcase classname="src/example.test.ts" name="hidden"><skipped/></testcase>'),
)
assert.deepEqual(unexpected.unexpectedSkips, ['src/example.test.ts: 1 skipped (allowed 0)'])

assert.throws(
  () => inspectJUnit('<testsuites tests="not-a-number" failures="0" errors="0" time="0"></testsuites>'),
  /non-numeric summary/,
)

console.log('test result policy self-test passed')
