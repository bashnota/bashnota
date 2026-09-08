#!/usr/bin/env node
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { assembleExport, EXPORT_COLLECTIONS } from './export.mjs'
import { parseLosslessJson, sha256, stableJson } from './canonical.mjs'

const failRedacted = () => { console.error(stableJson({ status: 'failed', errorClass: 'permanent' })); process.exit(1) }
process.on('uncaughtException', failRedacted)
process.on('unhandledRejection', failRedacted)

const values = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  if (!process.argv[index]?.startsWith('--') || process.argv[index + 1] === undefined) throw new Error('arguments must be --name value pairs')
  values.set(process.argv[index].slice(2), process.argv[index + 1])
}
const required = name => { if (!values.get(name)) throw new Error(`--${name} is required`); return values.get(name) }
const inputDirectory = resolve(required('input-dir')), outputPath = resolve(required('output'))
const readJson = async name => parseLosslessJson(await readFile(join(inputDirectory, `${name}.json`), 'utf8'), `${name}.json`)
const collections = Object.fromEntries(await Promise.all(EXPORT_COLLECTIONS.map(async name => [name, await readJson(name)])))
const assembled = assembleExport({ watermark: required('watermark'), authExport: await readJson('authUsers'), collections, storageManifest: await readJson('storageManifest') })
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${stableJson(assembled)}\n`, { mode: 0o600 }); await chmod(outputPath, 0o600)
console.log(stableJson({ status: 'exported', watermarkHash: sha256(assembled.watermark), authCount: assembled.authUsers.length, collectionCounts: Object.fromEntries(EXPORT_COLLECTIONS.map(name => [name, assembled.collections[name].length])), storageManifestCount: assembled.storageManifest.length, outputHash: sha256(assembled) }))
