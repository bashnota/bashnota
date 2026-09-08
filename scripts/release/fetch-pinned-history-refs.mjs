#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { validateHistoryBranchLedger } from './history-policy.mjs'

const DEFAULT_HISTORY_REMOTE = 'https://github.com/mlnomadpy/bashnota.git'
const root = path.resolve(new URL('../..', import.meta.url).pathname)

export function pinnedHistoryFetchPlan(ledger) {
  validateHistoryBranchLedger(ledger)
  return [
    ...ledger.preserveUnique.map((entry) => ({ ...entry, kind: 'preserve-unique' })),
    ...ledger.excludePinned.map((entry) => ({ ...entry, kind: 'exclude-pinned' })),
  ].map(({ ref, oid, kind }) => {
    const prefix = 'refs/remotes/origin/'
    if (!ref.startsWith(prefix)) {
      throw new Error(`Pinned history ref cannot be fetched as a development branch: ${ref}`)
    }
    const branch = ref.slice(prefix.length)
    if (!branch || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) {
      throw new Error(`Pinned history ref has an unsafe branch name: ${ref}`)
    }
    return {
      kind,
      oid,
      ref,
      // The checkout's origin may be the canonical repository while the ledger
      // intentionally records the audited development fork. Force the local
      // tracking ref, then verify its immutable OID below.
      refspec: `+refs/heads/${branch}:${ref}`,
    }
  })
}

export async function fetchPinnedHistoryRefs({
  cwd = root,
  remote = DEFAULT_HISTORY_REMOTE,
} = {}) {
  const ledger = JSON.parse(await readFile(path.join(cwd, 'scripts/release/history-branches.json'), 'utf8'))
  const plan = pinnedHistoryFetchPlan(ledger)

  for (const entry of plan) {
    const fetched = spawnSync('git', ['fetch', '--no-tags', remote, entry.refspec], {
      cwd,
      encoding: 'utf8',
    })
    if (fetched.status !== 0) {
      throw new Error(`Could not fetch pinned history ref ${entry.ref}: ${fetched.stderr.trim()}`)
    }
    const resolved = spawnSync('git', ['rev-parse', '--verify', entry.ref], {
      cwd,
      encoding: 'utf8',
    })
    if (resolved.status !== 0 || resolved.stdout.trim() !== entry.oid) {
      throw new Error(`Pinned history ref moved: ${entry.ref} (expected ${entry.oid}, got ${resolved.stdout.trim() || 'missing'})`)
    }
  }

  console.log(`Fetched and verified ${plan.length} pinned release-history refs`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await fetchPinnedHistoryRefs()
}
