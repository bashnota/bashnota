#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { assertReviewedFixture, forbiddenArchivePath, findSecretShape, validateFixtureLedger } from './archive-policy.mjs'
import { scanGitObjects } from './git-secret-scan.mjs'
import { enumerateHistoricalPathBlobs } from './git-history-paths.mjs'
import { canonicalHistoryRefs, classifyHistoryRef, forbiddenBundleRef, isCanonicalHistoryRef } from './history-policy.mjs'
import { validateLicenseOverrides } from './license-evidence-policy.mjs'
import { assertReleaseVersionBinding, assertValidReleaseVersion } from './release-version-policy.mjs'
import { validatedSecretScanExceptions } from './secret-scan-exceptions.mjs'
import { pinnedHistoryFetchPlan } from './fetch-pinned-history-refs.mjs'

const root = path.resolve(new URL('../..', import.meta.url).pathname)
const testCredential = 'aB3dE5fG7hI9jK1mN3pQ5rS7tU9wX2zC'
const awsSecretAssignment = [['AWS', 'SECRET', 'ACCESS', 'KEY'].join('_'), testCredential].join('=')
const required = [
  'SECURITY.md', 'CHANGELOG.md', 'CODE_OF_CONDUCT.md', '.github/CODEOWNERS',
  'NOTICE', 'docs/release-readiness.md', 'docs/development.md',
  'docs/architecture/README.md', 'docs/architecture/data-flow.md',
  'docs/architecture/threat-model.md', 'docs/architecture/backup-recovery.md',
  'docs/architecture/format-compatibility.md',
  'docs/provenance/contributors.json', 'docs/provenance/fixtures.json',
  'docs/provenance/dependency-license-overrides.json',
  'docs/provenance/license-evidence/khroma-2.1.0-LICENSE.txt',
  'docs/provenance/license-evidence/vaul-vue-0.4.1-LICENSE.txt',
  'scripts/release/history-branches.json',
  'scripts/release/fetch-pinned-history-refs.mjs',
  'scripts/release/secret-scan-exceptions.json',
]

