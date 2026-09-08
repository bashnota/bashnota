#!/usr/bin/env node
import { assertValidReleaseVersion } from './release-version-policy.mjs'

const version = process.argv[2]
if (!version) throw new Error('Usage: validate-release-version.mjs <version>')
assertValidReleaseVersion(version)
console.log(`Validated release version ${version}`)
