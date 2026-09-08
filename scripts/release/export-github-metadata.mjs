#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('Usage: npm run release:github-metadata -- --repo OWNER/REPO [--output FILE]')
  process.exit(0)
}
const valueAfter = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : null
const repo = valueAfter('--repo')
if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('--repo OWNER/REPO is required.')
const root = path.resolve(new URL('../..', import.meta.url).pathname)
const output = path.resolve(root, valueAfter('--output') ?? 'release/github-metadata.json')

function api(endpoint) {
  const result = spawnSync('gh', ['api', '--paginate', '--slurp', endpoint], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`gh api ${endpoint} failed:\n${result.stderr}`)
  return JSON.parse(result.stdout).flat()
}

const issues = api(`repos/${repo}/issues?state=all&per_page=100`)
const pulls = api(`repos/${repo}/pulls?state=all&per_page=100`)
const issueComments = api(`repos/${repo}/issues/comments?per_page=100`)
const reviewComments = api(`repos/${repo}/pulls/comments?per_page=100`)
const reviews = []
for (const pull of pulls) reviews.push(...api(`repos/${repo}/pulls/${pull.number}/reviews?per_page=100`))
const scrub = (value) => JSON.parse(JSON.stringify(value, (key, item) => ['authorization', 'token'].includes(key.toLowerCase()) ? '[REDACTED]' : item))
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(scrub({ schemaVersion: 1, repository: repo, issues, pulls, issueComments, reviewComments, reviews }), null, 2)}\n`)
console.log(`Wrote collaboration metadata to ${path.relative(root, output)}; privacy review is required before submission.`)
