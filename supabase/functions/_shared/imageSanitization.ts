import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from 'npm:@imagemagick/magick-wasm@0.0.42'
import { MAX_IMAGE_BYTES, validateRaster, type ValidatedRaster } from './imageValidation.ts'

const wasmBytes = await Deno.readFile(
  new URL('magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.42')),
)
await initializeImageMagick(wasmBytes)

export interface SanitizedRaster { bytes: Uint8Array; raster: ValidatedRaster }

/**
 * Decode with a real raster codec and re-encode to PNG before Storage sees the
 * object. Re-encoding drops trailers, alternate parser interpretations, and
 * active metadata instead of trying to enumerate every possible polyglot.
 */
export function sanitizeRaster(bytes: Uint8Array, declaredMime: string): SanitizedRaster {
  const parsed = validateRaster(bytes, declaredMime)
  try {
    const sanitized = ImageMagick.read(bytes, image => {
      if (image.width !== parsed.width || image.height !== parsed.height) {
        throw new Error('decoded dimensions disagree with the raster header')
      }
      image.strip()
      return image.write(MagickFormat.Png, data => Uint8Array.from(data))
    })
    if (sanitized.byteLength < 1 || sanitized.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('sanitized image exceeds the 5 MB storage limit')
    }
    return { bytes: sanitized, raster: validateRaster(sanitized, 'image/png') }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'raster decoder rejected the payload'
    throw new Error(`Invalid published image: decoded raster is malformed (${detail})`)
  }
}