for (const file of required) await readFile(path.join(root, file))
const historyBranchLedger = JSON.parse(await readFile(path.join(root, 'scripts/release/history-branches.json'), 'utf8'))
const pinnedLegacyOids = new Map(historyBranchLedger.preserveUnique.map((entry) => [entry.ref, entry.oid]))
const pinnedHistoryPlan = pinnedHistoryFetchPlan(historyBranchLedger)
assert.deepEqual(
  pinnedHistoryPlan.map(({ ref }) => ref),
  historyBranchLedger.preserveUnique.map(({ ref }) => ref),
)
assert.ok(pinnedHistoryPlan.every(({ refspec }) => (
  refspec.startsWith('refs/heads/') && refspec.includes(':refs/remotes/origin/')
)))
assert.throws(() => pinnedHistoryFetchPlan({
  ...historyBranchLedger,
  preserveUnique: [{
    ...historyBranchLedger.preserveUnique[0],
    ref: 'refs/tags/not-a-development-branch',
  }],
}), /cannot be fetched as a development branch/)
const allowedSecretFindings = validatedSecretScanExceptions(JSON.parse(await readFile(path.join(root, 'scripts/release/secret-scan-exceptions.json'), 'utf8')))
assert.equal(forbiddenArchivePath('node_modules/vue/index.js'), 'generated/dependency directory')
assert.equal(forbiddenArchivePath('dist/index.html'), 'generated/dependency directory')
assert.equal(forbiddenArchivePath('.env.production'), 'private environment file')
for (const credentialPath of [
  '.npmrc', '.pypirc', '.netrc', '.git-credentials', '.aws/credentials',
  '.docker/config.json', '.kube/config', 'config/client_secret.json', 'config/credentials.prod.json',
]) assert.equal(forbiddenArchivePath(credentialPath), 'credential configuration file')
assert.equal(forbiddenArchivePath('private.nota'), 'unclassified notebook/user data')
assert.equal(forbiddenArchivePath('e2e/fixtures/example.nota'), 'unclassified notebook/user data')
assert.equal(forbiddenArchivePath('e2e/fixtures/example.ipynb'), 'unclassified notebook/user data')
assert.equal(forbiddenArchivePath('src/main.ts'), null)
assert.equal(findSecretShape('-----BEGIN ' + 'PRIVATE KEY-----'), 'private-key marker')
assert.equal(findSecretShape('-----BEGIN ' + 'ENCRYPTED PRIVATE KEY-----'), 'private-key marker')
assert.equal(findSecretShape('sk-' + 'proj-' + 'A1b2C3d4E5f6G7h8I9j0K1l2'), 'OpenAI API-key shape')
assert.equal(findSecretShape('sk-' + 'ant-api03-' + 'A1b2C3d4E5f6G7h8I9j0K1l2'), 'Anthropic API-key shape')
assert.equal(findSecretShape('gsk_' + 'A1b2C3d4E5f6G7h8I9j0K1l2'), 'Groq API-key shape')
assert.equal(findSecretShape('hf_' + 'A1b2C3d4E5f6G7h8I9j0K1l2'), 'Hugging Face token shape')
assert.equal(findSecretShape('xai-' + 'A1b2C3d4E5f6G7h8I9j0K1l2'), 'xAI API-key shape')
assert.equal(findSecretShape(Buffer.concat([Buffer.from([0, 255, 0]), Buffer.from('sk_' + 'live_' + 'A1b2C3d4E5f6G7h8I9j0K1l2')])), 'Stripe live secret-key shape')
assert.equal(findSecretShape(`jupyter_token=${testCredential}`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(`{"token":"${testCredential}"}`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(`'api_key': '${testCredential}'`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(`c.ServerApp.token = '${testCredential}'`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(['https://operator:', testCredential, '@jupyter.example.invalid/tree'].join('')), 'credential-bearing URL')
assert.equal(findSecretShape(['https://jupyter.example.invalid/tree?', 'token=', testCredential].join('')), 'credential-bearing URL')
const shortCredential = ['A1b2C3d4', 'E5f6G7h8', 'I9j0K1m2'].join('')
const compactCredential = ['A1b2', 'C3d4', 'E5f6'].join('')
assert.equal(findSecretShape(`password=${compactCredential}`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(`password=${shortCredential}`), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(['mysql://operator:', compactCredential, '@database.example.invalid/app'].join('')), 'credential-bearing URL')
assert.equal(findSecretShape(['postgresql://operator:', shortCredential, '@database.example.invalid/app'].join('')), 'credential-bearing URL')
assert.equal(findSecretShape(Buffer.concat([Buffer.from([0, 255, 0]), Buffer.from(`password=${shortCredential}`)])), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(Buffer.concat([Buffer.alloc(6 * 1024 * 1024), Buffer.from(['mongodb+srv://operator:', shortCredential, '@database.example.invalid/app'].join(''))])), 'credential-bearing URL')
for (const placeholderWord of ['placeholder', 'example', 'dummy', 'sample', 'fixture', 'test', 'fake', 'marker', 'secret']) {
  const embeddedPlaceholderCredential = ['A1b2C3d4', placeholderWord, 'E5f6G7h8I9j0K1m2N3p4Q5r6'].join('')
  assert.equal(findSecretShape(`token=${embeddedPlaceholderCredential}`), 'high-entropy value assigned to a secret-named field')
  assert.equal(findSecretShape(['https://operator:', embeddedPlaceholderCredential, '@jupyter.example.invalid/tree'].join('')), 'credential-bearing URL')
}
assert.equal(findSecretShape(`token=${'placeholder-'.repeat(4)}`), null)
assert.equal(findSecretShape('const secret = \'AIzaCredentialMarker012345678901234\''), null)
assert.equal(findSecretShape(Buffer.concat([Buffer.alloc(6 * 1024 * 1024), Buffer.from('glpat-' + 'A1b2C3d4E5f6G7h8I9j0')])), 'GitLab access-token shape')
assert.equal(findSecretShape(awsSecretAssignment), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(Buffer.concat([Buffer.from([0, 255, 0]), Buffer.from(awsSecretAssignment)])), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape(Buffer.concat([Buffer.alloc(6 * 1024 * 1024), Buffer.from(awsSecretAssignment)])), 'high-entropy value assigned to a secret-named field')
assert.equal(findSecretShape('ordinary fixture data'), null)

for (const [oid, exception] of allowedSecretFindings) {
  const blob = spawnSync('git', ['cat-file', 'blob', oid], { cwd: root, encoding: null })
  assert.equal(blob.status, 0, blob.stderr?.toString())
  assert.equal(findSecretShape(blob.stdout), exception.shape, `Secret exception no longer matches its reviewed shape: ${oid}`)
  assert.equal(createHash('sha256').update(blob.stdout).digest('hex'), exception.sha256, `Secret exception digest drift: ${oid}`)
  assert.equal(await scanGitObjects({
    cwd: root,
    objects: new Map([[oid, exception.path]]),
    maxEntryBytes: 50 * 1024 * 1024,
    allowedFindings: allowedSecretFindings,
  }), null, `Exact reviewed secret exception must be accepted: ${oid}`)
  const aliasedFinding = await scanGitObjects({
    cwd: root,
    objects: new Map([[oid, [exception.path, 'copied/unreviewed-secret-fixture.txt']]]),
    maxEntryBytes: 50 * 1024 * 1024,
    allowedFindings: allowedSecretFindings,
  })
  assert.equal(aliasedFinding?.shape, exception.shape)
  assert.equal(aliasedFinding?.file, 'copied/unreviewed-secret-fixture.txt')
}

assert.doesNotThrow(() => assertReleaseVersionBinding({
  requestedVersion: '0.2.0',
  packageVersion: '0.2.0',
  changelog: '# Changelog\n\n## [Unreleased]\n',
}))
for (const version of ['0.2.0', '0.2.0-rc.1', '0.2.0-rc.1+build.7']) {
  assert.doesNotThrow(() => assertValidReleaseVersion(version))
}
for (const version of ['v0.2.0', '01.2.3', '0.2', '0.2.0-', '0.2.0-01', '0.2.0+']) {
  assert.throws(() => assertValidReleaseVersion(version), /Invalid semantic release version/)
}
assert.throws(() => assertReleaseVersionBinding({
  requestedVersion: '0.3.0',
  packageVersion: '0.2.0',
  changelog: '# Changelog\n\n## [0.3.0] - 2026-09-04\n',
}), /does not match package\.json/)
assert.throws(() => assertReleaseVersionBinding({
  requestedVersion: '0.2.0',
  packageVersion: '0.2.0',
  changelog: '# Changelog\n\n## [Unreleased]\n',
  requireReleasedHeading: true,
}), /missing a released heading/)
assert.doesNotThrow(() => assertReleaseVersionBinding({
  requestedVersion: '0.2.0',
  packageVersion: '0.2.0',
  changelog: '# Changelog\n\n## [0.2.0] - 2026-09-04\n',
  requireReleasedHeading: true,
}))

const secretHistory = await mkdtemp(path.join(os.tmpdir(), 'bashnota-secret-history-'))
try {
  const runFixtureGit = (...args) => {
    const result = spawnSync('git', args, { cwd: secretHistory, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  }
  runFixtureGit('init', '--quiet')
  await writeFile(path.join(secretHistory, 'historical.bin'), Buffer.concat([
    Buffer.alloc(6 * 1024 * 1024),
    Buffer.from('xoxb-' + 'A1b2C3d4-E5f6G7h8-I9j0K1l2'),
  ]))
  runFixtureGit('add', 'historical.bin')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'binary fixture')
  const historicalObjects = new Map(runFixtureGit('rev-list', '--objects', 'HEAD').split('\n').filter((line) => line.includes(' ')).map((line) => {
    const separator = line.indexOf(' ')
    return [line.slice(0, separator), line.slice(separator + 1)]
  }))
  const historicalFinding = await scanGitObjects({ cwd: secretHistory, objects: historicalObjects, maxEntryBytes: 50 * 1024 * 1024 })
  assert.equal(historicalFinding?.shape, 'Slack token shape')
  assert.equal(historicalFinding?.file, 'historical.bin')
  const jsonBlob = spawnSync('git', ['hash-object', '-w', '--stdin'], {
    cwd: secretHistory,
    input: Buffer.from(`{"api_key":"${testCredential}"}`),
    encoding: 'utf8',
  })
  assert.equal(jsonBlob.status, 0, jsonBlob.stderr)
  const jsonFinding = await scanGitObjects({
    cwd: secretHistory,
    objects: new Map([[jsonBlob.stdout.trim(), 'historical-config.json']]),
    maxEntryBytes: 50 * 1024 * 1024,
  })
  assert.equal(jsonFinding?.shape, 'high-entropy value assigned to a secret-named field')
  assert.equal(jsonFinding?.file, 'historical-config.json')
  for (const [file, value, expectedShape] of [
    ['historical-encrypted-key.pem', '-----BEGIN ' + 'ENCRYPTED PRIVATE KEY-----', 'private-key marker'],
    ['historical-jupyter.py', `c.ServerApp.token = '${testCredential}'`, 'high-entropy value assigned to a secret-named field'],
    ['historical-credential-url.txt', ['https://operator:', testCredential, '@jupyter.example.invalid/tree'].join(''), 'credential-bearing URL'],
    ['historical-database-url.txt', ['redis://operator:', shortCredential, '@cache.example.invalid/0'].join(''), 'credential-bearing URL'],
    ['historical-short-password.env', `password=${shortCredential}`, 'high-entropy value assigned to a secret-named field'],
    ['historical-compact-password.env', `password=${compactCredential}`, 'high-entropy value assigned to a secret-named field'],
    ['historical-aws.env', awsSecretAssignment, 'high-entropy value assigned to a secret-named field'],
  ]) {
    const blob = spawnSync('git', ['hash-object', '-w', '--stdin'], { cwd: secretHistory, input: value, encoding: 'utf8' })
    assert.equal(blob.status, 0, blob.stderr)
    const finding = await scanGitObjects({
      cwd: secretHistory,
      objects: new Map([[blob.stdout.trim(), file]]),
      maxEntryBytes: 50 * 1024 * 1024,
    })
    assert.equal(finding?.shape, expectedShape)
    assert.equal(finding?.file, file)
  }
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'tag', '-a', 'v0.0.0', '-m', `token=${testCredential}`)
  const tagOid = runFixtureGit('rev-parse', 'refs/tags/v0.0.0')
  const tagFinding = await scanGitObjects({ cwd: secretHistory, objects: new Map([[tagOid, 'refs/tags/v0.0.0']]), maxEntryBytes: 50 * 1024 * 1024 })
  assert.equal(tagFinding?.shape, 'high-entropy value assigned to a secret-named field')
  assert.equal(tagFinding?.type, 'tag')

  const sharedAllowedFirst = Buffer.from('identical allowed-first bytes')
  await writeFile(path.join(secretHistory, 'allowed-first.txt'), sharedAllowedFirst)
  runFixtureGit('add', 'allowed-first.txt')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'allowed path first')
  await writeFile(path.join(secretHistory, '.env.private'), sharedAllowedFirst)
  runFixtureGit('add', '.env.private')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'forbidden path second')

  const sharedForbiddenFirst = Buffer.from('identical forbidden-first bytes')
  await writeFile(path.join(secretHistory, 'private.nota'), sharedForbiddenFirst)
  runFixtureGit('add', 'private.nota')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'forbidden path first')
  await writeFile(path.join(secretHistory, 'allowed-second.txt'), sharedForbiddenFirst)
  runFixtureGit('add', 'allowed-second.txt')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'allowed path second')

  const pathBlobs = enumerateHistoricalPathBlobs({ cwd: secretHistory, refs: ['HEAD'] })
  const pathsByOid = new Map()
  for (const { oid, file } of pathBlobs) {
    const files = pathsByOid.get(oid) ?? new Set()
    files.add(file)
    pathsByOid.set(oid, files)
  }
  const allowedFirstOid = runFixtureGit('hash-object', 'allowed-first.txt')
  assert.deepEqual([...pathsByOid.get(allowedFirstOid)].sort(), ['.env.private', 'allowed-first.txt'])
  const forbiddenFirstOid = runFixtureGit('hash-object', 'private.nota')
  assert.deepEqual([...pathsByOid.get(forbiddenFirstOid)].sort(), ['allowed-second.txt', 'private.nota'])
  assert.equal(forbiddenArchivePath('.env.private'), 'private environment file')
  assert.equal(forbiddenArchivePath('private.nota'), 'unclassified notebook/user data')

  await writeFile(path.join(secretHistory, 'merge-conflict.txt'), 'base\n')
  runFixtureGit('add', 'merge-conflict.txt')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'merge base')
  const fixtureMainBranch = runFixtureGit('branch', '--show-current')
  runFixtureGit('checkout', '--quiet', '-b', 'merge-left')
  await writeFile(path.join(secretHistory, 'merge-conflict.txt'), 'left\n')
  runFixtureGit('add', 'merge-conflict.txt')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'left side')
  const leftCommit = runFixtureGit('rev-parse', 'HEAD')
  runFixtureGit('checkout', '--quiet', fixtureMainBranch)
  await writeFile(path.join(secretHistory, 'merge-conflict.txt'), 'right\n')
  runFixtureGit('add', 'merge-conflict.txt')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'right side')
  const rightCommit = runFixtureGit('rev-parse', 'HEAD')
  const conflictedMerge = spawnSync('git', [
    '-c', 'user.name=Release Policy Test',
    '-c', 'user.email=release-policy@example.invalid',
    'merge', '--no-commit', 'merge-left',
  ], { cwd: secretHistory, encoding: 'utf8' })
  assert.notEqual(conflictedMerge.status, 0, 'Synthetic merge must conflict before the resolution-only blob is added.')
  assert.equal(runFixtureGit('rev-parse', '--verify', 'MERGE_HEAD'), leftCommit,
    'The expected failure must be a real merge conflict, not an unrelated Git configuration error.')
  await writeFile(path.join(secretHistory, 'merge-conflict.txt'), 'resolved\n')
  await writeFile(path.join(secretHistory, 'merge-only.nota'), `token=${testCredential}\n`)
  runFixtureGit('add', 'merge-conflict.txt', 'merge-only.nota')
  runFixtureGit('-c', 'user.name=Release Policy Test', '-c', 'user.email=release-policy@example.invalid', 'commit', '--quiet', '-m', 'merge resolution')
  const mergeParents = runFixtureGit('rev-list', '--parents', '-n', '1', 'HEAD').split(' ')
  assert.deepEqual(new Set(mergeParents.slice(1)), new Set([rightCommit, leftCommit]),
    'The resolution fixture must remain a two-parent merge commit.')
  assert.equal(runFixtureGit('ls-tree', '-r', '--name-only', rightCommit).split('\n').includes('merge-only.nota'), false)
  assert.equal(runFixtureGit('ls-tree', '-r', '--name-only', leftCommit).split('\n').includes('merge-only.nota'), false)

  const mergeHistoryEntries = enumerateHistoricalPathBlobs({ cwd: secretHistory, refs: ['HEAD'] })
  const mergeOnlyOid = runFixtureGit('rev-parse', 'HEAD:merge-only.nota')
  assert.ok(mergeHistoryEntries.some(({ oid, file }) => oid === mergeOnlyOid && file === 'merge-only.nota'),
    'A blob introduced only by merge resolution must be enumerated with its exact path.')
  const mergeOnlyBlob = spawnSync('git', ['cat-file', 'blob', mergeOnlyOid], { cwd: secretHistory, encoding: null })
  assert.equal(mergeOnlyBlob.status, 0, mergeOnlyBlob.stderr?.toString())
  assert.equal(findSecretShape(mergeOnlyBlob.stdout), 'high-entropy value assigned to a secret-named field')
  assert.equal(forbiddenArchivePath('merge-only.nota'), 'unclassified notebook/user data')

  const enumeratedPairs = new Set(mergeHistoryEntries.map(({ oid, file }) => `${oid}\t${file}`))
  for (const commit of runFixtureGit('rev-list', 'HEAD').split('\n')) {
    for (const line of runFixtureGit('ls-tree', '-r', '--full-tree', commit).split('\n').filter(Boolean)) {
      const match = line.match(/^\d+ \w+ ([0-9a-f]{40})\t(.+)$/)
      assert.ok(match, `Malformed ls-tree fixture entry: ${line}`)
      assert.ok(enumeratedPairs.has(`${match[1]}\t${match[2]}`),
        `Historical enumeration missed ${match[2]} (${match[1]}) from ${commit}.`)
    }
  }
} finally {
  await rm(secretHistory, { recursive: true, force: true })
}
assert.equal(forbiddenBundleRef('HEAD', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/tags/v1.0.0', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/heads/master', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/remotes/origin/master', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/heads/release/0.2', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/remotes/origin/release/0.2', historyBranchLedger), null)
assert.equal(forbiddenBundleRef('refs/stash', historyBranchLedger), 'non-canonical or private Git ref')
assert.equal(forbiddenBundleRef('refs/codex/turn-diffs/private', historyBranchLedger), 'non-canonical or private Git ref')
assert.equal(forbiddenBundleRef('refs/heads/dacli-record', historyBranchLedger), 'non-canonical or private Git ref')
assert.equal(classifyHistoryRef('refs/remotes/origin/codex/private', historyBranchLedger), 'exclude')
assert.equal(classifyHistoryRef('refs/heads/product-experiment', historyBranchLedger), 'unclassified')
const preserveRefs = historyBranchLedger.preserveUnique.map(({ ref }) => ref)
const ledgerWithoutPreserveUnique = { ...historyBranchLedger, preserveUnique: [] }
const codeParamsLedger = {
  ...historyBranchLedger,
  preserveUnique: historyBranchLedger.preserveUnique.filter(({ ref }) => ref === 'refs/remotes/origin/code-params'),
}
const syntheticRunGit = (...args) => {
  if (args[0] === 'for-each-ref') return [
  'refs/heads/master',
  'refs/heads/release/0.2',
  'refs/heads/codex/private',
  'refs/heads/merged-feature',
  'refs/remotes/origin/master',
  'refs/remotes/origin/release/0.3',
  'refs/remotes/origin/dacli/private',
  'refs/tags/v0.2.0',
  ...preserveRefs,
  ].join('\n')
  if (args[0] === 'rev-parse') return pinnedLegacyOids.get(args[1])
  if (args[0] === 'rev-list') return '0'
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}
assert.deepEqual(canonicalHistoryRefs(syntheticRunGit, historyBranchLedger), ['HEAD', ...[
  'refs/heads/release/0.2',
  'refs/remotes/origin/master',
  'refs/remotes/origin/release/0.3',
  'refs/tags/v0.2.0',
  ...preserveRefs,
].sort()])
assert.deepEqual(canonicalHistoryRefs((...args) => args[0] === 'for-each-ref' ? 'refs/heads/master\nrefs/heads/release/local-only\n' : '0', ledgerWithoutPreserveUnique), [
  'HEAD',
  'refs/heads/master',
  'refs/heads/release/local-only',
])
assert.deepEqual(canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return [
    'refs/remotes/origin/master',
    'refs/remotes/origin/code-params',
    'refs/tags/v0.3.0',
  ].join('\n')
  if (args[0] === 'rev-parse') return pinnedLegacyOids.get(args[1])
  if (args[0] === 'rev-list' && args[2] === 'HEAD..refs/remotes/origin/master') return '1'
  if (args[0] === 'rev-list' && args[2] === 'HEAD..refs/tags/v0.3.0') return '1'
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}, codeParamsLedger), [
  'HEAD',
  'refs/remotes/origin/code-params',
])
assert.throws(() => canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return 'refs/remotes/origin/code-params\n'
  if (args[0] === 'rev-parse') return '0'.repeat(40)
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}, codeParamsLedger), /Pinned preserve-unique history ref moved/)
assert.throws(() => canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return preserveRefs.slice(1).join('\n')
  throw new Error(`A missing preserve-unique ref must fail before another Git query: ${args.join(' ')}`)
}, historyBranchLedger), new RegExp(`Pinned preserve-unique history ref is unavailable: ${preserveRefs[0]}`))
assert.throws(() => canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return 'refs/heads/unreviewed-unique\n'
  if (args[0] === 'rev-list') return '1'
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}, ledgerWithoutPreserveUnique), /Unclassified branch ref has 1 commit/)
assert.throws(() => canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return 'refs/remotes/origin/dacli/unreviewed-agent-work\n'
  if (args[0] === 'rev-list') return '1'
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}, ledgerWithoutPreserveUnique), /Excluded source branch ref has 1 commit.*explicit pinned disposition/)
const pinnedExclusion = historyBranchLedger.excludePinned[0]
assert.throws(() => canonicalHistoryRefs((...args) => {
  if (args[0] === 'for-each-ref') return `${pinnedExclusion.ref}\n`
  if (args[0] === 'rev-parse') return '0'.repeat(40)
  throw new Error(`Unexpected synthetic Git call: ${args.join(' ')}`)
}, ledgerWithoutPreserveUnique), /Pinned excluded history ref moved/)

