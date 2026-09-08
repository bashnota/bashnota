import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { findSecretShape } from './archive-policy.mjs'

export async function scanGitObjects({ cwd, objects, maxEntryBytes, allowedFindings = new Map() }) {
  const requested = [...objects.entries()].map(([oid, files]) => [
    oid,
    [...new Set(files instanceof Set ? files : Array.isArray(files) ? files : [files])],
  ])
  if (requested.length === 0) return null

  const child = spawn('git', ['cat-file', '--batch'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.stdin.end(`${requested.map(([oid]) => oid).join('\n')}\n`)

  const chunks = []
  let firstChunkOffset = 0
  let bufferedBytes = 0
  const append = (chunk) => {
    chunks.push(chunk)
    bufferedBytes += chunk.length
  }
  const readBytes = (length) => {
    const parts = []
    let remaining = length
    while (remaining > 0) {
      const available = chunks[0].length - firstChunkOffset
      const take = Math.min(available, remaining)
      parts.push(chunks[0].subarray(firstChunkOffset, firstChunkOffset + take))
      firstChunkOffset += take
      bufferedBytes -= take
      remaining -= take
      if (firstChunkOffset === chunks[0].length) {
        chunks.shift()
        firstChunkOffset = 0
      }
    }
    return parts.length === 1 ? parts[0] : Buffer.concat(parts, length)
  }
  const lineLength = () => {
    let length = 0
    for (let index = 0; index < chunks.length; index += 1) {
      const start = index === 0 ? firstChunkOffset : 0
      const newline = chunks[index].indexOf(0x0a, start)
      if (newline >= 0) return length + newline - start
      length += chunks[index].length - start
    }
    return -1
  }

  let header = null
  let requestIndex = 0
  let finding = null
  for await (const chunk of child.stdout) {
    append(chunk)
    while (true) {
      if (!header) {
        const headerLength = lineLength()
        if (headerLength < 0) break
        const fields = readBytes(headerLength).toString('utf8').split(' ')
        readBytes(1)
        const [oid, type, rawSize] = fields
        const size = Number(rawSize)
        const expected = requested[requestIndex]
        if (!expected || oid !== expected[0] || !Number.isSafeInteger(size) || size < 0) {
          throw new Error(`Unexpected git cat-file response: ${fields.join(' ')}`)
        }
        header = { oid, type, size, files: expected[1] }
      }
      if (bufferedBytes < header.size + 1) break
      const content = readBytes(header.size)
      if (readBytes(1)[0] !== 0x0a) throw new Error(`Malformed git cat-file payload for ${header.oid}`)
      requestIndex += 1
      if (header.type === 'blob' && header.size > maxEntryBytes) {
        throw new Error(`Historical blob exceeds the ${maxEntryBytes} byte limit: ${header.files[0]} (${header.oid})`)
      }
      if (header.type === 'blob' || header.type === 'commit' || header.type === 'tag') {
        const shape = findSecretShape(content)
        if (shape) {
          const allowed = allowedFindings.get(header.oid)
          const digest = createHash('sha256').update(content).digest('hex')
          const matchesAllowance = allowed
            && header.files.length === 1
            && allowed.path === header.files[0]
            && allowed.shape === shape
            && allowed.sha256 === digest
          const findingFile = allowed
            ? header.files.find((file) => file !== allowed.path) ?? header.files[0]
            : header.files[0]
          if (!finding && !matchesAllowance) finding = { shape, file: findingFile, oid: header.oid, type: header.type }
        }
      }
      header = null
    }
  }

  const exitCode = await completion
  if (exitCode !== 0) throw new Error(`Historical object scan failed:\n${stderr}`)
  if (header || bufferedBytes || requestIndex !== requested.length) {
    throw new Error(`Historical object scan returned ${requestIndex} of ${requested.length} requested objects.`)
  }
  return finding
}
