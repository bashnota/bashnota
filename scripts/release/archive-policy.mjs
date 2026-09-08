import path from 'node:path'

const forbiddenSegments = new Set([
  'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report',
  '.firebase', '.supabase', '.netlify', '.cache',
])

export function forbiddenArchivePath(file) {
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '')
  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((segment) => forbiddenSegments.has(segment))) return 'generated/dependency directory'
  const name = path.posix.basename(normalized)
  const lowerPath = normalized.toLowerCase()
  if ((name === '.env' || name.startsWith('.env.')) && !name.endsWith('.example')) return 'private environment file'
  if (['.npmrc', '.pypirc', '.netrc', '.git-credentials'].includes(name)
    || /(?:^|\/)\.aws\/credentials$/.test(lowerPath)
    || /(?:^|\/)\.docker\/config\.json$/.test(lowerPath)
    || /(?:^|\/)\.kube\/config$/.test(lowerPath)
    || /(?:^|\/)(?:credentials|secrets|client[_-]?secret)(?:\.[^/]*)?\.json$/.test(lowerPath)) {
    return 'credential configuration file'
  }
  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(name)) return 'private key or key store'
  if (/(?:service[-_]?account|firebase-adminsdk).*\.json$/i.test(name)) return 'service-account credential'
  if (/^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/.test(name)) return 'private key'
  if (/\.(?:nota|ipynb)$/i.test(name)) return 'unclassified notebook/user data'
  return null
}

export function validateFixtureLedger(ledger) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.fixtures) || !Array.isArray(ledger.historicalFixtures)) {
    throw new Error('Invalid fixture provenance ledger.')
  }
  const currentPaths = new Set()
  const historicalPairs = new Set()
  for (const [scope, records] of [['current', ledger.fixtures], ['historical', ledger.historicalFixtures]]) {
    for (const record of records) {
      if (typeof record?.path !== 'string' || !/\.(?:nota|ipynb)$/i.test(record.path)
        || !/^[0-9a-f]{40}$/.test(record.blobOid ?? '') || !/^[0-9a-f]{64}$/.test(record.sha256 ?? '')
        || record.containsPersonalOrUserData !== false || typeof record.privacyReview !== 'string' || !record.privacyReview
        || typeof record.rightsBasis !== 'string' || !record.rightsBasis || typeof record.origin !== 'string' || !record.origin) {
        throw new Error(`Invalid ${scope} fixture provenance record: ${JSON.stringify(record)}`)
      }
      if (scope === 'current') {
        if (typeof record.purpose !== 'string' || !record.purpose || currentPaths.has(record.path)) {
          throw new Error(`Invalid or duplicate current fixture provenance: ${record.path}`)
        }
        currentPaths.add(record.path)
      } else {
        const pair = `${record.blobOid}\t${record.path}`
        if (!/^[0-9a-f]{40}$/.test(record.introducedCommit ?? '') || !/^[0-9a-f]{40}$/.test(record.removedCommit ?? '')
          || historicalPairs.has(pair)) {
          throw new Error(`Invalid or duplicate historical fixture provenance: ${record.path}`)
        }
        historicalPairs.add(pair)
      }
    }
  }
  return ledger
}

export function assertReviewedFixture({ ledger, file, blobOid, digest, currentOnly = false }) {
  validateFixtureLedger(ledger)
  const candidates = currentOnly ? ledger.fixtures : [...ledger.fixtures, ...ledger.historicalFixtures]
  const record = candidates.find((entry) => entry.path === file && entry.blobOid === blobOid)
  if (!record) throw new Error(`Notebook fixture lacks exact provenance: ${file} (${blobOid})`)
  if (record.sha256 !== digest) throw new Error(`Notebook fixture digest drift: ${file} (${blobOid})`)
  return record
}

