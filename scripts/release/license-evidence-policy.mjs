import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const evidenceRoot = 'docs/provenance/license-evidence/'
const immutableCommitUrl = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-f]{40}\/.+$/

export async function validateLicenseOverrides(root, document) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.overrides)) {
    throw new Error('Dependency license overrides must use schemaVersion 1 and an overrides array.')
  }

  const seen = new Set()
  for (const override of document.overrides) {
    const identity = `${override.name}@${override.version}`
    if (seen.has(identity)) throw new Error(`Duplicate dependency license override: ${identity}`)
    seen.add(identity)

    if (typeof override.evidence !== 'string' || !override.evidence.startsWith(evidenceRoot) || path.isAbsolute(override.evidence) || override.evidence.includes('..')) {
      throw new Error(`License evidence for ${identity} must be a local file under ${evidenceRoot}`)
    }
    if (!/^[0-9a-f]{64}$/.test(override.evidenceSha256 ?? '')) {
      throw new Error(`License evidence for ${identity} must declare a lowercase SHA-256 digest.`)
    }
    if (!immutableCommitUrl.test(override.upstream ?? '')) {
      throw new Error(`License evidence for ${identity} must link to an immutable 40-character Git commit.`)
    }

    const evidence = await readFile(path.join(root, override.evidence))
    const digest = createHash('sha256').update(evidence).digest('hex')
    if (digest !== override.evidenceSha256) {
      throw new Error(`License evidence digest drift for ${identity}: ${override.evidence}`)
    }
  }
}
