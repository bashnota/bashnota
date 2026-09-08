function matchesPattern(ref, pattern) {
  if (!pattern.endsWith('*')) return ref === pattern
  return ref.startsWith(pattern.slice(0, -1))
}

export function validateHistoryBranchLedger(ledger) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.include) || !Array.isArray(ledger.preserveUnique)
    || !Array.isArray(ledger.excludePinned) || !Array.isArray(ledger.exclude)) {
    throw new Error('Invalid release history branch-classification ledger.')
  }
  for (const pattern of [...ledger.include, ...ledger.exclude]) {
    if (typeof pattern !== 'string' || !pattern.startsWith('refs/')) {
      throw new Error(`Invalid release history ref pattern: ${String(pattern)}`)
    }
  }
  for (const entry of [...ledger.preserveUnique, ...ledger.excludePinned]) {
    if (typeof entry?.ref !== 'string' || !entry.ref.startsWith('refs/') || entry.ref.includes('*') || !/^[0-9a-f]{40}$/.test(entry.oid ?? '')) {
      throw new Error(`Invalid pinned history ref disposition: ${JSON.stringify(entry)}`)
    }
    if (typeof entry.reason !== 'string' || !entry.reason) {
      throw new Error(`Pinned history ref disposition lacks a review reason: ${entry.ref}`)
    }
  }
  const preserveRefs = ledger.preserveUnique.map((entry) => entry.ref)
  const pinnedExclusions = ledger.excludePinned.map((entry) => entry.ref)
  if (new Set(preserveRefs).size !== preserveRefs.length) throw new Error('Duplicate pinned preserve-unique history ref.')
  if (new Set(pinnedExclusions).size !== pinnedExclusions.length) throw new Error('Duplicate pinned excluded history ref.')
  for (const pattern of [...ledger.include, ...preserveRefs, ...pinnedExclusions]) {
    if (ledger.exclude.includes(pattern)) throw new Error(`History ref pattern is both included and excluded: ${pattern}`)
    if (ledger.include.includes(pattern) && preserveRefs.includes(pattern)) {
      throw new Error(`History ref pattern is both head-bound and preserve-unique: ${pattern}`)
    }
    if (preserveRefs.includes(pattern) && pinnedExclusions.includes(pattern)) {
      throw new Error(`History ref is both preserve-unique and pinned-excluded: ${pattern}`)
    }
  }
  return ledger
}

export function classifyHistoryRef(ref, ledger) {
  validateHistoryBranchLedger(ledger)
  if (ref.startsWith('refs/tags/')) return 'include'
  if (ledger.include.some((pattern) => matchesPattern(ref, pattern))) return 'include'
  if (ledger.preserveUnique.some((entry) => ref === entry.ref)) return 'preserve-unique'
  if (ledger.excludePinned.some((entry) => ref === entry.ref)) return 'exclude-pinned'
  if (ledger.exclude.some((pattern) => matchesPattern(ref, pattern))) return 'exclude'
  return 'unclassified'
}

export function isCanonicalHistoryRef(ref, ledger) {
  return ['include', 'preserve-unique'].includes(classifyHistoryRef(ref, ledger))
}

export function canonicalHistoryRefs(runGit, ledger) {
  validateHistoryBranchLedger(ledger)
  const discovered = runGit('for-each-ref', '--format=%(refname)', 'refs/remotes', 'refs/tags')
    .split('\n')
    .filter(Boolean)
  const discoveredSet = new Set(discovered)
  for (const { ref } of ledger.preserveUnique) {
    if (!discoveredSet.has(ref)) {
      throw new Error(`Pinned preserve-unique history ref is unavailable: ${ref}`)
    }
  }
  const refs = new Set()
  for (const ref of discovered) {
    const classification = classifyHistoryRef(ref, ledger)
    if (classification === 'preserve-unique') {
      const expectedOid = ledger.preserveUnique.find((entry) => entry.ref === ref).oid
      const actualOid = runGit('rev-parse', ref)
      if (actualOid !== expectedOid) {
        throw new Error(`Pinned preserve-unique history ref moved: ${ref} (expected ${expectedOid}, got ${actualOid})`)
      }
      refs.add(ref)
      continue
    }
    if (classification === 'exclude-pinned') {
      const disposition = ledger.excludePinned.find((entry) => entry.ref === ref)
      const actualOid = runGit('rev-parse', ref)
      if (actualOid !== disposition.oid) {
        throw new Error(`Pinned excluded history ref moved: ${ref} (expected ${disposition.oid}, got ${actualOid})`)
      }
      continue
    }
    if (ref === 'refs/remotes/origin/HEAD') continue
    const uniqueCount = Number(runGit('rev-list', '--count', `HEAD..${ref}`))
    if (!Number.isSafeInteger(uniqueCount) || uniqueCount < 0) {
      throw new Error(`Could not classify unique history for branch ref: ${ref}`)
    }
    if (classification === 'include') {
      if (uniqueCount === 0) refs.add(ref)
      continue
    }
    if (classification === 'exclude') {
      if (uniqueCount > 0) {
        throw new Error(`Excluded source branch ref has ${uniqueCount} commit(s) outside release HEAD and needs an explicit pinned disposition: ${ref}`)
      }
      continue
    }
    if (uniqueCount > 0) {
      throw new Error(`Unclassified branch ref has ${uniqueCount} commit(s) outside release HEAD: ${ref}`)
    }
  }

  if (refs.has('refs/remotes/origin/master')) refs.delete('refs/heads/master')
  for (const ref of refs) {
    if (!ref.startsWith('refs/remotes/origin/release/')) continue
    refs.delete(ref.replace('refs/remotes/origin/release/', 'refs/heads/release/'))
  }
  return ['HEAD', ...[...refs].sort()]
}

export function forbiddenBundleRef(ref, ledger) {
  if (ref === 'HEAD' || isCanonicalHistoryRef(ref, ledger)) return null
  return 'non-canonical or private Git ref'
}
