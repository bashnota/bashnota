#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { validateLicenseOverrides } from './license-evidence-policy.mjs'

const root = path.resolve(new URL('../..', import.meta.url).pathname)
const outputArg = process.argv.indexOf('--output')
const output = path.resolve(root, outputArg >= 0 ? process.argv[outputArg + 1] : 'release/dependency-licenses.json')
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const overridesDocument = JSON.parse(await readFile(path.join(root, 'docs/provenance/dependency-license-overrides.json'), 'utf8'))
await validateLicenseOverrides(root, overridesDocument)
const overrides = new Map(overridesDocument.overrides.map((item) => [`${item.name}@${item.version}`, item]))
const appliedOverrides = []
const packages = []
const missing = []
const undeclared = []

for (const [location, locked] of Object.entries(lock.packages ?? {})) {
  if (!location || locked.link) continue
  let manifest
  try {
    manifest = JSON.parse(await readFile(path.join(root, location, 'package.json'), 'utf8'))
  } catch {
    if (locked.optional) continue
    missing.push(location)
    continue
  }
  let license = manifest.license
    ?? (Array.isArray(manifest.licenses) ? manifest.licenses.map((item) => item.type ?? item).join(' OR ') : null)
  const identity = `${manifest.name ?? location}@${manifest.version ?? locked.version}`
  const override = overrides.get(identity)
  if (!license && override) {
    license = override.license
    appliedOverrides.push(identity)
  }
  if (!license) undeclared.push(identity)
  packages.push({
    name: manifest.name ?? location.split('node_modules/').at(-1),
    version: manifest.version ?? locked.version,
    license: license ?? 'UNKNOWN',
    scope: locked.dev ? 'development' : locked.optional ? 'optional' : 'production',
    repository: typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url ?? null,
    homepage: manifest.homepage ?? null,
    licenseEvidence: override ?? null,
  })
}

if (missing.length) {
  throw new Error(`Cannot produce a complete license report; unresolved packages:\n${missing.join('\n')}`)
}

packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version) || a.scope.localeCompare(b.scope))
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify({
  schemaVersion: 1,
  source: 'installed package manifests resolved by package-lock.json plus version-pinned reviewed overrides',
  lockfileVersion: lock.lockfileVersion,
  packageCount: packages.length,
  undeclaredLicenseCount: undeclared.length,
  undeclaredLicenses: undeclared.sort(),
  appliedLicenseOverrides: appliedOverrides.sort(),
  packages,
}, null, 2)}\n`)
if (undeclared.length) throw new Error(`License review is incomplete for: ${undeclared.sort().join(', ')}`)
console.log(`Wrote ${packages.length} installed package license records (${undeclared.length} undeclared) to ${path.relative(root, output)}`)
