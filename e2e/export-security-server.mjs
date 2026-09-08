import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const [, , fixturePath, logPath, readyPath, portValue] = process.argv
const fixture = readFileSync(fixturePath)

createServer((request, response) => {
  appendFileSync(logPath, `${request.url}\n`)
  if (request.url === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(fixture)
    return
  }
  if (request.url === '/assets/image_0.png') {
    response.writeHead(200, { 'content-type': 'image/png' })
    response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'))
    return
  }
  response.writeHead(404)
  response.end('not found')
}).listen(Number(portValue), '127.0.0.1', () => writeFileSync(readyPath, 'ready'))
