const safeImageTypes = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
} as const

type SafeImageMimeType = keyof typeof safeImageTypes

export interface ExportImageAsset {
  base64: string
  extension: (typeof safeImageTypes)[SafeImageMimeType]
  mimeType: SafeImageMimeType
}

const dataImageUrl = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/i

function hasPrefix(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  return bytes.length >= offset + prefix.length
    && prefix.every((value, index) => bytes[offset + index] === value)
}

function readU16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readU16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readU32BE(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] * 0x1000000)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]) >>> 0
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]
    + (bytes[offset + 1] << 8)
    + (bytes[offset + 2] << 16)
    + (bytes[offset + 3] * 0x1000000)) >>> 0
}

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function isValidPng(bytes: Uint8Array): boolean {
  if (!hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return false

  let offset = 8
  let chunkIndex = 0
  let sawImageData = false
  while (offset + 12 <= bytes.length) {
    const length = readU32BE(bytes, offset)
    const typeOffset = offset + 4
    const dataOffset = typeOffset + 4
    const crcOffset = dataOffset + length
    if (crcOffset + 4 > bytes.length) return false

    const type = String.fromCharCode(...bytes.slice(typeOffset, dataOffset))
    if (!/^[A-Za-z]{4}$/.test(type)) return false
    if (readU32BE(bytes, crcOffset) !== crc32(bytes, typeOffset, crcOffset)) return false

    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) return false
      if (readU32BE(bytes, dataOffset) === 0 || readU32BE(bytes, dataOffset + 4) === 0) return false
    } else if (type === 'IHDR') return false
    if (type === 'IDAT') sawImageData = true
    offset = crcOffset + 4
    chunkIndex += 1

    if (type === 'IEND') return length === 0 && sawImageData && offset === bytes.length
  }
  return false
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function isValidJpeg(bytes: Uint8Array): boolean {
  if (!hasPrefix(bytes, [0xff, 0xd8]) || bytes.length < 12) return false

  let offset = 2
  let inScan = false
  let sawFrame = false
  let sawScan = false

  while (offset < bytes.length) {
    let marker: number
    if (inScan) {
      while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1
      if (offset >= bytes.length) return false
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1
      if (offset >= bytes.length) return false
      marker = bytes[offset]
      offset += 1
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue
      inScan = false
    } else {
      if (bytes[offset] !== 0xff) return false
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1
      if (offset >= bytes.length) return false
      marker = bytes[offset]
      offset += 1
    }

    if (marker === 0xd9) return sawFrame && sawScan && offset === bytes.length
    if (marker === 0xd8 || marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) return false
    if (offset + 2 > bytes.length) return false

    const segmentLength = readU16BE(bytes, offset)
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return false
    const segmentData = offset + 2
    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 8 || readU16BE(bytes, segmentData + 1) === 0 || readU16BE(bytes, segmentData + 3) === 0) return false
      sawFrame = true
    }
    offset += segmentLength
    if (marker === 0xda) {
      sawScan = true
      inScan = true
    }
  }

  return false
}

function skipGifColorTable(bytes: Uint8Array, offset: number, packed: number): number | null {
  if ((packed & 0x80) === 0) return offset
  const tableBytes = 3 * (1 << ((packed & 0x07) + 1))
  return offset + tableBytes <= bytes.length ? offset + tableBytes : null
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number | null {
  let offset = start
  while (offset < bytes.length) {
    const length = bytes[offset]
    offset += 1
    if (length === 0) return offset
    if (offset + length > bytes.length) return null
    offset += length
  }
  return null
}

function isValidGif(bytes: Uint8Array): boolean {
  const validHeader = hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    || hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  if (!validHeader || bytes.length < 14) return false
  if (readU16LE(bytes, 6) === 0 || readU16LE(bytes, 8) === 0) return false

  let offset = skipGifColorTable(bytes, 13, bytes[10])
  if (offset === null) return false
  let sawImage = false

  while (offset < bytes.length) {
    const introducer = bytes[offset]
    offset += 1
    if (introducer === 0x3b) return sawImage && offset === bytes.length
    if (introducer === 0x21) {
      if (offset >= bytes.length) return false
      offset += 1 // extension label
      const next = skipGifSubBlocks(bytes, offset)
      if (next === null) return false
      offset = next
      continue
    }
    if (introducer !== 0x2c || offset + 9 > bytes.length) return false
    if (readU16LE(bytes, offset + 4) === 0 || readU16LE(bytes, offset + 6) === 0) return false
    const imagePacked = bytes[offset + 8]
    offset += 9
    const afterColorTable = skipGifColorTable(bytes, offset, imagePacked)
    if (afterColorTable === null || afterColorTable >= bytes.length) return false
    offset = afterColorTable + 1 // LZW minimum code size
    const next = skipGifSubBlocks(bytes, offset)
    if (next === null) return false
    offset = next
    sawImage = true
  }
  return false
}

function isValidWebp(bytes: Uint8Array): boolean {
  if (!hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) || !hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return false
  if (bytes.length < 20 || readU32LE(bytes, 4) !== bytes.length - 8) return false

  let offset = 12
  let sawImage = false
  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4))
    const chunkLength = readU32LE(bytes, offset + 4)
    const dataOffset = offset + 8
    const paddedEnd = dataOffset + chunkLength + (chunkLength & 1)
    if (paddedEnd > bytes.length) return false

    if (chunkType === 'VP8 ') {
      if (chunkLength < 10 || !hasPrefix(bytes, [0x9d, 0x01, 0x2a], dataOffset + 3)) return false
      if ((readU16LE(bytes, dataOffset + 6) & 0x3fff) === 0) return false
      if ((readU16LE(bytes, dataOffset + 8) & 0x3fff) === 0) return false
      sawImage = true
    } else if (chunkType === 'VP8L') {
      if (chunkLength < 5 || bytes[dataOffset] !== 0x2f) return false
      sawImage = true
    } else if (chunkType === 'VP8X') {
      if (chunkLength !== 10 || (bytes[dataOffset] & 0xc1) !== 0 || bytes[dataOffset + 1] !== 0 || bytes[dataOffset + 2] !== 0 || bytes[dataOffset + 3] !== 0) return false
    }
    offset = paddedEnd
  }
  return sawImage && offset === bytes.length
}

function isStructurallyValidImage(mimeType: SafeImageMimeType, bytes: Uint8Array): boolean {
  switch (mimeType) {
    case 'image/png': return isValidPng(bytes)
    case 'image/jpeg': return isValidJpeg(bytes)
    case 'image/gif': return isValidGif(bytes)
    case 'image/webp': return isValidWebp(bytes)
  }
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    const decoded = atob(value)
    return Uint8Array.from(decoded, character => character.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * Archive images must be complete, structurally valid raster containers. Every
 * parser consumes the exact byte stream so header-only files, appended HTML,
 * MIME mismatches, and extension-smuggling payloads fail closed.
 */
export function parseSafeExportImageDataUrl(value: string): ExportImageAsset | null {
  const match = dataImageUrl.exec(value)
  if (!match) return null

  const mimeType = match[1].toLowerCase() as SafeImageMimeType
  const base64 = match[2]
  const bytes = decodeBase64(base64)
  if (!bytes || !isStructurallyValidImage(mimeType, bytes)) return null

  return { base64, mimeType, extension: safeImageTypes[mimeType] }
}