const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
const historyRefs = canonicalHistoryRefs(git, historyBranchLedger)
assert.equal(historyRefs[0], 'HEAD')
assert.ok(historyRefs.slice(1).every((ref) => isCanonicalHistoryRef(ref, historyBranchLedger)))

const contributors = JSON.parse(await readFile(path.join(root, 'docs/provenance/contributors.json'), 'utf8'))
const exact = new Set(contributors.entries.flatMap((entry) => entry.aliases ?? []).map(({ name, email }) => `${name}\t${email}`))
const suffixes = contributors.entries.map((entry) => entry.match?.emailSuffix).filter(Boolean)
const unmatchedContributorIdentities = (identities, exactAliases = exact, emailSuffixes = suffixes) => [...new Set(identities)].filter((identity) => {
  const email = identity.split('\t')[1]
  return !exactAliases.has(identity) && !emailSuffixes.some((suffix) => email.endsWith(suffix))
})
const history = spawnSync('git', ['log', ...historyRefs, '--format=%aN%x09%aE%x00%B%x00'], { cwd: root, encoding: 'utf8' })
assert.equal(history.status, 0, history.stderr)
const historyFields = history.stdout.split('\0')
const identities = []
for (let index = 0; index + 1 < historyFields.length; index += 2) {
  if (historyFields[index].trim()) identities.push(historyFields[index].trim())
  for (const match of historyFields[index + 1].matchAll(/^Co-authored-by:\s*(.+?)\s*<([^<>]+)>\s*$/gim)) {
    identities.push(`${match[1].trim()}\t${match[2].trim()}`)
  }
}
const unmatched = unmatchedContributorIdentities(identities)
assert.deepEqual(unmatched, [], `Unmatched Git author identities:\n${unmatched.join('\n')}`)
const withoutClaude = contributors.entries.filter((entry) => entry.id !== 'automation:claude-opus-5')
const withoutClaudeExact = new Set(withoutClaude.flatMap((entry) => entry.aliases ?? []).map(({ name, email }) => `${name}\t${email}`))
const withoutClaudeSuffixes = withoutClaude.map((entry) => entry.match?.emailSuffix).filter(Boolean)
assert.deepEqual(
  unmatchedContributorIdentities(['Claude Opus 5\tnoreply@anthropic.com'], withoutClaudeExact, withoutClaudeSuffixes),
  ['Claude Opus 5\tnoreply@anthropic.com'],
  'Removing a co-author ledger entry must fail identity coverage.',
)

