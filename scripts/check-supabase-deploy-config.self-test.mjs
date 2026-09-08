import assert from 'node:assert/strict'
import { validateSupabaseDeployConfig, verifyProductionCutover } from './check-supabase-deploy-config.mjs'

const valid = {
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser-safe',
  SUPABASE_MIGRATION_EVIDENCE_SHA256: 'a'.repeat(64),
  SUPABASE_RECONCILIATION_EVIDENCE_SHA256: 'b'.repeat(64),
}

assert.deepEqual(validateSupabaseDeployConfig(valid), [])
const selfHosted = {
  ...valid,
  VITE_SUPABASE_URL: 'https://supabase.apps.tahabouhsine.com',
  SUPABASE_DEPLOY_GATE_SELF_HOSTED_ORIGIN: 'https://supabase.apps.tahabouhsine.com',
}
assert.deepEqual(validateSupabaseDeployConfig(selfHosted), [])
for (const invalid of [
  { VITE_SUPABASE_URL: '' },
  { VITE_SUPABASE_URL: 'http://project.supabase.co' },
  { VITE_SUPABASE_URL: 'https://project.supabase.co/rest/v1' },
  { VITE_SUPABASE_URL: 'https://user:password@project.supabase.co' },
  { VITE_SUPABASE_URL: 'https://project.supabase.co/#fragment' },
  { VITE_SUPABASE_URL: 'https://project.supabase.co.evil.example' },
  { VITE_SUPABASE_URL: 'https://supabase.apps.tahabouhsine.com' },
  { VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_server' },
  { VITE_SUPABASE_ANON_KEY: 'legacy-anon' },
  { SUPABASE_MIGRATION_EVIDENCE_SHA256: 'not-a-hash' },
  { SUPABASE_RECONCILIATION_EVIDENCE_SHA256: '' },
]) assert.ok(validateSupabaseDeployConfig({ ...valid, ...invalid }).length, JSON.stringify(invalid))

for (const invalid of [
  'http://supabase.apps.tahabouhsine.com',
  'https://supabase.apps.tahabouhsine.com.evil.example',
  'https://supabase.apps.tahabouhsine.com/rest/v1',
  'https://user@supabase.apps.tahabouhsine.com',
]) {
  assert.ok(validateSupabaseDeployConfig({ ...selfHosted, VITE_SUPABASE_URL: invalid }).length, invalid)
}

assert.deepEqual(validateSupabaseDeployConfig({
  ...valid,
  VITE_SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_DEPLOY_GATE_ALLOW_HTTP_LOCAL: 'true',
}), [])
assert.ok(validateSupabaseDeployConfig({
  ...valid,
  VITE_SUPABASE_URL: 'http://localhost:54321',
}).length)

let request
const approved = await verifyProductionCutover(valid, async (url, options) => {
  request = { url, options }
  return { ok: true, json: async () => true }
})
assert.deepEqual(approved.errors, [])
assert.equal(request.url, 'https://project.supabase.co/rest/v1/rpc/verify_production_cutover')
assert.equal(request.options.headers.apikey, valid.VITE_SUPABASE_PUBLISHABLE_KEY)
assert.ok(!JSON.stringify(request).match(/service.?role|sb_secret_/i))

const selfHostedApproved = await verifyProductionCutover(selfHosted, async (url) => ({
  ok: url === 'https://supabase.apps.tahabouhsine.com/rest/v1/rpc/verify_production_cutover',
  json: async () => true,
}))
assert.deepEqual(selfHostedApproved.errors, [])

const mismatch = await verifyProductionCutover({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_different' }, async () => ({ ok: true, json: async () => false }))
assert.match(mismatch.errors.join(' '), /does not match/)
console.log('Supabase production deployment configuration self-test passed.')
