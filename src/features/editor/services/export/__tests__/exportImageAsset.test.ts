import { describe, expect, it } from 'vitest'
import { parseSafeExportImageDataUrl } from '../exportImageAsset'

const validImages = {
  'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'image/jpeg': '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAAB//8AAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AACwgAAQABAQERAP/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//dAAQAAf/aAAgBAQAAPwD8A6//2Q==',
  'image/gif': 'R0lGODdhAQABAIAAAAAAAAAAACH5BAkAAAEALAAAAAABAAEAAAICRAEAOw==',
  'image/webp': 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vv9UAA=',
} as const

const extensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const

const dataUrl = (mime: string, base64: string) => `data:${mime};base64,${base64}`
const appendBytes = (base64: string, suffix: string) => btoa(`${atob(base64)}${suffix}`)
const truncateBytes = (base64: string) => btoa(atob(base64).slice(0, -4))

describe('export archive image validation', () => {
  it.each(Object.entries(validImages))('accepts a complete %s raster container', (mime, base64) => {
    expect(parseSafeExportImageDataUrl(dataUrl(mime, base64))).toMatchObject({
      mimeType: mime,
      extension: extensions[mime as keyof typeof extensions],
      base64,
    })
  })

  it.each(Object.entries(validImages))('rejects truncated and appended-polyglot %s containers', (mime, base64) => {
    expect(parseSafeExportImageDataUrl(dataUrl(mime, truncateBytes(base64)))).toBeNull()
    expect(parseSafeExportImageDataUrl(dataUrl(mime, appendBytes(base64, '<html><script>alert(1)</script></html>')))).toBeNull()
  })

  it.each([
    ['header-only PNG', dataUrl('image/png', 'iVBORw0KGgo=')],
    ['header-only JPEG', dataUrl('image/jpeg', '/9j/')],
    ['header-only GIF', dataUrl('image/gif', 'R0lGODlh')],
    ['header-only WebP', dataUrl('image/webp', 'UklGRgAAAABXRUJQ')],
    ['spoofed PNG containing HTML', dataUrl('image/png', btoa('<html><script>window.pwned=1</script></html>'))],
    ['SVG payload', dataUrl('image/svg+xml', btoa('<svg onload="window.pwned=1"/>'))],
    ['HTML payload', dataUrl('text/html', btoa('<img src=x onerror="window.pwned=1">'))],
    ['mismatched GIF declaration', dataUrl('image/gif', validImages['image/png'])],
    ['MIME parameter extension smuggling', `data:image/png;name=payload.html;base64,${validImages['image/png']}`],
    ['malformed base64', 'data:image/png;base64,%%%'],
  ])('drops %s', (_name, value) => {
    expect(parseSafeExportImageDataUrl(value)).toBeNull()
  })
})
