#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(new URL('../..', import.meta.url).pathname)
const outputArg = process.argv.indexOf('--output')
const output = path.resolve(root, outputArg >= 0 ? process.argv[outputArg + 1] : 'release/sbom.cdx.json')
const result = spawnSync('npm', ['sbom', '--sbom-format=cyclonedx'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (result.error) throw result.error
if (result.status !== 0) throw new Error(`npm sbom failed:\n${result.stderr}`)
const parsed = JSON.parse(result.stdout)

function git(...args) {
  const command = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (command.error) throw command.error
  if (command.status !== 0) throw new Error(`git ${args.join(' ')} failed:\n${command.stderr}`)
  return command.stdout.trim()
}

// npm intentionally emits a fresh timestamp and UUID for each invocation. Tie
// those identity fields to the source commit so identical inputs produce an
// identical SBOM while retaining schema-valid CycloneDX metadata.
const commit = git('rev-parse', 'HEAD')
const sourceEpoch = Number(process.env.SOURCE_DATE_EPOCH ?? git('show', '-s', '--format=%ct', commit))
if (!Number.isSafeInteger(sourceEpoch) || sourceEpoch < 0) throw new Error('SOURCE_DATE_EPOCH must be a non-negative integer.')
const uuidBytes = Buffer.from(createHash('sha256').update(`bashnota:${commit}`).digest().subarray(0, 16))
uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x50
uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80
const uuidHex = uuidBytes.toString('hex')
parsed.serialNumber = `urn:uuid:${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(16, 20)}-${uuidHex.slice(20)}`
parsed.metadata ??= {}
parsed.metadata.timestamp = new Date(sourceEpoch * 1000).toISOString()

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(parsed, null, 2)}\n`)
console.log(`Wrote CycloneDX SBOM to ${path.relative(root, output)}`)
