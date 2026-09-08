import { pathToFileURL } from 'node:url'

export const STALE_DEPLOY_GUARD_VERSION = 1

const COMMIT_SHA = /^[0-9a-f]{40}$/
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function requireCommitSha(value, label) {
  if (!COMMIT_SHA.test(value ?? '')) throw new Error(`${label} must be a full lowercase commit SHA`)
  return value
}

export function assertCurrentMasterHead(expectedSha, currentSha) {
  requireCommitSha(expectedSha, 'EXPECTED_SHA')
  requireCommitSha(currentSha, 'refs/heads/master SHA')
  if (currentSha !== expectedSha) {
    throw new Error(`Refusing stale deploy: Quality tested ${expectedSha}, but master is ${currentSha}.`)
  }
}

export async function readMasterHead({ repository, token, fetchImpl = globalThis.fetch }) {
  if (!REPOSITORY.test(repository ?? '')) throw new Error('REPOSITORY must be an owner/name pair')
  if (!token) throw new Error('GH_TOKEN is required')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required')

  const response = await fetchImpl(`https://api.github.com/repos/${repository}/git/ref/heads/master`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'bashnota-stale-deploy-guard',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub refs/heads/master lookup failed with HTTP ${response.status}`)

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('GitHub refs/heads/master lookup returned invalid JSON')
  }
  return requireCommitSha(payload?.object?.sha, 'refs/heads/master SHA')
}

export async function refuseStaleDeploy({ expectedSha, repository, token, fetchImpl = globalThis.fetch }) {
  requireCommitSha(expectedSha, 'EXPECTED_SHA')
  const currentSha = await readMasterHead({ repository, token, fetchImpl })
  assertCurrentMasterHead(expectedSha, currentSha)
  return currentSha
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  try {
    const currentSha = await refuseStaleDeploy({
      expectedSha: process.env.EXPECTED_SHA,
      repository: process.env.REPOSITORY,
      token: process.env.GH_TOKEN,
    })
    console.log(`Deployment freshness confirmed at ${currentSha}.`)
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : 'Stale deployment guard failed.'}`)
    process.exitCode = 1
  }
}
