function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const semanticVersion = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

export function assertValidReleaseVersion(version) {
  if (!semanticVersion.test(version)) throw new Error(`Invalid semantic release version: ${version}`)
}

export function assertReleaseVersionBinding({
  requestedVersion,
  packageVersion,
  changelog,
  requireReleasedHeading = false,
}) {
  assertValidReleaseVersion(requestedVersion)
  if (requestedVersion !== packageVersion) {
    throw new Error(`Release version ${requestedVersion} does not match package.json version ${packageVersion}.`)
  }
  if (!requireReleasedHeading) return

  const releasedHeading = new RegExp(
    `^## \\[?${escapeRegExp(requestedVersion)}\\]?(?:\\s+-\\s+\\d{4}-\\d{2}-\\d{2})?\\s*$`,
    'm',
  )
  if (!releasedHeading.test(changelog)) {
    throw new Error(`CHANGELOG.md is missing a released heading for ${requestedVersion}.`)
  }
}
