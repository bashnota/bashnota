import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = new URL('../', import.meta.url)
function runGit(args, input) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    input,
  })
  if (result.error) throw result.error
  return result
}

function basename(file) {
  return path.posix.basename(file.replaceAll('\\', '/'))
}

export function isPublicEnvironmentTemplate(file) {
  const name = basename(file)
  return name === '.env.example'
    || /^\.env\..+\.example$/.test(name)
    || name === '.envrc.example'
    || /^\.envrc\..+\.example$/.test(name)
}

export function sensitiveTrackedPath(file) {
  const normalized = file.replaceAll('\\', '/')
  const name = basename(normalized)

  if ((name === '.env' || name.startsWith('.env.') || name === '.envrc' || name.startsWith('.envrc.')) && !isPublicEnvironmentTemplate(normalized)) {
    return 'private environment file'
  }
  if (name === '.runtimeconfig.json' || name === '.secret.local' || name === '.secrets.local') {
    return 'local provider runtime secret'
  }
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(name)
    || /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/.test(name)) return 'private key or key store'
  if (/(?:service[-_]?account|firebase-adminsdk).*\.json$/i.test(name)) return 'provider service-account credential'
  if (name === 'google-services.json' || name === 'GoogleService-Info.plist') return 'provider application credential'
  if (/(^|\/)\.firebase\//i.test(normalized)
    || /(^|\/)\.supabase\//i.test(normalized)
    || /(^|\/)supabase\/(?:\.temp|\.branches)\//i.test(normalized)) {
    return 'generated provider state'
  }
  return null
}

const positiveFilenameCases = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.staging.local',
  'functions/.env.test',
  '.envrc',
  'functions/.runtimeconfig.json',
  'credentials/service-account-prod.json',
  'credentials/service_account-prod.json',
  'credentials/firebase-adminsdk-project.json',
  'credentials/private.pem',
  'credentials/private.PEM',
  'credentials/private.KEY',
  'credentials/private.P12',
  'credentials/private.PFX',
  'credentials/private.JKS',
  'credentials/private.KEYSTORE',
  'credentials/id_rsa',
  'credentials/id_ed25519',
  'android/google-services.json',
  'ios/GoogleService-Info.plist',
  'supabase/.temp/project-ref',
]
const negativeFilenameCases = [
  '.env.example',
  '.env.production.example',
  'functions/.env.test.example',
  '.envrc.example',
  '.envrc.development.example',
  'src/config/environment.ts',
  'docs/service-account-rotation.md',
]

for (const file of positiveFilenameCases) {
  assert.ok(sensitiveTrackedPath(file), `${file} must be classified as sensitive.`)
}
for (const file of negativeFilenameCases) {
  assert.equal(sensitiveTrackedPath(file), null, `${file} must remain a permitted source/template path.`)
}

const ignored = runGit(['check-ignore', '--no-index', '--stdin'], `${positiveFilenameCases.join('\n')}\n`)
assert.equal(ignored.status, 0, `Dangerous local paths must be ignored:\n${ignored.stderr}`)
const ignoredPaths = new Set(ignored.stdout.trim().split('\n'))
for (const file of positiveFilenameCases) {
  assert.ok(ignoredPaths.has(file), `${file} is missing from the effective .gitignore contract.`)
}

for (const file of negativeFilenameCases.slice(0, 5)) {
  const result = runGit(['check-ignore', '--no-index', file])
  assert.equal(result.status, 1, `${file} must not be ignored; public templates must remain reviewable.`)
}

const trackedResult = runGit(['ls-files', '-z'])
assert.equal(trackedResult.status, 0, trackedResult.stderr)
const trackedFiles = trackedResult.stdout.split('\0').filter(Boolean)
const sensitiveTracked = trackedFiles
  .map((file) => ({ file, reason: sensitiveTrackedPath(file) }))
  .filter(({ reason }) => reason)
assert.deepEqual(sensitiveTracked, [], `Tracked sensitive filenames:\n${sensitiveTracked.map(({ file, reason }) => `${file}: ${reason}`).join('\n')}`)

const secretPatterns = [
  { name: 'private-key marker', regex: new RegExp(`-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?${'PRIVATE'} KEY-----`) },
  { name: 'AWS access-key shape', regex: new RegExp(`(?:AKIA|ASIA)[0-9A-Z]{16}`) },
  { name: 'Supabase secret-key shape', regex: new RegExp(`${'sb_'}${'secret_'}[A-Za-z0-9_-]{20,}`) },
  { name: 'GitHub token shape', regex: new RegExp(`gh[pousr]_[A-Za-z0-9]{30,}`) },
  { name: 'secret-named Vite client variable', regex: new RegExp(`VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)[A-Z0-9_]*`) },
]

const contentFindings = []
for (const file of trackedFiles) {
  // Documentation, lockfiles, and this scanner are all scanned: secrets are
  // still secrets when copied into examples, policy code, or metadata. Pattern
  // fixtures in this file are deliberately assembled so they do not self-match.
  let content
  try {
    content = await readFile(new URL(file, root))
  } catch {
    continue
  }
  if (content.includes(0)) continue
  const text = content.toString('utf8')
  for (const { name, regex } of secretPatterns) {
    if (regex.test(text)) contentFindings.push(`${file}: ${name}`)
  }
}
assert.deepEqual(contentFindings, [], `Potential tracked secrets (values withheld):\n${contentFindings.join('\n')}`)

const exampleVariables = (await readFile(new URL('.env.example', root), 'utf8'))
  .split(/\r?\n/)
  .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map((line) => line.slice(0, line.indexOf('=')))
assert.ok(exampleVariables.includes('VITE_SUPABASE_URL'), '.env.example must document the public Supabase URL.')
assert.ok(exampleVariables.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), '.env.example must document the publishable browser key.')
assert.equal(exampleVariables.some((name) => /SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN/.test(name)), false,
  `.env.example contains a secret-named variable: ${exampleVariables.join(', ')}`)

console.log(`Repository hygiene passed: ${trackedFiles.length} tracked paths, ${positiveFilenameCases.length} ignore mutations, ${secretPatterns.length} redacted secret classes.`)
