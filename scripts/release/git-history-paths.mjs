import { spawnSync } from 'node:child_process'

export function enumerateHistoricalPathBlobs({ cwd, refs }) {
  const result = spawnSync('git', [
    'log', ...refs, '--format=', '--raw', '--root', '-m', '--no-abbrev', '--no-renames', '-z',
  ], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Historical tree-path enumeration failed:\n${result.stderr}`)

  const fields = result.stdout.split('\0').filter(Boolean)
  const entries = []
  for (let index = 0; index < fields.length; index += 2) {
    const header = fields[index]
    const file = fields[index + 1]
    const match = header.match(/^:\d+ \d+ ([0-9a-f]{40}) ([0-9a-f]{40}) [A-Z]+$/)
    if (!match || file === undefined) throw new Error(`Malformed historical tree entry: ${header}`)
    for (const oid of [match[1], match[2]]) {
      if (!/^0+$/.test(oid)) entries.push({ oid, file })
    }
  }
  return entries
}
