import admin from 'firebase-admin'
import * as crypto from 'crypto'

/**
 * Service for handling image uploads to Firebase Storage
 */
export class ImageUploadService {
  private userId: string
  private bucket: any

  constructor(userId: string) {
    this.userId = userId
    // Initialize Firebase Storage
    const storage = admin.storage()
    this.bucket = storage.bucket()
  }

  /**
   * Upload an image to Firebase Storage
   *
   * @param dataUrl The data URL of the image
   * @returns The URL of the uploaded image
   */
  async uploadImage(dataUrl: string): Promise<string> {
    // Extract image data and mime type
    const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL')
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate a unique filename
    const timestamp = Date.now()
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const extension = mimeType.split('/')[1]
    const filename = `published/${this.userId}/${timestamp}-${hash}.${extension}`

    // Upload to Firebase Storage
    const file = this.bucket.file(filename)
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          owner: this.userId,
        },
      },
    })

    // Make the file publicly accessible
    await file.makePublic()

    // Get the public URL
    // Check if we're in the emulator environment
    const isEmulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST ? true : false
    let publicUrl: string

    if (isEmulator) {
      // Format for emulator
      const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'localhost:9199'
      publicUrl = `http://${emulatorHost}/v0/b/${this.bucket.name}/o/${encodeURIComponent(filename)}?alt=media`
    } else {
      // Format for production
      publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filename}`
    }

    return publicUrl
  }
}
