export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 8192
export const MAX_IMAGE_PIXELS = 40_000_000
const MAX_WEBP_CHUNKS = 512

export type RasterMime = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
export interface ValidatedRaster {
  mime: RasterMime
  extension: 'png' | 'jpg' | 'gif' | 'webp'
  width: number
  height: number
}

function invalid(message: string): never {
  throw new Error(`Invalid published image: ${message}`)
}
function u16be(b: Uint8Array, o: number) {
  return (b[o] << 8) | b[o + 1]
}
function u24le(b: Uint8Array, o: number) {
  return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)
}
function u32be(b: Uint8Array, o: number) {
  return (b[o] * 0x1000000 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]) >>> 0
}
function u32le(b: Uint8Array, o: number) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] * 0x1000000)) >>> 0
}
function ascii(b: Uint8Array, o: number, n: number) {
  return String.fromCharCode(...b.subarray(o, o + n))
}

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff
  for (let index = start; index < end; index++) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    invalid('dimensions are missing')
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  )
    invalid('dimensions exceed the safe limit')
  return { width, height }
}

function png(bytes: Uint8Array) {
  if (
    bytes.length < 45 ||
    ascii(bytes, 1, 3) !== 'PNG' ||
    bytes[0] !== 0x89 ||
    bytes[4] !== 13 ||
    bytes[5] !== 10 ||
    bytes[6] !== 26 ||
    bytes[7] !== 10
  )
    invalid('malformed PNG signature')
  let offset = 8
  let seenHeader = false
  let seenData = false
  let size = { width: 0, height: 0 }
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset)
    const type = ascii(bytes, offset + 4, 4)
    const end = offset + 12 + length
    if (end > bytes.length) invalid('truncated PNG chunk')
    if (crc32(bytes, offset + 4, offset + 8 + length) !== u32be(bytes, offset + 8 + length))
      invalid('PNG chunk checksum failed')
    if (!seenHeader && type !== 'IHDR') invalid('PNG header is not first')
    if (type === 'IHDR') {
      if (seenHeader || length !== 13) invalid('invalid PNG header')
      size = dimensions(u32be(bytes, offset + 8), u32be(bytes, offset + 12))
      seenHeader = true
    } else if (type === 'IDAT') seenData = true
    else if (type === 'IEND') {
      if (length !== 0 || !seenData || end !== bytes.length)
        invalid('PNG has missing data or trailing bytes')
      return size
    } else if ((type.charCodeAt(0) & 32) === 0 && type !== 'PLTE')
      invalid('unsupported critical PNG chunk')
    offset = end
  }
  invalid('PNG has no terminal chunk')
}

function jpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
    invalid('malformed JPEG signature')
  let offset = 2
  let size: { width: number; height: number } | undefined
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) invalid('malformed JPEG marker')
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xd9) {
      if (offset !== bytes.length || !size) invalid('JPEG has missing dimensions or trailing bytes')
      return size
    }
    if (marker === 0xda) {
      const end = bytes.length - 2
      if (end < offset || bytes[end] !== 0xff || bytes[end + 1] !== 0xd9)
        invalid('JPEG scan is not terminal')
      if (!size) invalid('JPEG dimensions are missing')
      return size
    }
    if (offset + 2 > bytes.length) invalid('truncated JPEG segment')
    const length = u16be(bytes, offset)
    if (length < 2 || offset + length > bytes.length) invalid('invalid JPEG segment length')
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) invalid('invalid JPEG frame')
      size = dimensions(u16be(bytes, offset + 3), u16be(bytes, offset + 5))
    }
    offset += length
  }
  invalid('JPEG has no terminal marker')
}