const licenseOverrides = JSON.parse(await readFile(path.join(root, 'docs/provenance/dependency-license-overrides.json'), 'utf8'))
await validateLicenseOverrides(root, licenseOverrides)
const missingDigest = structuredClone(licenseOverrides)
delete missingDigest.overrides[0].evidenceSha256
await assert.rejects(validateLicenseOverrides(root, missingDigest), /must declare a lowercase SHA-256 digest/)
const remoteOnlyEvidence = structuredClone(licenseOverrides)
remoteOnlyEvidence.overrides[0].evidence = remoteOnlyEvidence.overrides[0].upstream
await assert.rejects(validateLicenseOverrides(root, remoteOnlyEvidence), /must be a local file/)
const wrongDigest = structuredClone(licenseOverrides)
wrongDigest.overrides[0].evidenceSha256 = '0'.repeat(64)
await assert.rejects(validateLicenseOverrides(root, wrongDigest), /digest drift/)
const mutableUpstream = structuredClone(licenseOverrides)
mutableUpstream.overrides[0].upstream = 'https://github.com/fabiospampinato/khroma/blob/v2.1.0/license'
await assert.rejects(validateLicenseOverrides(root, mutableUpstream), /immutable 40-character Git commit/)

const fixtures = validateFixtureLedger(JSON.parse(await readFile(path.join(root, 'docs/provenance/fixtures.json'), 'utf8')))
const fixtureMap = new Map(fixtures.fixtures.map((fixture) => [fixture.path, fixture]))
for (const extension of ['nota', 'ipynb']) {
  assert.throws(() => assertReviewedFixture({
    ledger: fixtures,
    file: `e2e/fixtures/unreviewed.${extension}`,
    blobOid: '1'.repeat(40),
    digest: '2'.repeat(64),
    currentOnly: true,
  }), /lacks exact provenance/)
}
const tracked = spawnSync('git', ['ls-files', '-z', '--', '*.nota', '*.ipynb'], { cwd: root, encoding: 'utf8' })
assert.equal(tracked.status, 0, tracked.stderr)
for (const file of tracked.stdout.split('\0').filter(Boolean)) {
  const record = fixtureMap.get(file)
  assert.ok(record, `Tracked nota lacks provenance: ${file}`)
  const digest = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')
  const blobOid = spawnSync('git', ['hash-object', '--', file], { cwd: root, encoding: 'utf8' }).stdout.trim()
  assert.equal(assertReviewedFixture({ ledger: fixtures, file, blobOid, digest, currentOnly: true }), record)
}