export const secretPatterns = [
  ['private-key marker', /-----BEGIN (?:(?:RSA|EC|OPENSSH|DSA|PGP|ENCRYPTED) )?PRIVATE KEY-----/],
  ['AWS access-key shape', /(?:AKIA|ASIA)[0-9A-Z]{16}/],
  ['Supabase secret-key shape', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['GitHub token shape', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['Google API-key shape', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['OpenAI API-key shape', /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/],
  ['Anthropic API-key shape', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ['Groq API-key shape', /\bgsk_[A-Za-z0-9]{20,}\b/],
  ['Hugging Face token shape', /\bhf_[A-Za-z0-9]{20,}\b/],
  ['xAI API-key shape', /\bxai-[A-Za-z0-9_-]{20,}\b/],
  ['Stripe live secret-key shape', /\bsk_live_[A-Za-z0-9]{24,}\b/],
  ['Slack token shape', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['GitLab access-token shape', /\bglpat-[A-Za-z0-9_-]{20,}\b/],
  ['npm access-token shape', /\bnpm_[A-Za-z0-9]{36,}\b/],
  ['JWT shape', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['secret-named Vite variable', /VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|TOKEN)[A-Z0-9_]*/],
]

const contextualSecret = /(?:^|[\s\x00,{;])(?:[A-Za-z_$][\w$]*\.)*["']?(?:[A-Za-z0-9]+[_-])*(?:api[_-]?key|access[_-]?key|client[_-]?secret|jupyter[_-]?token|password|secret|token)["']?\s*[=:]\s*(?:"((?!\$\{)[^"\r\n]{8,})"|'((?!\$\{)[^'\r\n]{8,})'|([A-Za-z0-9_/+=!@#%^&*-]{8,}))/gim
const credentialUrl = /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/(?:[^\s/:?#@]+:([^\s/?#@]{8,})@[^\s]+|[^\s?#]+[?#][^\s#]*(?:api[_-]?key|access[_-]?key|client[_-]?secret|jupyter[_-]?token|password|secret|token)=([^&#\s]{8,}))/gim

function isPlaceholder(value) {
  return /^(?:(?:placeholder|example|dummy|sample|fixture|test|fake|marker|secret|token|key|value|password)[-_.]*)+$/i.test(value)
    || /^AIzaCredentialMarker[0-9]+$/.test(value)
}

function shannonEntropy(value) {
  const frequencies = new Map()
  for (const character of value) frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
  return [...frequencies.values()].reduce((entropy, count) => {
    const probability = count / value.length
    return entropy - probability * Math.log2(probability)
  }, 0)
}

function looksLikeCredential(value) {
  if (isPlaceholder(value) || value.length < 8) return false
  const entropy = shannonEntropy(value)
  const hasCredentialDiversity = /[A-Za-z]/.test(value) && (/[0-9]/.test(value) || /[_/+=!@#%^&*-]/.test(value))
  if (!hasCredentialDiversity) return false
  if (value.length >= 16) return entropy >= 4
  return entropy >= 3 && /[0-9]/.test(value)
}

export function findSecretShape(content) {
  // Credentials are ASCII. Decoding the complete bounded blob keeps those byte
  // sequences visible even when unrelated bytes are binary or invalid UTF-8.
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content)
  const named = secretPatterns.find(([, regex]) => regex.test(text))?.[0]
  if (named) return named
  contextualSecret.lastIndex = 0
  for (const match of text.matchAll(contextualSecret)) {
    const value = match[1] ?? match[2] ?? match[3]
    if (looksLikeCredential(value)) return 'high-entropy value assigned to a secret-named field'
  }
  credentialUrl.lastIndex = 0
  for (const match of text.matchAll(credentialUrl)) {
    const encodedValue = match[1] ?? match[2]
    let value = encodedValue
    try {
      value = decodeURIComponent(encodedValue)
    } catch {
      // Malformed percent encoding is still scanned in its original form.
    }
    if (looksLikeCredential(value)) return 'credential-bearing URL'
  }
  return null
}
