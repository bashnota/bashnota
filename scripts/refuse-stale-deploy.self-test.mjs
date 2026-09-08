import assert from 'node:assert/strict'
import {
  STALE_DEPLOY_GUARD_VERSION,
  assertCurrentMasterHead,
  readMasterHead,
  refuseStaleDeploy,
} from './refuse-stale-deploy.mjs'

const testedSha = '1111111111111111111111111111111111111111'
const newerSha = '2222222222222222222222222222222222222222'
const repository = 'owner/bashnota'
const token = 'test-token'

function response({ ok = true, status = 200, payload = { object: { sha: testedSha } }, jsonError } = {}) {
  return {
    ok,
    status,
    async json() {
      if (jsonError) throw jsonError
      return payload
    },
  }
}

assert.equal(STALE_DEPLOY_GUARD_VERSION, 1)
assert.doesNotThrow(() => assertCurrentMasterHead(testedSha, testedSha))
assert.throws(() => assertCurrentMasterHead(testedSha, newerSha), /Refusing stale deploy/)
assert.throws(() => assertCurrentMasterHead('main', testedSha), /full lowercase commit SHA/)

let requestedUrl = ''
let requestedOptions
const currentSha = await readMasterHead({
  repository,
  token,
  fetchImpl: async (url, options) => {
    requestedUrl = url
    requestedOptions = options
    return response()
  },
})
assert.equal(currentSha, testedSha)
assert.equal(requestedUrl, 'https://api.github.com/repos/owner/bashnota/git/ref/heads/master')
assert.deepEqual(requestedOptions, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer test-token',
    'User-Agent': 'bashnota-stale-deploy-guard',
    'X-GitHub-Api-Version': '2022-11-28',
  },
})

await assert.rejects(() => readMasterHead({ repository, token, fetchImpl: async () => response({ ok: false, status: 503 }) }), /HTTP 503/)
await assert.rejects(() => readMasterHead({ repository, token, fetchImpl: async () => response({ jsonError: new Error('bad JSON') }) }), /invalid JSON/)
await assert.rejects(() => readMasterHead({ repository, token, fetchImpl: async () => response({ payload: {} }) }), /full lowercase commit SHA/)
await assert.rejects(() => readMasterHead({ repository: 'invalid', token, fetchImpl: async () => response() }), /owner\/name pair/)
await assert.rejects(() => readMasterHead({ repository, token: '', fetchImpl: async () => response() }), /GH_TOKEN is required/)

await assert.doesNotReject(() => refuseStaleDeploy({
  expectedSha: testedSha,
  repository,
  token,
  fetchImpl: async () => response(),
}))
await assert.rejects(() => refuseStaleDeploy({
  expectedSha: testedSha,
  repository,
  token,
  fetchImpl: async () => response({ payload: { object: { sha: newerSha } } }),
}), /Refusing stale deploy/)

console.log('Stale deployment guard self-test passed (current, stale, API failure, malformed response, and input validation).')
