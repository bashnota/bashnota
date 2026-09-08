import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

const baseUrl = process.env.JUPYTER_E2E_URL ?? 'http://127.0.0.1:8888'
const timeoutMs = 15_000

const kernelsResponse = await fetch(`${baseUrl}/api/kernels`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'python3' }),
})
assert.equal(kernelsResponse.ok, true, `Kernel creation failed: ${kernelsResponse.status}`)

const kernel = await kernelsResponse.json()
assert.equal(typeof kernel.id, 'string')

try {
  const session = randomUUID()
  const messageId = randomUUID()
  const wsUrl = new URL(`/api/kernels/${kernel.id}/channels`, baseUrl)
  wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  wsUrl.searchParams.set('session_id', session)

  const output = await new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl)
    const chunks = []
    const timeout = setTimeout(() => {
      socket.terminate()
      reject(new Error(`Jupyter execution exceeded ${timeoutMs}ms`))
    }, timeoutMs)

    socket.once('error', reject)
    socket.once('open', () => {
      socket.send(JSON.stringify({
        channel: 'shell',
        header: {
          msg_id: messageId,
          username: 'bashnota-e2e',
          session,
          date: new Date().toISOString(),
          msg_type: 'execute_request',
          version: '5.3',
        },
        parent_header: {},
        metadata: {},
        content: {
          code: 'print("BashNota Jupyter E2E")\n2 + 3',
          silent: false,
          store_history: false,
          user_expressions: {},
          allow_stdin: false,
          stop_on_error: true,
        },
        buffers: [],
      }))
    })

    socket.on('message', (rawMessage) => {
      const message = JSON.parse(String(rawMessage))
      if (message.parent_header?.msg_id !== messageId) return

      if (message.header?.msg_type === 'stream') chunks.push(message.content?.text ?? '')
      if (message.header?.msg_type === 'execute_result') {
        chunks.push(message.content?.data?.['text/plain'] ?? '')
      }
      if (message.header?.msg_type === 'error') {
        chunks.push(`${message.content?.ename}: ${message.content?.evalue}`)
      }
      if (message.header?.msg_type === 'status' && message.content?.execution_state === 'idle') {
        clearTimeout(timeout)
        socket.close()
        resolve(chunks.join(''))
      }
    })
  })

  assert.match(output, /BashNota Jupyter E2E/)
  assert.match(output, /5/)
  console.log(`Local Jupyter execution passed: ${JSON.stringify(output.trim())}`)
} finally {
  await fetch(`${baseUrl}/api/kernels/${kernel.id}`, { method: 'DELETE' })
}
