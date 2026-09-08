import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
assert.ok(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY is required from the local Docker Supabase stack')
const env = {
  ...process.env,
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  SUPABASE_DEPLOY_GATE_ALLOW_HTTP_LOCAL: 'true',
  SUPABASE_MIGRATION_EVIDENCE_SHA256: 'a'.repeat(64), SUPABASE_RECONCILIATION_EVIDENCE_SHA256: 'b'.repeat(64),
}
const update = body => fetch(`${url}/rest/v1/runtime_deployment_state?singleton=eq.true`, {
  method: 'PATCH', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
assert.ok((await update({ production_cutover: false })).ok, 'local cutover reset failed')
const gate = () => spawnSync('node', ['scripts/check-supabase-deploy-config.mjs'], { env, encoding: 'utf8' })
assert.notEqual(gate().status, 0, 'unapproved Docker database must block the production build gate')
const fixture = JSON.parse(await readFile(new URL('./approved-local-cutover.json', import.meta.url)))
try {
  assert.ok((await update(fixture)).ok, 'local approval fixture failed')
  const approved = gate()
  assert.equal(approved.status, 0, approved.stderr)
  const build = spawnSync('npm', ['run', 'build-only'], { env, encoding: 'utf8' })
  assert.equal(build.status, 0, build.stderr)
} finally {
  assert.ok((await update({ production_cutover: false, approved_at: null, approved_by: null })).ok, 'local cutover cleanup failed')
}
assert.notEqual(gate().status, 0, 'test cleanup must leave production cutover disabled')
console.log('Docker-backed production deployment gate passed only after the explicit local approval fixture.')