const historicalMap = new Map((fixtures.historicalFixtures ?? []).map((fixture) => [`${fixture.path}\t${fixture.blobOid}`, fixture]))
const historical = spawnSync('git', ['log', ...historyRefs, '--format=', '--raw', '--no-abbrev', '--no-renames', '--', '*.nota', '*.ipynb'], { cwd: root, encoding: 'utf8' })
assert.equal(historical.status, 0, historical.stderr)
const historicalBlobs = new Map()
for (const line of historical.stdout.split('\n')) {
  const match = line.match(/^:\d+ \d+ ([0-9a-f]{40}) ([0-9a-f]{40}) [A-Z]\t(.+\.(?:nota|ipynb))$/)
  if (!match) continue
  for (const oid of [match[1], match[2]]) {
    if (!/^0+$/.test(oid)) historicalBlobs.set(`${match[3]}\t${oid}`, { path: match[3], oid })
  }
}
for (const [key, { path: historicalPath, oid }] of historicalBlobs) {
  const record = fixtureMap.get(historicalPath)?.blobOid === oid ? fixtureMap.get(historicalPath) : historicalMap.get(key)
  assert.ok(record, `Historical nota blob lacks provenance: ${historicalPath} (${oid})`)
  const blob = spawnSync('git', ['cat-file', 'blob', oid], { cwd: root, encoding: null })
  assert.equal(blob.status, 0, blob.stderr?.toString())
  const digest = createHash('sha256').update(blob.stdout).digest('hex')
  assert.equal(assertReviewedFixture({ ledger: fixtures, file: historicalPath, blobOid: oid, digest }), record)
}
assert.equal(spawnSync('git', ['ls-files', 'src/App.vue.backup'], { cwd: root, encoding: 'utf8' }).stdout.trim(), '')

