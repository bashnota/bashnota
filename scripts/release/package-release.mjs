#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { assertReviewedFixture, forbiddenArchivePath, findSecretShape, validateFixtureLedger } from './archive-policy.mjs'
import { scanGitObjects } from './git-secret-scan.mjs'
import { enumerateHistoricalPathBlobs } from './git-history-paths.mjs'
import { canonicalHistoryRefs, forbiddenBundleRef } from './history-policy.mjs'
import { assertReleaseVersionBinding } from './release-version-policy.mjs'
import { validatedSecretScanExceptions } from './secret-scan-exceptions.mjs'

const root = path.resolve(new URL('../..', import.meta.url).pathname)
const args = process.argv.slice(2)
const valueAfter = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : null
const maxEntryBytes = 50 * 1024 * 1024

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { cwd: options.cwd ?? root, encoding: options.encoding ?? 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} failed:\n${result.stderr || result.stdout}`)
  return result.stdout.trim()
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

if (run('git', ['rev-parse', '--is-shallow-repository']) !== 'false') throw new Error('A full, non-shallow clone is required to preserve history.')
if (run('git', ['status', '--porcelain=v1'])) throw new Error('Refusing to package a dirty checkout.')
run('npm', ['run', 'check:repository-hygiene'])

const fixtureLedger = validateFixtureLedger(JSON.parse(await readFile(path.join(root, 'docs/provenance/fixtures.json'), 'utf8')))

const tracked = run('git', ['ls-files', '-z']).split('\0').filter(Boolean)
for (const file of tracked) {
  const forbidden = forbiddenArchivePath(file)
  const info = await stat(path.join(root, file))
  if (info.size > maxEntryBytes) throw new Error(`Tracked file exceeds the ${maxEntryBytes} byte limit: ${file}`)
  if (info.isFile()) {
    const content = await readFile(path.join(root, file))
    if (forbidden === 'unclassified notebook/user data') {
      assertReviewedFixture({
        ledger: fixtureLedger,
        file,
        blobOid: run('git', ['hash-object', '--', file]),
        digest: sha256(content),
        currentOnly: true,
      })
    } else if (forbidden) {
      throw new Error(`Tracked path is forbidden in releases (${forbidden}): ${file}`)
    }
    const finding = findSecretShape(content)
    if (finding) throw new Error(`Potential ${finding} in tracked file: ${file}`)
  }
}

const commit = run('git', ['rev-parse', 'HEAD'])
const sourceEpoch = Number(run('git', ['show', '-s', '--format=%ct', commit]))
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const historyBranchLedger = JSON.parse(await readFile(path.join(root, 'scripts/release/history-branches.json'), 'utf8'))
const allowedSecretFindings = validatedSecretScanExceptions(JSON.parse(await readFile(path.join(root, 'scripts/release/secret-scan-exceptions.json'), 'utf8')))
const version = valueAfter('--version') ?? packageJson.version
assertReleaseVersionBinding({
  requestedVersion: version,
  packageVersion: packageJson.version,
  changelog: await readFile(path.join(root, 'CHANGELOG.md'), 'utf8'),
  requireReleasedHeading: process.env.GITHUB_ACTIONS === 'true',
})
const output = path.resolve(root, valueAfter('--output') ?? `release/bashnota-${version}.tar.gz`)
const qualityRunId = valueAfter('--quality-run-id')
const releaseRunId = valueAfter('--release-run-id')
if (process.env.GITHUB_ACTIONS === 'true' && (!/^\d+$/.test(qualityRunId ?? '') || !/^\d+$/.test(releaseRunId ?? ''))) {
  throw new Error('GitHub release packaging requires numeric --quality-run-id and --release-run-id test evidence.')
}
const temporary = await mkdtemp(path.join(os.tmpdir(), 'bashnota-release-'))

try {
  const prefix = `bashnota-${version}/`
  const archiveRoot = path.join(temporary, prefix)
  const historyDir = path.join(archiveRoot, 'history')
  await mkdir(historyDir, { recursive: true })
  const bundle = path.join(historyDir, 'bashnota.bundle')
  const historyRefs = canonicalHistoryRefs((...gitArgs) => run('git', gitArgs), historyBranchLedger)
  const historicalPathBlobs = enumerateHistoricalPathBlobs({ cwd: root, refs: historyRefs })
  for (const { oid, file } of historicalPathBlobs) {
    const forbidden = forbiddenArchivePath(file)
    if (forbidden === 'unclassified notebook/user data') {
      const blob = spawnSync('git', ['cat-file', 'blob', oid], { cwd: root, encoding: null })
      if (blob.status !== 0) throw new Error(`Could not read historical notebook fixture ${file} (${oid}): ${blob.stderr?.toString()}`)
      assertReviewedFixture({ ledger: fixtureLedger, file, blobOid: oid, digest: sha256(blob.stdout) })
    } else if (forbidden) {
      throw new Error(`Historical path is forbidden in releases (${forbidden}): ${file} (${oid})`)
    }
  }
  const historicalObjectsByOid = new Map()
  const addHistoricalObjectPath = (oid, file) => {
    const files = historicalObjectsByOid.get(oid) ?? new Set()
    files.add(file)
    historicalObjectsByOid.set(oid, files)
  }
  for (const oid of run('git', ['rev-list', ...historyRefs]).split('\n').filter(Boolean)) addHistoricalObjectPath(oid, `(commit ${oid})`)
  for (const { oid, file } of historicalPathBlobs) addHistoricalObjectPath(oid, file)
  for (const ref of historyRefs.filter((ref) => ref.startsWith('refs/tags/'))) {
    addHistoricalObjectPath(run('git', ['rev-parse', ref]), ref)
  }
  const historicalFinding = await scanGitObjects({ cwd: root, objects: historicalObjectsByOid, maxEntryBytes, allowedFindings: allowedSecretFindings })
  if (historicalFinding) {
    throw new Error(`Potential ${historicalFinding.shape} in released Git ${historicalFinding.type}: ${historicalFinding.file} (${historicalFinding.oid})`)
  }
  // Parallel pack-object ordering is nondeterministic even for identical refs.
  // HEAD carries the released commit's complete ancestry. Canonical tags retain
  // release markers without leaking stashes, remote-tracking branches, local
  // worktree refs, or agent/tool bookkeeping namespaces.
  run('git', ['-c', 'pack.threads=1', 'bundle', 'create', bundle, ...historyRefs])
  run('git', ['bundle', 'verify', bundle])
  const advertisedRefs = run('git', ['bundle', 'list-heads', bundle])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(' ')[1])
  for (const ref of advertisedRefs) {
    const forbidden = forbiddenBundleRef(ref, historyBranchLedger)
    if (forbidden) throw new Error(`History bundle contains ${forbidden}: ${ref}`)
  }

  const licenses = path.join(archiveRoot, 'dependency-licenses.json')
  const sbom = path.join(archiveRoot, 'sbom.cdx.json')
  const testEvidence = path.join(archiveRoot, 'test-evidence.json')
  run(process.execPath, ['scripts/release/generate-license-report.mjs', '--output', licenses])
  run(process.execPath, ['scripts/release/generate-sbom.mjs', '--output', sbom])
  await writeFile(testEvidence, `${JSON.stringify({
    schemaVersion: 1,
    commit,
    sourceDateEpoch: sourceEpoch,
    qualityWorkflow: qualityRunId ? {
      runId: Number(qualityRunId),
      url: `https://github.com/mlnomadpy/bashnota/actions/runs/${qualityRunId}`,
      assertion: 'The release workflow verified this Quality run succeeded for the exact commit.',
    } : null,
    releaseWorkflow: releaseRunId ? {
      runId: Number(releaseRunId),
      url: `https://github.com/mlnomadpy/bashnota/actions/runs/${releaseRunId}`,
      assertion: 'This release workflow rechecked the release gates before packaging.',
    } : null,
    packagerChecks: [
      'npm run check:repository-hygiene',
      'git bundle verify history/bashnota.bundle',
      'current and historical size, secret-shape, and archive-path policy inspection',
      'archive required-entry inspection',
    ],
    limitation: qualityRunId ? null : 'Local package: no CI run IDs supplied; this is not publishable release test evidence.',
  }, null, 2)}\n`)

  const internalFiles = [bundle, licenses, sbom, testEvidence]
  const manifest = {
    schemaVersion: 1,
    project: 'bashnota',
    version,
    commit,
    sourceDateEpoch: sourceEpoch,
    historyScope: 'exact release HEAD ancestry, ancestor-bound release-line/tag refs, and immutable-OID reviewed legacy refs from scripts/release/history-branches.json',
    historyRefs: advertisedRefs,
    generatedFiles: Object.fromEntries(await Promise.all(internalFiles.map(async (file) => [path.relative(archiveRoot, file), sha256(await readFile(file))]))),
    toolchain: { node: process.version, npm: run('npm', ['--version']), git: run('git', ['--version']) },
    verification: ['npm run release:check', 'git bundle verify history/bashnota.bundle'],
  }
  const manifestPath = path.join(archiveRoot, 'release-manifest.json')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  await mkdir(path.dirname(output), { recursive: true })
  const gitDir = run('git', ['rev-parse', '--absolute-git-dir'])
  const archiveArgs = [
    `--git-dir=${gitDir}`, `--work-tree=${root}`, 'archive', '--format=tar.gz',
    `--mtime=@${sourceEpoch}`, `--output=${output}`,
    `--prefix=${prefix}history/`,
    `--add-file=${path.relative(temporary, bundle)}`,
    `--prefix=${prefix}`,
    `--add-file=${path.relative(temporary, licenses)}`,
    `--add-file=${path.relative(temporary, sbom)}`,
    `--add-file=${path.relative(temporary, testEvidence)}`,
    `--add-file=${path.relative(temporary, manifestPath)}`,
    `--prefix=${prefix}`,
    commit,
  ]
  run('git', archiveArgs, { cwd: temporary })
  const listing = run('tar', ['-tzf', output]).split('\n').filter(Boolean)
  for (const file of listing) {
    const relative = file.startsWith(prefix) ? file.slice(prefix.length) : file
    const forbidden = forbiddenArchivePath(relative)
    if (forbidden && forbidden !== 'unclassified notebook/user data') {
      throw new Error(`Archive inspection found forbidden path (${forbidden}): ${file}`)
    }
  }
  for (const required of ['history/bashnota.bundle', 'dependency-licenses.json', 'sbom.cdx.json', 'test-evidence.json', 'release-manifest.json', 'LICENSE', 'NOTICE', 'CHANGELOG.md']) {
    if (!listing.includes(`${prefix}${required}`)) throw new Error(`Archive is missing ${required}`)
  }
  const digest = sha256(await readFile(output))
  await writeFile(`${output}.sha256`, `${digest}  ${path.basename(output)}\n`)
  console.log(`${path.relative(root, output)}\nsha256 ${digest}\nentries ${listing.length}`)
} finally {
  await rm(temporary, { recursive: true, force: true })
}