function gif(bytes: Uint8Array) {
  if (bytes.length < 14 || !['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6)))
    invalid('malformed GIF signature')
  const size = dimensions(bytes[6] | (bytes[7] << 8), bytes[8] | (bytes[9] << 8))
  const packed = bytes[10]
  let offset = 13 + (packed & 0x80 ? 3 * (1 << ((packed & 7) + 1)) : 0)
  let seenFrame = false
  const skipBlocks = () => {
    let payload = 0
    while (offset < bytes.length) {
      const length = bytes[offset++]
      if (length === 0) return payload
      if (offset + length > bytes.length) invalid('truncated GIF data block')
      payload += length
      offset += length
    }
    invalid('unterminated GIF data block')
  }
  while (offset < bytes.length) {
    const marker = bytes[offset++]
    if (marker === 0x3b) {
      if (!seenFrame || offset !== bytes.length) invalid('GIF has no frame or has trailing bytes')
      return size
    }
    if (marker === 0x21) {
      if (offset >= bytes.length) invalid('truncated GIF extension')
      offset++
      skipBlocks()
      continue
    }
    if (marker !== 0x2c || offset + 9 > bytes.length) invalid('invalid GIF block marker')
    const frameWidth = bytes[offset + 4] | (bytes[offset + 5] << 8)
    const frameHeight = bytes[offset + 6] | (bytes[offset + 7] << 8)
    dimensions(frameWidth, frameHeight)
    const framePacked = bytes[offset + 8]
    offset += 9 + (framePacked & 0x80 ? 3 * (1 << ((framePacked & 7) + 1)) : 0)
    if (offset >= bytes.length || bytes[offset] < 2 || bytes[offset] > 8)
      invalid('invalid GIF LZW code size')
    offset++
    if (skipBlocks() === 0) invalid('GIF frame has no raster data')
    seenFrame = true
  }
  invalid('GIF has no terminal trailer')
}

function vp8Dimensions(bytes: Uint8Array, offset: number, length: number) {
  if (
    length < 10 ||
    bytes[offset + 3] !== 0x9d ||
    bytes[offset + 4] !== 0x01 ||
    bytes[offset + 5] !== 0x2a
  ) {
    invalid('malformed WebP VP8 payload')
  }
  return dimensions(
    (bytes[offset + 6] | (bytes[offset + 7] << 8)) & 0x3fff,
    (bytes[offset + 8] | (bytes[offset + 9] << 8)) & 0x3fff,
  )
}

function vp8lDimensions(bytes: Uint8Array, offset: number, length: number) {
  if (length < 5 || bytes[offset] !== 0x2f) invalid('malformed WebP VP8L payload')
  const bits = u32le(bytes, offset + 1)
  if (bits >>> 29 !== 0) invalid('unsupported WebP VP8L version')
  return {
    ...dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1),
    alpha: ((bits >>> 28) & 1) === 1,
  }
}

function webp(bytes: Uint8Array) {
  if (
    bytes.length < 20 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 4) !== 'WEBP' ||
    u32le(bytes, 4) + 8 !== bytes.length
  )
    invalid('malformed WebP container')

  let offset = 12
  let chunkCount = 0
  let extended = false
  let featureFlags = 0
  let canvas: { width: number; height: number } | undefined
  let sawLossy = false
  let sawLossless = false
  let losslessAlpha = false
  let sawAlpha = false
  let sawAnimationHeader = false
  let sawAnimationFrame = false
  let sawIccp = false
  let sawExif = false
  let sawXmp = false

  while (offset < bytes.length) {
    if (++chunkCount > MAX_WEBP_CHUNKS) invalid('WebP contains too many chunks')
    if (offset + 8 > bytes.length) invalid('truncated WebP chunk header')
    const type = ascii(bytes, offset, 4)
    const length = u32le(bytes, offset + 4)
    const dataOffset = offset + 8
    const dataEnd = dataOffset + length
    const paddedEnd = dataEnd + (length & 1)
    if (dataEnd < dataOffset || paddedEnd > bytes.length) invalid('truncated WebP chunk')
    if ((length & 1) !== 0 && bytes[dataEnd] !== 0) invalid('invalid WebP chunk padding')
    if (sawAlpha && !sawLossy && type !== 'VP8 ') invalid('WebP ALPH must immediately precede VP8')

    if (type === 'VP8X') {
      if (offset !== 12 || extended || length !== 10) invalid('invalid WebP extended header')
      featureFlags = bytes[dataOffset]
      if (
        (featureFlags & 0xc1) !== 0 ||
        bytes[dataOffset + 1] !== 0 ||
        bytes[dataOffset + 2] !== 0 ||
        bytes[dataOffset + 3] !== 0
      ) {
        invalid('invalid WebP extended feature flags')
      }
      canvas = dimensions(1 + u24le(bytes, dataOffset + 4), 1 + u24le(bytes, dataOffset + 7))
      extended = true
    } else if (type === 'VP8 ') {
      if (sawLossy || sawLossless || sawAnimationHeader || sawAnimationFrame)
        invalid('WebP has multiple image payloads')
      vp8Dimensions(bytes, dataOffset, length)
      sawLossy = true
    } else if (type === 'VP8L') {
      if (sawLossy || sawLossless || sawAlpha || sawAnimationHeader || sawAnimationFrame)
        invalid('WebP has multiple image payloads')
      losslessAlpha = vp8lDimensions(bytes, dataOffset, length).alpha
      sawLossless = true
    } else if (type === 'ALPH') {
      if (!extended || sawAlpha || sawLossy || sawLossless || length < 2)
        invalid('invalid WebP alpha chunk')
      sawAlpha = true
    } else if (type === 'ANIM') {
      if (!extended || sawAnimationHeader || sawLossy || sawLossless || sawAlpha || length !== 6)
        invalid('invalid WebP animation header')
      sawAnimationHeader = true
    } else if (type === 'ANMF') {
      if (!extended || !sawAnimationHeader || sawLossy || sawLossless || length < 16)
        invalid('invalid WebP animation frame')
      sawAnimationFrame = true
    } else if (type === 'ICCP') {
      if (!extended || sawIccp || sawLossy || sawLossless || sawAnimationHeader || length === 0)
        invalid('invalid WebP color profile')
      sawIccp = true
    } else if (type === 'EXIF') {
      if (!extended || sawExif || (!sawLossy && !sawLossless && !sawAnimationFrame) || length === 0)
        invalid('invalid WebP EXIF chunk')
      sawExif = true
    } else if (type === 'XMP ') {
      if (!extended || sawXmp || (!sawLossy && !sawLossless && !sawAnimationFrame) || length === 0)
        invalid('invalid WebP XMP chunk')
      sawXmp = true
    }
    offset = paddedEnd
  }

  if (!extended) {
    if (chunkCount !== 1 || (!sawLossy && !sawLossless)) invalid('invalid simple WebP payload')
    const size = sawLossy
      ? vp8Dimensions(bytes, 20, u32le(bytes, 16))
      : vp8lDimensions(bytes, 20, u32le(bytes, 16))
    return { width: size.width, height: size.height }
  }

  const hasFlag = (flag: number) => (featureFlags & flag) !== 0
  if (hasFlag(0x20) !== sawIccp || hasFlag(0x08) !== sawExif || hasFlag(0x04) !== sawXmp) {
    invalid('WebP metadata chunks disagree with feature flags')
  }
  if (hasFlag(0x02)) {
    if (!sawAnimationHeader || !sawAnimationFrame || sawLossy || sawLossless || sawAlpha) {
      invalid('WebP animation chunks disagree with feature flags')
    }
  } else if (sawAnimationHeader || sawAnimationFrame || (!sawLossy && !sawLossless)) {
    invalid('WebP animation chunks disagree with feature flags')
  }
  if (sawLossy && hasFlag(0x10) !== sawAlpha)
    invalid('WebP alpha chunk disagrees with feature flags')
  if (sawLossless && hasFlag(0x10) !== losslessAlpha)
    invalid('WebP lossless alpha disagrees with feature flags')
  if (!sawLossy && sawAlpha) invalid('WebP alpha chunk requires VP8')
  return canvas!
}

export function validateRaster(bytes: Uint8Array, declaredMime: string): ValidatedRaster {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES)
    invalid('size must be between 1 byte and 5 MB')
  let detected: RasterMime
  let extension: ValidatedRaster['extension']
  let size
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') {
    detected = 'image/png'
    extension = 'png'
    size = png(bytes)
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    detected = 'image/jpeg'
    extension = 'jpg'
    size = jpeg(bytes)
  } else if (ascii(bytes, 0, 3) === 'GIF') {
    detected = 'image/gif'
    extension = 'gif'
    size = gif(bytes)
  } else if (ascii(bytes, 0, 4) === 'RIFF') {
    detected = 'image/webp'
    extension = 'webp'
    size = webp(bytes)
  } else invalid('bytes are not an allowed raster format')
  if (declaredMime !== detected) invalid(`declared MIME ${declaredMime} does not match ${detected}`)
  return { mime: detected, extension, ...size }
}