for (const file of ['README.md', 'CONTRIBUTING.md']) {
  const text = await readFile(path.join(root, file), 'utf8')
  assert.equal(text.includes('your-repo'), false, `${file} retains the placeholder repository link.`)
  assert.equal(/^\s*(?:\$\s*)?npm run deploy\s*$/m.test(text), false, `${file} advertises an unsupported deploy command.`)
}
const historyAdr = await readFile(path.join(root, 'docs/architecture/adr/0001-preserve-authentic-history.md'), 'utf8')
assert.equal(historyAdr.includes('all refs visible'), false, 'History ADR still promises an unfiltered all-ref bundle.')
assert.ok(historyAdr.includes('scripts/release/history-branches.json'), 'History ADR must name the executable branch ledger.')
assert.match(historyAdr, /pinned commit\s+OID/, 'History ADR must document immutable legacy-ref pins.')
const releaseReadiness = await readFile(path.join(root, 'docs/release-readiness.md'), 'utf8')
assert.ok(releaseReadiness.includes('`refs/remotes/*` and `refs/tags/*`'), 'Release docs must name the executable remote/tag discovery scope.')
assert.ok(releaseReadiness.includes('local `refs/heads/*`'), 'Release docs must explain that local branch refs are not release inputs.')
console.log(`Release readiness policy passed: ${required.length} required records, ${exact.size} exact aliases, ${fixtureMap.size} current and ${historicalMap.size} historical fixtures.`)
